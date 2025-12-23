(function (global) {
    const defaults = {
      buttonLabel: "Upload Files",
      buttonAriaLabel: "Open file uploader",
      buttonIcon: "",
      apiBase: "",
      datasetId: "",
      apiKey: "",
      uploadEndpoint: "",
      zIndex: 10000,
      buttonOffset: 92,
      pollIntervalMs: 6000
    };

    let initialized = false;

    function initRagflowUploader(opts = {}) {
      if (initialized) return;
      initialized = true;

      const config = { ...defaults, ...opts };
      config.uploadEndpoint =
        config.uploadEndpoint ||
        (config.apiBase && config.datasetId
          ? `${config.apiBase}/api/v1/datasets/${config.datasetId}/documents`
          : "");

      injectStyles(config);

      const overlay = buildOverlay(config);
      const toggle = buildToggle(config);

      document.body.appendChild(overlay);
      document.body.appendChild(toggle);

      const closeBtn = overlay.querySelector(".nsing-uploader-close");
      const form = overlay.querySelector(".nsing-uploader-form");
      const fileInput = overlay.querySelector("#nsing-uploader-files");
      const statusList = overlay.querySelector(".nsing-uploader-status");
      const submitBtn = overlay.querySelector("[data-upload-submit]");
      const listContainer = overlay.querySelector("[data-upload-list]");
      const refreshBtn = overlay.querySelector("[data-upload-refresh]");
      let lastFocus = null;
      let pollTimer = null;

      const startPolling = () => {
        stopPolling();
        refreshDocuments(config, listContainer, statusList);
        pollTimer = window.setInterval(
          () => refreshDocuments(config, listContainer, statusList),
          config.pollIntervalMs
        );
      };

      const stopPolling = () => {
        if (pollTimer) {
          window.clearInterval(pollTimer);
          pollTimer = null;
        }
      };

      const open = () => {
        lastFocus = document.activeElement;
        overlay.classList.add("is-visible");
        overlay.removeAttribute("aria-hidden");
        toggle.style.display = "none";
        document.body.style.overflow = "hidden";
        fileInput.focus();
        startPolling();
      };

      const close = () => {
        stopPolling();
        overlay.classList.remove("is-visible");
        overlay.setAttribute("aria-hidden", "true");
        toggle.style.display = "";
        document.body.style.removeProperty("overflow");
        if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
      };

      toggle.addEventListener("click", open);
      closeBtn.addEventListener("click", close);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });
      document.addEventListener("keydown", (e) => {
        if (overlay.classList.contains("is-visible") && e.key === "Escape") close();
      });

      refreshBtn.addEventListener("click", () =>
        refreshDocuments(config, listContainer, statusList)
      );

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const files = Array.from(fileInput.files || []);

        if (!files.length) {
          renderStatus(statusList, "Please choose at least one file.", "error");
          return;
        }

        submitBtn.disabled = true;
        renderStatus(statusList, "Uploading…", "pending");

        try {
          const { docIds, raw } = await uploadFiles(files, config);
          const uploadedCount = Array.isArray(raw?.data) ? raw.data.length : files.length;

          if (!docIds.length) {
            renderStatus(
              statusList,
              "Uploaded, but no document IDs returned. Cannot start parsing.",
              "error"
            );
          } else {
            renderStatus(
              statusList,
              `Upload complete (${uploadedCount} file(s)). Starting parsing…`,
              "pending"
            );
            await startParsing(docIds, config);
            renderStatus(
              statusList,
              `Parsing started for ${docIds.length} document(s).`,
              "success"
            );
          }

          form.reset();
          refreshDocuments(config, listContainer, statusList);
        } catch (err) {
          console.warn("Upload or parse failed", err);
          renderStatus(
            statusList,
            err?.message || "Upload/parse failed. Please check your API settings and try again.",
            "error"
          );
        } finally {
          submitBtn.disabled = false;
        }
      });
    }

    function buildOverlay(config) {
      const overlay = document.createElement("div");
      overlay.className = "nsing-uploader-overlay";
      overlay.setAttribute("aria-hidden", "true");

      overlay.innerHTML = `
        <section class="nsing-uploader-modal" role="dialog" aria-modal="true" aria-label="Upload files to RAGFlow">
          <div class="nsing-uploader-header">
            <div>
              <h3>Upload Files</h3>
              <p>Add documents to your knowledge base.</p>
            </div>
            <button type="button" class="nsing-uploader-close" aria-label="Close uploader">&times;</button>
          </div>
          <form class="nsing-uploader-form">
            <label class="nsing-uploader-field nsing-uploader-inline">
              <h4>Files</h4>
              <div class="nsing-uploader-inline-row">
                <input id="nsing-uploader-files" name="files" type="file" multiple />
                <button type="submit" class="nsing-uploader-submit" data-upload-submit>Upload</button>
              </div>
            </label>
            <div class="nsing-uploader-status" aria-live="polite"></div>
          </form>

          <div class="nsing-uploader-list">
            <div class="nsing-uploader-list-header">
              <h4>Uploads</h4>
              <button type="button" class="nsing-uploader-refresh" data-upload-refresh>Refresh</button>
            </div>
            <div class="nsing-uploader-list-body" data-upload-list>
              <div class="nsing-uploader-empty">No documents yet.</div>
            </div>
          </div>
        </section>
      `;

      return overlay;
    }

    function buildToggle(config) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nsing-uploader-button";
      btn.setAttribute("aria-label", config.buttonAriaLabel);
      btn.innerHTML = `
        <span class="nsing-uploader-button-icon" aria-hidden="true">
          ${config.buttonIcon ? `<img src="${config.buttonIcon}" alt="" />` : "📤"}
        </span>
        <span class="nsing-uploader-button-label">${config.buttonLabel}</span>
      `;
      btn.style.bottom = `${config.buttonOffset}px`;
      return btn;
    }

    function renderStatus(container, text, state) {
      container.innerHTML = "";
      const item = document.createElement("div");
      item.className = `nsing-uploader-status-item ${state}`;
      item.textContent = text;
      container.appendChild(item);
    }

    async function uploadFiles(files, config) {
      if (!config.uploadEndpoint || !config.apiKey) {
        throw new Error("Upload endpoint or API key is not configured.");
      }

      const formData = new FormData();
      files.forEach((file) => formData.append("file", file));

      const res = await fetch(config.uploadEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`
        },
        body: formData
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload failed (HTTP ${res.status}).`);
      }

      const json = await res.json().catch(() => ({}));
      if (json?.code !== 0 || !Array.isArray(json?.data)) {
        throw new Error("Unexpected upload response shape.");
      }

      const docIds = json.data.map((item) => item?.id).filter(Boolean);
      return { docIds, raw: json };
    }

    async function startParsing(documentIds, config) {
      if (!config.apiBase || !config.datasetId || !config.apiKey) {
        throw new Error("Parsing config missing apiBase, datasetId, or apiKey.");
      }
      if (!documentIds.length) {
        throw new Error("No document IDs provided for parsing.");
      }

      const parseEndpoint = `${config.apiBase}/api/v1/datasets/${config.datasetId}/chunks`;
      const res = await fetch(parseEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ document_ids: documentIds })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Parsing request failed (HTTP ${res.status}).`);
      }

      return res.json().catch(() => ({}));
    }

    async function refreshDocuments(config, listContainer, statusList) {
      if (!config.apiBase || !config.datasetId || !config.apiKey) {
        renderStatus(statusList, "Missing API base/dataset/API key for listing.", "error");
        return;
      }
      const endpoint = `${config.apiBase}/api/v1/datasets/${config.datasetId}/documents`;

      try {
        const res = await fetch(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json"
          }
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `List request failed (HTTP ${res.status}).`);
        }
        const json = await res.json().catch(() => ({}));
        const docs = Array.isArray(json?.data?.docs) ? json.data.docs : [];
        renderDocuments(listContainer, docs);
      } catch (err) {
        console.warn("Failed to load documents", err);
        listContainer.innerHTML = `<div class="nsing-uploader-empty">Unable to load documents.</div>`;
      }
    }

    function renderDocuments(container, docs) {
      if (!docs.length) {
        container.innerHTML = `<div class="nsing-uploader-empty">No documents yet.</div>`;
        return;
      }
      container.innerHTML = "";
      docs
        .slice()
        .sort((a, b) => (b.update_time || b.create_time || 0) - (a.update_time || a.create_time || 0))
        .forEach((doc) => {
          const { colorClass, label } = statusFromRun(doc);
          const row = document.createElement("div");
          row.className = "nsing-uploader-row";
          row.innerHTML = `
            <span class="nsing-uploader-dot ${colorClass}" title="${label}"></span>
            <div class="nsing-uploader-row-main">
              <div class="nsing-uploader-name">${doc.name || doc.location || "Untitled"}</div>
              <div class="nsing-uploader-meta">
                ${doc.size ? `${formatBytes(doc.size)} · ` : ""}${label}
              </div>
            </div>
          `;
          container.appendChild(row);
        });
    }

    function statusFromRun(doc) {
      const run = (doc?.run || "").toUpperCase();
      const chunkCount = doc?.chunk_count || 0;
      if (run === "FINISHED" || run === "DONE" || chunkCount > 0) {
        return { colorClass: "green", label: "Parsed" };
      }
      if (run === "RUNNING" || run === "PARSING" || run === "PROCESSING") {
        return { colorClass: "orange", label: "Parsing…" };
      }
      return { colorClass: "red", label: "Unparsed" };
    }

    function formatBytes(bytes) {
      if (!bytes || bytes < 0) return "";
      const units = ["B", "KB", "MB", "GB"];
      const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
      const val = bytes / Math.pow(1024, i);
      return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
    }

    function injectStyles(config) {
      if (document.getElementById("nsing-uploader-styles")) return;
      const style = document.createElement("style");
      style.id = "nsing-uploader-styles";
      style.textContent = `
      .nsing-uploader-button {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: ${config.zIndex};
        background: linear-gradient(120deg, #0f182d, #0062ff);
        color: #fff;
        border: none;
        border-radius: 999px;
        padding: 12px 18px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 600;
        box-shadow: 0 12px 25px rgba(16, 32, 68, 0.35);
        cursor: pointer;
      }
      .nsing-uploader-button-icon {
        width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(255,255,255,0.14);
        overflow: hidden;
      }
      .nsing-uploader-button-icon img { width: 100%; height: 100%; object-fit: cover; }
      .nsing-uploader-overlay {
        position: fixed;
        inset: 0;
        background: rgba(7, 16, 36, 0.55);
        z-index: ${config.zIndex};
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
      .nsing-uploader-overlay.is-visible { opacity: 1; pointer-events: auto; }

      .nsing-uploader-modal {
        width: min(560px, 95vw);
        background: #fff;
        border-radius: 18px;
        padding: 20px;
        box-shadow: 0 28px 60px rgba(0,0,0,0.35);
        display: flex;
        flex-direction: column;
        gap: 4px;
        position: relative;
      }
      .nsing-uploader-header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
      .nsing-uploader-header h3 { margin: 0 0 4px; font-size: 20px; }
      .nsing-uploader-header p { margin: 0; color: #475067; font-size: 14px; }
      .nsing-uploader-close {
        border: none;
        background: rgba(0,0,0,0.1);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        line-height: 32px;
        text-align: center;
      }

      .nsing-uploader-form { display: flex; flex-direction: column; gap: 8px; }
      .nsing-uploader-field { display: flex; flex-direction: column; gap: 6px; font-size: 14px; color: #0f182d; }
      .nsing-uploader-inline-row { display: flex; gap: 10px; align-items: center; }
      .nsing-uploader-field input[type="file"] {
        flex: 1;
        border: 1px solid rgba(0,0,0,0.14);
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 14px;
        font-family: inherit;
      }
      .nsing-uploader-submit {
        border: none;
        border-radius: 10px;
        padding: 10px 16px;
        background: #0f182d;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }
      .nsing-uploader-status { min-height: 20px; font-size: 13px; }
      .nsing-uploader-status-item { padding: 8px 10px; border-radius: 10px; }
      .nsing-uploader-status-item.pending { background: #fff7e6; color: #8c6d1f; }
      .nsing-uploader-status-item.success { background: #e8fff1; color: #1b7a3f; }
      .nsing-uploader-status-item.error { background: #fff0f0; color: #a82121; }

      .nsing-uploader-list {
        border-top: 1px solid rgba(0,0,0,0.06);
        padding-top: 6px;
        margin-top: 2px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .nsing-uploader-list-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .nsing-uploader-list-header h4 { margin: 0; font-size: 15px; color: #0f182d; }
      .nsing-uploader-refresh {
        border: 1px solid rgba(0,0,0,0.1);
        background: #fff;
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 12px;
        cursor: pointer;
      }
      .nsing-uploader-list-body {
        max-height: 300px;
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .nsing-uploader-row {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 8px;
        border: 1px solid rgba(0,0,0,0.06);
        border-radius: 10px;
        background: #f9fafc;
      }
      .nsing-uploader-row-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .nsing-uploader-name {
        font-size: 14px;
        font-weight: 600;
        color: #0f182d;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .nsing-uploader-meta { font-size: 12px; color: #5a6478; }
      .nsing-uploader-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.08); }
      .nsing-uploader-dot.red { background: #e54848; }
      .nsing-uploader-dot.orange { background: #f5a524; }
      .nsing-uploader-dot.green { background: #2eb67d; }
      .nsing-uploader-empty { font-size: 13px; color: #5a6478; }

      @media (max-width: 768px) {
        .nsing-uploader-button { left: 16px; right: 16px; width: calc(100% - 32px); justify-content: center; }
        .nsing-uploader-modal { width: 100%; height: auto; max-height: 90vh; overflow: auto; }
      }
    `;
      document.head.appendChild(style);
    }

    global.initRagflowUploader = initRagflowUploader;
    initRagflowUploader(global.ragflowUploaderConfig || {});
  })(window);