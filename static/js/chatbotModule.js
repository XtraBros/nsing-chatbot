(function (global) {
  const AGENT_COMPLETION_PATH = "/api/v1/agents_openai/{agent_id}/chat/completions";
  const SESSION_STORAGE_PREFIX = "ragflow-chat-session-";
  const defaultServiceOptions = {
    apiBase: "",
    agentId: "",
    apiKey: "",
    tokenEndpoint: "",
    model: "default",
    agentCompletionPath: AGENT_COMPLETION_PATH,
    timeoutMs: 120000
  };

  function createChatbotService(overrides = {}) {
    const globalConfig = global.ragflowChatConfig || {};
    const options = normalizeOptions({
      ...defaultServiceOptions,
      ...globalConfig,
      ...overrides
    });
    try {
      validateOptions(options);
    } catch (error) {
      console.warn("Unable to initialize Ragflow chat client", error);
      return null;
    }

    const ragflowClient = createRagflowClient(options);

    async function ensureSession() {
      return ragflowClient.ensureSession();
    }

    async function sendMessage(prompt) {
      const { data } = await ragflowClient.sendMessage(prompt, { model: options.model });
      const reply = parseAssistantReply(data);
      return reply;
    }

    return {
      ensureSession,
      sendMessage
    };
  }

  function parseAssistantReply(data) {
    const choices = Array.isArray(data?.choices) ? data.choices : [];
    const first = choices.length ? choices[0] : null;
    let content =
      first?.message?.content ||
      first?.delta?.content ||
      data?.content ||
      "";
    if (Array.isArray(content)) {
      content = content.map((part) => part?.text || "").join("\n");
    }
    if (typeof content !== "string" || !content.trim()) {
      content = "I’m sorry, I couldn’t find any information for that request.";
    }
    const references = normalizeReferences(data, first);
    const chunks = data?.chunks || {};
    return {
        content,
        references,
        chunks
    };
  }

  function normalizeReferences(apiResponse, choice) {
    if (Array.isArray(apiResponse?.references) && apiResponse.references.length) {
      return dedupeReferences(
        apiResponse.references
          .map((reference) => sanitizeReference(reference))
          .filter(Boolean)
      );
    }
    const fallbackReference = choice?.message?.reference;
    if (fallbackReference && typeof fallbackReference === "object") {
      return dedupeReferences(buildReferencesFromMessage(fallbackReference));
    }
    return [];
  }

  function dedupeReferences(items) {
    if (!Array.isArray(items)) {
      return [];
    }
    const seen = new Set();
    return items.filter((item) => {
      const key = item?.id || item?.name;
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function sanitizeReference(reference) {
    if (!reference) {
      return null;
    }
    const name =
      reference.name ||
      reference.title ||
      reference.doc_name ||
      reference.docName ||
      "Reference document";
    return {
      id: reference.id || reference.doc_id || reference.docId || name,
      name,
      url: reference.url || reference.href || "",
      thumbnail: reference.thumbnail || reference.image || ""
    };
  }

  function buildReferencesFromMessage(reference) {
    const docAggs = reference.doc_aggs;
    if (!docAggs || typeof docAggs !== "object") {
      return [];
    }
    const seen = new Set();
    const items = [];
    Object.values(docAggs).forEach((doc) => {
      const id = doc?.doc_id || doc?.docId || doc?.id;
      if (!id || seen.has(id)) {
        return;
      }
      seen.add(id);
      items.push({
        id,
        name: doc?.doc_name || doc?.docName || "Reference document",
        url: ""
      });
    });
    return items;
  }

  function createRagflowClient(options) {
    const endpointPath = (options.agentCompletionPath || AGENT_COMPLETION_PATH).replace(
      "{agent_id}",
      options.agentId
    );
    const endpoint = `${options.apiBase}${endpointPath}`;
    const storageKey = `${SESSION_STORAGE_PREFIX}${hashString(
      endpoint + (options.model || "default")
    )}`;
    let currentSessionId = null;
    let ensuringSession = null;
    let tokenPromise = null;
    let cachedToken = null;

    async function ensureSession() {
      if (currentSessionId) {
        return currentSessionId;
      }
      if (ensuringSession) {
        return ensuringSession;
      }
      ensuringSession = (async () => {
        const stored = getStoredSession(storageKey);
        if (stored) {
          currentSessionId = stored;
          return stored;
        }
        currentSessionId = generateSessionId();
        saveSession(storageKey, currentSessionId);
        return currentSessionId;
      })().finally(() => {
        ensuringSession = null;
      });
      return ensuringSession;
    }

    async function sendMessage(message, extra = {}) {
      const prompt = (message || "").trim();
      if (!prompt) {
        throw new Error("Message is required.");
      }
      const sessionId = await ensureSession();
      const authToken = await resolveAuthToken();
      if (!authToken) {
        throw new Error("Missing RAGFlow API token.");
      }
      const body = {
        model: extra.model || options.model,
        messages: [{ role: "user", content: prompt }],
        stream: false
      };
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId =
        controller && options.timeoutMs
          ? setTimeout(() => controller.abort(), options.timeoutMs)
          : null;
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify(body),
          signal: controller ? controller.signal : undefined
        });
        const text = await response.text();
        if (!response.ok) {
          const errorMessage = text || `Request failed (${response.status}).`;
          throw new Error(errorMessage);
        }
        const data = text ? safeJsonParse(text) : {};
        const { references, chunks } = extractReferences(data, options.apiBase);
        if (references.length) {
          data.references = references;
        }
        if (Object.keys(chunks).length) {
          data.chunks = chunks;
        }
        return { data, sessionId };
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    }

    async function resolveAuthToken() {
      if (!options.tokenEndpoint) {
        return options.apiKey;
      }
      if (cachedToken !== null) {
        return cachedToken || options.apiKey;
      }
      if (!tokenPromise) {
        tokenPromise = fetch(options.tokenEndpoint, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store"
        })
          .then(async (response) => {
            if (!response.ok) {
              return "";
            }
            const data = await response.json().catch(() => ({}));
            return data?.token || "";
          })
          .catch(() => "")
          .then((token) => {
            cachedToken = token;
            return cachedToken || options.apiKey;
          })
          .finally(() => {
            tokenPromise = null;
          });
      }
      return tokenPromise;
    }

    return {
      ensureSession,
      sendMessage
    };
  }

  function normalizeOptions(options) {
    return {
      ...options,
      apiBase: (options.apiBase || "").replace(/\/+$/, ""),
      agentCompletionPath: options.agentCompletionPath || AGENT_COMPLETION_PATH,
      timeoutMs: options.timeoutMs || 120000
    };
  }

  function validateOptions(options) {
    if (!options.apiBase) {
      throw new Error("RAGFlow apiBase is not configured.");
    }
    if (!options.agentId) {
      throw new Error("RAGFlow agentId is not configured.");
    }
    if (!options.apiKey && !options.tokenEndpoint) {
      throw new Error("RAGFlow apiKey is not configured.");
    }
  }

  function safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error("Received invalid JSON from RAGFlow.");
    }
  }

  function generateSessionId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function getStoredSession(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function saveSession(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn("Unable to persist session id", error);
    }
  }

  function hashString(input = "") {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  function extractReferences(apiResponse, apiBase) {
    if (!apiResponse || typeof apiResponse !== "object") {
      return { references: [], chunks: {} };
    }
    const choices = Array.isArray(apiResponse.choices) ? apiResponse.choices : [];
    if (!choices.length) {
      return { references: [], chunks: {} };
    }
    const baseUrl = (apiBase || "").replace(/\/+$/, "");
    const references = [];
    const chunksMap = {};
    const seen = new Set();

    choices.forEach((choice) => {
      const message = (choice && choice.message) || {};
      const reference = message.reference || {};
      if (!reference) {
        return;
      }
      const docAggs = reference.doc_aggs || {};
      const chunks = reference.chunks || {};
      const docMeta = {};

      if (chunks && typeof chunks === "object") {
        Object.entries(chunks).forEach(([chunkId, chunk]) => {
          if (!chunkId || !chunk) {
            return;
          }
          chunksMap[chunkId] = {
            id: chunkId,
            content: chunk.content || chunk.text || chunk.chunk_content || "",
            document_id: chunk.document_id,
            document_name: chunk.document_name
          };
          const docId = chunk.document_id;
          if (!docId) {
            return;
          }
          const entry = docMeta[docId] || {};
          if (chunk.image_id && !entry.image_id) {
            entry.image_id = chunk.image_id;
          }
          if (chunk.document_name && !entry.name) {
            entry.name = chunk.document_name;
          }
          docMeta[docId] = entry;
        });
      }

      if (docAggs && typeof docAggs === "object") {
        Object.values(docAggs).forEach((doc) => {
          const docId = doc?.doc_id || doc?.docId;
          if (!docId || seen.has(docId)) {
            return;
          }
          seen.add(docId);
          const docName = doc?.doc_name || doc?.docName || docMeta[docId]?.name || "Reference document";
          references.push({
            id: docId,
            name: docName,
            url: buildDocumentUrl(baseUrl, docId, docName),
            thumbnail: buildThumbnailUrl(baseUrl, docMeta[docId]?.image_id, docId)
          });
        });
      }
    });

    return { references, chunks: chunksMap };
  }

  function buildDocumentUrl(baseUrl, docId, documentName) {
    if (!baseUrl || !docId) {
      return "";
    }
    const encodedId = encodeURIComponent(String(docId).trim());
    const query = [];
    if (documentName && typeof documentName === "string" && documentName.includes(".")) {
      const ext = documentName.split(".").pop();
      if (ext) {
        query.push(`ext=${encodeURIComponent(ext)}`);
      }
    }
    query.unshift("prefix=document");
    return `${baseUrl}/document/${encodedId}?${query.join("&")}`;
  }

  function buildThumbnailUrl(baseUrl, imageId, docId) {
    if (!baseUrl || !imageId) {
      return "";
    }
    const encodedImageId = encodeURIComponent(String(imageId).trim());
    const suffix = docId ? `-thumbnail_${encodeURIComponent(String(docId).trim())}.png` : "";
    return `${baseUrl}/v1/document/image/${encodedImageId}${suffix}`;
  }

  global.NsingChatbotService = {
    createChatbotService
  };
})(window);
