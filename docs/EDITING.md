# Editing the website text

Blocks are Markdown files in `content/blocks/`: `HERO.md` is English, `HERO.de.md` is the same block in German. Short texts are in `i18n/en.yaml` and `i18n/de.yaml`. Every block needs both files; a short text missing in German comes from English.

- `HERO.md`, `WELCOME.md`, `SERVICES.md`, `JOURNEY.md`, `ABOUT.md`, `FOOTER-CONTACT.md` hold the text blocks of the page.
- `LEGAL-NOTICE.md` (Impressum in German) and `PRIVACY.md` (Datenschutz) hold the legal texts. They open as pop-up windows on the page.
- `i18n/en.yaml` and `i18n/de.yaml` hold short texts: page title, menu labels, button labels, image descriptions.

The page template `layouts/home.html` places each block by name (`WELCOME.md`). The name must match the file exactly, including upper and lower case. Strings such as `menu_home` are keys from the i18n files.

Markdown basics:

- Empty line = new paragraph.
- `**bold**`, `*italic*`, `[link text](https://example.com)`.
- In `WELCOME.md`, `## Heading` starts a new heading.
- In `SERVICES.md`, each `### Title` starts a new numbered item. An item may have several paragraphs. The layout is designed for 9–10 items.
- In `FOOTER-CONTACT.md` and `LEGAL-NOTICE.md`, a `\` at the end of a line forces a line break.
- In `LEGAL-NOTICE.md` and `PRIVACY.md`, start with `##` for the title, then use `###` and `####` for lower headings.

`i18n/*.yaml`:

- Each line is `key: text`. Keys use lowercase letters, digits and `_` only.
- If a text contains `:` or `#`, wrap it in double quotes, e.g. `title: "Unfolding Portugal: Algarve"`.
- Never leave a text empty.
- Do not use the keys `description`, `other`, `one`, `two`, `few`, `many`, `zero`, `id`, `hash` or `translation`. Hugo reads them as plural forms and every text turns empty.

Change a file on GitHub (pencil icon → "Commit changes" to `main`) and the site rebuilds and publishes within a few minutes. If the build fails, the old site stays online and the failed run under the repository's *Actions* tab shows why.

Do not add new files here: the page template decides which blocks and keys exist. If a block or key is in neither language, the build fails. A text in the German files wins over the same English text.

## Edit in the browser

You can also edit the text on the live page. Add `?edit` to the end of the address, e.g. https://cawoodm.github.io/site-unfolding.pt/en/?edit.

- Your edits are kept in this browser until you click **Publish**.
- Publish commits the changes to GitHub. The site rebuilds and goes live within a few minutes.
- You need a GitHub token to publish. Set it in the ⚙ settings, or open the setup link the site owner sends you: it fills in all settings at once. Keep that link private, because it contains the token.
