#!/usr/bin/env node
import { generate } from 'critical';
import fs from 'fs/promises';
import { glob } from 'glob';

(async () => {
  try {
    // 1️⃣ Find all built HTML files
    const htmlFiles = await glob('_site/**/*.html');
    if (!htmlFiles.length) {
      console.error('No HTML files found in _site/');
      process.exit(1);
    }

    let combinedCss = '';

    // 2️⃣ Generate critical CSS for each page and collect it
    for (const file of htmlFiles) {
      try {
        const { css } = await generate({
          src: file,
          base: '_site',
          css: ['assets/css/style.css'],
          inline: false,
          extract: true,
          width: 1920,
          height: 1080
        });
        combinedCss += css + '\n';
        console.log(`✅ Generated critical CSS for: ${file}`);
      } catch (err) {
        console.warn(`⚠️  Failed on ${file}: ${err.message}`);
      }
    }

    // 3️⃣ Write out a single combined file
    await fs.mkdir('assets/css', { recursive: true });
    await fs.writeFile('assets/css/critical.css', combinedCss);
    console.log('✅ Wrote combined critical CSS to assets/css/critical.css');
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();
