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
      "Can you introduce yourself?",
      "Show me NSING N32 specs.",
      "Where can I view the Choml icon?"
    ],
    messageEndpoint: "/api/chat",
    useMockResponses: true,
    zIndex: 9999
  };

  let hasInitialized = false;

  function initChatbot(options = {}) {
    if (hasInitialized) {
      return;
    }
    hasInitialized = true;

    const config = { ...defaultConfig, ...options };
    const serviceFactory = global.NsingChatbotService;
    if (!serviceFactory) {
      console.warn("NsingChatbotService is not available. Using local mock responses.");
    }

    const service = createMockService(serviceFactory);
    bootstrapChatbot(config, service);
  }

  function bootstrapChatbot(config, service) {
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
        const suggestion = button.dataset.nsingChatbotSuggestion || "";
        if (!suggestion) {
          return;
        }
        textarea.value = suggestion;
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
        }
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
      appendMessage(overlay, value, "user");
      textarea.value = "";
      textarea.focus();
      try {
        const reply = await service.sendMessage(value);
        appendMessage(overlay, reply, "bot");
      } catch (error) {
        console.warn("Chatbot service request failed", error);
        appendMessage(
          overlay,
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
            <img src="${config.buttonIcon}" alt="" loading="lazy" decoding="async" />
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

  function appendMessage(overlay, content, author) {
    const list = overlay.querySelector(".nsing-chatbot-messages");
    const row = document.createElement("div");
    row.className = `nsing-chatbot-message nsing-chatbot-message-${author}`;

    const bubble = document.createElement("div");
    bubble.className = "nsing-chatbot-bubble";
    if (typeof content === "string") {
      bubble.textContent = content;
    } else if (content instanceof Node) {
      bubble.appendChild(content.cloneNode(true));
    } else if (Array.isArray(content)) {
      content.forEach((item) => {
        if (item instanceof Node) {
          bubble.appendChild(item.cloneNode(true));
        } else if (typeof item === "string") {
          const block = document.createElement("p");
          block.textContent = item;
          bubble.appendChild(block);
        }
      });
    } else {
      bubble.textContent = "";
    }
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
      }
      .nsing-chatbot-richtext {
        margin: 0 0 8px;
        font-size: 14px;
        color: #222;
      }
      .nsing-chatbot-link {
        color: #0062ff;
        font-weight: 600;
        text-decoration: none;
      }
      .nsing-chatbot-link:hover {
        text-decoration: underline;
      }
      .nsing-chatbot-figure {
        margin: 10px 0;
        text-align: center;
      }
      .nsing-chatbot-figure img {
        max-width: 100%;
        border-radius: 12px;
      }
      .nsing-chatbot-figure figcaption {
        margin-top: 6px;
        font-size: 13px;
        color: #5e6478;
      }
      .nsing-chatbot-table {
        width: 100%;
        border-collapse: collapse;
        margin: 8px 0;
        font-size: 13px;
      }
      .nsing-chatbot-table th,
      .nsing-chatbot-table td {
        border: 1px solid rgba(0, 0, 0, 0.1);
        padding: 6px 8px;
        text-align: left;
      }
      .nsing-chatbot-table th {
        background: rgba(0, 0, 0, 0.04);
        font-weight: 600;
      }
      .nsing-chatbot-form {
        display: flex;
        gap: 10px;
        padding-top: 12px;
      }
      .nsing-chatbot-input {
        flex: 1;
        border-radius: 14px;
        border: 1px solid rgba(13, 28, 66, 0.15);
        padding: 10px 14px;
        min-height: 46px;
        resize: none;
        font-size: 14px;
        font-family: inherit;
        color: #000000;
      }
      .nsing-chatbot-input:focus {
        outline: none;
        border-color: rgba(0, 98, 255, 0.45);
        box-shadow: 0 0 0 2px rgba(0, 98, 255, 0.15);
      }
      .nsing-chatbot-send {
        border: none;
        border-radius: 12px;
        background: #102044;
        color: #fff;
        font-weight: 600;
        padding: 0 22px;
        cursor: pointer;
        transition: opacity 0.2s ease;
      }
      .nsing-chatbot-send[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
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
      @media (max-width: 768px) {
        .nsing-chatbot-button {
          right: 16px;
          left: 16px;
          width: calc(100% - 32px);
          justify-content: center;
        }
        .nsing-chatbot-button-label {
          font-size: 14px;
        }
        .nsing-chatbot-overlay {
          padding: 12px;
        }
        .nsing-chatbot-modal {
          width: 100%;
          max-height: 100%;
          border-radius: 16px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  global.initChatbot = initChatbot;

  function autoBootstrap() {
    const config = global.nsingChatbotConfig || {};
    initChatbot(config);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoBootstrap, { once: true });
  } else {
    autoBootstrap();
  }

  function createMockService(serviceFactory) {
    return {
      sendMessage(prompt) {
        return Promise.resolve(resolveMockReply(prompt, serviceFactory));
      }
    };
  }

  function resolveMockReply(prompt, serviceFactory) {
    if (serviceFactory && typeof serviceFactory.getMockReply === "function") {
      return serviceFactory.getMockReply(prompt);
    }
    return buildLocalMockReply(prompt);
  }

  function buildLocalMockReply(prompt) {
    const normalized = (prompt || "").toLowerCase();
    if (normalized.includes("introduce")) {
      return buildLocalFragment([
        {
          type: "text",
          value: "I’m the NSING Assistant, here to share updates, specs, and support guidance."
        },
        {
          type: "image",
          src: "images/choml.png",
          alt: "NSING chatbot avatar",
          caption: "Choml is the visual identity for this assistant."
        }
      ]);
    }
    if (normalized.includes("spec")) {
      return buildLocalFragment([
        {
          type: "text",
          value: "Here’s a placeholder NSING N32 spec table:"
        },
        {
          type: "table",
          headers: ["Product", "Core", "Flash", "SRAM", "Peripherals"],
          rows: [
            ["N32H787", "Cortex-M7", "2 MB", "512 KB", "CAN FD, USB HS, Ethernet"],
            ["N32G457", "Cortex-M4", "512 KB", "192 KB", "I2C, SPI, UART, USB"],
            ["N32S032", "Cortex-M0", "64 KB", "16 KB", "SPI, I2C, GPIO"],
            ["N32A455", "Cortex-M4F", "256 KB", "96 KB", "CAN, LIN, PWM, ADC"]
          ]
        }
      ]);
    }
    if (normalized.includes("choml") || normalized.includes("icon") || normalized.includes("link")) {
      return buildLocalFragment([
        {
          type: "text",
          value: "Open the link below to view the Choml icon used in our chatbot:"
        },
        { type: "link", href: "images/choml.png", text: "View choml.png" }
      ]);
    }
    return buildLocalFragment([
      {
        type: "text",
        value:
          "Thanks for the question! This demo assistant currently serves hardcoded replies for testing."
      }
    ]);
  }

  function buildLocalFragment(blocks = []) {
    const fragment = document.createDocumentFragment();
    blocks.forEach((block) => {
      if (!block || typeof block !== "object") {
        return;
      }
      switch (block.type) {
        case "text":
          fragment.appendChild(localTextBlock(block.value));
          break;
        case "image":
          fragment.appendChild(localImageBlock(block));
          break;
        case "table":
          fragment.appendChild(localTableBlock(block));
          break;
        case "link":
          fragment.appendChild(localLinkBlock(block));
          break;
        default:
          fragment.appendChild(localTextBlock(block.value));
      }
    });
    return fragment;
  }

  function localTextBlock(value = "") {
    const p = document.createElement("p");
    p.className = "nsing-chatbot-richtext";
    p.textContent = value;
    return p;
  }

  function localLinkBlock({ href = "#", text = href }) {
    const a = document.createElement("a");
    a.className = "nsing-chatbot-link";
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = text;
    return a;
  }

  function localImageBlock({ src, alt = "", caption = "" }) {
    const figure = document.createElement("figure");
    figure.className = "nsing-chatbot-figure";
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    figure.appendChild(img);
    if (caption) {
      const figcaption = document.createElement("figcaption");
      figcaption.textContent = caption;
      figure.appendChild(figcaption);
    }
    return figure;
  }

  function localTableBlock({ headers = [], rows = [] }) {
    const table = document.createElement("table");
    table.className = "nsing-chatbot-table";
    if (headers.length) {
      const thead = document.createElement("thead");
      const tr = document.createElement("tr");
      headers.forEach((title) => {
        const th = document.createElement("th");
        th.textContent = title;
        tr.appendChild(th);
      });
      thead.appendChild(tr);
      table.appendChild(thead);
    }
    if (rows.length) {
      const tbody = document.createElement("tbody");
      rows.forEach((row) => {
        const tr = document.createElement("tr");
        row.forEach((cell) => {
          const td = document.createElement("td");
          td.textContent = cell;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
    }
    return table;
  }
})(window);
