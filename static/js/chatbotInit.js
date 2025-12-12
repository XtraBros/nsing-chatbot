(function (global) {
  const defaultConfig = {
    assistantName: "NSING Assistant",
    assistantSubtitle: "Answers about products, specs, and support",
    buttonLabel: "Ask NSING",
    buttonAriaLabel: "Open NSING virtual assistant",
    buttonIcon: "images/choml.png",
    welcomeTitle: "Hi there 👋",
    welcomeMessage:
      "This virtual assistant is here to answer quick questions about NSING products, applications, or sales support. Use the suggestions or type your own prompt. A live RAGFlow session on the right shows full answers.",
    placeholder: "Ask me anything about NSING solutions...",
    suggestions: [
      "Can you introduce yourself?",
      "Show me NSING N32 specs.",
    ],
    ragflowEmbedUrl:
      "http://xtraragflow.ddns.net/next-chats/share?shared_id=75067fe0d5d411f081be6ac959cbbf0e&from=chat&auth=E1OTJjNWE2ZDYxOTExZjBhOGRjNmFjOT&visible_avatar=1",
    zIndex: 9999
  };

  let hasInitialized = false;

  function initChatbot(options = {}) {
    if (hasInitialized) {
      return;
    }
    hasInitialized = true;
    const config = { ...defaultConfig, ...options };
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
    const backendFrame = overlay.querySelector(".nsing-chatbot-backendFrame");
    const backendOrigin = getOrigin(config.ragflowEmbedUrl);
    let backendWindow = null;
    let fallbackTimer = null;

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
      if (backendFrame && !backendFrame.src) {
        backendFrame.src = config.ragflowEmbedUrl;
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

    if (backendFrame) {
      backendFrame.addEventListener("load", () => {
        backendWindow = backendFrame.contentWindow;
      });
    }

    const handleBackendMessage = (event) => {
      if (!backendWindow) {
        return;
      }
      if (event.source !== backendWindow) {
        return;
      }
      if (backendOrigin && backendOrigin !== "*" && event.origin !== backendOrigin) {
        return;
      }
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      const data = event.data;
      let responseText = "";
      if (typeof data === "string") {
        responseText = data;
      } else if (data && typeof data === "object") {
        responseText = data.text || data.message || "";
      }
      if (responseText) {
        appendMessage(overlay, responseText, "bot");
      }
      isSending = false;
      if (sendButton) {
        sendButton.disabled = false;
      }
    };
    window.addEventListener("message", handleBackendMessage);

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
      forwardToBackend(value);
    });

    function forwardToBackend(message) {
      if (backendWindow) {
        backendWindow.postMessage(
          {
            type: "nsing-chatbot-user-message",
            text: message
          },
          backendOrigin || "*"
        );
      }
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      fallbackTimer = setTimeout(() => {
        appendMessage(
          overlay,
          "The assistant is thinking... please check back in a moment.",
          "bot"
        );
        isSending = false;
        if (sendButton) {
          sendButton.disabled = false;
        }
      }, 4000);
    }
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
              (text) => `<button type="button" data-nsing-chatbot-suggestion="${text}">${text}</button>`
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
      <iframe
        class="nsing-chatbot-backendFrame"
        loading="lazy"
        frameborder="0"
        allow="clipboard-write"
        aria-hidden="true"
      ></iframe>
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
  }

  function injectStyles(zIndex) {
    if (document.getElementById("nsing-chatbot-styles")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "nsing-chatbot-styles";
    style.textContent = `
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
        background: rgba(255,255,255,0.18);
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
        width: min(1100px, 96vw);
        max-height: 95vh;
        height: min(860px, 95vh);
        background: #fff;
        border-radius: 24px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 35px 65px rgba(0,0,0,0.35);
        padding: 24px;
        position: relative;
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
        display: flex;
        flex-direction: column;
        gap: 16px;
        flex: 1;
        min-height: 0;
      }
      .nsing-chatbot-column {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-height: 0;
        flex: 1;
      }
      .nsing-chatbot-intro h4 {
        margin: 0;
        font-size: 18px;
      }
      .nsing-chatbot-intro p {
        margin: 4px 0 0;
        font-size: 14px;
        color: #555;
      }
      .nsing-chatbot-intro .intro-header {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .nsing-chatbot-intro .intro-header img {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
      }
      .nsing-chatbot-suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .nsing-chatbot-suggestions button {
        border: 1px solid rgba(13, 28, 66, 0.15);
        background: #f6f7fb;
        border-radius: 20px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 13px;
      }
      .nsing-chatbot-messages {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        background: #f9f9fd;
        border-radius: 16px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .nsing-chatbot-message {
        display: flex;
      }
      .nsing-chatbot-message-user {
        justify-content: flex-end;
      }
      .nsing-chatbot-bubble {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 14px;
        font-size: 14px;
        line-height: 1.4;
      }
      .nsing-chatbot-message-user .nsing-chatbot-bubble {
        background: #0062ff;
        color: #fff;
        border-bottom-right-radius: 4px;
      }
      .nsing-chatbot-message-bot .nsing-chatbot-bubble {
        background: #fff;
        border: 1px solid rgba(0,0,0,0.08);
      }
      .nsing-chatbot-form {
        display: flex;
        gap: 12px;
        margin-top: auto;
      }
      .nsing-chatbot-input {
        flex: 1;
        border-radius: 14px;
        border: 1px solid rgba(13,28,66,0.15);
        padding: 12px 16px;
        resize: none;
        min-height: 60px;
        font-size: 15px;
        font-family: inherit;
        color: #000;
      }
      .nsing-chatbot-send {
        border: none;
        border-radius: 14px;
        padding: 0 28px;
        background: #102044;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
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
      .nsing-chatbot-backendFrame {
        display: none;
      }
    `;
    document.head.appendChild(style);
  }

  global.initChatbot = initChatbot;

  const config = global.nsingChatbotConfig || {};
  initChatbot(config);

  function getOrigin(url) {
    if (!url) {
      return "*";
    }
    try {
      return new URL(url).origin;
    } catch (error) {
      return "*";
    }
  }
})(window);
