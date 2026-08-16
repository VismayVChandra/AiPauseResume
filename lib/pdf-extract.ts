// Extracts raw text from an uploaded LinkedIn "Save to PDF" export.
// Kept separate from AIService.extractProfile: this does dumb text
// extraction, AIService does the structuring.

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB — LinkedIn exports are small; generous ceiling

export class PdfValidationError extends Error {}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  if (buffer.length === 0) {
    throw new PdfValidationError("The uploaded file is empty.");
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new PdfValidationError("The uploaded file is too large (max 8MB).");
  }
  // Minimal signature check so we fail fast with a clear message instead of
  // a confusing parser stack trace on a non-PDF upload.
  const header = buffer.subarray(0, 5).toString("utf-8");
  if (header !== "%PDF-") {
    throw new PdfValidationError("The uploaded file doesn't look like a valid PDF.");
  }

  // pdf-parse is CJS; dynamic import keeps it out of the client bundle.
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);

  const text = (result.text || "").trim();
  if (text.length < 20) {
    throw new PdfValidationError(
      "Couldn't find readable text in this PDF. If it's a scanned image, try pasting your profile text instead."
    );
  }
  return text;
}
