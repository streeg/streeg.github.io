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

## Pixel friends

A small pixel version of me and my cats, Capitu and Sancho, live along the bottom of the window. They are ES modules in `fun/`, loaded after `main.js`; the build versions each one through an import map.

- `fun/world.js`: the engine (actors, props, tasks, physics, input, the main loop)
- `fun/me.js`, `fun/scenes.js`, `fun/cats.js`, `fun/together.js`: the dev, his scenes, the cats, and the three of them together
- `fun/toys.js`, `fun/pets.js`, `fun/villains.js`, `fun/special.js`, `fun/seasons.js`, `fun/terminal.js`, `fun/sound.js` and friends: one feature each
- `fun/home.js`, `fun/clock.js`, `fun/routine.js`, `fun/daynight.js`, `fun/critters.js`, `fun/visits.js`, `fun/lud.js`, `fun/aquarium.js`: the home corner, the day by the visitor's clock, the sky, the critters, the visits and the screensaver-like aquarium mode
- `fun/forecast.js`, `fun/outside.js`: the real weather in Brasília (Open-Meteo, no key) and how the little world reacts to it (puddles, the umbrella, a fan on hot days)
- `fun/dreams.js`, `fun/github.js`, `fun/reading.js`, `fun/fishing.js`: dream bubbles, the reaction to public GitHub pushes, the dev reading along with the visitor, and fishing in aquarium mode
- `fun/gadgets.js`, `fun/speedrun.js`: the shortcuts in the house (a wall clock that moves the day on, a calendar, a phone, a window, headphones, catnip) and the speedrun stopwatch with its timer
- `fun/art/`: the pixel art, as character grids
- `fun/i18n.js`: their copy, in both languages

## Checks

`npm ci` once, then:

- `npm run lint`: static checks on `fun/` (undefined names, missing imports, import cycles)
- `npm test`: browser test suites (`tests/page/`), run with Playwright against the site served locally (the weather and GitHub APIs are answered by the runner, so the checks never touch the network)
- `npm run check`: build, lint and test

GitHub Actions runs the same on every push and pull request, and also checks that the built pages are up to date.
