// A small, safe markdown reader for artifact documents. SAM's
// artifacts are data, never instructions, and this renderer keeps
// that posture on the glass: every character of the source is
// HTML-escaped FIRST, and the only tags in the output are the ones
// this file mints itself for the plain subset a brief or document
// uses (headings, paragraphs, lists, quotes, code, bold, italic,
// and http(s) links). No raw HTML from an artifact ever reaches
// the page.

function esc(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text) {
  let out = esc(text);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
  return out;
}

export function renderMarkdown(source) {
  const lines = String(source ?? "").split(/\r?\n/);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      blocks.push("<pre><code>" + esc(buf.join("\n")) + "</code></pre>");
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 4);
      blocks.push("<h" + level + ">" + inline(heading[2]) + "</h" + level + ">");
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push("<hr />"); i++; continue; }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, "")); i++; }
      blocks.push("<ul>" + items.map((item) => "<li>" + inline(item) + "</li>").join("") + "</ul>");
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.)]\s+/, "")); i++; }
      blocks.push("<ol>" + items.map((item) => "<li>" + inline(item) + "</li>").join("") + "</ol>");
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
      blocks.push("<blockquote>" + inline(buf.join(" ")) + "</blockquote>");
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !/^```/.test(lines[i]) && !/^>\s?/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push("<p>" + inline(buf.join(" ")) + "</p>");
  }
  return blocks.join("\n");
}
