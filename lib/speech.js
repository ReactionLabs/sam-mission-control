// Speakable prose, the app-side mirror of the door's cleaning
// (member-mm-voice.ts): a chat reply is written for eyes, so
// before any of it is read aloud the code blocks and the Sources
// tail come off, markdown marks come off, links keep their
// words, and citation brackets go quiet. The door cleans again
// on its side, so the two never fight.

export function cleanForSpeech(text) {
  let out = String(text ?? "");
  out = out.replace(/```[\s\S]*?(```|$)/g, " ");
  out = out.replace(/`([^`]*)`/g, "$1");
  const kept = [];
  for (const line of out.split(/\r?\n/)) {
    if (/^\s*sources\s*:/i.test(line)) break;
    kept.push(line);
  }
  out = kept.join(" ");
  out = out.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  out = out.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  out = out.replace(/\[\d+\]/g, "");
  out = out.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  out = out.replace(/^\s*>\s?/gm, "");
  out = out.replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "");
  out = out.replace(/(\*\*|__)(.*?)\1/g, "$2");
  out = out.replace(/(\*|_)(.*?)\1/g, "$2");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

/** Sentence-sized chunks for one-synthesis-per-sentence speech:
 *  tiny fragments fold into their neighbour, run-ons are cut at
 *  a comma or a space. Same rules as the door's splitter. */
export function splitSentences(text) {
  const clean = cleanForSpeech(text);
  if (!clean) return [];
  const parts = clean.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g) || [clean];
  const sentences = [];
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    if (sentences.length && (part.length < 12 || sentences[sentences.length - 1].length < 12)) {
      sentences[sentences.length - 1] = (sentences[sentences.length - 1] + " " + part).trim();
    } else sentences.push(part);
  }
  const out = [];
  for (const sentence of sentences) {
    let rest = sentence;
    while (rest.length > 280) {
      let cut = rest.lastIndexOf(", ", 280);
      if (cut < 120) cut = rest.lastIndexOf(" ", 280);
      if (cut < 120) cut = 280;
      out.push(rest.slice(0, cut + (rest[cut] === "," ? 1 : 0)).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) out.push(rest);
  }
  return out.filter((s) => s.length > 0);
}
