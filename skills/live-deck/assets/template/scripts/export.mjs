import { copyFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const deck = JSON.parse(await readFile(new URL("../content.json", import.meta.url), "utf8"));
const target = new URL(`../../${deck.file}`, import.meta.url);
await copyFile(new URL("../dist/index.html", import.meta.url), target);
console.log(`Exported ${fileURLToPath(target)}`);
