import Papa from 'papaparse';
import { ChartRecord, DSPPlatform, HighlightRecord, ImportedDocument } from '../types';

export interface ExtractedPeriod {
  periodString: string;
  isIdentified: boolean;
  startDate?: string;
  endDate?: string;
}

/**
 * Extracts weekly period from file name.
 * Examples:
 * - "charts_spotify_2024_10_14_a_2024_10_20.csv" -> "14/10/2024 a 20/10/2024"
 * - "deezer_14-10-2024_20-10-2024.csv" -> "14/10/2024 a 20/10/2024"
 * - "Top50_07_10_a_13_10_2024.csv" -> "07/10 a 13/10/2024"
 * - "chart_semana_42_2024.csv" -> "Semana 42/2024"
 * - "2024-W42.csv" -> "Semana 42/2024"
 * - "Apple_Music_2024-10-18.csv" -> "Semana de 18/10/2024"
 */
export function extractPeriodFromFileName(fileName: string): ExtractedPeriod {
  const cleanName = fileName.replace(/\.[^/.]+$/, '').trim();

  // Pattern 1: DD[-/_]MM[-/_]YYYY a DD[-/_]MM[-/_]YYYY or similar range
  const rangePattern1 = /(\d{1,2})[-/._](\d{1,2})[-/._](\d{4})\s*(?:a|to|-|_)\s*(\d{1,2})[-/._](\d{1,2})[-/._](\d{4})/i;
  const matchRange1 = cleanName.match(rangePattern1);
  if (matchRange1) {
    const [, d1, m1, y1, d2, m2, y2] = matchRange1;
    return {
      periodString: `${d1.padStart(2, '0')}/${m1.padStart(2, '0')}/${y1} a ${d2.padStart(2, '0')}/${m2.padStart(2, '0')}/${y2}`,
      isIdentified: true,
      startDate: `${y1}-${m1.padStart(2, '0')}-${d1.padStart(2, '0')}`,
      endDate: `${y2}-${m2.padStart(2, '0')}-${d2.padStart(2, '0')}`,
    };
  }

  // Pattern 2: YYYY[-/_]MM[-/_]DD a YYYY[-/_]MM[-/_]DD
  const rangePattern2 = /(\d{4})[-/._](\d{1,2})[-/._](\d{1,2})\s*(?:a|to|-|_)\s*(\d{4})[-/._](\d{1,2})[-/._](\d{1,2})/i;
  const matchRange2 = cleanName.match(rangePattern2);
  if (matchRange2) {
    const [, y1, m1, d1, y2, m2, d2] = matchRange2;
    return {
      periodString: `${d1.padStart(2, '0')}/${m1.padStart(2, '0')}/${y1} a ${d2.padStart(2, '0')}/${m2.padStart(2, '0')}/${y2}`,
      isIdentified: true,
      startDate: `${y1}-${m1.padStart(2, '0')}-${d1.padStart(2, '0')}`,
      endDate: `${y2}-${m2.padStart(2, '0')}-${d2.padStart(2, '0')}`,
    };
  }

  // Pattern 3: DD[-/_]MM a DD[-/_]MM[-/_]YYYY (first year omitted)
  const rangePattern3 = /(\d{1,2})[-/._](\d{1,2})\s*(?:a|to|-|_)\s*(\d{1,2})[-/._](\d{1,2})[-/._](\d{4})/i;
  const matchRange3 = cleanName.match(rangePattern3);
  if (matchRange3) {
    const [, d1, m1, d2, m2, y2] = matchRange3;
    return {
      periodString: `${d1.padStart(2, '0')}/${m1.padStart(2, '0')} a ${d2.padStart(2, '0')}/${m2.padStart(2, '0')}/${y2}`,
      isIdentified: true,
      startDate: `${y2}-${m1.padStart(2, '0')}-${d1.padStart(2, '0')}`,
      endDate: `${y2}-${m2.padStart(2, '0')}-${d2.padStart(2, '0')}`,
    };
  }

  // Pattern 4: Year + Week: 2024-W42 or W42-2024 or Semana 42 2024
  const weekPattern = /(?:semana|week|sem|w)[-_.\s]*(\d{1,2})[-_.\s]*(?:de|of)?[-_.\s]*(\d{4})/i;
  const matchWeek = cleanName.match(weekPattern);
  if (matchWeek) {
    const [, w, y] = matchWeek;
    return {
      periodString: `Semana ${w}/${y}`,
      isIdentified: true,
      startDate: `${y}-W${w.padStart(2, '0')}`,
    };
  }

  const weekPatternAlt = /(\d{4})[-_.\s]*(?:semana|week|sem|w)[-_.\s]*(\d{1,2})/i;
  const matchWeekAlt = cleanName.match(weekPatternAlt);
  if (matchWeekAlt) {
    const [, y, w] = matchWeekAlt;
    return {
      periodString: `Semana ${w}/${y}`,
      isIdentified: true,
      startDate: `${y}-W${w.padStart(2, '0')}`,
    };
  }

  // Pattern 5: Single full date (YYYY-MM-DD or DD-MM-YYYY)
  const singleDatePattern1 = /(\d{4})[-/._](\d{1,2})[-/._](\d{1,2})/;
  const matchSingle1 = cleanName.match(singleDatePattern1);
  if (matchSingle1) {
    const [, y, m, d] = matchSingle1;
    return {
      periodString: `Semana de ${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`,
      isIdentified: true,
      startDate: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
    };
  }

  const singleDatePattern2 = /(\d{1,2})[-/._](\d{1,2})[-/._](\d{4})/;
  const matchSingle2 = cleanName.match(singleDatePattern2);
  if (matchSingle2) {
    const [, d, m, y] = matchSingle2;
    return {
      periodString: `Semana de ${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`,
      isIdentified: true,
      startDate: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
    };
  }

  return {
    periodString: 'Período Não Identificado',
    isIdentified: false,
  };
}

