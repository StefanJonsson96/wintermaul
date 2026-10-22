// Packs the stand-alone build (vite build --mode artifact) into one page for claude.ai: just the
// page content (the host adds <html>, <head> and <body>), with the script and styles inline and
// the fonts from Google Fonts.  npm run build:artifact  ->  dist/artifact/winterward.html
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist/artifact';
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const assets = readdirSync(join(dir, 'assets'));
const js = assets.filter((f) => f.endsWith('.js'));
const css = assets.filter((f) => f.endsWith('.css'));
const other = assets.filter((f) => !f.endsWith('.js') && !f.endsWith('.css'));
if (js.length !== 1 || css.length !== 1 || other.length) throw new Error(`expected one script and one stylesheet, found: ${assets.join(', ')}`);

const read = (f) => readFileSync(join(dir, 'assets', f), 'utf8');
// a literal "</script" inside the code would end the inline script early
const script = read(js[0]).replace(/<\/script/gi, '<\\/script');
const style = read(css[0]).replace(/<\/style/gi, '<\\/style');
const body = html
  .slice(html.indexOf('<body>') + '<body>'.length, html.indexOf('</body>'))
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '')
  .trim();

const page = `<title>Winterward</title>
<meta name="description" content="Co-op maze tower defense in the spirit of Wintermaul: tutorial, campaign and skirmish.">
<meta name="theme-color" content="#0b1220">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;600;700;800&display=swap">
<style>
:root { color-scheme: dark; }
${style}
</style>
${body}
<script type="module">
${script}
</script>
`;
const out = join(dir, 'winterward.html');
writeFileSync(out, page);
console.log(`${out}: ${(page.length / 1024).toFixed(0)} KB`);
