(() => {
  const toggles = document.querySelectorAll("[data-toggle-password]");
  if (!toggles.length) {
    return;
  }

  const inputs = document.querySelectorAll("[data-password]");
  toggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      const type = toggle.checked ? "text" : "password";
      inputs.forEach((input) => {
        input.type = type;
      });
    });
  });
})();
