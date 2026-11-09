// Pure HTML builders shared by the browser (main.js, on language switch) and the
// build script (build.mjs, which bakes the same markup into index.html and pt/index.html).
// They only read content.js; nothing here touches the DOM.
(function (root) {
  "use strict";

  const ICONS = {
    bank: '<path d="M3 9.5 12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
    users: '<path d="M9 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM3 19.5c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6M16.5 11.5a2.6 2.6 0 1 0 0-5.2M17 14.2c2.4.3 4 2.1 4 4.8"/>',
    plug: '<path d="M9 3v5M15 3v5M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0ZM12 17v4"/>',
    cycle: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v4.5H15"/>',
    search: '<path d="M10.8 17.6a6.8 6.8 0 1 0 0-13.6 6.8 6.8 0 0 0 0 13.6ZM15.8 15.8 21 21"/>',
    chart: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6M3 21h18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5 19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3Z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    out: '<path d="M7 17 17 7M9 7h8v8"/>',
    game: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const rev = (revealed) => (revealed ? " in" : "");

  // The visible number counts up in the browser; screen readers and crawlers get the real value.
  function impact(c, { revealed = false, counting = false } = {}) {
    return c.impact.cards.map((k, i) => `
      <article class="impact-card spot reveal${rev(revealed)}" style="--d:${(i % 3) * 0.08}s" id="impact-${k.id}" data-tilt>
        <div class="impact-icon">${svg(k.icon)}</div>
        ${k.num != null
          ? `<p class="impact-big"><span aria-hidden="true">${k.prefix ? `<span class="num">${k.prefix}</span>` : ""}<span class="num" data-count="${k.num}">${counting ? 0 : k.num}</span><span class="num">${k.suffix}</span></span><span class="sr-only">${k.prefix || ""}${k.num}${k.suffix}</span></p><p class="impact-label">${k.label}</p>`
          : `<p class="impact-big text">${k.text}</p>`}
        <p class="impact-body">${k.body}</p>
      </article>`).join("");
  }

  function logoTile(j) {
    if (!j.logo) return `<div class="job-mono" aria-hidden="true">${j.mono}</div>`;
    return `<div class="job-mono logo${j.logoFull ? " full" : ""}${j.logoOnDark ? " on-dark" : ""}" aria-hidden="true"><img src="/assets/logos/${j.logo}" alt="" width="58" height="58"></div>`;
  }

  function jobs(c, { revealed = false, open = new Set() } = {}) {
    const ex = c.experience, edu = ex.education;
    return ex.jobs.map((j, i) => {
      const isOpen = open.has(i);
      return `
      <article class="job spot reveal${rev(revealed)}${isOpen ? " open" : ""}" style="--d:${i * 0.06}s" data-i="${i}">
        <div class="job-head">
          ${logoTile(j)}
          <div>
            <h3 class="job-title">${j.company}${j.current ? `<span class="badge">${ex.current}</span>` : ""}</h3>
            <p class="job-meta"><b>${j.role}</b> · ${j.dates}</p>
            <p class="job-headline">${j.headline}</p>
            <ul class="tags">${j.tags.map((x) => `<li>${x}</li>`).join("")}</ul>
            <button class="job-toggle" type="button" aria-expanded="${isOpen}" aria-controls="job-${i}"><span>${isOpen ? ex.less : ex.more}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
            <div class="job-details" id="job-${i}"><div><ul>${j.bullets.map((b) => `<li>${b}</li>`).join("")}</ul></div></div>
          </div>
        </div>
      </article>`; }).join("") + `
      <article class="job edu spot reveal${rev(revealed)}">
        <div class="job-mono logo" aria-hidden="true"><img src="/assets/logos/${edu.logo}" alt="" width="58" height="58"></div>
        <div><p class="edu-label">${edu.label}</p><h3 class="edu-school">${edu.school}</h3><p class="edu-degree">${edu.degree}</p></div>
      </article>`;
  }

  function filters(c, current = "all") {
    const f = c.stack.filters;
    return Object.keys(f).map((k) => `<button class="filter" type="button" data-f="${k}" aria-pressed="${k === current}">${f[k]}</button>`).join("");
  }

  function stack(items, { revealed = false } = {}) {
    return items.map((s, i) => `
      <li class="tech reveal${rev(revealed)}" style="--d:${(i % 6) * 0.04}s" data-cat="${s.cat}">
        <img class="ic-dark" src="/assets/icons/${s.id}-dark.svg" alt="" width="48" height="48" loading="lazy">
        <img class="ic-light" src="/assets/icons/${s.id}-light.svg" alt="" width="48" height="48" loading="lazy">
        <span>${s.name}</span>
      </li>`).join("");
  }

  const thesisTags = (c) => c.security.thesis.tags.map((x) => `<li>${x}</li>`).join("");

  function academic(c, links, { revealed = false } = {}) {
    return c.projects.academic.items.map((a, i) => `
      <li class="reveal${rev(revealed)}" style="--d:${i * 0.06}s">
        <a class="acad spot" href="${links[a.link]}" target="_blank" rel="noopener">
          <span class="acad-meta">${a.meta}</span>
          <span class="acad-name">${a.name}</span>
          <span class="acad-note">${a.note}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>
        </a>
      </li>`).join("");
  }

  const typedSentence = (c) => `${c.hero.lead} ${c.hero.words.map((w) => w.replace(/\.$/, "")).join(", ")}.`;

  root.RENDER = { ICONS, svg, esc, impact, jobs, filters, stack, thesisTags, academic, typedSentence };
})(typeof window !== "undefined" ? window : globalThis);
