# My JS Vite Template

A lightweight front-end starter: Vite + vanilla JS (ES modules) + SCSS, no UI frameworks. Minimal dependencies — only what the page actually uses.

## Quick start

```bash
npm install
npm run dev         # local dev server
npm run build       # unminified build into dist-readable/
npm run build-min   # minified production build into dist/
npm run preview     # preview the production build
```

## UI component catalog (`/ui.html`)

```bash
npm run dev   # then open http://localhost:5173/ui.html
```

A standalone page with a tab for every UI component (button, link, checkbox, radio, switch, select, input, badge, alert, table, popup, tooltip, slider). It loads the real `main.scss`/`main.js`, so the examples always reflect the current styles. It's linked from the header menu ("UI page" in `src/partials/header.html`) and can also be opened directly by URL. It's included in the build (`vite.config.js` → `build.rollupOptions.input`) and processed by `npm run strip-comments` just like `index.html`.

## Linting and formatting

```bash
npm run prettier         # Prettier — format all files
npm run prettier:check   # Prettier — check only
npm run stylelint        # Stylelint — lint and auto-fix SCSS
npm run stylelint:check
```

Configs: `.prettierrc.json`, `.stylelintrc.json` (based on `stylelint-config-standard-scss`, property order via `stylelint-order`). Tabs, single quotes in JS, semicolons.

Prettier also loads a small local plugin, `scripts/prettier-plugin-scss-fix.mjs`, which fixes a few SCSS cases Prettier doesn't handle itself: missing `;` at the end of declarations and spaces around `/` in `grid-area`, `grid-row`, `grid-column` and `aspect-ratio`.

## Stripping comments

```bash
npm run strip-comments
```

Creates a copy of the project next to it (`<project-name>-no-comments`) and removes comments from `src/**/*.js`, `src/**/*.scss`, `index.html`, `ui.html` and `vite.config.js`. The original project is left untouched; the copy is recreated on each run.

## Project structure

```
index.html               — demo page (entry point)
ui.html                  — UI component catalog (tabs), built as dist/ui.html
scripts/                 — strip-comments script and the Prettier SCSS plugin
src/
  partials/               — HTML includes (<load>): header, footer, popups/, forms/, sliders/
  assets/img/             — images (available as @img)
  fonts/                  — font files (woff2/woff)
  main.js                 — JS entry point; modules are enabled/disabled here
  scss/
    main.scss              — SCSS entry point
    _project-mixins.scss    — functions (rem/em/toPercent, alpha) + universal mixins
                              (font, adaptiveValue, gridContainer)
    _breakpoints.scss       — breakpoints as mixins (@use '@scss/breakpoints' as breakpoint;
                              @include breakpoint.tab {...} / breakpoint.max-tab {...} for max-width)
    _settings.scss          — template settings (min width, container, $max-padding/$min-padding)
    _global.scss            — shared blocks (wrapper, container with adaptive padding)
    _reset.scss, _palette.scss, _variables.scss, _utils.scss
    _index.scss             — forwards project-mixins, imported as `@scss`
    font/                   — local @font-face and icon font
    effects/                — visual effects (ripple, tooltip, animations, watcher animations)
    components/             — standalone UI blocks (button, link, checkbox, radio, switch, inputs,
                              forms, badge, alert, table, popup, slider, titles)
    layout/                 — header/footer
    pages/                  — page-specific styles
  js/
    modules/                — project functionality
    site.js                 — project-specific code
```

## Aliases

JS and SCSS imports use aliases configured in `vite.config.js`:

- `@` → `src`
- `@js` → `src/js`
- `@scss` → `src/scss`
- `@assets` → `src/assets`
- `@img` → `src/assets/images`

```js
import { myModules } from '@js/modules/registry.js';
```

```scss
@use '@scss' as *;
@use '@scss/breakpoints' as breakpoint;
```

`@img/` also works in HTML attributes (`src`, `srcset`, `poster`, including partials) — a small plugin in `vite.config.js` rewrites it to `/src/assets/img/`.

