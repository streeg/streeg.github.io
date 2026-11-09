# streeg.github.io

Source of [streeg.github.io](https://streeg.github.io), my personal site.

Built with HTML, CSS and vanilla JavaScript, with no framework. It is bilingual (English at `/`, Portuguese at `/pt/`), has light and dark themes, and includes a command palette (Ctrl/⌘+K) and a playable version of the [Riposte](https://github.com/streeg/Riposte) timing mechanic.

The content is baked into the HTML, so the page reads fine without JavaScript and crawlers see the real text. JavaScript adds the interactive layer and switches the language in place.

- `src/index.html`: page template (edit this one)
- `content.js`: all copy, in both languages
- `render.js`: HTML builders shared by the build and the browser
- `build.mjs`: generates `index.html`, `pt/index.html`, `sitemap.xml` and `robots.txt` (`node build.mjs`, no dependencies)
- `main.js`: behaviour (language switch, theme, palette, orbit, timeline, mini-game)
- `styles.css`: design tokens and layout
