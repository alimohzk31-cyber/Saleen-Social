/**
 * sync-index.mjs
 * --------------
 * بعد بناء ناجح، ينسخ ناتج الإنتاج (dist/index.html) إلى جذر المشروع
 * (index.html) ليكون جاهزاً للاستضافة المباشرة أو الفتح بالمتصفح
 * بدون خادم builds (نمط single-file).
 *
 * الاستخدام: npm run release
 */
import { copyFileSync, existsSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist', 'index.html');
const target = resolve(root, 'index.html');

if (!existsSync(dist)) {
  console.error('[sync-index] dist/index.html غير موجود! شغّل npm run build أولاً.');
  process.exit(1);
}

copyFileSync(dist, target);
const bytes = statSync(dist).size;
const sizeMB = (bytes / (1024 * 1024)).toFixed(2);
console.log(`[sync-index] نُسخ dist/index.html إلى جذر index.html ✅ (${sizeMB} MB — جاهز للإصدار)`);