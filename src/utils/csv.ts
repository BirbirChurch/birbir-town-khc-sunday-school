import * as XLSX from 'xlsx';

/**
 * Utility to download CSV files with UTF-8 BOM so Amharic text opens cleanly in MS Excel
 */
export const downloadCSV = (csvContent: string, filename: string) => {
  const bom = '\uFEFF';
  const content = csvContent.startsWith(bom) ? csvContent : bom + csvContent;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export const downloadXLSX = (data: (string | number)[][], filename: string) => {
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

export const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === '\t' || char === ';') && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
};

/**
 * Helper to read any Excel (.xlsx, .xls) or CSV/text file asynchronously.
 * Uses SheetJS (xlsx) for native Excel support and falls back to multi-encoding TextDecoder (UTF-8, UTF-16LE, UTF-16BE) for CSVs.
 */
export const readCSVFile = (file: File): Promise<string[][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength === 0) return resolve([]);

        // Try parsing with SheetJS (XLSX) first
        try {
          const workbook = XLSX.read(buffer, { type: 'array', codepage: 65001 });
          const firstSheetName = workbook.SheetNames[0];
          if (firstSheetName) {
            const worksheet = workbook.Sheets[firstSheetName];
            const rawRows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, {
              header: 1,
              raw: false,
              defval: ''
            });

            if (rawRows && rawRows.length > 0) {
              const cleanRows = rawRows
                .map((row) =>
                  Array.isArray(row)
                    ? row.map((cell) => (cell !== null && cell !== undefined ? String(cell).trim() : ''))
                    : []
                )
                .filter((row) => row.some((cell) => cell.length > 0));

              if (cleanRows.length > 0) {
                return resolve(cleanRows);
              }
            }
          }
        } catch {
          // SheetJS parse failed, proceed to custom BOM / multi-encoding text decoding
        }

        // Custom multi-encoding fallback for text/CSV
        const bytes = new Uint8Array(buffer);
        let text = '';

        if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
          text = new TextDecoder('utf-16le').decode(buffer);
        } else if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
          text = new TextDecoder('utf-16be').decode(buffer);
        } else if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
          text = new TextDecoder('utf-8').decode(buffer);
        } else {
          try {
            const decoder = new TextDecoder('utf-8', { fatal: true });
            text = decoder.decode(buffer);
          } catch {
            try {
              text = new TextDecoder('utf-16le').decode(buffer);
            } catch {
              text = new TextDecoder('utf-8').decode(buffer);
            }
          }
        }

        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1);
        }

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const parsed = lines.map((l) => parseCSVLine(l));
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