**Ctrl+click on aliases in VS Code:** JS works out of the box via `jsconfig.json`; SCSS needs the [Some Sass](https://marketplace.visualstudio.com/items?itemName=SomewhatStationery.some-sass) extension (see `.vscode/extensions.json` and `.vscode/settings.json`).

## HTML includes (`<load>`)

Markup is split into files and assembled with `<load src="./path/to/file.html" />` via [vite-plugin-html-inject](https://github.com/donnikitos/vite-plugin-html-inject). Works the same in `npm run dev` and `npm run build`.

```html
<load src="./src/partials/header.html" />
```

The header, footer, popups, forms and sliders live in `src/partials/` (one file per popup in `popups/`).

## Features (`src/js/modules`)

- **Burger menu** — toggles the mobile menu via the `burger-open` class on `<html>` (`burger-menu.js`).
- **Nav menu** — active menu item highlighting, closes the burger on click (`nav-menu.js`); dropdowns on touch devices via `[data-dropdown]` (`dropdown.js`).
- **Ripple** — click wave effect on `[data-ripple]` (`ripple-effect.js`, styles in `effects/_ripple.scss`).
- **Touch detection** — `isMobile` and a touch class on `<html>` (`mobile-detect.js`).
- **Body lock** — scroll locking for menus and popups (`body-lock.js`).
- **Popup** — popups with focus trap, scroll lock and optional URL hash (`popup.js`).
- **Forms** — native validation with error messages (`form.js`).
- **Watcher** — `IntersectionObserver`-based visibility watcher via `data-watcher` (`watcher.js`).
- **Smooth navigation** — scroll to a block via `data-goto`, accounting for header height (`scroll/`).
- **Dynamic Adapt** — moves blocks between containers at breakpoints via `data-da` (`dynamic-adapt/`).
- **Sliders** — Swiper with a separate BEM block per slider, found by `data-slider="name"` (`slider.js`).
- **API** — a minimal `fetch` wrapper (`api/FetchWrapper.js`).

`functions.js` re-exports the small modules so `main.js` can call them as `myFunctions.initX()`.

## Enabling/disabling a module

Add or remove the import/call in `src/main.js`, and the matching `@use` in `src/scss/main.scss` if the module has styles.

## WebStorm

No extra plugins are needed — everything is built in (JavaScript, Vite, Sass, Prettier, Stylelint).

**Ctrl/Cmd+click on paths:**

- JS imports with aliases — out of the box via `jsconfig.json`.
- SCSS (`@use '@scss'`, `@use '@scss/breakpoints'`) — out of the box.
- `<load src="...">` — WebStorm doesn't know this tag, so a "File Reference" Language Injection for `<load src>` is committed in `.idea/IntelliLang.xml`. `load` is also registered as a custom HTML tag in `.idea/inspectionProfiles/Project_Default.xml` to silence the "Unknown tag" warning. If paths aren't clickable after opening the project, restart WebStorm or set it up manually (below).

**Manual `<load src>` setup:**

1. `Settings → Editor → Language Injections → + → XML Tag Injection`.
2. `Language: File Reference`, `Local name: load`.
3. `XML Attributes` tab → add `src` → `Apply`.
4. For the "Unknown tag" warning: `Settings → Editor → Inspections → HTML → Unknown tag → Custom HTML tags` → add `load`.

**Formatting (Prettier):** enabled by `.idea/prettier.xml` — uses `prettier` from `node_modules` and rules from `.prettierrc.json`, runs on save and on `Reformat Code` (Cmd+Alt+L) for `js, mjs, cjs, json, html, css, scss, md`. Indentation, encoding and line endings also come from `.editorconfig`.

If it doesn't work: `Settings → Languages & Frameworks → JavaScript → Prettier` → `Automatic Prettier configuration`, check `Run on reformat` and `Run on save`, set `Run for files` to `**/*.{js,mjs,cjs,json,html,css,scss,md}`.

**SCSS linting (Stylelint):** `Settings → Languages & Frameworks → Style Sheets → Stylelint` → `Enable`, use `stylelint` from `node_modules`, make sure `Run for files` includes `scss` (e.g. `**/*.{css,scss}`), and enable `Run stylelint --fix on save`. This setting is stored locally in the IDE and isn't committed.

**Node.js:** `Settings → Languages & Frameworks → Node.js` → any installed interpreter (required for Prettier, Stylelint and `npm run dev`).

Terminal checks work regardless of the IDE: `npm run prettier:check` and `npm run stylelint:check`.
