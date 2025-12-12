(function (global) {
  const defaultServiceOptions = {
    sessionEndpoint: "/api/chatbot/session",
    messageEndpoint: "/api/chatbot/send",
    systemPrompt:
      "You are the NSING Assistant. Respond in Markdown with concise paragraphs, bullet lists, tables when helpful, and cite reference names when available.",
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
          system_prompt: options.systemPrompt,
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
    const references = data?.references || [];
    return {
      content,
      references: Array.isArray(references) ? references : []
    };
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
