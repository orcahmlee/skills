---
name: live-deck
description: Build a live deck, HTML slides presented from a browser with keyboard control, a speaker notes window and one offline file. Use when the user will present live, or asks for an HTML deck. For a PDF or PPTX deck, use kami.
---

# Live deck

The engine in `assets/template/` already holds the fixes from a real deck. Copy it, fill `content.json`, and let `verify` decide when the deck is done.

## Steps

1. **Look at the target folder**, which is the folder holding the user's material, or else the current directory. If a deck project for this material exists, extend it, and back up what you change when it sits outside git. Otherwise pick a free project folder name and a free `file` name, because `npm run build` overwrites `../<file>`.
   Done when you can name the project folder and the output path.
2. **Copy the template.** Copy `assets/template/`, including `.gitignore`, to the project folder. Run `npm ci` there.
   Done when `npm ci` exits 0.
3. **Write `content.json`**, following its sample and the rules under Content. Put images in `images/` and pages in `embeds/`. The build inlines every file in both folders, so remove `images/sample.svg` and `embeds/sample.html`.
   Done when every slide has a title and notes, and every string the user supplied appears verbatim.
4. **Build and verify.** Run `npm run build`, then `npm run verify`. If a `fits` check fails, cut or split the slide, and keep the type sizes.
   Done when `verify` exits 0.
5. **Look at the screenshots** in `dist/verify-shots/`: every `slide-*.png`, `overview`, `panel`, `notes` and `fullscreen`, plus `overview-embed` and `fullscreen-embed` when the deck has an embedded page. They catch what the checks cannot, such as a cropped figure or an unreadable image.
   Done when you have opened each one and fixed each defect, or reported it.
6. **Report** the output path, the `verify` result and these two limits: `verify` runs headless, and nobody has yet run this deck on the real displays. Give the user the rehearsal order below.

## Content

- One idea per slide, and speaker notes on every slide.
- Text the user supplies stays verbatim.
- Notes come from the user's material. Ask the user for a fact the material lacks.
- Layouts: `cover` holds a title. `content` holds a title and up to 4 one-line `items`. `figure` holds a title, an `image` and an optional `caption`. `embed` holds a title and a `page`, and the page fills the slide, so the audience sees no title.
- `**word**` paints the one word the audience should remember in the emphasis colour.
- Ask the user before adding a chart. The file carries all of its data, so whoever receives the deck receives the numbers.

## Themes

`theme` in `content.json` picks the palette in `src/styles.css`. Use `dark` unless the user asks for light.

- `dark`: the user chose `#1E1E1E`, `#5283B0`, `#5C94CA` and `#E96C65`, so these four stay as they are. `#5283B0` reaches only 4.15:1 on `#1E1E1E`, so it serves non-text marks and large text.
- `light`: Kami's palette. For a design decision beyond the tokens, read `CHEATSHEET.md` in the `kami` skill.
- Both themes use Noto Serif TC, which draws Taiwan-standard glyphs, and it replaces Kami's TsangerJinKai02.

## Embedded pages

An `embed` slide runs an existing HTML page in an iframe with no sandbox, because the deck must hear the page's key presses. Embed only pages the user trusts. `verify` fails a page that loads outside files or needs scrolling; inline the outside files, or show the user the failure.

When a deck uses one, tell the user:

- Leaving the slide reloads the page, so its state resets on return.
- The page keeps its own colours, whatever the deck's theme.
- Thumbnails and the notes window show a card in place of the page, so the presenter sees its state only on the deck.
- While a select or an input in the page has focus, it keeps the deck's keys. Clicking elsewhere in the page returns them.

## Rehearsal order

The browser accepts full screen for the deck only from a key press in the deck window.

1. In the deck window, press `N`.
2. Move the notes window to the laptop screen.
3. Select the deck window, and press `F`.
4. Select the notes window. Its arrow keys now change the slides.

## Sharing the file

`verify` tests a lone copy of the file in another folder, so a pass means the file can travel alone. When the user will share it, tell them:

- The recipient downloads the file and opens it in a browser. A preview pane that skips JavaScript shows a blank page.
- The speaker notes travel with the file, and the recipient can read them with `N`.

## Extending the engine

- Build a feature only when the user asks. Not built yet: drag-to-reorder and hidden slides in the panel, step-by-step builds, click-to-zoom figures, charts and a PDF button. https://www.gritai.studio/blog/html-presentations describes each one.
- Add a check to `scripts/verify.mjs` with each feature, and state it as what the audience or the presenter sees. A key press that fires proves little: the first full-screen check passed while the toolbar stayed on the projected screen.
- Keep the output a local file, and publish it only when the user asks. The output is about 4.4 MB plus images and embedded pages, because every Noto Serif TC subset is inlined, so warn the user if a deck grows too large to email.
