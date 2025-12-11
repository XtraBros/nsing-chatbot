(function (global) {
  const defaultServiceOptions = {
    messageEndpoint: "/api/chat",
    useMockResponses: true
  };

  function createChatbotService(overrides = {}) {
    const serviceOptions = {
      ...defaultServiceOptions,
      ...overrides
    };
    return {
      sendMessage(prompt) {
        return requestAssistantResponse(serviceOptions, prompt);
      },
      buildImageIntro() {
        return createRichContentFragment([
          {
            type: "text",
            value: "I’m the NSING Assistant, built to connect you with products and support details."
          },
          {
            type: "image",
            src: "images/choml.png",
            alt: "NSING Assistant avatar",
            caption: "Here’s the Choml icon representing my avatar."
          }
        ]);
      },
      buildSpecsTable() {
        return createRichContentFragment([
          {
            type: "text",
            value: "Here’s a placeholder spec overview for the NSING N32 series:"
          },
          {
            type: "table",
            headers: ["Model", "Core", "Flash (KB)", "SRAM (KB)", "Interfaces"],
            rows: [
              ["N32H787", "Cortex-M7", "2048", "512", "CAN FD, USB HS, Ethernet"],
              ["N32G457", "Cortex-M4", "512", "192", "I2C, SPI, UART, USB FS"],
              ["N32S032", "Cortex-M0", "64", "16", "SPI, I2C, GPIO"],
              ["N32A455", "Cortex-M4F", "256", "96", "CAN, LIN, PWM, ADC"]
            ]
          }
        ]);
      },
      buildChomlLink() {
        return createRichContentFragment([
          {
            type: "text",
            value: "You can download or view the Choml icon directly using the link below:"
          },
          {
            type: "link",
            href: "images/choml.png",
            text: "Open choml.png"
          }
        ]);
      }
    };
  }

  async function requestAssistantResponse(options, prompt) {
    const endpoint = (options.messageEndpoint || "").trim();
    const shouldCallEndpoint = endpoint && !options.useMockResponses;

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
        console.warn("Chatbot endpoint request failed.", error);
      }
    }

    return getMockAssistantReply(prompt);
  }

  function getMockAssistantReply(prompt) {
    const normalized = (prompt || "").toLowerCase();
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
    const normalized = (prompt || "").toLowerCase();
    if (normalized.includes("introduce") || normalized.includes("yourself")) {
      const fragment = createRichContentFragment([
        {
          type: "text",
          value: "I’m the NSING Assistant, here to guide you through products, specs, and support."
        },
        {
          type: "image",
          src: "images/choml.png",
          alt: "NSING Assistant avatar",
          caption: "Choml is the face you’ll see when chatting with me."
        }
      ]);
      return fragment;
    }
    if (normalized.includes("spec")) {
      return createRichContentFragment([
        {
          type: "text",
          value: "Here’s a mock spec matrix for an NSING family:"
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
    if (normalized.includes("choml") || normalized.includes("link")) {
      return createRichContentFragment([
        {
          type: "text",
          value: "You can view our chatbot icon at the link below:"
        },
        { type: "link", href: "images/choml.png", text: "View choml.png" }
      ]);
    }
    const fallbacks = [
      "Thanks for the message! I’m using a demo brain right now, but a live assistant will soon answer this automatically.",
      "Great question. While the real API is being wired up, here’s a placeholder reply letting you know we received: “{text}”.",
      "I’ve noted your question. Once the production endpoint is ready, this space will show detailed answers tailored to your prompt."
    ];
    const selected = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    return selected.replace("{text}", prompt || "");
  }

  function createTextElement(text) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    paragraph.className = "nsing-chatbot-richtext";
    return paragraph;
  }

  function createLinkElement({ href, text, target = "_blank" }) {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.textContent = text || href;
    anchor.target = target;
    anchor.rel = "noopener noreferrer";
    anchor.className = "nsing-chatbot-link";
    return anchor;
  }

  function createImageElement({ src, alt = "", caption = "" }) {
    const figure = document.createElement("figure");
    figure.className = "nsing-chatbot-figure";
    const image = document.createElement("img");
    image.src = src;
    image.alt = alt;
    figure.appendChild(image);
    if (caption) {
      const figcaption = document.createElement("figcaption");
      figcaption.textContent = caption;
      figure.appendChild(figcaption);
    }
    return figure;
  }

  function createTableElement({ headers = [], rows = [] }) {
    const table = document.createElement("table");
    table.className = "nsing-chatbot-table";
    if (headers.length) {
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      headers.forEach((header) => {
        const th = document.createElement("th");
        th.textContent = header;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
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

  function createRichContentFragment(blocks = []) {
    const fragment = document.createDocumentFragment();
    blocks.forEach((block) => {
      if (!block || typeof block !== "object") {
        return;
      }
      switch (block.type) {
        case "text":
          fragment.appendChild(createTextElement(block.value || ""));
          break;
        case "link":
          fragment.appendChild(createLinkElement(block));
          break;
        case "image":
        case "figure":
          fragment.appendChild(createImageElement(block));
          break;
        case "table":
          fragment.appendChild(createTableElement(block));
          break;
        default:
          fragment.appendChild(createTextElement(block.value || ""));
      }
    });
    return fragment;
  }

  global.NsingChatbotService = {
    createChatbotService,
    createTextElement,
    createLinkElement,
    createImageElement,
    createTableElement,
    createRichContentFragment,
    getMockReply: getMockAssistantReply
  };
})(window);
