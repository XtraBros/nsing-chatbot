(function (global) {
  const defaultServiceOptions = {
    sessionEndpoint: "/api/chatbot/session",
    messageEndpoint: "/api/chatbot/send",
    model: "default"
  };

  const SESSION_STORAGE_PREFIX = "nsing-chatbot-session-";

  function createChatbotService(overrides = {}) {
    const options = {
      ...defaultServiceOptions,
      ...overrides
    };

    const storageKey = `${SESSION_STORAGE_PREFIX}${hashString(
      options.sessionEndpoint + options.messageEndpoint
    )}`;

    let currentSessionId = null;
    let isEnsuringSession = null;

    async function ensureSession() {
      if (currentSessionId) {
        return currentSessionId;
      }
      if (isEnsuringSession) {
        return isEnsuringSession;
      }

      isEnsuringSession = (async () => {
        const stored = getStoredSession(storageKey);
        if (stored) {
          const valid = await pingSession(stored);
          if (valid) {
            currentSessionId = stored;
            return currentSessionId;
          }
        }
        currentSessionId = await createSession();
        saveSession(storageKey, currentSessionId);
        return currentSessionId;
      })().finally(() => {
        isEnsuringSession = null;
      });

      return isEnsuringSession;
    }

    async function createSession() {
      const response = await fetch(options.sessionEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error("Unable to create assistant session");
      }
      const data = await response.json();
      return data?.session_id;
    }

    async function pingSession(sessionId) {
      if (!sessionId) {
        return false;
      }
      // We currently do not expose a ping endpoint, so assume valid for now
      return true;
    }

    async function sendMessage(prompt) {
      const sessionId = await ensureSession();
      const response = await fetch(options.messageEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: prompt,
          model: options.model
        })
      });
      if (response.status === 404) {
        clearStoredSession(storageKey);
        currentSessionId = null;
        throw new Error("Session expired, please try again.");
      }
      if (!response.ok) {
        throw new Error("Assistant request failed.");
      }
      const data = await response.json();
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

  function clearStoredSession(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Unable to clear session id", error);
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

  global.NsingChatbotService = {
    createChatbotService
  };
})(window);
