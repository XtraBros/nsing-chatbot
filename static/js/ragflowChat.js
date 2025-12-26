(function (global) {
  const AGENT_COMPLETION_PATH = "/api/v1/agents_openai/{agent_id}/chat/completions";
  const CONFIG_ENDPOINT = "/api/ragflow/config";
  const SESSION_PREFIX = "ragflow-chat-session-";
  const defaultOptions = {
    apiBase: "",
    agentId: "",
    apiKey: "",
    model: "default",
    agentCompletionPath: AGENT_COMPLETION_PATH,
    timeoutMs: 120000,
    configEndpoint: CONFIG_ENDPOINT
  };

  function createService(overrides = {}) {
    const baseOptions = {
      ...defaultOptions,
      ...overrides
    };

    let resolvedOptions = null;
    let optionsPromise = null;
    let currentSessionId = null;
    let ensurePromise = null;
    let storageKey = null;

    async function ensureOptions() {
      if (resolvedOptions) {
        return resolvedOptions;
      }
      if (!optionsPromise) {
        optionsPromise = (async () => {
          const merged = await mergeServerConfig(baseOptions);
          const normalized = normalizeOptions(merged);
          validateOptions(normalized);
          storageKey =
            storageKey ||
            `${SESSION_PREFIX}${hashString(
              normalized.apiBase + normalized.agentCompletionPath + normalized.agentId
            )}`;
          resolvedOptions = normalized;
          return resolvedOptions;
        })().finally(() => {
          optionsPromise = null;
        });
      }
      return optionsPromise;
    }

    async function ensureSession() {
      await ensureOptions();
      if (currentSessionId) {
        return currentSessionId;
      }
      if (ensurePromise) {
        return ensurePromise;
      }
      ensurePromise = (async () => {
        const stored = getStoredSession(storageKey);
        if (stored) {
          currentSessionId = stored;
          return stored;
        }
        currentSessionId = generateSessionId();
        saveSession(storageKey, currentSessionId);
        return currentSessionId;
      })().finally(() => {
        ensurePromise = null;
      });
      return ensurePromise;
    }

    async function sendMessage(message, overrides = {}) {
      const options = await ensureOptions();
      const prompt = (message || "").trim();
      if (!prompt) {
        throw new Error("Message is required.");
      }
      const sessionId = await ensureSession();
      const endpointPath = (options.agentCompletionPath || AGENT_COMPLETION_PATH).replace(
        "{agent_id}",
        options.agentId
      );
      const endpoint = `${options.apiBase}${endpointPath}`;
      const body = {
        model: overrides.model || options.model,
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
            Authorization: `Bearer ${options.apiKey}`
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
        return { data, sessionId };
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    }

    return {
      ensureSession,
      sendMessage
    };
  }

  async function mergeServerConfig(options) {
    if (options.apiBase && options.agentId && options.apiKey) {
      return options;
    }
    const configEndpoint = options.configEndpoint || CONFIG_ENDPOINT;
    const serverConfig = await fetchServerConfig(configEndpoint);
    return {
      ...options,
      apiBase: options.apiBase || serverConfig.apiBase || "",
      agentId: options.agentId || serverConfig.agentId || "",
      apiKey: options.apiKey || serverConfig.apiKey || ""
    };
  }

  function normalizeOptions(options) {
    return {
      ...options,
      apiBase: (options.apiBase || "").replace(/\/+$/, ""),
      agentCompletionPath: options.agentCompletionPath || AGENT_COMPLETION_PATH,
      timeoutMs: options.timeoutMs || 120000,
      configEndpoint: options.configEndpoint || CONFIG_ENDPOINT
    };
  }

  function validateOptions(options) {
    if (!options.apiBase) {
      throw new Error("RAGFlow apiBase is not configured.");
    }
    if (!options.agentId) {
      throw new Error("RAGFlow agentId is not configured.");
    }
    if (!options.apiKey) {
      throw new Error("RAGFlow apiKey is not configured.");
    }
  }

  async function fetchServerConfig(endpoint) {
    const url = endpoint || CONFIG_ENDPOINT;
    const response = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error("Unable to load chat configuration from the server.");
    }
    const data = await response.json().catch(() => ({}));
    return data || {};
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

  global.RagflowChat = {
    createService
  };
})(window);
