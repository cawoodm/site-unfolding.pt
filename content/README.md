# Editing the website text

Each language has a folder: `en/` (English) and `de/` (German).

- `hero.md`, `welcome.md`, `services.md`, `journey.md`, `about.md`, `footer-contact.md` hold the text blocks of the home page.
- `site.yml` holds short texts: page title, menu labels, button labels, image descriptions.

Markdown basics:

- Empty line = new paragraph.
- `**bold**`, `*italic*`, `[link text](https://example.com)`.
- In `welcome.md`, `## Heading` starts a new heading.
- In `services.md`, each `### Title` starts a new numbered item.
- In `footer-contact.md`, a `\` at the end of a line forces a line break.

Change a file on GitHub (pencil icon → "Commit changes" to `main`) and the site rebuilds and publishes within a few minutes. If the build fails, the old site stays online and the failed run under the repository's *Actions* tab shows why.

Every block must exist in both languages. Do not add new files here: the page template decides which blocks exist.