/**
 * Normalizes date string to YYYY-MM-DD or MM/DD
 */
export function normalizeDate(rawDate: string): string {
  if (!rawDate) return '';
  const trimmed = rawDate.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD/MM/YYYY or MM/DD/YYYY
  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      // Could be DD/MM/YYYY or MM/DD/YYYY. In BR music market, DD/MM/YYYY is common.
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      const y = parts[2];
      // If p1 > 12, definitely DD/MM
      if (p1 > 12) {
        return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      }
      // If p2 > 12, definitely MM/DD
      if (p2 > 12) {
        return `${y}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
      }
      // Default to DD/MM/YYYY
      return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    } else if (parts[0].length === 4) {
      // YYYY/MM/DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }

  // MM/DD (as requested in spec: "A data deve ser interpretada corretamente como mês/dia quando os dados estiverem nesse formato")
  if (parts.length === 2) {
    const currentYear = new Date().getFullYear();
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    // If p1 <= 12 and p2 <= 31, interpret as MM/DD
    return `${currentYear}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
  }

  return trimmed;
}

/**
 * Detects if CSV is Highlights (Destaques) or Charts based on header keys
 */
export function detectCsvType(headers: string[]): 'destaques' | 'chart' | 'unknown' {
  const normHeaders = headers.map(h => h.trim().toLowerCase());

  const hasDestaqueCols = normHeaders.some(h => h.includes('destaque') || h.includes('upc') || h.includes('bu'));
  const hasChartCols = normHeaders.some(h => h.includes('rank') || h.includes('streams') || h.includes('track'));

  if (hasDestaqueCols && !normHeaders.some(h => h.includes('streams') || h === 'rank')) {
    return 'destaques';
  }
  if (hasChartCols) {
    return 'chart';
  }
  return 'unknown';
}

/**
 * Normalizes DSP name to standard DSPPlatform
 */
