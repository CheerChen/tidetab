(() => {
  const disclosure = document.querySelector(".privacy");
  const trigger = disclosure.querySelector("summary");

  document.addEventListener("click", (event) => {
    if (disclosure.open && !disclosure.contains(event.target)) disclosure.open = false;
  }, { capture: true });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !disclosure.open) return;
    disclosure.open = false;
    if (disclosure.contains(document.activeElement)) trigger.focus();
    event.preventDefault();
    event.stopPropagation();
  }, { capture: true });
})();
