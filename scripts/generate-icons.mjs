import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const OUT_DIR = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(OUT_DIR, { recursive: true });

// Minimal CRC32 + PNG encoder for crisp geometric TerraPulse icon
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function renderIconPng(size, maskable = false) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  const cx = size / 2;
  const cy = size / 2;
  const radius = maskable ? size * 0.5 : size * 0.44;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter None
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded forest-green background
      const cornerRadius = maskable ? 0 : size * 0.22;
      const inSquare =
        maskable ||
        (Math.abs(dx) <= size * 0.5 - cornerRadius ||
          Math.abs(dy) <= size * 0.5 - cornerRadius ||
          Math.hypot(
            Math.max(0, Math.abs(dx) - (size * 0.5 - cornerRadius)),
            Math.max(0, Math.abs(dy) - (size * 0.5 - cornerRadius))
          ) <= cornerRadius);

      if (!inSquare) {
        raw[idx] = 0;
        raw[idx + 1] = 0;
        raw[idx + 2] = 0;
        raw[idx + 3] = 0;
        continue;
      }

      // Deep forest green gradient background (#0f291e -> #14532d)
      const t = (x + y) / (2 * size);
      let r = Math.round(15 + t * 8);
      let g = Math.round(41 + t * 42);
      let b = Math.round(30 + t * 15);

      // Subtle compass ring
      if (Math.abs(dist - radius * 0.72) < size * 0.018) {
        r = 167;
        g = 243;
        b = 208;
      }

      // Solar amber sun arc in top-right quadrant
      const sunX = cx + size * 0.16;
      const sunY = cy - size * 0.16;
      if (Math.hypot(x - sunX, y - sunY) < size * 0.11) {
        r = 245;
        g = 158;
        b = 11;
      }

      // Stylized leaf/drop silhouette in center
      const lx = (x - cx) / (size * 0.24);
      const ly = (y - (cy + size * 0.04)) / (size * 0.28);
      const inLeaf = lx * lx + ly * ly * 0.78 - Math.abs(lx) * 0.35 < 0.55;
      if (inLeaf && ly > -0.9 && ly < 0.85) {
        r = 34;
        g = 197;
        b = 94;
        // Central vein
        if (Math.abs(lx) < 0.06 && ly > -0.6 && ly < 0.7) {
          r = 240;
          g = 253;
          b = 244;
        }
      }

      // Hydro blue water wave along lower arc
      const waveY = cy + size * 0.24 + Math.sin((x / size) * Math.PI * 3) * (size * 0.025);
      if (y > waveY && y < waveY + size * 0.055 && Math.abs(dx) < size * 0.28) {
        r = 14;
        g = 165;
        b = 233;
      }

      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 6 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(OUT_DIR, "icon-192.png"), renderIconPng(192, false));
fs.writeFileSync(path.join(OUT_DIR, "icon-512.png"), renderIconPng(512, false));
fs.writeFileSync(path.join(OUT_DIR, "icon-maskable-512.png"), renderIconPng(512, true));

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f291e"/>
      <stop offset="100%" stop-color="#14532d"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="176" fill="none" stroke="#86efac" stroke-opacity="0.35" stroke-width="8"/>
  <circle cx="332" cy="172" r="52" fill="#f59e0b"/>
  <path d="M256 128 C332 190 344 294 256 356 C168 294 180 190 256 128 Z" fill="#22c55e"/>
  <path d="M256 164 L256 340" stroke="#f0fdf4" stroke-width="12" stroke-linecap="round"/>
  <path d="M132 372 Q196 344 256 372 T380 372" fill="none" stroke="#0ea5e9" stroke-width="20" stroke-linecap="round"/>
</svg>`;
fs.writeFileSync(path.join(OUT_DIR, "icon.svg"), svgIcon, "utf8");

console.log("Generated PWA icons in public/icons/");
