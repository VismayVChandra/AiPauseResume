// Minimal inline-markdown parser for resume bullets: **bold** and
// _italic_/*italic* only, no nesting, no other markdown. Users type these
// markers directly in a bullet field; both the PDF and DOCX renderers turn
// the result into styled runs instead of literal asterisks/underscores.

export interface RichSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

const TOKEN_PATTERN = /(\*\*.+?\*\*|_.+?_|\*.+?\*)/g;

export function parseInlineMarkdown(text: string): RichSegment[] {
  if (!text) return [{ text: "" }];
  const parts = text.split(TOKEN_PATTERN).filter((p) => p !== "");
  const segments: RichSegment[] = [];

  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      segments.push({ text: part.slice(2, -2), bold: true });
    } else if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      segments.push({ text: part.slice(1, -1), italic: true });
    } else if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      segments.push({ text: part.slice(1, -1), italic: true });
    } else {
      segments.push({ text: part });
    }
  }
  return segments;
}
