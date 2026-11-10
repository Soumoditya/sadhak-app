// Devanagari → Bengali script, letter for letter. Panchang names (tithi,
// nakshatra, month) are stored in Devanagari; Bengali readers get them in
// their own script without a second table.
const SPECIAL: Record<number, string> = {
  0x090d: 'এ', 0x090e: 'এ', 0x0911: 'ও', 0x0912: 'ও', 0x0929: 'ন', 0x0931: 'র', 0x0933: 'ল', 0x0934: 'ল', 0x0935: 'ব',
  0x0945: 'ে', 0x0946: 'ে', 0x0949: 'ো', 0x094a: 'ো', 0x0950: 'ওঁ',
  0x0958: 'ক', 0x0959: 'খ', 0x095a: 'গ', 0x095b: 'জ', 0x095e: 'ফ',
};

export function devaToBengali(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 0x0900 || c > 0x096f || c === 0x0964 || c === 0x0965) { out += ch; continue; }
    out += SPECIAL[c] ?? String.fromCodePoint(c + 0x80);
  }
  return out;
}
