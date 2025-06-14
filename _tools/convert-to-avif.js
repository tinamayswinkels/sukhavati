// _tools/convert-to-avif.js

const sharp = require('sharp');
const glob  = require('glob');
const path  = require('path');
const fs    = require('fs');

// 1️⃣ Where your originals live:
const INPUT_GLOB = path.join(__dirname, '..', 'uploads', '**', '*.{jpg,jpeg,png}');
// 2️⃣ Where AVIFs should go:
const OUTPUT_DIR = path.join(__dirname, '..', 'uploads', 'avif');

(async () => {
  console.log('🔥 Starting AVIF conversion…');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.log(`📁 Creating output directory at ${OUTPUT_DIR}`);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Find all source images
  const files = glob.sync(INPUT_GLOB, { nodir: true });
  console.log(`🔍 Found ${files.length} image(s) to convert.`);

  if (files.length === 0) {
    console.warn('⚠️ No images matched. Check your uploads path and glob pattern.');
    return;
  }

  for (const srcPath of files) {
    try {
      const relPath = path.relative(path.join(__dirname, '..', 'uploads'), srcPath);
      const outPath = path.join(OUTPUT_DIR, relPath).replace(/\.(jpe?g|png)$/i, '.avif');
      const outDir  = path.dirname(outPath);

      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      console.log(`👉 Converting: ${srcPath}`);
      await sharp(srcPath)
        .resize({ width: 1800, withoutEnlargement: true })
        .avif({ quality: 60, effort: 6 })
        .toFile(outPath);
      console.log(`✅ Written:   ${outPath}\n`);
    } catch (err) {
      console.error(`❌ Error converting ${srcPath}:`, err);
    }
  }

  console.log('🎉 All done!');
})();