// The built home pages must show exactly the text captured before the CMS migration.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { visibleText } from './text.mjs';

for (const lang of ['en', 'de']) {
  test(`${lang} home page text matches the snapshot`, () => {
    const built = readFileSync(new URL(`../dist/${lang}/index.html`, import.meta.url), 'utf8');
    const expected = readFileSync(new URL(`./fixtures/home-${lang}.txt`, import.meta.url), 'utf8').trim();
    assert.equal(visibleText(built), expected);
  });
}
