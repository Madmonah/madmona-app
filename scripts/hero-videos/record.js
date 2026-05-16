/**
 * Madmona Hero Films Recorder
 * Auto-captures cosmos.html / genesis.html / storyboard.html as MP4
 *
 * Usage:
 *   node record.js cosmos              recordings cosmos in all 3 formats
 *   node record.js cosmos portrait     records only cosmos portrait
 *   node record.js all                 records everything (12 outputs)
 *
 * Outputs go to ./output/ as:
 *   {film}_landscape_1920x1080.mp4   (YouTube, Facebook feed)
 *   {film}_portrait_1080x1920.mp4    (IG Reel, TikTok, IG Story, YT Short)
 *   {film}_square_1080x1080.mp4      (Instagram feed post)
 *
 * NOTE: Generates SILENT video. For audio:
 *   - Use Method B (OBS Studio) instead - see obs-guide.bat
 *   - Or add free music in Canva/CapCut after recording
 */

const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const path = require('path');
const fs = require('fs');

const VIDEOS = {
  cosmos: {
    url: 'https://madmonacairo.com/cosmos.html',
    duration: 40000,
    description: 'Cosmos V4 - Netflix-grade 3D opening title (APPROVED STANDARD)',
  },
  genesis: {
    url: 'https://madmonacairo.com/genesis.html',
    duration: 40000,
    description: 'Genesis V3 - luxury monolith variant',
  },
  storyboard: {
    url: 'https://madmonacairo.com/storyboard.html',
    duration: 40000,
    description: 'Storyboard V2 - CSS lightweight fallback',
  },
};

const FORMATS = {
  landscape: { width: 1920, height: 1080, label: 'landscape_1920x1080', use: 'YouTube, Facebook feed' },
  portrait: { width: 1080, height: 1920, label: 'portrait_1080x1920', use: 'IG Reel, TikTok, YT Short, IG Story' },
  square: { width: 1080, height: 1080, label: 'square_1080x1080', use: 'Instagram feed post' },
};

async function recordVideo(filmName, formatKey) {
  const film = VIDEOS[filmName];
  const format = FORMATS[formatKey];
  const outputPath = path.join(__dirname, 'output', `${filmName}_${format.label}.mp4`);

  console.log(`\n[${filmName} - ${formatKey}] Starting...`);
  console.log(`   URL: ${film.url}`);
  console.log(`   Dimensions: ${format.width}x${format.height}`);
  console.log(`   Output: ${outputPath}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--autoplay-policy=no-user-gesture-required',
      `--window-size=${format.width},${format.height}`,
      '--use-fake-ui-for-media-stream',
      '--enable-features=NetworkService',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
      '--hide-scrollbars',
    ],
    defaultViewport: {
      width: format.width,
      height: format.height,
      deviceScaleFactor: 1,
    },
  });

  const page = await browser.newPage();
  await page.setViewport({ width: format.width, height: format.height });

  const recorder = new PuppeteerScreenRecorder(page, {
    followNewTab: false,
    fps: 30,
    videoFrame: {
      width: format.width,
      height: format.height,
    },
    videoCrf: 18,
    videoCodec: 'libx264',
    videoPreset: 'medium',
    videoBitrate: 6000,
    autopad: { color: 'black' },
    aspectRatio: `${format.width}:${format.height}`,
  });

  await recorder.start(outputPath);

  await page.goto(film.url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Trigger autoplay
  await page.evaluate(() => {
    document.body.click();
  });

  // Verify Three.js loaded (sanity check after the production fix)
  const threeCheck = await page.evaluate(() => ({
    hasThree: typeof THREE !== 'undefined',
    version: typeof THREE !== 'undefined' ? THREE.REVISION : null,
  }));
  if (filmName !== 'storyboard') {
    console.log(`   Three.js loaded: ${threeCheck.hasThree} (r${threeCheck.version})`);
  }

  console.log(`   Recording for ${film.duration / 1000}s...`);
  await new Promise((resolve) => setTimeout(resolve, film.duration));

  await recorder.stop();
  await browser.close();

  const stats = fs.statSync(outputPath);
  console.log(`   [OK] Saved (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

  return outputPath;
}

async function main() {
  const args = process.argv.slice(2);
  const filmArg = args[0] || 'all';
  const formatArg = args[1] || 'all';

  console.log('============================================================');
  console.log('  Madmona - Hero Films Auto Recorder');
  console.log('============================================================');

  const filmsToRecord = filmArg === 'all' ? Object.keys(VIDEOS) : [filmArg];
  const formatsToRecord = formatArg === 'all' ? Object.keys(FORMATS) : [formatArg];

  const results = [];
  const startTime = Date.now();

  for (const film of filmsToRecord) {
    if (!VIDEOS[film]) {
      console.error(`[ERROR] Unknown film: ${film}. Available: ${Object.keys(VIDEOS).join(', ')}`);
      continue;
    }
    for (const format of formatsToRecord) {
      if (!FORMATS[format]) {
        console.error(`[ERROR] Unknown format: ${format}. Available: ${Object.keys(FORMATS).join(', ')}`);
        continue;
      }
      try {
        const out = await recordVideo(film, format);
        results.push({ film, format, output: out, status: 'success' });
      } catch (err) {
        console.error(`   [FAIL] ${err.message}`);
        results.push({ film, format, error: err.message, status: 'failed' });
      }
    }
  }

  const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n============================================================');
  console.log('  Summary');
  console.log('============================================================');
  results.forEach((r) => {
    const icon = r.status === 'success' ? '[OK]' : '[FAIL]';
    console.log(`${icon} ${r.film} - ${r.format}: ${r.status === 'success' ? r.output : r.error}`);
  });
  console.log(`\nTotal time: ${totalSec}s`);
  console.log(`Output folder: ${path.join(__dirname, 'output')}`);

  // Write a manifest file
  const manifestPath = path.join(__dirname, 'output', 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    recorded_at: new Date().toISOString(),
    results,
    next_steps: [
      'Files are SILENT video. To add audio, open in CapCut/Canva and apply music.',
      'For native audio (Web Audio drone), re-record with OBS Studio - see obs-guide.bat',
      'Upload each MP4 to its target platform (IG Reel/TikTok/FB/YT) manually',
      'After publishing, tell Claude the post URL to update content_calendar tracker',
    ],
  }, null, 2));

  console.log('\nManifest written to output/manifest.json');
}

main().catch((err) => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
