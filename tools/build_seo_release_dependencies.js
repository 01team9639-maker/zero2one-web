// Builds only the isolated SEO module and its tiny legacy-script loader.
// The shared stylesheet bundle and all HTML files are deliberately untouched.
// Usage: node tools/build_seo_release_dependencies.js [--check] [--runtime-root=...]
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.dirname(__dirname), check = process.argv.includes('--check');
const runtimeArg = process.argv.find(arg => arg.startsWith('--runtime-root='));
const dependencyRoots = [root, runtimeArg ? path.resolve(runtimeArg.split('=').slice(1).join('=')) : path.resolve(root, '../zero2one_aa1')];
const esbuild = require(require.resolve('esbuild', { paths: dependencyRoots }));
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const sha = text => crypto.createHash('sha256').update(text).digest('hex').slice(0, 8);

// Split selector lists without splitting :is(), :has(), attribute values or URLs.
function selectors(text) {
  const output = [];
  let start = 0, depth = 0, quote = '', escape = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (quote) { if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '(' || c === '[') depth++;
    if (c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) { output.push(text.slice(start, i).trim()); start = i + 1; }
  }
  output.push(text.slice(start).trim());
  return output;
}

// Fail closed on any global selector or new unsupported at-rule. Keyframes
// have a unique module name and never install global element declarations.
function validateScope(css) {
  let count = 0;
  function inspect(text, keyframes) {
    let i = 0;
    while (i < text.length) {
      while (i < text.length && /\s/.test(text[i])) i++;
      if (i === text.length) break;
      const start = i;
      let depth = 0, quote = '', escape = false;
      for (; i < text.length; i++) {
        const c = text[i];
        if (escape) { escape = false; continue; }
        if (c === '\\') { escape = true; continue; }
        if (quote) { if (c === quote) quote = ''; continue; }
        if (c === '"' || c === "'") { quote = c; continue; }
        if (c === '(' || c === '[') depth++;
        if (c === ')' || c === ']') depth--;
        if (c === ';' && depth === 0) throw Error('Unsupported CSS statement');
        if (c === '{' && depth === 0) break;
      }
      if (i === text.length) throw Error('Unclosed CSS rule');
      const header = text.slice(start, i).trim(), bodyStart = ++i;
      let braces = 1;
      quote = ''; escape = false;
      for (; i < text.length; i++) {
        const c = text[i];
        if (escape) { escape = false; continue; }
        if (c === '\\') { escape = true; continue; }
        if (quote) { if (c === quote) quote = ''; continue; }
        if (c === '"' || c === "'") { quote = c; continue; }
        if (c === '{') braces++;
        if (c === '}' && --braces === 0) break;
      }
      if (braces) throw Error('Unclosed CSS body');
      const body = text.slice(bodyStart, i++);
      if (/^@media\b/.test(header)) inspect(body, false);
      else if (/^@keyframes seo-owner-[\w-]+$/.test(header)) inspect(body, true);
      else if (header.startsWith('@')) throw Error('Unsupported CSS at-rule: ' + header);
      else if (keyframes) {
        if (selectors(header).some(s => !/^(?:from|to|[\d.]+%)$/.test(s))) throw Error('Unexpected keyframe selector');
      } else {
        for (const selector of selectors(header)) {
          if (!/^(?:html(?:\[[^\]]+\])?\s+)?(?:main)?\.rf-seo-owner\b/.test(selector)) {
            throw Error('Unscoped SEO rule: ' + selector);
          }
          if (/\.rf-(?:home|about|case|work)-page\b|\.rf-page\b|:root/.test(selector)) {
            throw Error('Unrelated page dependency: ' + selector);
          }
          count++;
        }
      }
    }
  }
  inspect(css.replace(/\/\*[\s\S]*?\*\//g, ''), false);
  return count;
}

async function main() {
  const css = read('assets/css/seo-owner-review.css');
  const selectorCount = validateScope(css);
  const cssMin = (await esbuild.transform(css, { loader: 'css', minify: true, charset: 'utf8' })).code;
  validateScope(cssMin);
  const jsMin = (await esbuild.transform(read('assets/js/seo-owner-review.js'), { loader: 'js', minify: true, charset: 'utf8' })).code;
  const cssHash = sha(cssMin), jsHash = sha(jsMin);
  const manifest = "var z2oSeoOwnerAssets = {css:'/assets/css/seo-owner-review.min.css?v=" + cssHash + "',js:'/assets/js/seo-owner-review.min.js?v=" + jsHash + "'};";
  const originalMain = read('assets/js/index-new.js');
  const manifestPattern = /(?<=\/\/ BEGIN SEO OWNER ASSET MANIFEST[^\n]*\n)[\s\S]*?(?=\n\/\/ END SEO OWNER ASSET MANIFEST)/;
  if (!manifestPattern.test(originalMain)) throw Error('Missing SEO manifest markers');
  const mainSource = originalMain.replace(manifestPattern, manifest);
  const mainMin = (await esbuild.transform(mainSource, { loader: 'js', minify: true, charset: 'utf8' })).code;
  const outputs = {
    'assets/css/seo-owner-review.min.css': cssMin,
    'assets/js/seo-owner-review.min.js': jsMin,
    'assets/js/index-new.js': mainSource,
    'assets/js/index-new.min.js': mainMin
  };
  for (const [file, contents] of Object.entries(outputs)) {
    if (check) {
      if (!fs.existsSync(path.join(root, file)) || read(file) !== contents) throw Error('Stale dependency: ' + file);
    } else fs.writeFileSync(path.join(root, file), contents);
  }
  console.log(JSON.stringify({ checked: check, selectorCount, cssHash, jsHash, mainHash: sha(mainMin) }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
