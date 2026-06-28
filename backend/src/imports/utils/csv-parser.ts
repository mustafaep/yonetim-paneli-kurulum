/**
 * CSV satır parser'ı. Tırnak içindeki ayırıcıları korur.
 * Hem virgül (,) hem noktalı virgül (;) desteklenir (Türkçe Excel uyumu).
 */
export function parseCsvLine(
  line: string,
  delimiter: ',' | ';' = ',',
): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * İlk satıra bakarak ayırıcıyı tespit eder.
 * Noktalı virgül varsa (Türkçe Excel) onu kullanır, yoksa virgül.
 */
function detectDelimiter(firstLine: string): ',' | ';' {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas && semicolons > 0 ? ';' : ',';
}

/**
 * Buffer'dan CSV satırlarını döndürür (header + data).
 * BOM ve \r\n / \n farklarını normalize eder.
 * Virgül ve noktalı virgül ayırıcıyı otomatik tespit eder.
 */
export function parseCsvBuffer(buffer: Buffer): {
  headers: string[];
  rows: string[][];
} {
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter);
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    rows.push(parseCsvLine(lines[i], delimiter));
  }
  return { headers, rows };
}
