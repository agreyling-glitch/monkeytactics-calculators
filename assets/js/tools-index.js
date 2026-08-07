(function () {
  "use strict";

  const search = document.getElementById("toolSearch");
  const tools = Array.from(document.querySelectorAll(".directory-tool"));
  const groups = Array.from(document.querySelectorAll("[data-tool-group]"));
  const subgroups = Array.from(document.querySelectorAll("[data-tool-subgroup]"));
  const visibleCount = document.getElementById("visibleCount");
  const noResults = document.getElementById("noResults");
  let activeIndex = -1;

  if (!search || !visibleCount || !noResults) return;

  function visibleTools() {
    return tools.filter((tool) => !tool.hidden);
  }

  function clearActive() {
    tools.forEach((tool) => tool.classList.remove("is-keyboard-active"));
    activeIndex = -1;
  }

  function applySearch() {
    const query = search.value.trim().toLocaleLowerCase();

    tools.forEach((tool) => {
      const searchableText = `${tool.dataset.search || ""} ${tool.textContent}`.toLocaleLowerCase();
      tool.hidden = Boolean(query) && !searchableText.includes(query);
    });

    subgroups.forEach((subgroup) => {
      subgroup.hidden = !subgroup.querySelector(".directory-tool:not([hidden])");
    });

    groups.forEach((group) => {
      group.hidden = !group.querySelector(".directory-tool:not([hidden])");
    });

    const count = visibleTools().length;
    visibleCount.textContent = String(count);
    noResults.hidden = count !== 0;
    clearActive();
  }

  function moveActive(direction) {
    const visible = visibleTools();
    if (!visible.length) return;

    tools.forEach((tool) => tool.classList.remove("is-keyboard-active"));
    activeIndex = (activeIndex + direction + visible.length) % visible.length;
    const active = visible[activeIndex];
    active.classList.add("is-keyboard-active");
    active.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  search.addEventListener("input", applySearch);
  search.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      visibleTools()[activeIndex]?.click();
    } else if (event.key === "Escape") {
      search.value = "";
      applySearch();
      search.blur();
    }
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
    if (event.key === "/" && !isTyping) {
      event.preventDefault();
      search.focus();
    }
  });
})();
