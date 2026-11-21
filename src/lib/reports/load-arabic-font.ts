/**
 * Loads the Amiri font (public/fonts, SIL Open Font License) as base64 for jsPDF.
 * Fetched only when an Arabic PDF is made; kept in memory after the first time.
 */
let cached: Promise<string | null> | null = null;

function toBase64(buffer: ArrayBuffer): string {
  // Convert in chunks: spreading 400 KB into String.fromCharCode at once overflows the stack.
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function loadArabicPdfFont(): Promise<string | null> {
  if (!cached) {
    cached = fetch("/fonts/Amiri-Regular.ttf")
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(String(res.status)))))
      .then((buffer) => {
        // Must really be a TrueType font (00 01 00 00), not an HTML page sent back by a redirect.
        const head = new Uint8Array(buffer, 0, 4);
        const isTrueType = head[0] === 0 && head[1] === 1 && head[2] === 0 && head[3] === 0;
        if (!isTrueType || buffer.byteLength < 10_000) throw new Error("not a font");
        return toBase64(buffer);
      })
      .catch(() => {
        cached = null; // try again next time (for example after coming back online)
        return null;
      });
  }
  return cached;
}
