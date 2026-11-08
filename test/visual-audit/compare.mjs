import sharp from 'sharp';
import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
const root = process.env.AUDIT_OUTPUT;
if (!root) throw new Error('Set AUDIT_OUTPUT');
const current = process.argv[2] ?? 'current';
await mkdir(`${root}/comparisons/${current}`, { recursive: true });
const inventories = await Promise.all([1440, 390].map(async width => {
  const base = `${root}/screens/baseline/${width}`;
  const latest = `${root}/screens/${current}/${width}`;
  const names = (await readdir(base)).filter(name => name.endsWith('.png')).sort();
  const available = await readdir(latest);
  const rows = await Promise.all(names.filter(name => available.includes(name)).map(async name => {
    const targetWidth = width === 1440 ? 720 : 390;
    const images = await Promise.all([base, latest].map(async folder => sharp(`${folder}/${name}`).resize({ width: targetWidth }).png().toBuffer({ resolveWithObject: true })));
    const height = Math.max(...images.map(image => image.info.height));
    const full = await sharp({ create: { width: targetWidth * 2, height, channels: 3, background: '#fff' } })
      .composite(images.map((image, index) => ({ input: image.data, left: index * targetWidth, top: 0 })))
      .png().toBuffer();
    await writeFile(`${root}/comparisons/${current}/${width}-${name}`, full);
    const metadata = await Promise.all([base, latest].map(folder => readFile(`${folder}/${name.replace('.png','.json')}`, 'utf8').then(JSON.parse)));
    return { name, width, heights: images.map(image => image.info.height), overflow: metadata.map(m => m.scrollWidth > m.width), controlsOutside: metadata.map(m => m.overflow.length) };
  }));
  await Promise.all(Array.from({ length: Math.ceil(rows.length / 6) }, async (_, group) => {
    const items = rows.slice(group * 6, group * 6 + 6);
    const panels = await Promise.all(items.map(async item => {
      const path = `${root}/comparisons/${current}/${width}-${item.name}`;
      const image = await sharp(path).resize({ width: 780 }).toBuffer();
      const info = await sharp(image).metadata();
      const label = Buffer.from(`<svg width="780" height="30"><rect width="780" height="30" fill="white"/><text x="10" y="21" font-size="17">${item.name} — baseline LEFT / ${current} RIGHT</text></svg>`);
      return sharp({ create: { width: 780, height: 470, channels: 3, background: '#fff' } })
        .composite([{ input: label, left: 0, top: 0 }, { input: await sharp(image).extract({ left: 0, top: 0, width: 780, height: Math.min(440, info.height) }).toBuffer(), left: 0, top: 30 }]).png().toBuffer();
    }));
    await sharp({ create: { width: 1560, height: Math.ceil(panels.length / 2) * 470, channels: 3, background: '#fff' } })
      .composite(panels.map((input, index) => ({ input, left: index % 2 * 780, top: Math.floor(index / 2) * 470 })))
      .png().toFile(`${root}/comparisons/${current}/sheet-${width}-${group}.png`);
  }));
  return { width, unmatchedBaseline: names.filter(name => !available.includes(name)),
    unmatchedCurrent: available.filter(name => name.endsWith('.png') && !names.includes(name)), rows };
}));
await writeFile(`${root}/comparisons/${current}/inventory.json`, JSON.stringify(inventories, null, 2));
await writeFile(`${root}/comparisons/${current}/index.html`, `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Angular / ${current} visual comparison</title>
<style>body{font:16px system-ui;margin:2rem;background:#111827;color:#eee}a{color:#93c5fd}ul{columns:3;column-width:18rem}li{margin:.5rem 0}img{max-width:100%}</style>
<h1>Angular baseline / ${current}</h1><p>Each pair: baseline left, ${current} right. Open an image to inspect its full height.</p>
${inventories.map(({ width, rows, unmatchedBaseline, unmatchedCurrent }) => `<section><h2>${width}px — ${rows.length} paired states</h2>
<p>Missing ${current}: ${unmatchedBaseline.join(', ') || 'none'}. Missing baseline: ${unmatchedCurrent.join(', ') || 'none'}.</p>
<ul>${rows.map(row => `<li><a href="${width}-${row.name}">${row.name}</a></li>`).join('')}</ul>
${Array.from({ length: Math.ceil(rows.length / 6) }, (_, index) => `<a href="sheet-${width}-${index}.png"><img loading="lazy" alt="${width}px contact sheet ${index + 1}" src="sheet-${width}-${index}.png"></a>`).join('')}</section>`).join('')}
</html>`);
console.log(inventories.map(({ width, rows, unmatchedBaseline, unmatchedCurrent }) => ({ width, pairs: rows.length, unmatchedBaseline, unmatchedCurrent, overflows: rows.filter(row => row.overflow[1]) })));
