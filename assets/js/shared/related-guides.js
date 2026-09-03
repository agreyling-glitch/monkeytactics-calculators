(function () {
  "use strict";

  let sections = Array.from(document.querySelectorAll("[data-related-guides-tool]"));
  if (!sections.length) return;

  const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const indexUrl = isLocal
    ? "http://localhost:1313/menu-search.json"
    : "https://blog.monkeytactics.com/menu-search.json";

  function relationFor(post, tool) {
    const relations = Array.isArray(post.related_tools) ? post.related_tools : [];
    for (const relation of relations) {
      if (typeof relation === "string" && relation === tool) return { tool, priority: 0 };
      if (relation && relation.tool === tool) {
        return { tool, priority: Number(relation.priority) || 0 };
      }
    }
    return null;
  }

  function safeBlogUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "blog.monkeytactics.com" ? url.href : "";
    } catch (_error) {
      return "";
    }
  }

  function render(section, posts) {
    const tool = section.dataset.relatedGuidesTool;
    const limit = Math.max(1, Number(section.dataset.relatedGuidesLimit) || 2);
    const matches = posts
      .map((post) => ({ post, relation: relationFor(post, tool) }))
      .filter(({ post, relation }) => relation && post.title && safeBlogUrl(post.url))
      .sort((a, b) => b.relation.priority - a.relation.priority || a.post.title.localeCompare(b.post.title))
      .slice(0, limit);
    if (!matches.length) return;

    const grid = section.querySelector(".word-game-guide-grid, .crossword-guide-grid");
    if (!grid) return;
    const isCrossword = grid.classList.contains("crossword-guide-grid");
    const cardClass = isCrossword ? "crossword-guide-card" : "word-game-guide-card";
    const linkClass = isCrossword ? "crossword-guide-link" : "word-game-guide-link";
    const fragment = document.createDocumentFragment();

    for (const { post } of matches) {
      const article = document.createElement("article");
      article.className = cardClass;
      const label = document.createElement("span");
      label.textContent = "Featured guide";
      const heading = document.createElement("h3");
      const titleLink = document.createElement("a");
      titleLink.href = safeBlogUrl(post.url);
      titleLink.textContent = post.title;
      heading.appendChild(titleLink);
      const summary = document.createElement("p");
      summary.textContent = post.description || "Read this related guide on the MonkeyTactics Blog.";
      const readLink = document.createElement("a");
      readLink.className = linkClass;
      readLink.href = titleLink.href;
      readLink.append("Read guide ");
      const arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      readLink.appendChild(arrow);
      article.append(label, heading, summary, readLink);
      fragment.appendChild(article);
    }

    grid.replaceChildren(fragment);
  }

  try {
    if (localStorage.getItem("monkeytactics.crossword-solver.offline-cache")) {
      for (const section of sections) {
        if (section.dataset.relatedGuidesTool === "crossword-solver") section.hidden = true;
      }
      sections = sections.filter((section) => section.dataset.relatedGuidesTool !== "crossword-solver");
    }
  } catch (_error) {
    // Storage can be unavailable without preventing the fallback guide cards.
  }

  if (!sections.length) return;

  fetch(indexUrl, { mode: "cors", cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Related guide index returned ${response.status}`);
      return response.json();
    })
    .then((posts) => {
      if (!Array.isArray(posts)) return;
      for (const section of sections) render(section, posts);
    })
    .catch(() => {
      // Keep the crawlable, server-rendered fallback cards when the blog is unavailable.
    });
})();
