(function (global) {
  const AGENT_COMPLETION_PATH = "/api/v1/agents_openai/{agent_id}/chat/completions";
  const SESSION_PREFIX = "ragflow-chat-session-";
  const defaultOptions = {
    apiBase: "",
    agentId: "",
    apiKey: "",
    model: "default",
    agentCompletionPath: AGENT_COMPLETION_PATH,
    timeoutMs: 120000
  };

  function createService(overrides = {}) {
    const globalConfig = global.ragflowChatConfig || {};
    const options = {
      ...defaultOptions,
      ...globalConfig,
      ...overrides
    };

    options.apiBase = (options.apiBase || "").replace(/\/+$/, "");
    if (!options.apiBase) {
      throw new Error("RAGFlow apiBase is not configured.");
    }
    if (!options.agentId) {
      throw new Error("RAGFlow agentId is not configured.");
    }
    if (!options.apiKey) {
      throw new Error("RAGFlow apiKey is not configured.");
    }

    const endpointPath = (options.agentCompletionPath || AGENT_COMPLETION_PATH).replace(
      "{agent_id}",
      options.agentId
    );
    const endpoint = `${options.apiBase}${endpointPath}`;
    const storageKey = `${SESSION_PREFIX}${hashString(endpoint)}`;
    let currentSessionId = null;
    let ensurePromise = null;

    async function ensureSession() {
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

    async function sendMessage(message, extra = {}) {
      const prompt = (message || "").trim();
      if (!prompt) {
        throw new Error("Message is required.");
      }
      const sessionId = await ensureSession();
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
