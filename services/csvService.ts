import { PartData, Word } from '../types';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTrV7dL1Po9d0XS6hI90aPzuXqO21lghMcw5SjcIGOy3j4b1glE4TA8YgsqHMqoiKklaBydSQCHgpZn/pub?output=csv';

// Helper to parse CSV line respecting quotes
const parseCSVLine = (text: string): string[] => {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuote) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cur += char;
      }
    } else {
      if (char === '"') {
        inQuote = true;
      } else if (char === ',') {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
  }
  result.push(cur.trim());
  return result;
};

export const fetchAndParseCSV = async (): Promise<PartData[]> => {
  try {
    const response = await fetch(CSV_URL);
    const text = await response.text();
    
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);
    const partsMap: { [key: string]: PartData } = {};
    const columnMapping: { index: number; partName: string; type: 'eng' | 'tr' }[] = [];

    // Map columns to parts based on logic: Pair 0-1 is Part X, Pair 2-3 is Part Y
    // The user image shows "PART 1, PART 1, PART 2, PART 2"
    for (let i = 0; i < headers.length; i += 2) {
      if (i + 1 >= headers.length) break;
      
      const partName = headers[i].trim();
      if (!partName) continue;

      if (!partsMap[partName]) {
        partsMap[partName] = { name: partName, words: [] };
      }

      // We associate column i with English and i+1 with Turkish for this part
      columnMapping.push({ index: i, partName, type: 'eng' });
      columnMapping.push({ index: i + 1, partName, type: 'tr' });
    }

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const rowValues = parseCSVLine(lines[i]);
      
      // Iterate by pairs again to extract words
      for (let j = 0; j < columnMapping.length; j += 2) {
        if (j + 1 >= columnMapping.length) break;

        const colEng = columnMapping[j];
        const colTr = columnMapping[j+1];

        // Safety check: ensure we are looking at the same part pair
        if (colEng.partName !== colTr.partName) continue;

        const engVal = rowValues[colEng.index];
        const trVal = rowValues[colTr.index];

        if (engVal && trVal) {
          const partData = partsMap[colEng.partName];
          partData.words.push({
            id: `${colEng.partName}-${i}-${j}`, // Unique ID
            english: engVal,
            turkish: trVal,
            part: colEng.partName
          });
        }
      }
    }

    return Object.values(partsMap);
  } catch (error) {
    console.error("Failed to parse CSV", error);
    throw error;
  }
};