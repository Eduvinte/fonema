import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = join(root, 'public', 'favicon.svg');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

async function render(name, size, { maskable = false } = {}) {
  const base = sharp(svg).resize(size, size);
  const icon = maskable
    ? await sharp({
        create: { width: size, height: size, channels: 4, background: '#2c69b7' },
      })
        .composite([{ input: await base.png().toBuffer() }])
        .png()
        .toBuffer()
    : await base.png().toBuffer();
  await sharp(icon).toFile(join(outDir, name));
  console.log('✓', name);
}

await render('icon-192.png', 192);
await render('icon-512.png', 512);
await render('icon-180.png', 180);
await render('maskable-512.png', 512, { maskable: true });
console.log('Iconos generados en', outDir);
