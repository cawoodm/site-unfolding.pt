// Mini CMS: renders templates/home.html once per language into www/<lang>/index.html.
//
// Placeholders in the template:
//   ##KEY##        content/<lang>/<key>.md as HTML (KEY_PART -> key-part.md),
//                  or else the HTML-escaped string <key> from content/<lang>/site.yml
//   ##KEY:items##  the .md file split at "### " headings, one <li> per section
//   ##LANG## ##CANONICAL## ##ALTERNATES## ##LANG_SWITCH##  computed per language
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Marked } from 'marked';
import { parse as parseYaml } from 'yaml';

const ROOT = resolve(import.meta.dirname, '..');
export const CONTENT_DIR = join(ROOT, 'content');
export const TEMPLATE = join(ROOT, 'templates', 'home.html');
export const LANGUAGES = ['en', 'de'];
const SITE_URL = 'https://unfolding.pt';

const marked = new Marked({ gfm: true });

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function renderItems(markdown) {
  return markdown
    .split(/^(?=### )/m)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<li>${marked.parse(part).trim()}</li>`)
    .join('\n');
}

export function renderPage(template, { lang, languages, blocks, strings }) {
  for (const key of Object.keys(strings)) {
    if (key.replaceAll('_', '-') in blocks) throw new Error(`${lang}: "${key}" is both ${key.replaceAll('_', '-')}.md and a site.yml key`);
  }
  const builtins = {
    lang: () => lang,
    canonical: () => `${SITE_URL}/${lang}/`,
    alternates: () => languages.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE_URL}/${l}/">`).join('\n  '),
    lang_switch: () =>
      languages
        .map((l) =>
          l === lang
            ? `<span aria-current="true" class="font-bold">${l.toUpperCase()}</span>`
            : `<a href="../${l}/" hreflang="${l}" lang="${l}" class="hover:underline">${l.toUpperCase()}</a>`)
        .join('<span aria-hidden="true">|</span>'),
  };
  const usedBlocks = new Set();
  const usedStrings = new Set();

  const html = template.replace(/##([A-Z0-9_]+)(?::(items))?##/g, (_, key, mode) => {
    const name = key.toLowerCase();
    const file = name.replaceAll('_', '-');
    if (builtins[name]) return builtins[name]();
    if (file in blocks) {
      usedBlocks.add(file);
      return mode === 'items' ? renderItems(blocks[file]) : marked.parse(blocks[file]).trim();
    }
    if (name in strings) {
      usedStrings.add(name);
      return escapeHtml(strings[name]);
    }
    throw new Error(`${lang}: no content for placeholder ##${key}## (add content/${lang}/${file}.md or "${name}" to content/${lang}/site.yml)`);
  });

  const unused = [
    ...Object.keys(blocks).filter((k) => !usedBlocks.has(k)),
    ...Object.keys(strings).filter((k) => !usedStrings.has(k)),
  ];
  if (unused.length) throw new Error(`${lang}: content not used by the template: ${unused.join(', ')}`);
  return html;
}

export function loadLanguage(dir) {
  const blocks = {};
  let strings = {};
  for (const file of readdirSync(dir).sort()) {
    const path = join(dir, file);
    if (file.endsWith('.md')) blocks[file.slice(0, -3)] = readFileSync(path, 'utf8');
    else if (file === 'site.yml') strings = parseYaml(readFileSync(path, 'utf8')) ?? {};
    else throw new Error(`${path}: only .md files and site.yml are allowed`);
  }
  return { blocks, strings };
}

export function buildContent() {
  const template = readFileSync(TEMPLATE, 'utf8');
  for (const lang of LANGUAGES) {
    const html = renderPage(template, { lang, languages: LANGUAGES, ...loadLanguage(join(CONTENT_DIR, lang)) });
    mkdirSync(join(ROOT, 'www', lang), { recursive: true });
    writeFileSync(join(ROOT, 'www', lang, 'index.html'), html);
  }
  return LANGUAGES;
}

// `npm run content` renders without building.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  console.log(`Rendered: ${buildContent().map((l) => `www/${l}/index.html`).join(', ')}`);
}
