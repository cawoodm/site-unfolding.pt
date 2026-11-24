import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadLanguage, loadRoot, renderItems, renderPage } from '../scripts/build-content.mjs';

const base = { lang: 'en', languages: ['en', 'de'], blocks: {}, strings: {} };

test('##NAME.md## inserts the Markdown file as HTML', () => {
  const html = renderPage('<div>##HERO.md##</div>', { ...base, blocks: { 'HERO.md': '# unfolding\n\nA *gentle* start.' } });
  assert.equal(html, '<div><h1>unfolding</h1>\n<p>A <em>gentle</em> start.</p></div>');
});

test('the .md placeholder maps to the exact file name, with hyphens and case', () => {
  assert.equal(renderPage('##FOOTER-CONTACT.md##', { ...base, blocks: { 'FOOTER-CONTACT.md': 'Guia' } }), '<p>Guia</p>');
  assert.equal(renderPage('##WELCOME.md##', { ...base, blocks: { 'WELCOME.md': 'Hi' } }), '<p>Hi</p>');
});

test('a .md placeholder with a different case than the file fails the build', () => {
  assert.throws(() => renderPage('##welcome.md##', { ...base, blocks: { 'WELCOME.md': 'Hi' } }), /en: no content for placeholder ##welcome\.md## \(expected file content\/en\/welcome\.md/);
  assert.throws(() => renderPage('##WELCOME.MD##', { ...base, blocks: { 'WELCOME.md': 'Hi' } }), /unknown placeholder ##WELCOME\.MD##/);
});

test('##lowercase_key## inserts an escaped site.yml string', () => {
  const html = renderPage('<p title="##about_role##">##about_role##</p>', { ...base, strings: { about_role: 'Founder & "Host"' } });
  assert.equal(html, '<p title="Founder &amp; &quot;Host&quot;">Founder &amp; &quot;Host&quot;</p>');
});

test('a lowercase placeholder without a site.yml key fails the build', () => {
  assert.throws(() => renderPage('##missing_key##', base), /en: no content for placeholder ##missing_key## \(expected key "missing_key" in content\/en\/site\.yml\)/);
});

test('##NAME.md:items## renders one <li> per ### section', () => {
  assert.equal(renderItems('### A\n\nOne\n\n### B\n\nTwo'), '<li><div><h3>A</h3>\n<p>One</p></div></li>\n<li><div><h3>B</h3>\n<p>Two</p></div></li>');
  const html = renderPage('<ol>##SERVICES.md:items##</ol>', { ...base, blocks: { 'SERVICES.md': '### A\n\nOne' } });
  assert.equal(html, '<ol><li><div><h3>A</h3>\n<p>One</p></div></li></ol>');
});

test('##NAME.md:items## keeps several paragraphs in one item', () => {
  assert.equal(renderItems('### A\n\nOne\n\nTwo'), '<li><div><h3>A</h3>\n<p>One</p>\n<p>Two</p></div></li>');
});

test('##NAME.md:items## fails on text before the first ### heading', () => {
  assert.throws(() => renderItems('Intro\n\n### A\n\nOne'), /must start with a "### " heading/);
  assert.throws(() => renderPage('##S.md:items##', { ...base, blocks: { 'S.md': 'Intro' } }), /must start with a "### " heading/);
});

test(':items is only allowed on a .md placeholder', () => {
  assert.throws(() => renderPage('##title:items##', { ...base, strings: { title: 'x' } }), /only allowed on a \.md placeholder/);
});

test('built-ins: LANG, HEAD_LINKS, LANG_SWITCH', () => {
  const html = renderPage('##LANG##|##HEAD_LINKS##|##LANG_SWITCH##', { ...base, lang: 'de' });
  assert.equal(html, [
    'de',
    [
      '<link rel="canonical" href="https://unfolding.pt/de/">',
      '<link rel="alternate" hreflang="en" href="https://unfolding.pt/en/">',
      '<link rel="alternate" hreflang="de" href="https://unfolding.pt/de/">',
      '<meta property="og:url" content="https://unfolding.pt/de/">',
    ].join('\n  '),
    '<li><a href="../en/" hreflang="en" lang="en" class="block px-4 py-2 hover:bg-mist/40">English</a></li><li><span aria-current="true" lang="de" class="block px-4 py-2 font-bold">Deutsch</span></li>',
  ].join('|'));
});

test('an unknown uppercase or mixed-case placeholder fails the build', () => {
  assert.throws(() => renderPage('##UNKNOWN##', base), /en: unknown placeholder ##UNKNOWN##/);
  assert.throws(() => renderPage('##Welcome##', base), /en: unknown placeholder ##Welcome##/);
});

test('content the template does not use fails the build', () => {
  assert.throws(() => renderPage('##HERO.md##', { ...base, blocks: { 'HERO.md': 'x', 'EXTRA.md': 'y' } }), /en: content not used by the template: EXTRA\.md/);
});

test('a site.yml string the template does not use fails the build', () => {
  assert.throws(() => renderPage('##HERO.md##', { ...base, blocks: { 'HERO.md': 'x' }, strings: { extra: 'y' } }), /en: content not used by the template: extra/);
});

function withDir(files, check) {
  const dir = mkdtempSync(join(tmpdir(), 'content-'));
  try {
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
    check(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('loadLanguage reads .md files and site.yml and rejects other files', () => {
  withDir({ 'HERO.md': '# Hi', 'site.yml': 'title: Unfolding Portugal | Algarve\nabout_role: Founder & Host\n' }, (dir) => {
    assert.deepEqual(loadLanguage(dir), { blocks: { 'HERO.md': '# Hi' }, strings: { title: 'Unfolding Portugal | Algarve', about_role: 'Founder & Host' } });
    writeFileSync(join(dir, 'notes.txt'), 'x');
    assert.throws(() => loadLanguage(dir), /notes\.txt: only \.md files and site\.yml are allowed/);
  });
});

test('site.yml must be a list of key: text lines', () => {
  withDir({ 'site.yml': 'just some text\n' }, (dir) => {
    assert.throws(() => loadLanguage(dir), /site\.yml: must be a list of "key: text" lines/);
  });
});

test('a site.yml value must be non-empty text', () => {
  withDir({ 'site.yml': 'title:\n' }, (dir) => {
    assert.throws(() => loadLanguage(dir), /"title" must be text; put it in double quotes/);
  });
  withDir({ 'site.yml': 'title: 2024\n' }, (dir) => {
    assert.throws(() => loadLanguage(dir), /"title" must be text; put it in double quotes/);
  });
});

test('a site.yml key must be lowercase letters, digits and underscores', () => {
  withDir({ 'site.yml': 'Title: x\n' }, (dir) => {
    assert.throws(() => loadLanguage(dir), /key "Title" must be lowercase/);
  });
  withDir({ 'site.yml': 'menu-home: x\n' }, (dir) => {
    assert.throws(() => loadLanguage(dir), /key "menu-home" must be lowercase/);
  });
});

const root = { blocks: { 'ABOUT.md': 'Root *about*', 'SERVICES.md': '### A\n\nOne' }, strings: { pagetitle: 'Fish & Chips' } };
const de = { ...base, lang: 'de' };
const rootStrings = { blocks: {}, strings: root.strings };

test('a key missing in de falls back to the escaped root string', () => {
  assert.equal(renderPage('##pagetitle##', { ...de, fallback: rootStrings }), 'Fish &amp; Chips');
});

test('a key missing in en also falls back to the root', () => {
  assert.equal(renderPage('##pagetitle##', { ...base, fallback: rootStrings }), 'Fish &amp; Chips');
});

test('a missing .md file falls back to the root block, also with :items', () => {
  assert.equal(renderPage('##ABOUT.md##', { ...de, fallback: { blocks: { 'ABOUT.md': root.blocks['ABOUT.md'] }, strings: {} } }), '<p>Root <em>about</em></p>');
  assert.equal(renderPage('<ol>##SERVICES.md:items##</ol>', { ...base, fallback: { blocks: { 'SERVICES.md': root.blocks['SERVICES.md'] }, strings: {} } }), '<ol><li><div><h3>A</h3>\n<p>One</p></div></li></ol>');
});

test('own-language content wins over the root', () => {
  assert.equal(renderPage('##pagetitle##', { ...de, strings: { pagetitle: 'Titel' }, fallback: rootStrings }), 'Titel');
  assert.equal(renderPage('##ABOUT.md##', { ...de, blocks: { 'ABOUT.md': 'Über' }, fallback: { blocks: { 'ABOUT.md': 'x' }, strings: {} } }), '<p>Über</p>');
});

test('content missing in the language and in the root names both files', () => {
  assert.throws(() => renderPage('##nope##', { ...de, fallback: rootStrings }), /de: no content for placeholder ##nope## \(expected key "nope" in content\/de\/site\.yml and content\/site\.yml\)/);
  assert.throws(() => renderPage('##NOPE.md##', { ...de, fallback: rootStrings }), /de: no content for placeholder ##NOPE\.md## \(expected file content\/de\/NOPE\.md and content\/NOPE\.md;/);
});

test('without a root, missing content still fails', () => {
  assert.throws(() => renderPage('##pagetitle##', base), /en: no content for placeholder ##pagetitle## \(expected key "pagetitle" in content\/en\/site\.yml\)/);
});

test('the per-language unused-content check ignores root content', () => {
  assert.throws(() => renderPage('##pagetitle##', { ...de, blocks: { 'EXTRA.md': 'y' }, fallback: rootStrings }), /de: content not used by the template: EXTRA\.md/);
  assert.throws(() => renderPage('##pagetitle##', { ...de, strings: { extra: 'y' }, fallback: rootStrings }), /de: content not used by the template: extra/);
});

test('a root key or file the template never references fails the build', () => {
  assert.throws(() => renderPage('##pagetitle##', { ...de, fallback: { blocks: {}, strings: { pagetitle: 'x', stray: 'y' } } }), /content\/: content not used by the template: stray/);
  assert.throws(() => renderPage('##pagetitle##', { ...de, fallback: { blocks: root.blocks, strings: root.strings } }), /content\/: content not used by the template: ABOUT\.md, SERVICES\.md/);
});

test('a root key overridden in the language still counts as used', () => {
  assert.equal(renderPage('##pagetitle##', { ...de, strings: { pagetitle: 'Titel' }, fallback: rootStrings }), 'Titel');
});

const on = { ...base, markers: true };

test('markers are off by default', () => {
  assert.equal(renderPage('##HERO.md##|##t##', { ...base, blocks: { 'HERO.md': 'x' }, strings: { t: 'y' } }), '<p>x</p>|y');
});

test('markers wrap a block and an :items block', () => {
  assert.equal(renderPage('##HERO.md##', { ...on, blocks: { 'HERO.md': 'x' } }), '<!--cms:HERO.md--><p>x</p><!--/cms-->');
  assert.equal(
    renderPage('<ol>##S.md:items##</ol>', { ...on, blocks: { 'S.md': '### A\n\nOne' } }),
    '<ol><!--cms:S.md:items--><li><div><h3>A</h3>\n<p>One</p></div></li><!--/cms--></ol>',
  );
});

test('markers wrap a string in text context only', () => {
  const strings = { t: 'A & B' };
  assert.equal(renderPage('<p>##t##</p>', { ...on, strings, blocks: {} }), '<p><!--cms:t-->A &amp; B<!--/cms--></p>');
  assert.equal(renderPage('<img alt="##t##" title=\'##t##\'><p>##t##</p>', { ...on, strings }), '<img alt="A &amp; B" title=\'A &amp; B\'><p><!--cms:t-->A &amp; B<!--/cms--></p>');
});

test('markers skip strings in <title>, <textarea>, <script> and <style>', () => {
  const strings = { t: 'x' };
  for (const tag of ['title', 'textarea', 'script', 'style']) {
    assert.equal(renderPage(`<${tag}>##t##</${tag}>`, { ...on, strings }), `<${tag}>x</${tag}>`, tag);
  }
  assert.equal(renderPage('<title>a</title><p>##t##</p>', { ...on, strings }), '<title>a</title><p><!--cms:t-->x<!--/cms--></p>');
});

test('markers never wrap built-ins', () => {
  assert.doesNotMatch(renderPage('##LANG##|##HEAD_LINKS##|##LANG_SWITCH##', on), /cms/);
});

test('root content has plain markers, without a suffix', () => {
  assert.equal(renderPage('##ABOUT.md##', { ...de, markers: true, fallback: { blocks: { 'ABOUT.md': root.blocks['ABOUT.md'] }, strings: {} } }), '<!--cms:ABOUT.md--><p>Root <em>about</em></p><!--/cms-->');
  assert.equal(renderPage('<p>##pagetitle##</p>', { ...de, markers: true, fallback: rootStrings }), '<p><!--cms:pagetitle-->Fish &amp; Chips<!--/cms--></p>');
  assert.equal(renderPage('<img alt="##pagetitle##">', { ...de, markers: true, fallback: rootStrings }), '<img alt="Fish &amp; Chips">');
});

test('loadRoot reads .md files and site.yml, skips language folders and a missing folder', () => {
  withDir({ 'site.yml': 'pagetitle: Unfolding Portugal\n', 'SHARED.md': 'x' }, (dir) => {
    mkdirSync(join(dir, 'en'));
    writeFileSync(join(dir, 'en', 'HERO.md'), 'y');
    assert.deepEqual(loadRoot(dir), { blocks: { 'SHARED.md': 'x' }, strings: { pagetitle: 'Unfolding Portugal' } });
    writeFileSync(join(dir, 'notes.txt'), 'x');
    assert.throws(() => loadRoot(dir), /notes\.txt: only \.md files and site\.yml are allowed/);
  });
  assert.deepEqual(loadRoot(join(tmpdir(), 'does-not-exist-content')), { blocks: {}, strings: {} });
});
