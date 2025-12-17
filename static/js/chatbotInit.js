(function (global) {
  const defaultConfig = {
    assistantName: "NSING Assistant",
    assistantSubtitle: "Answers about products, specs, and support",
    buttonLabel: "Ask NSING",
    buttonAriaLabel: "Open NSING virtual assistant",
    buttonIcon: "images/choml.png",
    welcomeTitle: "Hi there 👋",
    welcomeMessage:
      "This virtual assistant is here to answer quick questions about NSING products, applications, or sales support. Use the suggestions or type your own prompt.",
    placeholder: "Ask me anything about NSING solutions...",
    suggestions: [
      "Compare NSING’s Cortex-M0, Cortex-M4, and Cortex-M7 offerings in tabular format.",
      "Highlight the N32H automotive MCU lineup.",
      "Which NSING MCUs include EtherCAT support?"
    ],
    zIndex: 9999
  };

  let hasInitialized = false;
  let ragflowService = null;
  let serviceReady = false;
  let serviceError = null;

  function initChatbot(options = {}) {
    if (hasInitialized) {
      return;
    }
    hasInitialized = true;

    const config = { ...defaultConfig, ...options };
    if (
      global.NsingChatbotService &&
      typeof global.NsingChatbotService.createChatbotService === "function"
    ) {
      ragflowService = global.NsingChatbotService.createChatbotService();
    }
    bootstrapChatbot(config);
  }

  function bootstrapChatbot(config) {
    injectStyles(config.zIndex);
    const overlay = buildOverlay(config);
    const toggleButton = buildToggleButton(config);

    document.body.appendChild(overlay);
    document.body.appendChild(toggleButton);

    const textarea = overlay.querySelector(".nsing-chatbot-input");
    const closeButton = overlay.querySelector(".nsing-chatbot-close");
    const suggestions = overlay.querySelectorAll("[data-nsing-chatbot-suggestion]");
    const form = overlay.querySelector(".nsing-chatbot-form");
    const sendButton = overlay.querySelector(".nsing-chatbot-send");

    let previousFocus = null;
    let previousOverflowValue = "";
    let isSending = false;

    const openModal = () => {
      previousFocus = document.activeElement;
      previousOverflowValue = document.body.style.overflow;
      overlay.classList.add("is-visible");
      overlay.removeAttribute("aria-hidden");
      toggleButton.style.display = "none";
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onKeydown);
      textarea.focus();
      if (ragflowService && !serviceReady && !serviceError) {
        ragflowService
          .ensureSession()
          .then(() => {
            serviceReady = true;
          })
          .catch((error) => {
            console.warn("Unable to initialize assistant session", error);
            serviceError = error;
          });
      }
    };

    const closeModal = () => {
      overlay.classList.remove("is-visible");
      overlay.setAttribute("aria-hidden", "true");
      toggleButton.style.display = "";
      if (previousOverflowValue) {
        document.body.style.overflow = previousOverflowValue;
      } else {
        document.body.style.removeProperty("overflow");
      }
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      } else {
        toggleButton.focus();
      }
      document.removeEventListener("keydown", onKeydown);
    };

    const onKeydown = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    toggleButton.addEventListener("click", openModal);
    closeButton.addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeModal();
      }
    });

    suggestions.forEach((button) => {
      button.addEventListener("click", () => {
        textarea.value = button.dataset.nsingChatbotSuggestion || "";
        textarea.focus();
      });
    });

    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
        }
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = textarea.value.trim();
      if (!value || isSending) {
        return;
      }
      isSending = true;
      if (sendButton) {
        sendButton.disabled = true;
      }
      appendMessage(overlay, value, "user");
      textarea.value = "";
      textarea.focus();
      const pending = appendPendingMessage(overlay);

      if (!ragflowService || serviceError) {
        populateBotMessage(
          pending,
          "Thanks for the question! The live assistant is configuring now, please try again shortly."
        );
        isSending = false;
        if (sendButton) {
          sendButton.disabled = false;
        }
        return;
      }

      ragflowService
        .sendMessage(value)
        .then(({ content, references, chunks }) => {
          populateBotMessage(pending, content, references, chunks);
        })
        .catch((error) => {
          console.warn("Assistant request failed", error);
          populateBotMessage(
            pending,
            "I’m sorry, I couldn’t get a response right now. Please try again in a moment."
          );
        })
        .finally(() => {
          isSending = false;
          if (sendButton) {
            sendButton.disabled = false;
          }
        });
    });
  }

  function buildToggleButton(config) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nsing-chatbot-button";
    button.setAttribute("aria-label", config.buttonAriaLabel);
    const iconMarkup = config.buttonIcon
      ? `
        <span class="nsing-chatbot-button-icon" aria-hidden="true">
          <img src="${config.buttonIcon}" alt="" loading="lazy" decoding="async" />
        </span>
      `
      : `<span class="nsing-chatbot-button-icon" aria-hidden="true">💬</span>`;
    button.innerHTML = `
      ${iconMarkup}
      <span class="nsing-chatbot-button-label">${config.buttonLabel}</span>
    `;
    return button;
  }

  function buildOverlay(config) {
    const overlay = document.createElement("div");
    overlay.className = "nsing-chatbot-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const modal = document.createElement("section");
    modal.className = "nsing-chatbot-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("tabindex", "-1");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", config.assistantName);

    modal.innerHTML = `
      <div class="nsing-chatbot-body">
        <div class="nsing-chatbot-column">
          <div class="nsing-chatbot-intro">
            <div class="intro-header">
              <img src="${config.buttonIcon}" alt="Assistant" />
              <div>
                <h4>${config.welcomeTitle}</h4>
                <p>${config.welcomeMessage}</p>
              </div>
            </div>
          </div>
          <div class="nsing-chatbot-suggestions" data-nsing-chatbot-suggestions>
            ${config.suggestions
              .map(
                (text) =>
                  `<button type="button" data-nsing-chatbot-suggestion="${text}">${text}</button>`
              )
              .join("")}
          </div>
          <div class="nsing-chatbot-messages" aria-live="polite"></div>
          <form class="nsing-chatbot-form">
            <label class="nsing-chatbot-visually-hidden" for="nsing-chatbot-input">Ask NSING</label>
            <textarea
              id="nsing-chatbot-input"
              class="nsing-chatbot-input"
              placeholder="${config.placeholder}"
              rows="2"
            ></textarea>
            <button type="submit" class="nsing-chatbot-send">Send</button>
          </form>
        </div>
      </div>
      <button class="nsing-chatbot-close" type="button" aria-label="Close chatbot">
        <span aria-hidden="true">&times;</span>
      </button>
    `;

    overlay.appendChild(modal);
    return overlay;
  }

  function appendMessage(overlay, text, author) {
    const list = overlay.querySelector(".nsing-chatbot-messages");
    const row = document.createElement("div");
    row.className = `nsing-chatbot-message nsing-chatbot-message-${author}`;

    const bubble = document.createElement("div");
    bubble.className = "nsing-chatbot-bubble";
    bubble.textContent = text;

    row.appendChild(bubble);
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
    return { row, bubble };
  }

  function appendPendingMessage(overlay) {
    const { row, bubble } = appendMessage(overlay, "Thinking...", "bot");
    row.classList.add("pending");
    return bubble;
  }

  function extractChunkReferences(text, chunks = {}) {
    const pattern = /\[ID:(\d+)\]/g;
    const found = [];
    const seen = new Set();
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const chunkId = match[1];
      if (!seen.has(chunkId)) {
        seen.add(chunkId);
        const chunk = chunks[chunkId];
        if (chunk) {
          found.push({
            id: chunkId,
            content: chunk.content || chunk.text || 'No content available'
          });
        }
      }
    }

    return found;
  }

  function renderChunkReferences(chunkRefs) {
    const wrapper = document.createElement("div");
    wrapper.className = "nsing-chatbot-chunk-references";
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = "Sources";
    wrapper.appendChild(label);

    const list = document.createElement("div");
    list.className = "nsing-chatbot-chunk-reference-list";

    chunkRefs.forEach((chunkRef) => {
      const container = document.createElement("div");
      container.className = "nsing-chatbot-chunk-reference";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "nsing-chatbot-chunk-reference-btn";
      button.textContent = `ID:${chunkRef.id}`;
      button.setAttribute("aria-label", `View chunk ${chunkRef.id}`);

      const popup = document.createElement("span");
      popup.className = "nsing-chatbot-chunk-reference-popup";
      popup.setAttribute("role", "tooltip");

      const popupContent = document.createElement("span");
      popupContent.className = "nsing-chatbot-chunk-reference-popup-content";
      popupContent.textContent = chunkRef.content;

      popup.appendChild(popupContent);
      container.appendChild(button);
      container.appendChild(popup);
      list.appendChild(container);
    });

    wrapper.appendChild(list);
    return wrapper;
  }

  function populateBotMessage(bubble, content, references = [], chunks = []) {
    const fragment = document.createDocumentFragment();

    const markdown = renderMarkdown(content);
    fragment.appendChild(markdown);

    // Extract and render chunk references
    const chunkRefs = extractChunkReferences(content, chunks);
    if (chunkRefs.length > 0) {
      fragment.appendChild(renderChunkReferences(chunkRefs));
    }

    if (Array.isArray(references) && references.length) {
      fragment.appendChild(renderReferences(references));
    }

    bubble.innerHTML = "";
    bubble.appendChild(fragment);
    bubble.parentElement?.classList.remove("pending");

    // Position tooltips after rendering
    positionChunkTooltips(bubble);
  }

  function positionChunkTooltips(container) {
    const chunkRefs = container.querySelectorAll('.nsing-chatbot-chunk-reference');
    chunkRefs.forEach(ref => {
      const btn = ref.querySelector('.nsing-chatbot-chunk-reference-btn');
      const popup = ref.querySelector('.nsing-chatbot-chunk-reference-popup');

      if (!btn || !popup) return;

      const updatePosition = () => {
        const rect = btn.getBoundingClientRect();
        popup.style.left = `${rect.left + rect.width / 2}px`;
        popup.style.top = `${rect.top}px`;
      };

      btn.addEventListener('mouseenter', updatePosition);
      btn.addEventListener('focus', updatePosition);
    });
  }

  function renderMarkdown(text = "") {
    const container = document.createElement("div");
    container.className = "nsing-chatbot-markdown";
    container.innerHTML = convertMarkdownToHtml(text);
    return container;
  }

  function renderReferences(references) {
    const wrapper = document.createElement("div");
    wrapper.className = "nsing-chatbot-references";
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = "Files";
    wrapper.appendChild(label);

    const list = document.createElement("div");
    list.className = "nsing-chatbot-reference-list";

    references.forEach((reference) => {
      const targetElement = document.createElement(reference?.url ? "a" : "div");
      targetElement.className = "nsing-chatbot-reference";
      if (reference?.url) {
        targetElement.href = reference.url;
        targetElement.target = "_blank";
        targetElement.rel = "noopener noreferrer";
      } else {
        targetElement.style.cursor = "default";
      }
      const documentName = reference?.name || reference?.title || "Reference document";
      targetElement.title = documentName;
      targetElement.setAttribute("aria-label", documentName);

      const icon = document.createElement("span");
      icon.className = "nsing-chatbot-reference-icon";

      const srText = document.createElement("span");
      srText.className = "nsing-chatbot-visually-hidden";
      srText.textContent = documentName;

      const tooltip = document.createElement("span");
      tooltip.className = "nsing-chatbot-reference-tooltip";
      tooltip.textContent = documentName;

      targetElement.appendChild(icon);
      targetElement.appendChild(srText);
      targetElement.appendChild(tooltip);
      list.appendChild(targetElement);
    });

    wrapper.appendChild(list);
    return wrapper;
  }

  function convertMarkdownToHtml(markdown = "") {
    const m = window.marked;
    if (!m) {
      return escapeHtml(markdown || "");
    }

    const parser =
      typeof m === "function"
        ? m
        : typeof m.parse === "function"
          ? m.parse.bind(m)
          : null;
    if (!parser) {
      return escapeHtml(markdown || "");
    }

    if (typeof m.setOptions === "function") {
      m.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false
      });
    }

    const raw = parser(markdown || "");
    const div = document.createElement("div");
    div.innerHTML = raw;
    div.querySelectorAll("script").forEach((el) => el.remove());
    return div.innerHTML;
  }

  function formatInline(text) {
    let escaped = escapeHtml(text);
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/\*(.+?)\*/g, "<em>$1</em>");
    escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
    escaped = escaped.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return escaped;
  }

  function escapeHtml(text = "") {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function injectStyles(zIndex) {
    if (document.getElementById("nsing-chatbot-styles")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "nsing-chatbot-styles";
    style.textContent = `
          .nsing-chatbot-markdown {
        max-width: 100%;
        overflow-x: auto;
      }
      .nsing-chatbot-markdown table {
        border-collapse: collapse;
        width: 100%;
        margin: 8px 0;
        table-layout: auto;
      }
      .nsing-chatbot-markdown th,
      .nsing-chatbot-markdown td { border: 1px solid #e0e0e0; padding: 6px 8px; text-align: left; }
      .nsing-chatbot-markdown thead { background: #f6f8fa; font-weight: 600; }
      .nsing-chatbot-button {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: ${zIndex};
        background: linear-gradient(120deg, #102044, #0062ff);
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
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .nsing-chatbot-button:focus-visible,
      .nsing-chatbot-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 18px 30px rgba(0, 98, 255, 0.35);
        outline: none;
      }
      .nsing-chatbot-button-icon {
        width: 34px;
        height: 34px;
        display: inline-flex;
        border-radius: 999px;
        overflow: hidden;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        color: #fff;
        background: rgba(255, 255, 255, 0.18);
      }
      .nsing-chatbot-overlay {
        position: fixed;
        inset: 0;
        background: rgba(7, 16, 36, 0.55);
        z-index: ${zIndex};
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
      .nsing-chatbot-overlay.is-visible {
        opacity: 1;
        pointer-events: auto;
      }
      .nsing-chatbot-modal {
        width: min(900px, 95vw);
        height: min(820px, 95vh);
        background: #fff;
        border-radius: 24px;
        display: flex;
        flex-direction: column;
        padding: 24px;
        position: relative;
        box-shadow: 0 35px 65px rgba(0, 0, 0, 0.35);
      }
      .nsing-chatbot-close {
        position: absolute;
        top: 16px;
        right: 16px;
        border: none;
        background: rgba(0,0,0,0.55);
        color: #fff;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        line-height: 34px;
        text-align: center;
      }
      .nsing-chatbot-body {
        flex: 1;
        display: flex;
        min-height: 0;
      }
      .nsing-chatbot-column {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-height: 0;
        background: #f7f8fc;
        border-radius: 18px;
        padding: 18px;
        color: #0f182d;
      }
      .nsing-chatbot-intro .intro-header {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #ffffff;
        border-radius: 16px;
        padding: 10px 14px;
        color: #0f182d;
        box-shadow: inset 0 0 0 1px rgba(15, 24, 45, 0.06);
      }
      .nsing-chatbot-intro .intro-header img {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
      }
      .nsing-chatbot-intro h4 {
        margin: 0;
        font-size: 18px;
      }
      .nsing-chatbot-intro p {
        margin: 4px 0 0;
        font-size: 14px;
        color: rgba(15, 24, 45, 0.7);
      }
      .nsing-chatbot-suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .nsing-chatbot-suggestions button {
        border: 1px solid rgba(15,24,45,0.15);
        border-radius: 20px;
        background: #fff;
        color: #0f182d;
        font-size: 13px;
        padding: 6px 12px;
        cursor: pointer;
      }
      .nsing-chatbot-messages {
        flex: 1;
        min-height: 0;
        border-radius: 16px;
        background: #f9f9fd;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow-y: auto;
        overflow-x: visible;
      }
      .nsing-chatbot-message {
        display: flex;
        min-width: 0;
      }
      .nsing-chatbot-message-user {
        justify-content: flex-end;
      }
      .nsing-chatbot-bubble {
        max-width: 100%;
        min-width: 0;
        border-radius: 14px;
        padding: 10px 14px;
        font-size: 14px;
        line-height: 1.45;
        overflow-x: auto;
        overflow-y: visible;
      }
      .nsing-chatbot-bubble table {
        display: block;
        width: 100%;
        max-width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        overflow-x: auto;
      }
      .nsing-chatbot-bubble th,
      .nsing-chatbot-bubble td {
        padding: 6px 8px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        word-break: break-word;
        white-space: normal;
      }
      .nsing-chatbot-message-user .nsing-chatbot-bubble {
        background: #0062ff;
        color: #fff;
        border-bottom-right-radius: 4px;
      }
      .nsing-chatbot-message-bot .nsing-chatbot-bubble {
        background: #ffffff;
        border: 1px solid rgba(0,0,0,0.08);
        color: #0f182d;
      }
      .nsing-chatbot-message-bot.pending .nsing-chatbot-bubble {
        opacity: 0.75;
        font-style: italic;
      }
      .nsing-chatbot-form {
        display: flex;
        gap: 12px;
      }
      .nsing-chatbot-input {
        flex: 1;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.25);
        padding: 12px 16px;
        min-height: 70px;
        resize: none;
        font-size: 15px;
        font-family: inherit;
        color: #000;
        background: #fff;
      }
      .nsing-chatbot-send {
        border: none;
        border-radius: 14px;
        padding: 0 28px;
        background: #102044;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
        min-height: 70px;
      }
      .nsing-chatbot-chunk-references {
        margin-top: 10px;
        border-top: 1px solid rgba(0,0,0,0.08);
        padding-top: 8px;
        font-size: 12px;
        color: #555;
      }
      .nsing-chatbot-chunk-references .label {
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .nsing-chatbot-chunk-reference-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 0;
        padding: 0;
      }
      .nsing-chatbot-chunk-reference {
        position: relative;
        display: inline-block;
      }
      .nsing-chatbot-chunk-reference-btn {
        border: 1px solid rgba(68, 68, 68, 0.3);
        background: rgba(200, 200, 200, 0.1);
        color: rgba(0,0,0,0.7);
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .nsing-chatbot-chunk-reference-btn:hover,
      .nsing-chatbot-chunk-reference-btn:focus-visible {
        background: rgba(216, 216, 216, 0.2);
        border-color: rgba(70, 70, 70, 0.5);
        outline: none;
      }
      .nsing-chatbot-chunk-reference-popup {
        position: fixed;
        background: rgba(15, 24, 45, 0.95);
        color: #fff;
        padding: 12px;
        border-radius: 8px;
        min-width: calc(min(900px, 95vw) - 100px);
        max-width: calc(min(900px, 95vw) - 100px);
        width: auto;
        font-size: 13px;
        line-height: 1.5;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
        z-index: 10000;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        transform: translate(-50%, calc(-100% - 8px));
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      .nsing-chatbot-chunk-reference:hover .nsing-chatbot-chunk-reference-popup,
      .nsing-chatbot-chunk-reference-btn:focus-visible + .nsing-chatbot-chunk-reference-popup {
        opacity: 1;
        pointer-events: auto;
      }
      .nsing-chatbot-chunk-reference-popup-content {
        display: block;
      }
      .nsing-chatbot-references {
        margin-top: 10px;
        border-top: 1px solid rgba(0,0,0,0.08);
        padding-top: 8px;
        font-size: 12px;
        color: #555;
      }
      .nsing-chatbot-references .label {
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .nsing-chatbot-reference-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 0;
        padding: 0;
      }
      .nsing-chatbot-reference {
        width: 36px;
        height: 36px;
        border-radius: 12px;
        border: 1px solid rgba(15,24,45,0.15);
        background: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        color: inherit;
        position: relative;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        cursor: pointer;
      }
      .nsing-chatbot-reference:hover,
      .nsing-chatbot-reference:focus-visible {
        transform: translateY(-1px);
        box-shadow: 0 6px 14px rgba(15,24,45,0.15);
        outline: none;
      }
      .nsing-chatbot-reference-tooltip {
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        transform: translate(-50%, 4px);
        background: rgba(15,24,45,0.9);
        color: #fff;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 11px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease, transform 0.15s ease;
        z-index: 2;
      }
      .nsing-chatbot-reference:hover .nsing-chatbot-reference-tooltip,
      .nsing-chatbot-reference:focus-visible .nsing-chatbot-reference-tooltip {
        opacity: 1;
        transform: translate(-10%, 0);
      }
      .nsing-chatbot-reference-icon {
        font-size: 16px;
        line-height: 1;
        width: 20px;
        height: 20px;
        background-image: url('images/paper-clip.png');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }
      .nsing-chatbot-markdown p {
        margin: 0 0 8px;
      }
      .nsing-chatbot-markdown ul {
        margin: 0 0 10px 18px;
        padding: 0;
      }
      .nsing-chatbot-markdown code {
        background: rgba(15,24,45,0.08);
        padding: 0 4px;
        border-radius: 4px;
        font-size: 13px;
      }
      .nsing-chatbot-markdown pre {
        background: #0f182d;
        color: #fff;
        padding: 10px;
        border-radius: 10px;
        overflow-x: auto;
        font-size: 13px;
      }
      .nsing-chatbot-visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0,0,0,0);
        border: 0;
      }
      @media (max-width: 768px) {
        .nsing-chatbot-button {
          right: 16px;
          left: 16px;
          width: calc(100% - 32px);
          justify-content: center;
        }
        .nsing-chatbot-modal {
          width: 100%;
          height: 100%;
          border-radius: 0;
        }
        .nsing-chatbot-previewPanel {
          padding: 14px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  global.initChatbot = initChatbot;

  const config = global.nsingChatbotConfig || {};
  initChatbot(config);
})(window);
