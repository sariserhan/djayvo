// Rebuild the original geometric app icon with the pinned test browser; no runtime dependency.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
const svg = await readFile(new URL('../icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const size of [180, 192, 512]) {
    const bytes = await page.evaluate(async ({ svg, size }) => {
      const image = new Image();
      image.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
      await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      canvas.getContext('2d').drawImage(image, 0, 0, size, size);
      return Array.from(new Uint8Array(await (await new Promise(resolve => canvas.toBlob(resolve))).arrayBuffer()));
    }, { svg, size });
    await writeFile(new URL(`../icon-${size}.png`, import.meta.url), Buffer.from(bytes));
  }
} finally { await browser.close(); }
