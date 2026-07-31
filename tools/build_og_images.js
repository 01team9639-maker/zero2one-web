/**
 * ZERO 2 ONE — social share images
 * ================================
 *
 * Renders assets/images/og-cover.jpg and og-cover-ar.jpg at exactly 1200x630.
 *
 * Why these exist: every page used to point og:image at a 1023x1537 portrait
 * PNG weighing 576 KB. WhatsApp, LinkedIn and Facebook want 1.91:1 landscape,
 * so they centre-cropped it hard or fell back to a small square, and X with
 * summary_large_image can reject a 2:3 image outright — while every crawler
 * that unfurled a link downloaded 576 KB.
 *
 * JPEG, not WebP: WhatsApp and some LinkedIn paths still do not render WebP
 * previews reliably, and a share image that fails to render is worse than a
 * slightly larger one.
 *
 * Rendered through the real browser with the real brand faces rather than
 * composited by hand, so the typography matches the site exactly. Cairo is
 * fetched from Google at build time only — the output is a flat JPEG, so
 * nothing third-party ships to visitors.
 *
 * Usage:  node tools/build_og_images.js
 */
const { chromium } = require('playwright');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const OUT = path.join(ROOT, 'assets', 'images');

const DARK = '#1C1D20';
const ORANGE = '#F9460E';
const CREAM = '#FFFDED';

// The site WebP is only 154px tall; scaling it to the OG size softens it.
// Use the master SVG when it is still around, so the mark stays crisp.
const svgPath = path.join(ROOT, 'assets/icons/logo-z2o.svg');
const useSvg = fs.existsSync(svgPath);
const logo = fs.readFileSync(useSvg ? svgPath : path.join(ROOT, 'assets/icons/logo-z2o.webp')).toString('base64');
const logoMime = useSvg ? 'image/svg+xml' : 'image/webp';
const face = (file, weight) => {
  const p = path.join(ROOT, 'assets/fonts', file);
  if (!fs.existsSync(p)) return '';
  return `@font-face{font-family:'Dennis Sans';src:url(data:font/otf;base64,${
    fs.readFileSync(p).toString('base64')}) format('opentype');font-weight:${weight};font-style:normal;}`;
};

function html({ rtl, wordmark, line, kicker }) {
  return `<!DOCTYPE html><html${rtl ? ' dir="rtl" lang="ar"' : ' lang="en"'}><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=block" rel="stylesheet">
<style>
  ${face('NeueMontreal-Regular.otf', 450)}
  ${face('NeueMontreal-Bold.otf', 700)}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{
    background:${DARK};
    font-family:${rtl ? "'Cairo',sans-serif" : "'Dennis Sans',sans-serif"};
    color:${CREAM};
    display:flex;flex-direction:column;justify-content:center;
    padding:0 96px;position:relative;
  }
  /* the rounded sweep the site uses between sections */
  .sweep{position:absolute;left:-10%;bottom:-72%;width:120%;height:100%;
         background:${ORANGE};border-radius:50%;opacity:.10}
  .rule{position:absolute;top:0;left:0;width:100%;height:10px;background:${ORANGE}}
  .logo{height:88px;width:auto;margin-bottom:40px;align-self:flex-start}
  .kicker{font-size:26px;letter-spacing:${rtl ? '0' : '.18em'};text-transform:${rtl ? 'none' : 'uppercase'};
          color:${ORANGE};font-weight:700;margin-bottom:22px}
  .wordmark{font-size:${rtl ? '86px' : '96px'};font-weight:${rtl ? 900 : 700};line-height:1.02;letter-spacing:${rtl ? '0' : '-.01em'}}
  .line{font-size:34px;line-height:1.35;margin-top:26px;color:${CREAM};opacity:.82;max-width:20ch}
  .dot{color:${ORANGE}}
</style></head><body>
  <div class="rule"></div><div class="sweep"></div>
  <img class="logo" src="data:${logoMime};base64,${logo}" alt="">
  <p class="kicker">${kicker}</p>
  <h1 class="wordmark">${wordmark}</h1>
  <p class="line">${line}</p>
</body></html>`;
}

const VARIANTS = [
  {
    file: 'og-cover.jpg',
    opts: {
      rtl: false,
      kicker: 'Riyadh, Saudi Arabia',
      wordmark: 'ZERO <span class="dot">2</span> ONE',
      line: 'Digital marketing agency taking brands from zero to one.',
    },
  },
  {
    file: 'og-cover-ar.jpg',
    opts: {
      rtl: true,
      kicker: 'الرياض، المملكة العربية السعودية',
      wordmark: 'من الصفر <span class="dot">إلى</span> الواحد',
      line: 'وكالة تسويق رقمي تأخذ علامتك من الصفر إلى الواحد.',
    },
  },
];

(async () => {
  const browser = await chromium.launch();
  for (const v of VARIANTS) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
    await page.setContent(html(v.opts), { waitUntil: 'load' });
    try { await page.evaluate(() => document.fonts.ready); } catch (e) { /* ignore */ }
    await page.waitForTimeout(600);
    const png = await page.screenshot({ type: 'png' });
    await page.close();

    // 2x render downsampled to exactly 1200x630 keeps the type crisp
    const dest = path.join(OUT, v.file);
    let quality = 84;
    for (;;) {
      await sharp(png).resize(1200, 630, { fit: 'fill' })
        .jpeg({ quality, progressive: true, mozjpeg: true }).toFile(dest);
      const kb = fs.statSync(dest).size / 1024;
      if (kb < 150 || quality <= 60) {
        const m = await sharp(dest).metadata();
        console.log(`  ${v.file.padEnd(18)} ${m.width}x${m.height}  ${kb.toFixed(0)} KB  q${quality}`);
        break;
      }
      quality -= 6;
    }
  }
  await browser.close();
})();
