(function (global) {
  const defaultServiceOptions = {
    model: "default"
  };

  function createChatbotService(overrides = {}) {
    const globalConfig = global.ragflowChatConfig || {};
    const options = {
      ...defaultServiceOptions,
      ...globalConfig,
      ...overrides
    };

    if (!global.RagflowChat || typeof global.RagflowChat.createService !== "function") {
      console.warn("Ragflow chat module is not available on the page.");
      return null;
    }

    let ragflowClient = null;
    try {
      ragflowClient = global.RagflowChat.createService(options);
    } catch (error) {
      console.warn("Unable to initialize Ragflow chat client", error);
      return null;
    }

    async function ensureSession() {
      if (!ragflowClient) {
        throw new Error("Chat service is not ready.");
      }
      return ragflowClient.ensureSession();
    }

    async function sendMessage(prompt) {
      if (!ragflowClient) {
        throw new Error("Chat service is not ready.");
      }
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

  global.NsingChatbotService = {
    createChatbotService
  };
})(window);
