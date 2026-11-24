// Mini CMS renderer: turns www/index.html (the single template) into one page per language.
//
// Placeholders in the template:
//   ##NAME.md##        content/<lang>/NAME.md as HTML (exact, case-sensitive file name)
//   ##NAME.md:items##  the .md file split at "### " headings, one <li> per section
//   ##lower_key##      the HTML-escaped string <lower_key> from content/<lang>/site.yml
//   ##UPPER_NAME##     built-ins, computed per language: LANG, HEAD_LINKS, LANG_SWITCH
// Vite calls renderLanguage() per request in dev and once per language after the build.
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Marked } from 'marked';
import { parse as parseYaml } from 'yaml';

const ROOT = resolve(import.meta.dirname, '..');
export const CONTENT_DIR = join(ROOT, 'content');
export const TEMPLATE = join(ROOT, 'www', 'index.html');
export const LANGUAGES = ['en', 'de'];
const SITE_URL = 'https://unfolding.pt';

// Language redirect page (dist/index.html and "/" in dev). It has no assets of its own.
export const REDIRECT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unfolding Portugal</title>
  <script>
    // Go to German if the browser ranks German above English, otherwise to English.
    const preferred = (navigator.languages || [navigator.language || ''])
      .map((lang) => lang.toLowerCase().slice(0, 2))
      .find((lang) => lang === 'de' || lang === 'en');
    location.replace(preferred === 'de' ? 'de/' : 'en/');
  </script>
  <noscript><meta http-equiv="refresh" content="0; url=en/"></noscript>
  <link rel="alternate" hreflang="en" href="${SITE_URL}/en/">
  <link rel="alternate" hreflang="de" href="${SITE_URL}/de/">
  <link rel="alternate" hreflang="x-default" href="${SITE_URL}/en/">
</head>
<body>
  <h1>unfolding.pt</h1>
  <p><a href="en/">English</a> | <a href="de/">Deutsch</a></p>
</body>
</html>
`;

const marked = new Marked({ gfm: true });

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function renderItems(markdown) {
  const parts = markdown
    .split(/^(?=### )/m)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length && !parts[0].startsWith('### ')) throw new Error('##…:items## block must start with a "### " heading, found text before it');
  // The <div> keeps the heading and all paragraphs together as one flex child.
  return parts.map((part) => `<li><div>${marked.parse(part).trim()}</div></li>`).join('\n');
}

export function renderPage(template, { lang, languages, blocks, strings }) {
  const builtins = {
    LANG: () => lang,
    HEAD_LINKS: () => [
      `<link rel="canonical" href="${SITE_URL}/${lang}/">`,
      ...languages.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE_URL}/${l}/">`),
      `<meta property="og:url" content="${SITE_URL}/${lang}/">`,
    ].join('\n  '),
    LANG_SWITCH: () =>
      languages
        .map((l) =>
          l === lang
            ? `<span aria-current="true" class="font-bold">${l.toUpperCase()}</span>`
            : `<a href="../${l}/" hreflang="${l}" lang="${l}" class="hover:underline">${l.toUpperCase()}</a>`)
        .join('<span aria-hidden="true">|</span>'),
  };
  const usedBlocks = new Set();
  const usedStrings = new Set();

  const html = template.replace(/##([A-Za-z0-9_.-]+?)(?::(items))?##/g, (_, key, mode) => {
    if (key.endsWith('.md')) {
      if (!(key in blocks)) throw new Error(`${lang}: no content for placeholder ##${key}## (expected file content/${lang}/${key}; the name is case-sensitive)`);
      usedBlocks.add(key);
      return mode === 'items' ? renderItems(blocks[key]) : marked.parse(blocks[key]).trim();
    }
    if (mode) throw new Error(`${lang}: ##${key}:${mode}## is only allowed on a .md placeholder`);
    if (/^[a-z0-9_]+$/.test(key)) {
      if (!(key in strings)) throw new Error(`${lang}: no content for placeholder ##${key}## (expected key "${key}" in content/${lang}/site.yml)`);
      usedStrings.add(key);
      return escapeHtml(strings[key]);
    }
    if (/^[A-Z0-9_]+$/.test(key) && builtins[key]) return builtins[key]();
    throw new Error(`${lang}: unknown placeholder ##${key}## (use ##NAME.md## for a file, ##lowercase_key## for site.yml, or a built-in: ${Object.keys(builtins).join(', ')})`);
  });

  const unused = [
    ...Object.keys(blocks).filter((k) => !usedBlocks.has(k)),
    ...Object.keys(strings).filter((k) => !usedStrings.has(k)),
  ];
  if (unused.length) throw new Error(`${lang}: content not used by the template: ${unused.join(', ')}`);
  return html;
}

function loadStrings(path) {
  const strings = parseYaml(readFileSync(path, 'utf8')) ?? {};
  if (typeof strings !== 'object' || Array.isArray(strings)) throw new Error(`${path}: must be a list of "key: text" lines`);
  for (const [key, value] of Object.entries(strings)) {
    if (!/^[a-z0-9_]+$/.test(key)) throw new Error(`${path}: key "${key}" must be lowercase letters, digits and "_" only`);
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${path}: "${key}" must be text; put it in double quotes if it contains ":" or "#"`);
  }
  return strings;
}

export function loadLanguage(dir) {
  const blocks = {};
  let strings = {};
  for (const file of readdirSync(dir).sort()) {
    const path = join(dir, file);
    if (file.endsWith('.md')) blocks[file] = readFileSync(path, 'utf8');
    else if (file === 'site.yml') strings = loadStrings(path);
    else throw new Error(`${path}: only .md files and site.yml are allowed`);
  }
  return { blocks, strings };
}

// Renders the template for one language with the content of content/<lang>/.
export function renderLanguage(templateHtml, lang) {
  return renderPage(templateHtml, { lang, languages: LANGUAGES, ...loadLanguage(join(CONTENT_DIR, lang)) });
}
