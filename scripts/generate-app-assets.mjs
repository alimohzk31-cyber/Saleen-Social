// يولّد أيقونة التطبيق وشاشة البداية (PNG خام عبر zlib — بلا مكتبات خارجية).
// الناتج: assets/icon-only.png, assets/icon-foreground.png,
//         assets/icon-background.png, assets/splash.png
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });

// ---------- PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(width, height, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- canvas بسيط ----------
const RED = [217, 4, 41, 255];     // #D90429 — لون التطبيق
const WHITE = [255, 255, 255, 255];
const CLEAR = [0, 0, 0, 0];

function canvas(size) {
  const px = Buffer.alloc(size * size * 4);
  return {
    size,
    px,
    fill(color) { for (let i = 0; i < size * size; i++) px.set(color, i * 4); },
    set(x, y, color) {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      px.set(color, (y * size + x) * 4);
    },
    circle(cx, cy, r, color) {
      const r2 = r * r;
      for (let y = Math.floor(cy - r); y <= cy + r; y++) {
        for (let x = Math.floor(cx - r); x <= cx + r; x++) {
          const dx = x - cx, dy = y - cy;
          if (dx * dx + dy * dy <= r2) this.set(x, y, color);
        }
      }
    },
    roundRect(x0, y0, w, h, rad, color) {
      const x1 = x0 + w, y1 = y0 + h;
      for (let y = Math.max(0, y0 | 0); y < Math.min(size, y1); y++) {
        for (let x = Math.max(0, x0 | 0); x < Math.min(size, x1); x++) {
          // مناطق الزوايا: يجب أن تكون داخل دائرة الزاوية
          const cx = Math.max(x0 + rad, Math.min(x, x1 - rad));
          const cy = Math.max(y0 + rad, Math.min(y, y1 - rad));
          const dx = x - cx, dy = y - cy;
          if (dx * dx + dy * dy <= rad * rad) this.set(x, y, color);
        }
      }
    },
  };
}

// حرف S بخط نقطي 6×7 (واضح في الأحجام الصغيرة)
const S_GLYPH = [
  [0, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1],
  [0, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1],
  [0, 1, 1, 1, 1, 0],
];

function drawLogo(cv, cx, cy, circleR, color, sColor, cell) {
  if (circleR > 0) cv.circle(cx, cy, circleR, color);
  const gw = S_GLYPH[0].length * cell;
  const gh = S_GLYPH.length * cell;
  const x0 = Math.round(cx - gw / 2);
  const y0 = Math.round(cy - gh / 2);
  for (let r = 0; r < S_GLYPH.length; r++) {
    for (let c = 0; c < S_GLYPH[0].length; c++) {
      if (!S_GLYPH[r][c]) continue;
      for (let dy = 0; dy < cell; dy++) {
        for (let dx = 0; dx < cell; dx++) {
          cv.set(x0 + c * cell + dx, y0 + r * cell + dy, sColor);
        }
      }
    }
  }
}

function save(name, cv) {
  const buf = encodePng(cv.size, cv.size, cv.px);
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log(`${name}: ${(buf.length / 1024).toFixed(0)} KB (${cv.size}x${cv.size})`);
}

// 1) الأيقونة الكاملة 1024 — مربع أحمر دائري الزوايا + دائرة بيضاء + حرف S أحمر
const icon = canvas(1024);
icon.roundRect(0, 0, 1024, 1024, 190, RED);
drawLogo(icon, 512, 512, 336, WHITE, RED, 62);
save('icon-only.png', icon);

// 2) طبقة الخلفية للأيقونة التكيفية — أحمر بالكامل
const bg = canvas(1024);
bg.fill(RED);
save('icon-background.png', bg);

// 3) طبقة المقدمة للأيقونة التكيفية — شفافة + الشعار (المنطقة الآمنة ~66%)
const fg = canvas(1024);
drawLogo(fg, 512, 512, 300, WHITE, RED, 56);
save('icon-foreground.png', fg);

// 4) شاشة البداية 2732 — خلفية بيضاء + الشعار في المنتصف
const SPLASH = 2732;
const splash = canvas(SPLASH);
splash.fill([255, 255, 255, 255]);
drawLogo(splash, SPLASH / 2, SPLASH / 2, 430, RED, WHITE, 80);
save('splash.png', splash);

console.log('تم توليد جميع ملفات assets ✅');