export function normalizeDsp(rawDsp?: string): DSPPlatform {
  if (!rawDsp) return 'Spotify';
  const val = rawDsp.toLowerCase().trim();
  if (val.includes('spot')) return 'Spotify';
  if (val.includes('deez')) return 'Deezer';
  if (val.includes('amazon')) return 'Amazon Music';
  if (val.includes('apple')) return 'Apple Music';
  if (val.includes('you') || val.includes('yt')) return 'YouTube Music';
  if (val.includes('claro')) return 'Claro Música';
  if (val.includes('brisa')) return 'Brisa Music';
  if (val.includes('nomo')) return 'Nomo Music';
  if (val.includes('beatport')) return 'Beatport';
  if (val.includes('audiomack')) return 'Audiomack';
  if (val.includes('qobuz')) return 'Qobuz';
  if (val.includes('tidal')) return 'TIDAL';
  if (val.includes('shazam')) return 'Shazam Discovery';
  return 'Spotify';
}

/**
 * Normalizes BU to the official 7 ONErpm BUs:
 * Eletrônico, Funk, NNE, Gospel, Sertanejo, Samba & Pagode, MPB
 */
export function normalizeBu(rawBu?: string): string {
  if (!rawBu) return 'Geral / Outros';
  const val = rawBu.trim().toLowerCase();
  if (val.includes('elet') || val.includes('edm')) return 'Eletrônico';
  if (val.includes('funk')) return 'Funk';
  if (val.includes('nne') || val.includes('norte') || val.includes('nordeste')) return 'NNE';
  if (val.includes('gospel') || val.includes('religio') || val.includes('crist')) return 'Gospel';
  if (val.includes('sertan')) return 'Sertanejo';
  if (val.includes('samba') || val.includes('pagod')) return 'Samba & Pagode';
  if (val.includes('mpb')) return 'MPB';
  return rawBu.trim();
}

export interface ParsedCsvResult {
  document: ImportedDocument;
  highlights: HighlightRecord[];
  charts: ChartRecord[];
  errors: string[];
}

/**
 * Parses a single CSV file text and returns typed records
 */
