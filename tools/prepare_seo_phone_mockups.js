// Prepare the owner's supplied phone mockups without changing their artwork.
// Run: node tools/prepare_seo_phone_mockups.js [source-directory]
// Archived byte-identical originals allow rebuilding after the Desktop files move.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const arabic = process.argv.includes('--ar');
const destination = path.resolve(__dirname, '../assets/images/seo/'+(arabic?'phone-mockups-ar-2026-10-14':'phone-mockups-2026-10-12'));
const originalsDirectory = path.join(destination, 'originals');
const sourceDirectory = path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--')) || (arabic?'/Users/mohammad/Downloads':'/Users/mohammad/Desktop'));
const widths = [400, 700, 1000];
const webpOptions = { quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true };
const sources = arabic ? [
  {name:'google-search',sourceFilename:'ChatGPT Image Oct 14, 2026 at 03_52_30 PM-1 1.png',subject:'Google Search',height:1736,expectedSha256:'01c495d4c9ad71f3e68820a5cb80111f723d4b954885d2fdc8a4d7bfbdeb6f6f'},
  {name:'google-maps',sourceFilename:'Frame 427319607.png',subject:'Google Maps Search',height:1700,expectedSha256:'59ac41d489f54466d08aab4fd418058978f64e44a2a4b1f935c61b4fad138a0a'},
  {name:'chatgpt-search',sourceFilename:'ChatGPT Image Oct 14, 2026 at 03_52_33 PM-3 1.png',subject:'ChatGPT Search',height:1700,expectedSha256:'3fd93ecd45c5595630e968ba28b3227017a8b3e9af8839a5f74f3bcb6134c7c0'}
] : [
  {
    name: 'google-search',
    sourceFilename: '١.png',
    subject: 'Google Search',
    expectedSha256: '2460a9f2845ed0c9b6d111ff6d6dc2e4fce892348bc571d0bf5f32d429c99ec2'
  },
  {
    name: 'google-maps',
    sourceFilename: '٢.png',
    subject: 'Google Maps Search',
    expectedSha256: '92dcef19bd162ae63f97a819e9c1204fd64d6df0a9b5007a8e87202cd2b86880'
  },
  {
    name: 'chatgpt-search',
    sourceFilename: '٣.png',
    subject: 'ChatGPT Search',
    expectedSha256: '9d4c9069cdf9574426831629987b3fb51f59565084e7830266ad7287a9a863a0'
  }
];

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function alphaSummary(alpha) {
  let minimum = 255;
  let maximum = 0;
  let transparentPixels = 0;
  let partiallyTransparentPixels = 0;
  for (const value of alpha) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
    if (value === 0) transparentPixels++;
    else if (value < 255) partiallyTransparentPixels++;
  }
  return { minimum, maximum, transparentPixels, partiallyTransparentPixels, sha256: sha256(alpha) };
}

async function verifyImage(bytes, width, height) {
  const metadata = await sharp(bytes).metadata();
  const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  if (metadata.width !== width || metadata.height !== height || !metadata.hasAlpha || info.channels !== 4) {
    throw new Error(`Invalid RGBA output: expected ${width}×${height}; received ${JSON.stringify(metadata)}`);
  }
  if (data.length !== width * height * 4) throw new Error('Incomplete image decode');
  const alpha = await sharp(bytes).extractChannel('alpha').raw().toBuffer();
  const transparency = alphaSummary(alpha);
  if (transparency.minimum !== 0 || transparency.maximum !== 255) {
    throw new Error('Expected both fully transparent and opaque pixels');
  }
  return { metadata, transparency };
}

async function main() {
  fs.mkdirSync(originalsDirectory, { recursive: true });
  const images = [];

  for (const source of sources) {
    const sourcePath = path.join(sourceDirectory, source.sourceFilename);
    const originalCopy = `originals/${source.name}.png`;
    const archivedPath = path.join(destination, originalCopy);
    const readablePath = fs.existsSync(sourcePath) ? sourcePath : archivedPath;
    const original = fs.readFileSync(readablePath);
    if (sha256(original) !== source.expectedSha256) {
      throw new Error(`Source does not match the supplied original: ${readablePath}`);
    }
    const originalHeight = source.height || 1700;
    const originalVerification = await verifyImage(original, 1000, originalHeight);
    if (fs.existsSync(archivedPath) && sha256(fs.readFileSync(archivedPath)) !== source.expectedSha256) {
      throw new Error(`Archived original differs from supplied source: ${archivedPath}`);
    }
    if (readablePath !== archivedPath) fs.copyFileSync(readablePath, archivedPath);
    if (sha256(fs.readFileSync(archivedPath)) !== source.expectedSha256) {
      throw new Error(`Original copy is not byte-identical: ${archivedPath}`);
    }

    const outputs = [];
    for (const width of widths) {
      const height = Math.round(width * originalHeight / 1000);
      const filename = `${source.name}-${width}.webp`;
      const outputPath = path.join(destination, filename);
      const referenceAlpha = await sharp(original)
        .resize({ width, withoutEnlargement: true })
        .extractChannel('alpha').raw().toBuffer();
      await sharp(original)
        .resize({ width, withoutEnlargement: true })
        .webp(webpOptions).toFile(outputPath);
      const bytes = fs.readFileSync(outputPath);
      const verification = await verifyImage(bytes, width, height);
      if (verification.metadata.format !== 'webp') throw new Error(`Invalid output format: ${filename}`);
      if (verification.transparency.sha256 !== sha256(referenceAlpha)) {
        throw new Error(`Alpha changed during WebP encoding: ${filename}`);
      }
      outputs.push({
        file: filename,
        format: 'webp',
        width,
        height,
        bytes: bytes.length,
        sha256: sha256(bytes),
        hasAlpha: true,
        decodeVerified: true,
        alphaMatchesResizedOriginal: true,
        transparency: verification.transparency
      });
    }
    if (sha256(fs.readFileSync(readablePath)) !== source.expectedSha256) {
      throw new Error(`Source changed while preparing outputs: ${readablePath}`);
    }
    images.push({
      name: source.name,
      subject: source.subject,
      origin: 'Owner-supplied illustrative mockup; not a newly generated image or verified ranking record.',
      sourceFilename: source.sourceFilename,
      sourcePath,
      originalCopy,
      originalSha256: source.expectedSha256,
      originalBytes: original.length,
      originalWidth: 1000,
      originalHeight,
      originalFormat: 'png',
      originalHasAlpha: true,
      originalCopyByteIdentical: true,
      originalTransparency: originalVerification.transparency,
      outputs
    });
    console.log(`${source.name}: ${outputs.map(output => `${output.width}×${output.height} ${(output.bytes / 1024).toFixed(1)} KiB`).join(' / ')}`);
  }

  const provenance = {
    preparedAt: new Date().toISOString(),
    sourceDate: arabic ? '2026-10-14' : '2026-10-12',
    language: arabic ? 'ar' : 'en',
    transformation: 'Full composition preserved. Aspect-ratio resize and WebP encoding only; no crop, retouching, background removal, flattening, or added artwork.',
    encoder: { sharp: sharp.versions.sharp, libwebp: sharp.versions.webp, options: webpOptions },
    widths,
    images
  };
  fs.writeFileSync(path.join(destination, 'provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);
  console.log('Verified all 9 WebP decodes, preserved alpha, and 3 byte-identical original PNG copies.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
