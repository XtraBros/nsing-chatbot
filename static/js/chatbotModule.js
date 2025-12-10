(function (global) {
const defaultConfig = {
  assistantName: "NSING Assistant",
  assistantSubtitle: "Answers about products, specs, and support",
  buttonLabel: "Ask NSING",
  buttonAriaLabel: "Open NSING virtual assistant",
  buttonIcon: "images/choml.png",
  welcomeTitle: "Hi there 👋",
  welcomeMessage:
    "This virtual assistant is here to answer quick questions about NSING products, applications, or sales support. Start with one of the suggestions below or type your own prompt.",
  placeholder: "Ask me anything about NSING solutions...",
  suggestions: [
    "What MCU fits an automotive gateway?",
    "Show the latest product highlights.",
    "How can I contact the sales team?"
  ],
  messageEndpoint: "/api/chat",
  useMockResponses: true,
  zIndex: 9999
};

let hasInitialized = false;

const initChatbot = (options = {}) => {
  if (hasInitialized) {
    return;
  }

  const start = () => {
    if (hasInitialized) {
      return;
    }
    hasInitialized = true;
    const config = { ...defaultConfig, ...options };
    bootstrapChatbot(config);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
};

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
    textarea.focus();
    document.addEventListener("keydown", onKeydown);
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
      textarea.value = button.dataset.nsingChatbotSuggestion;
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = textarea.value.trim();
    if (!value || isSending) {
      return;
    }
    isSending = true;
    if (sendButton) {
      sendButton.disabled = true;
    }
    appendMessage(value, "user");
    textarea.value = "";
    textarea.focus();
    try {
      const reply = await requestAssistantResponse(config, value);
      appendMessage(reply, "bot");
    } catch (error) {
      console.warn("Chatbot placeholder request failed", error);
      appendMessage(
        "Sorry, we couldn't reach the assistant right now. Please try again soon.",
        "bot"
      );
    } finally {
      isSending = false;
      if (sendButton) {
        sendButton.disabled = false;
      }
    }
  });

  function appendMessage(text, author) {
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
    <header class="nsing-chatbot-header">
      <div class="nsing-chatbot-headerDetails">
        <div class="nsing-chatbot-avatar" aria-hidden="true">
          <img src="images/choml.png" alt="" loading="lazy" decoding="async" />
        </div>
        <div>
          <p class="nsing-chatbot-title">${config.assistantName}</p>
          <p class="nsing-chatbot-subtitle">${config.assistantSubtitle}</p>
        </div>
      </div>
      <button class="nsing-chatbot-close" type="button" aria-label="Close chatbot">
        <span aria-hidden="true">&times;</span>
      </button>
    </header>
    <div class="nsing-chatbot-body">
      <div class="nsing-chatbot-intro">
        <h4>${config.welcomeTitle}</h4>
        <p>${config.welcomeMessage}</p>
      </div>
      <div class="nsing-chatbot-suggestions" data-nsing-chatbot-suggestions></div>
      <div class="nsing-chatbot-messages" aria-live="polite"></div>
    </div>
    <form class="nsing-chatbot-form">
      <label class="nsing-chatbot-visually-hidden" for="nsing-chatbot-input">
        Ask NSING
      </label>
      <textarea
        id="nsing-chatbot-input"
        class="nsing-chatbot-input"
        placeholder="${config.placeholder}"
        rows="2"
      ></textarea>
      <button type="submit" class="nsing-chatbot-send">Send</button>
    </form>
  `;

  overlay.appendChild(modal);

  const suggestionsRoot = modal.querySelector(
    "[data-nsing-chatbot-suggestions]"
  );
  config.suggestions.forEach((text) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.nsingChatbotSuggestion = text;
    button.textContent = text;
    suggestionsRoot.appendChild(button);
  });
  return overlay;
}

async function requestAssistantResponse(config, prompt) {
  const endpoint = (config.messageEndpoint || "").trim();
  const shouldCallEndpoint = endpoint && !config.useMockResponses;

  if (shouldCallEndpoint) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: prompt })
      });
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.reply === "string" && data.reply.trim()) {
          return data.reply;
        }
      }
    } catch (error) {
      console.warn("Placeholder endpoint not available yet.", error);
    }
  }

  return getMockAssistantReply(prompt);
}

function getMockAssistantReply(prompt) {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("mcu")) {
    return "Our automotive-grade MCU families cover Cortex-M0, M4, and M7 cores so you can scale performance and memory. Tell us your voltage and peripheral needs and we’ll short-list exact parts.";
  }
  if (normalized.includes("contact") || normalized.includes("sales")) {
    return "You can reach our sales team via the Contact Us page or by emailing sales@nsing.com.sg. Share your project timeline and we’ll connect you with the right regional rep.";
  }
  if (normalized.includes("sample")) {
    return "Samples are available through the Sample & Buy portal. Sign in with your company email, pick the device, and we’ll ship within 3–5 business days.";
  }
  if (normalized.includes("roadmap") || normalized.includes("upcoming")) {
    return "Our 2025 roadmap focuses on secure connectivity, BLE + MCU combos, and extended automotive temperature ranges. Stay tuned for quarterly launch notes.";
  }
  const fallbacks = [
    "Thanks for the message! I’m using a demo brain right now, but a live assistant will soon answer this automatically.",
    "Great question. While the real API is being wired up, here’s a placeholder reply letting you know we received: “{text}”.",
    "I’ve noted your question. Once the production endpoint is ready, this space will show detailed answers tailored to your prompt."
  ];
  const selected = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  return selected.replace("{text}", prompt);
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
    .nsing-chatbot-button:focus-visible {
      box-shadow: 0 0 0 4px rgba(0, 98, 255, 0.3);
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
    .nsing-chatbot-button-icon img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
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
      width: min(720px, 90vw);
      max-height: 90vh;
      background: #fff;
      border-radius: 24px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 35px 65px rgba(0, 0, 0, 0.35);
      padding: 24px;
      transform: translateY(20px);
      transition: transform 0.2s ease;
    }
    .nsing-chatbot-overlay.is-visible .nsing-chatbot-modal {
      transform: translateY(0);
    }
    .nsing-chatbot-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(13, 28, 66, 0.08);
    }
    .nsing-chatbot-headerDetails {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .nsing-chatbot-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: transparent;
      overflow: hidden;
    }
    .nsing-chatbot-avatar img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      border-radius: 50%;
    }
    .nsing-chatbot-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    .nsing-chatbot-subtitle {
      margin: 2px 0 0;
      font-size: 13px;
      color: #5e6478;
    }
    .nsing-chatbot-close {
      border: none;
      background: transparent;
      font-size: 24px;
      line-height: 1;
      color: #5e6478;
      cursor: pointer;
    }
    .nsing-chatbot-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px 0;
      overflow: hidden;
    }
    .nsing-chatbot-intro h4 {
      margin: 0 0 6px;
      font-size: 16px;
    }
    .nsing-chatbot-intro p {
      margin: 0;
      font-size: 14px;
      color: #4a536b;
    }
    .nsing-chatbot-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .nsing-chatbot-suggestions button {
      border: 1px solid rgba(13, 28, 66, 0.15);
      border-radius: 99px;
      background: #f6f7fb;
      padding: 6px 12px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease;
    }
    .nsing-chatbot-suggestions button:hover,
    .nsing-chatbot-suggestions button:focus-visible {
      background: rgba(0, 98, 255, 0.08);
      border-color: rgba(0, 98, 255, 0.45);
      outline: none;
    }
    .nsing-chatbot-messages {
      flex: 1;
      min-height: 180px;
      max-height: 260px;
      overflow-y: auto;
      padding: 8px 4px;
      border-radius: 14px;
      background: #f9f9fd;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .nsing-chatbot-message {
      display: flex;
    }
    .nsing-chatbot-message-user {
      justify-content: flex-end;
    }
    .nsing-chatbot-bubble {
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.4;
      max-width: 80%;
    }
    .nsing-chatbot-message-user .nsing-chatbot-bubble {
      background: #0062ff;
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .nsing-chatbot-message-bot .nsing-chatbot-bubble {
      background: #fff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-bottom-left-radius: 4px;
    }
    .nsing-chatbot-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .nsing-chatbot-input {
      width: 100%;
      border-radius: 14px;
      border: 1px solid rgba(0, 0, 0, 0.2);
      padding: 10px 12px;
      font-size: 14px;
      resize: none;
    }
    .nsing-chatbot-input:focus {
      outline: none;
      border-color: #0062ff;
      box-shadow: 0 0 0 2px rgba(0, 98, 255, 0.25);
    }
    .nsing-chatbot-send {
      align-self: flex-end;
      border: none;
      border-radius: 999px;
      background: #0d1c42;
      color: #fff;
      padding: 10px 18px;
      cursor: pointer;
      font-weight: 600;
    }
    .nsing-chatbot-visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }
    @media (max-width: 640px) {
      .nsing-chatbot-button {
        right: 16px;
        bottom: 16px;
        width: calc(100% - 32px);
        border-radius: 16px;
        justify-content: center;
      }
      .nsing-chatbot-overlay {
        padding: 16px 8px;
        align-items: flex-end;
      }
      .nsing-chatbot-modal {
        width: 100%;
        max-height: 90vh;
        padding: 14px;
      }
    }
  `;

  document.head.appendChild(style);
}

global.initChatbot = initChatbot;
if (!global.nsingChatbot) {
  global.nsingChatbot = {};
}
global.nsingChatbot.init = initChatbot;
})(typeof window !== "undefined" ? window : this);
