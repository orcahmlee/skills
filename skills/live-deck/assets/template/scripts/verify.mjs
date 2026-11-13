// Copies the exported deck alone to another folder, and drives that copy in the installed Chrome.
// Every check therefore also proves that the file needs nothing beside it.
// The checks state what the audience and the presenter see.
// Run `npm run verify`, or test another file with `node scripts/verify.mjs path/to/deck.html`.
// Expected text, slide count and theme come from content.json.
// The process exits with 1 if a check fails. Screenshots go to dist/verify-shots.
// The checks run headless, so they do not prove behaviour in a headed window or on a second display.
import { access, copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const SURFACE = { dark: "#1E1E1E", light: "#f5f4ed" };
const LAYOUTS = ["cover", "content", "figure", "embed"];
const VIEWPORTS = [[1920, 1080], [1280, 720], [1024, 768], [768, 1024], [844, 390], [390, 844], [375, 812], [320, 568]];
// Chrome's user activation lasts about 5 seconds, so a full-screen test must wait longer to prove anything.
const ACTIVATION_EXPIRY_MS = 7000;

const fromProject = path => new URL(`../${path}`, import.meta.url);
const plain = text => text.replaceAll("**", "");

/** Lists what a page loads from outside itself. A deck must play offline from one file. */
function findOutsideReferences(html) {
  const patterns = [
    /<(?:script|img|image|link|iframe|source|video|audio|embed|object)\b[^>]*?\s(?:src|href|data)\s*=\s*["']([^"']+)["']/gi,
    /url\(\s*["']?([^"')]+)/gi,
    /@import\s+["']([^"']+)/gi,
  ];
  const references = patterns.flatMap(pattern => [...html.matchAll(pattern)].map(match => match[1]));
  return [...new Set(references.filter(reference => !/^(data:|blob:|#)/i.test(reference)).map(reference => reference.slice(0, 80)))];
}

async function findContentProblems(deck) {
  const problems = [];
  const present = value => typeof value === "string" && value.trim() !== "";
  if (!present(deck.title)) problems.push("title is missing");
  if (!present(deck.lang)) problems.push("lang is missing");
  if (!(deck.theme in SURFACE)) problems.push(`theme must be one of ${Object.keys(SURFACE).join(", ")}`);
  if (!present(deck.file) || basename(deck.file) !== deck.file || !deck.file.endsWith(".html")) problems.push("file must be a plain file name ending in .html");
  if (!Array.isArray(deck.slides) || deck.slides.length < 2) {
    problems.push("slides must hold at least 2 slides");
    return problems;
  }
  for (const [index, slide] of deck.slides.entries()) {
    const at = `slide ${index + 1}`;
    if (!LAYOUTS.includes(slide.layout)) problems.push(`${at}: layout must be one of ${LAYOUTS.join(", ")}`);
    if (!present(slide.title)) problems.push(`${at}: title is missing`);
    if (!Array.isArray(slide.notes) || !slide.notes.length || !slide.notes.every(present)) problems.push(`${at}: notes must hold at least one line`);
    if (slide.layout === "content" && (!Array.isArray(slide.items) || !slide.items.length || !slide.items.every(present))) problems.push(`${at}: items must hold at least one line`);
    if (slide.layout === "figure") {
      if (!present(slide.image)) problems.push(`${at}: image is missing`);
      else await access(fromProject(`images/${slide.image}`)).catch(() => problems.push(`${at}: images/${slide.image} does not exist`));
    }
    if (slide.layout === "embed") {
      const html = present(slide.page) ? await readFile(fromProject(`embeds/${slide.page}`), "utf8").catch(() => null) : null;
      if (html === null) problems.push(`${at}: page must name a file in embeds/`);
      else for (const reference of findOutsideReferences(html)) problems.push(`${at}: embeds/${slide.page} loads ${reference}, but an embedded page must be self-contained`);
    }
  }
  return problems;
}

function luminance(hex) {
  const channel = start => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(first, second) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/** Runs in the page. Lists elements that leave the safe area of the slide or cover the slide number. */
function findFitProblems(canvas) {
  const frame = canvas.getBoundingClientRect();
  const safeMargin = 40 * (frame.width / 1600);
  const footer = canvas.querySelector(".slide-footer").getBoundingClientRect();
  const boxOf = element => {
    if (element.tagName === "IMG") return element.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect();
  };
  const problems = [];
  for (const element of canvas.querySelectorAll("h1, h2, li, img, figcaption")) {
    const box = boxOf(element);
    const leaves = box.left < frame.left + safeMargin || box.right > frame.right - safeMargin
      || box.top < frame.top + safeMargin || box.bottom > frame.bottom - safeMargin;
    const coversNumber = box.left < footer.right && footer.left < box.right && box.top < footer.bottom && footer.top < box.bottom;
    if (leaves) problems.push(`${element.tagName} leaves the safe area`);
    else if (coversNumber) problems.push(`${element.tagName} covers the slide number`);
  }
  return problems;
}

const deck = JSON.parse(await readFile(fromProject("content.json"), "utf8"));
const contentProblems = await findContentProblems(deck);
if (contentProblems.length) {
  for (const problem of contentProblems) console.log(`FAIL  content.json: ${problem}`);
  process.exit(1);
}

const SOURCE = process.argv[2] ?? fileURLToPath(fromProject(`../${deck.file}`));
await access(SOURCE).catch(() => {
  console.log(`FAIL  ${SOURCE} does not exist. Run npm run build first.`);
  process.exit(1);
});
// The name holds a space and CJK on purpose, because a recipient may rename the file.
const loneFolder = await mkdtemp(join(tmpdir(), "live-deck-"));
const FILE = join(loneFolder, "shared copy 副本.html");
await copyFile(SOURCE, FILE);
const DECK_URL = pathToFileURL(FILE).href;
const SHOTS = fileURLToPath(fromProject("dist/verify-shots"));
await mkdir(SHOTS, { recursive: true });

const slides = deck.slides;
const last = slides.length;
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  -> ${detail}` : ""}`);
};
const stage = ".presentation-stage .slide-canvas";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.setOffline(true);
const outsideLoads = [];
const errors = [];
context.on("request", request => {
  const url = request.url();
  if (/^(data:|blob:|about:)/.test(url)) return;
  if (decodeURI(url).split("#")[0] !== decodeURI(DECK_URL)) outsideLoads.push(url);
});
const page = await context.newPage();
page.on("console", message => {
  if (["error", "warning"].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`);
});
page.on("pageerror", error => errors.push(`pageerror: ${error.message}`));
const hash = () => page.evaluate(() => location.hash);
const isFullscreen = () => page.evaluate(() => !!document.fullscreenElement);

await page.goto(DECK_URL);
await page.evaluate(() => document.fonts.ready);

// Theme
const paint = await page.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  const tokens = Object.fromEntries(["surface", "surface-raised", "ink", "secondary", "muted", "accent", "accent-quiet", "emphasis"]
    .map(name => [name, root.getPropertyValue(`--${name}`).trim()]));
  return {
    theme: document.documentElement.dataset.theme,
    tokens,
    shell: getComputedStyle(document.querySelector(".deck-shell")).backgroundColor,
    slide: getComputedStyle(document.querySelector(".slide-canvas")).backgroundColor,
  };
});
check(`theme is ${deck.theme}`, paint.theme === deck.theme && paint.tokens.surface.toLowerCase() === SURFACE[deck.theme].toLowerCase(), paint.tokens.surface);
check("stage and slide share one colour", paint.shell === paint.slide, `${paint.shell} / ${paint.slide}`);
for (const background of ["surface", "surface-raised"]) {
  for (const foreground of ["ink", "secondary", "muted", "accent", "emphasis"]) {
    const ratio = contrast(paint.tokens[foreground], paint.tokens[background]);
    check(`--${foreground} on --${background} reaches 4.5:1`, ratio >= 4.5, ratio.toFixed(2));
  }
  const ratio = contrast(paint.tokens["accent-quiet"], paint.tokens[background]);
  check(`--accent-quiet on --${background} reaches 3:1`, ratio >= 3, ratio.toFixed(2));
}

// Every slide: its text, its image, its embedded page and its fit
for (const [index, slide] of slides.entries()) {
  const number = index + 1;
  if (index) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300); // The entrance animation moves the text.
  check(`slide ${number}: address`, (await hash()) === `#slide-${number}`, await hash());
  if (slide.layout === "embed") {
    const frame = page.frameLocator(`${stage} iframe`);
    await frame.locator("body").waitFor({ state: "attached" });
    const fills = await page.$eval(`${stage} iframe`, iframe => {
      const box = iframe.getBoundingClientRect();
      const slideBox = iframe.closest(".slide-viewport").getBoundingClientRect();
      return Math.abs(box.width - slideBox.width) <= 1 && Math.abs(box.height - slideBox.height) <= 1;
    });
    check(`slide ${number}: embedded page fills the slide`, fills);
    const scroll = await frame.locator("html").evaluate(root => ({ scrollWidth: root.scrollWidth, scrollHeight: root.scrollHeight, width: innerWidth, height: innerHeight }));
    check(`slide ${number}: embedded page needs no scrolling`, scroll.scrollWidth <= scroll.width && scroll.scrollHeight <= scroll.height, JSON.stringify(scroll));
  } else {
    const heading = await page.textContent(`${stage} ${slide.layout === "cover" ? "h1" : "h2"}`);
    check(`slide ${number}: title verbatim`, heading === plain(slide.title), heading);
  }
  if (slide.layout === "content") {
    const items = await page.$$eval(`${stage} .point-text`, elements => elements.map(element => element.textContent));
    check(`slide ${number}: items verbatim`, JSON.stringify(items) === JSON.stringify(slide.items.map(plain)), items.join(" | "));
  }
  if (slide.layout === "figure") {
    const width = await page.$eval(`${stage} img`, image => image.naturalWidth);
    check(`slide ${number}: image loads`, width > 0, `naturalWidth=${width}`);
    if (slide.caption) check(`slide ${number}: caption verbatim`, (await page.textContent(`${stage} figcaption`)) === plain(slide.caption));
  }
  const fit = await page.$eval(stage, findFitProblems);
  check(`slide ${number}: fits`, fit.length === 0, fit.join(", "));
  await page.screenshot({ path: `${SHOTS}/slide-${String(number).padStart(2, "0")}.png` });
}
const fonts = await page.evaluate(() => [...new Set([...document.fonts].filter(font => font.status === "loaded").map(font => font.family))]);
check("embedded font loads offline", fonts.some(family => family.includes("Noto Serif TC")), fonts.join(","));

// Navigation keys
await page.keyboard.press("ArrowRight");
check("ArrowRight stops at the last slide", (await hash()) === `#slide-${last}`);
await page.keyboard.press("Home");
check("Home goes to slide 1", (await hash()) === "#slide-1");
await page.keyboard.press("Space");
check("Space goes forward", (await hash()) === "#slide-2");
await page.keyboard.press("ArrowLeft");
check("ArrowLeft goes back", (await hash()) === "#slide-1");
await page.keyboard.press("End");
check("End goes to the last slide", (await hash()) === `#slide-${last}`);
await page.reload();
check("reload keeps the slide", (await hash()) === `#slide-${last}`);
await page.goto(`${DECK_URL}#slide-1`);
await page.reload();
check("the address opens a chosen slide", (await hash()) === "#slide-1");

// Overview and panel
await page.keyboard.press("g");
check("G opens the overview", await page.isVisible("dialog.overview-dialog[open]"));
check("overview shows every slide", (await page.locator("dialog.overview-dialog .thumbnail-button").count()) === last);
await page.waitForTimeout(200);
await page.screenshot({ path: `${SHOTS}/overview.png` });
await page.keyboard.press("Escape");
await page.waitForTimeout(100);
check("Esc closes the overview", !(await page.isVisible("dialog.overview-dialog")));
await page.keyboard.press("p");
check("P opens the panel", await page.isVisible(".slide-panel"));
const thumbnail = await page.$eval(".slide-panel .slide-canvas", element => element.style.transform);
check("panel thumbnails are scaled", /scale\(0\.\d+\)/.test(thumbnail), thumbnail);
await page.screenshot({ path: `${SHOTS}/panel.png` });
await page.keyboard.press("p");
check("P closes the panel", !(await page.isVisible(".slide-panel")));

// Embedded page: the deck's keys with the focus inside it, and its own controls
const embedIndex = slides.findIndex(slide => slide.layout === "embed");
if (embedIndex >= 0) {
  const number = embedIndex + 1;
  const selector = ".presentation-stage iframe";
  const frame = page.frameLocator(selector);
  const focusFrame = () => page.$eval(selector, iframe => iframe.contentWindow.focus());
  const expectSlide = async (name, expected) => {
    await page.waitForTimeout(200);
    check(name, (await hash()) === `#slide-${expected}`, await hash());
  };
  await page.goto(`${DECK_URL}#slide-${number}`);
  await page.reload();
  await frame.locator("body").waitFor({ state: "attached" });

  const [away, back, neighbour] = number === last ? ["ArrowLeft", "ArrowRight", number - 1] : ["ArrowRight", "ArrowLeft", number + 1];
  await focusFrame();
  await page.keyboard.press(away);
  await expectSlide("an arrow key works with the focus in an embedded page", neighbour);
  await page.keyboard.press(back);
  await expectSlide("the deck returns to the embedded page", number);
  await frame.locator("body").waitFor({ state: "attached" });

  await focusFrame();
  await page.keyboard.press("g");
  await page.waitForTimeout(200);
  check("G works with the focus in an embedded page", await page.isVisible("dialog.overview-dialog[open]"));
  check("thumbnails run no copy of the embedded page", (await page.locator("iframe").count()) === 1);
  await page.screenshot({ path: `${SHOTS}/overview-embed.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  const button = frame.locator("button").first();
  if (await button.count()) {
    const reachable = await button.click({ trial: true, timeout: 3000 }).then(() => true, () => false);
    check("a click reaches an embedded button through the slide scale", reachable);
    await button.focus();
    await page.keyboard.press("Space");
    await expectSlide("Space on an embedded button keeps the slide", number);
  }
  const roleButton = frame.locator("[role='button']").first();
  if (await roleButton.count()) {
    await roleButton.focus();
    await page.keyboard.press("Space");
    await expectSlide("Space on an embedded role=button keeps the slide", number);
  }
  const select = frame.locator("select").first();
  if (await select.count()) {
    await select.focus();
    await page.keyboard.press("ArrowDown");
    await expectSlide("an arrow key on an embedded select keeps the slide", number);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    await select.evaluate(element => element.blur()); // A focused select keeps every deck key, by design.
  }

  await focusFrame();
  await page.waitForTimeout(ACTIVATION_EXPIRY_MS);
  await page.keyboard.press("f");
  await page.waitForTimeout(500);
  check("F in an embedded page enters full screen after an idle wait", (await isFullscreen()) && !(await page.isVisible(".notice")));
  await page.screenshot({ path: `${SHOTS}/fullscreen-embed.png` });
  await page.keyboard.press("f");
  await page.waitForTimeout(300);
  check("F in an embedded page leaves full screen", !(await isFullscreen()));
  await page.goto(`${DECK_URL}#slide-1`);
  await page.reload();
}

// Notes window
const [popup] = await Promise.all([context.waitForEvent("page"), page.keyboard.press("n")]);
await popup.waitForSelector(".presenter-view");
await popup.setViewportSize({ width: 1120, height: 800 });
await popup.waitForTimeout(300);
check("N opens the notes window", await popup.isVisible(".speaker-notes"));
check("notes window has a clock", /\d\d:\d\d:\d\d/.test(await popup.textContent(".presenter-clock")));
const previews = await popup.$$eval(".presenter-previews .slide-canvas", elements => elements.map(element => element.style.transform));
check("notes window previews are scaled", previews.length === 2 && previews.every(value => /scale\(0\.\d+\)/.test(value)), previews.join(" "));
await popup.screenshot({ path: `${SHOTS}/notes.png` });
for (const [index, slide] of slides.entries()) {
  if (index) await page.keyboard.press("ArrowRight");
  await popup.waitForTimeout(150);
  const notes = await popup.$$eval(".speaker-notes p", elements => elements.map(element => element.textContent));
  check(`slide ${index + 1}: notes verbatim in the notes window`, JSON.stringify(notes) === JSON.stringify(slide.notes), notes[0]);
}
check("last slide shows the end card", await popup.isVisible(".end-card"));
check("notes window runs no copy of an embedded page", (await popup.locator("iframe").count()) === 0);
await popup.keyboard.press("Home");
await page.waitForTimeout(150);
check("a key in the notes window drives the deck", (await hash()) === "#slide-1");

// Full screen, started after the deck's user activation has expired
await popup.keyboard.press("f");
await page.waitForTimeout(300);
check("F in the notes window leaves the deck alone", !(await isFullscreen()) && !(await page.isVisible(".notice")));
check("F in the notes window shows a hint there", await popup.isVisible(".presenter-hint"));
await popup.screenshot({ path: `${SHOTS}/notes-hint.png` });
await popup.waitForTimeout(5300);
check("the hint clears itself", !(await popup.isVisible(".presenter-hint")));
await page.waitForTimeout(ACTIVATION_EXPIRY_MS - 5300);
await page.keyboard.press("f");
await page.waitForTimeout(500);
const full = await page.evaluate(() => {
  const slide = document.querySelector(".presentation-stage .slide-viewport").getBoundingClientRect();
  return {
    width: innerWidth,
    height: innerHeight,
    slideWidth: Math.round(slide.width),
    slideHeight: Math.round(slide.height),
    toolbar: getComputedStyle(document.querySelector(".deck-toolbar")).display !== "none",
  };
});
check("F in the deck enters full screen after an idle wait", await isFullscreen());
check("full screen hides the toolbar", !full.toolbar);
check("full screen fills the limiting side", full.slideWidth === full.width || full.slideHeight === full.height, `${full.slideWidth}x${full.slideHeight} in ${full.width}x${full.height}`);
await page.screenshot({ path: `${SHOTS}/fullscreen.png` });
await popup.keyboard.press("ArrowRight");
await page.waitForTimeout(150);
check("the notes window drives the deck in full screen", (await hash()) === "#slide-2" && await isFullscreen());
await page.keyboard.press("f");
await page.waitForTimeout(300);
check("F leaves full screen", !(await isFullscreen()));
check("the toolbar returns", await page.isVisible(".deck-toolbar"));
await popup.close();

const wide = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const widePage = await wide.newPage();
await widePage.goto(DECK_URL);
await widePage.keyboard.press("f");
await widePage.waitForTimeout(400);
const edge = await widePage.evaluate(() => {
  const box = document.querySelector(".presentation-stage .slide-viewport").getBoundingClientRect();
  return { x: box.x, y: box.y, width: box.width, height: box.height };
});
check("1920x1080 full screen is edge to edge", edge.x === 0 && edge.y === 0 && edge.width === 1920 && edge.height === 1080, JSON.stringify(edge));
await wide.close();

// Window sizes
for (const [width, height] of VIEWPORTS) {
  const sized = await browser.newContext({ viewport: { width, height } });
  const sizedPage = await sized.newPage();
  await sizedPage.goto(`${DECK_URL}#slide-${last}`);
  await sizedPage.evaluate(() => document.fonts.ready);
  await sizedPage.waitForTimeout(300);
  const layout = await sizedPage.evaluate(() => {
    const slide = document.querySelector(".presentation-stage .slide-viewport").getBoundingClientRect();
    const toolbar = document.querySelector(".deck-toolbar").getBoundingClientRect();
    return { pageOverflow: document.documentElement.scrollWidth > innerWidth, overlap: slide.bottom > toolbar.top + 1, toolbarBottom: Math.round(toolbar.bottom) };
  });
  check(`window ${width}x${height}`, !layout.pageOverflow && !layout.overlap && layout.toolbarBottom <= height, JSON.stringify(layout));
  await sizedPage.screenshot({ path: `${SHOTS}/window-${width}x${height}.png` });
  await sized.close();
}

// Reduced motion
const calm = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "reduce" });
const calmPage = await calm.newPage();
await calmPage.goto(DECK_URL);
const animation = await calmPage.$eval(".presentation-stage .slide-enter .slide-content", element => getComputedStyle(element).animationName);
check("reduced motion turns the animation off", animation === "none", animation);
await calm.close();

check("the deck loads nothing but its own file", outsideLoads.length === 0, outsideLoads.slice(0, 3).join(", "));
check("no console errors or warnings", errors.length === 0, errors.slice(0, 5).join(" || "));
await browser.close();

// The file itself
const bundle = await readFile(FILE, "utf8");
check("the file names no path on this machine", !bundle.includes(homedir()));
check("the deck font carries no woff copy", !/font-family:\s*["']?Noto Serif TC[^}]*data:font\/woff;/.test(bundle));
await rm(loneFolder, { recursive: true, force: true });

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} passed`);
console.log(`Screenshots: ${SHOTS}`);
process.exit(passed === results.length ? 0 : 1);