export function parseCsvContent(
  fileName: string,
  csvText: string,
  preferredDsp?: DSPPlatform,
  overridePeriod?: string
): ParsedCsvResult {
  const errors: string[] = [];
  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const period = overridePeriod
    ? {
        periodString: overridePeriod,
        isIdentified: overridePeriod !== 'Período Não Identificado',
      }
    : extractPeriodFromFileName(fileName);

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  });

  const headers = parsed.meta.fields || [];
  let fileType = detectCsvType(headers);
  if (fileType === 'unknown') {
    // Default fallback: if has rank -> chart, else destaques
    fileType = headers.some(h => /rank/i.test(h)) ? 'chart' : 'destaques';
  }

  let finalDsp: DSPPlatform = preferredDsp || 'Spotify';
  if (!preferredDsp) {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('spotify')) finalDsp = 'Spotify';
    else if (lowerName.includes('deezer')) finalDsp = 'Deezer';
    else if (lowerName.includes('amazon')) finalDsp = 'Amazon Music';
    else if (lowerName.includes('apple')) finalDsp = 'Apple Music';
    else if (lowerName.includes('youtube') || lowerName.includes('yt')) finalDsp = 'YouTube Music';
    else if (lowerName.includes('shazam')) finalDsp = 'Shazam Discovery';
  }

  const document: ImportedDocument = {
    id: docId,
    fileName,
    type: fileType,
    dsp: finalDsp,
    importDate: new Date().toISOString(),
    identifiedPeriod: period.periodString,
    isPeriodIdentified: period.isIdentified,
    periodStartDate: period.startDate,
    periodEndDate: period.endDate,
    recordCount: parsed.data.length,
    fileSize: csvText.length,
  };

  const highlights: HighlightRecord[] = [];
  const charts: ChartRecord[] = [];

  const rows = parsed.data as Record<string, any>[];

  if (fileType === 'destaques') {
    rows.forEach((row, idx) => {
      // Columns: Data | DSP | BU | Artista | Título | Destaque | UPC | Tipo de Destaque | Território de destaque
      const rawData = row['Data'] || row['DATA'] || row['date'] || row['Date'] || '';
      // As requested: "quando for importaçao de csv destaques, a plataforma do destaque está no csv. o arquivo csv nao é separado por plataforma."
      // Each row has its own DSP:
      const rawDsp = row['DSP'] || row['dsp'] || row['Plataforma'] || row['PLATAFORMA'] || row['Platform'] || finalDsp;
      const bu = normalizeBu(row['BU'] || row['bu'] || 'Geral / Outros');
      const artista = row['Artista'] || row['ARTISTA'] || row['Artist'] || 'Artista Desconhecido';
      const titulo = row['Título'] || row['Titulo'] || row['TITULO'] || row['Track Name'] || row['Track'] || 'Sem Título';
      const destaque = row['Destaque'] || row['DESTAQUE'] || 'Destaque Geral';
      const upc = String(row['UPC'] || row['upc'] || '').replace(/[^0-9A-Za-z]/g, '');
      const rawTipo = String(row['Tipo de Destaque'] || row['TIPO DE DESTAQUE'] || row['Tipo'] || 'DESTAQUE').toUpperCase();
      const tipoDestaque = rawTipo.includes('CAPA') ? 'CAPA' : 'DESTAQUE';
      const territorio = row['Território de destaque'] || row['Território'] || row['Territorio'] || 'Brasil';

      // Detect NAC vs INT
      const rawNacInt = String(row['Nac/Int'] || row['Origem'] || '').toUpperCase();
      const origem: 'NAC' | 'INT' = rawNacInt.includes('INT') ? 'INT' : 'NAC';

      highlights.push({
        id: `${docId}_hl_${idx}`,
        documentId: docId,
        data: normalizeDate(rawData) || new Date().toISOString().split('T')[0],
        dsp: normalizeDsp(rawDsp),
        bu,
        artista: artista.trim(),
        titulo: titulo.trim(),
        destaque: destaque.trim(),
        upc: upc.trim(),
        tipoDestaque,
        territorio: territorio.trim(),
        origem,
      });
    });
  } else {
    // Chart format: Rank | Artist | Track Name | Streams | Label | Nac/Int | Genre | Date
    rows.forEach((row, idx) => {
      const rawRank = row['Rank'] || row['rank'] || row['Posição'] || row['Posicao'] || idx + 1;
      const rank = parseInt(String(rawRank).replace(/\D/g, ''), 10) || idx + 1;
      const artist = row['Artist'] || row['Artista'] || 'Artista Desconhecido';
      const trackName = row['Track Name'] || row['Track'] || row['Título'] || row['Titulo'] || 'Faixa';
      const rawStreams = row['Streams'] || row['streams'] || row['Reproduções'] || '0';
      const streams = parseInt(String(rawStreams).replace(/[^0-9]/g, ''), 10) || 0;
      const label = row['Label'] || row['Gravadora'] || row['Selo'] || 'Independente';
      const isOnerpm = /onerpm/i.test(label) || /one rpm/i.test(label);
      const rawNacInt = String(row['Nac/Int'] || row['Origem'] || 'NAC').toUpperCase();
      const nacInt: 'NAC' | 'INT' = rawNacInt.includes('INT') ? 'INT' : 'NAC';
      const genre = normalizeBu(row['Genre'] || row['Gênero'] || row['Genero'] || row['BU'] || 'Outros');

      // Date reflects weekly period from document, or row date if explicit
      const rowDate = row['Date'] || row['Data'] || period.periodString;

      charts.push({
        id: `${docId}_ch_${idx}`,
        documentId: docId,
        rank,
        artist: String(artist).trim(),
        trackName: String(trackName).trim(),
        streams,
        label: String(label).trim(),
        isOnerpm,
        nacInt,
        genre: String(genre).trim(),
        date: String(rowDate).trim(),
        dsp: finalDsp,
      });
    });
  }

  return {
    document,
    highlights,
    charts,
    errors,
  };
}
