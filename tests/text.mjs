// Title, meta description and visible body text of a page, whitespace-normalised.
// Used to prove that the CMS renders exactly the same text as before.
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

export function visibleText(html) {
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  const body = html
    .slice(html.indexOf('<body'))
    .replace(/<(svg|script|style)\b[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  return [title, description, body]
    .join('\n')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
    .replace(/[ \t\r\n]+/g, ' ')
    .trim();
}
