(function (global) {
  const defaultConfig = {
    buttonLabel: "Ask NSING",
    buttonAriaLabel: "Open NSING virtual assistant",
    buttonIcon: "images/choml.png",
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
    bootstrap(config);
  }

  function bootstrap(config) {
    injectStyles(config.zIndex);
    const overlay = buildOverlay(config);
    const toggleButton = buildToggleButton(config);
    document.body.appendChild(overlay);
    document.body.appendChild(toggleButton);

    const iframe = overlay.querySelector(".nsing-ragflow-frame");
    const closeButton = overlay.querySelector(".nsing-chatbot-close");

    let previousFocus = null;
    let previousOverflowValue = "";

    const openModal = () => {
      previousFocus = document.activeElement;
      previousOverflowValue = document.body.style.overflow;
      overlay.classList.add("is-visible");
      overlay.removeAttribute("aria-hidden");
      toggleButton.style.display = "none";
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onKeydown);
      if (iframe && !iframe.src) {
        iframe.src = config.ragflowEmbedUrl;
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
    modal.setAttribute("aria-label", "NSING Assistant");

    modal.innerHTML = `
      <button class="nsing-chatbot-close" type="button" aria-label="Close chatbot">
        <span aria-hidden="true">&times;</span>
      </button>
      <iframe
        class="nsing-ragflow-frame"
        loading="lazy"
        frameborder="0"
        allow="clipboard-write"
      ></iframe>
    `;

    overlay.appendChild(modal);
    return overlay;
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
        background: rgba(255, 255, 255, 0.18);
      }
      .nsing-chatbot-button-label {
        line-height: 1;
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
        width: min(920px, 95vw);
        height: min(850px, 95vh);
        background: #fff;
        border-radius: 24px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 35px 65px rgba(0, 0, 0, 0.35);
        padding: 24px;
        min-height: 0;
        position: relative;
      }
      .nsing-chatbot-close {
        position: absolute;
        top: 12px;
        right: 12px;
        border: none;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        cursor: pointer;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        font-size: 18px;
        line-height: 34px;
        text-align: center;
      }
      .nsing-ragflow-frame {
        flex: 1;
        width: 100%;
        border: none;
        border-radius: 18px;
        min-height: 0;
      }
      @media (max-width: 768px) {
        .nsing-chatbot-button {
          right: 16px;
          left: 16px;
          width: calc(100% - 32px);
          justify-content: center;
        }
        .nsing-chatbot-overlay {
          padding: 12px;
        }
        .nsing-chatbot-modal {
          width: 100%;
          height: calc(100% - 24px);
          border-radius: 16px;
          padding: 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  global.initChatbot = initChatbot;

  const config = global.nsingChatbotConfig || {};
  initChatbot(config);
})(window);
