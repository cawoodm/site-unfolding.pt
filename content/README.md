# Editing the website text

Each language has a folder: `en/` (English) and `de/` (German).

- `HERO.md`, `WELCOME.md`, `SERVICES.md`, `JOURNEY.md`, `ABOUT.md`, `FOOTER-CONTACT.md` hold the text blocks of the page.
- `LEGAL-NOTICE.md` (Impressum in German) and `PRIVACY.md` (Datenschutz) hold the legal texts. They open as pop-up windows on the page.
- `site.yml` holds short texts: page title, menu labels, button labels, image descriptions.

The page template `www/index.html` places each file with a placeholder like `##WELCOME.md##`. The file name in the placeholder must match the file exactly, including upper and lower case. Lowercase placeholders such as `##menu_home##` are keys from `site.yml`.

Markdown basics:

- Empty line = new paragraph.
- `**bold**`, `*italic*`, `[link text](https://example.com)`.
- In `WELCOME.md`, `## Heading` starts a new heading.
- In `SERVICES.md`, each `### Title` starts a new numbered item. An item may have several paragraphs. The layout is designed for 9–10 items.
- In `FOOTER-CONTACT.md` and `LEGAL-NOTICE.md`, a `\` at the end of a line forces a line break.
- In `LEGAL-NOTICE.md` and `PRIVACY.md`, start with `##` for the title, then use `###` and `####` for lower headings.

`site.yml`:

- Each line is `key: text`. Keys use lowercase letters, digits and `_` only.
- If a text contains `:` or `#`, wrap it in double quotes, e.g. `title: "Unfolding Portugal: Algarve"`.
- Never leave a text empty.

Change a file on GitHub (pencil icon → "Commit changes" to `main`) and the site rebuilds and publishes within a few minutes. If the build fails, the old site stays online and the failed run under the repository's *Actions* tab shows why.

Do not add new files here: the page template decides which blocks exist. English is the master: every block and key must exist in `en/`. If a German text is missing, the English text is used and the build log shows a warning.
