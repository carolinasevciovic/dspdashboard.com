import Papa from 'papaparse';
import { WorkedReleaseRecord } from '../types';
import { normalizeBu, normalizeDate } from './csvParser';

export const WORKED_RELEASES_HEADERS = [
  'BU',
  'Data',
  'Artist',
  'Title',
  'UPC',
  'ISRC',
  'Label',
  'Genre',
  'Format',
  'Focus Track',
  'Tipo de faixa',
  'Geral/Spotify',
  'Amazon',
  'Deezer',
  'Apple',
  'YTM',
  'Release',
  'Fotos',
  'S4A',
  'AM4A',
  'Comment',
  'Check in DSPs',
  'International Potential',
];

/**
 * Generates CSV content with the exact requested headers and UTF-8 BOM
 */
export function exportWorkedReleasesToCsv(
  releases: WorkedReleaseRecord[],
  delimiter: ',' | ';' | '\t' = ';'
): string {
  const headerLine = WORKED_RELEASES_HEADERS.join(delimiter);

  const escapeCell = (val: string | undefined): string => {
    if (!val) return '';
    const str = String(val).trim();
    if (delimiter === '\t') {
      return str.replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
    }
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = releases.map((r) => {
    return [
      escapeCell(r.bu),
      escapeCell(r.data),
      escapeCell(r.artist),
      escapeCell(r.title),
      escapeCell(r.upc),
      escapeCell(r.isrc),
      escapeCell(r.label),
      escapeCell(r.genre),
      escapeCell(r.format),
      escapeCell(r.focusTrack),
      escapeCell(r.tipoFaixa),
      escapeCell(r.spotify),
      escapeCell(r.amazon),
      escapeCell(r.deezer),
      escapeCell(r.apple),
      escapeCell(r.ytm),
      escapeCell(r.releaseNotes),
      escapeCell(r.fotos),
      escapeCell(r.s4a),
      escapeCell(r.am4a),
      escapeCell(r.comment),
      escapeCell(r.checkInDsps),
      escapeCell(r.internationalPotential),
    ].join(delimiter);
  });

  // Include UTF-8 Byte Order Mark (BOM) so Excel respects Portuguese characters (é, ã, etc.)
  return '\uFEFF' + [headerLine, ...rows].join('\r\n');
}

/**
 * Triggers in-browser file download for CSV/TSV
 */
export function triggerCsvDownload(
  content: string,
  fileName: string = 'lancamentos_trabalhados_onerpm.csv',
  mimeType: string = 'text/csv;charset=utf-8;'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a pre-filled template with the official header and two realistic examples
 */
export function downloadWorkedReleasesTemplate(): void {
  const sampleReleases: WorkedReleaseRecord[] = [
    {
      id: 'template_01',
      bu: 'Sertanejo',
      data: '2024-10-18',
      artist: 'Artista Exemplo',
      title: 'Nome do Single',
      upc: '7891234567890',
      isrc: 'BR1R12400001',
      label: 'Selo / ONErpm',
      genre: 'Sertanejo',
      format: 'Single',
      focusTrack: 'Nome do Single',
      tipoFaixa: 'Focus Track',
      spotify: 'Pitching Editorial / Capa',
      amazon: 'Pitching Novidades',
      deezer: 'Pitching Novidades da Semana',
      apple: 'New Music Daily',
      ytm: 'Lançamentos',
      releaseNotes: 'Press release e release para editores das plataformas.',
      fotos: 'Sim',
      s4a: 'Pitched',
      am4a: 'Pitched',
      comment: 'Prioridade da BU no mês.',
      checkInDsps: 'OK - Conferido no ar',
      internationalPotential: 'Não',
    },
    {
      id: 'template_02',
      bu: 'Eletrônico',
      data: '2024-10-25',
      artist: 'DJ / Produtor',
      title: 'Club Track',
      upc: '7899876543210',
      isrc: 'BR1R12400002',
      label: 'Hub Records / ONErpm',
      genre: 'Eletrônico',
      format: 'Remix',
      focusTrack: 'Club Track',
      tipoFaixa: 'Remix',
      spotify: 'Pitching Mint',
      amazon: 'Fresh Dance',
      deezer: 'Electro Brasil',
      apple: 'Dance XL',
      ytm: 'Electronic',
      releaseNotes: 'Suporte de DJs internacionais em festivais.',
      fotos: 'Sim',
      s4a: 'Pitched',
      am4a: 'Pitched',
      comment: 'Foco internacional.',
      checkInDsps: 'OK',
      internationalPotential: 'Global',
    },
  ];

  const csv = exportWorkedReleasesToCsv(sampleReleases, ';');
  triggerCsvDownload(csv, 'modelo_lancamentos_trabalhados_onerpm.csv');
}

/**
 * Parses user-uploaded CSV / TSV file text into WorkedReleaseRecord[]
 */
export function parseWorkedReleasesCsv(csvText: string): {
  records: WorkedReleaseRecord[];
  errors: string[];
} {
  const errors: string[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors && parsed.errors.length > 0) {
    parsed.errors.slice(0, 3).forEach((err) => {
      errors.push(`Linha ${err.row}: ${err.message}`);
    });
  }

  const rawRows = parsed.data || [];
  const records: WorkedReleaseRecord[] = [];

  rawRows.forEach((row, idx) => {
    // Flexible column finder (case-insensitive and trimmed)
    const getVal = (candidates: string[]): string => {
      for (const cand of candidates) {
        const lowerCand = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const [key, val] of Object.entries(row)) {
          const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (lowerKey === lowerCand || lowerKey.includes(lowerCand)) {
            if (val !== undefined && val !== null) {
              return String(val).trim();
            }
          }
        }
      }
      return '';
    };

    const artist = getVal(['artist', 'artista', 'nome do artista']);
    const title = getVal(['title', 'titulo', 'título', 'faixa', 'nome da faixa', 'track']);

    // Ignore completely empty rows
    if (!artist && !title) return;

    const rawBu = getVal(['bu', 'business unit', 'unidade']);
    const rawData = getVal(['data', 'date', 'release date', 'data de lancamento']);
    const upc = getVal(['upc', 'codigo upc', 'código upc', 'barcode']);
    const isrc = getVal(['isrc', 'codigo isrc']);
    const label = getVal(['label', 'selo', 'gravadora']) || 'ONErpm';
    const genre = getVal(['genre', 'genero', 'gênero']) || rawBu;
    const format = getVal(['format', 'formato']) || 'Single';
    const focusTrack = getVal(['focus track', 'faixa foco', 'focus']) || title;
    const tipoFaixa = getVal(['tipo de faixa', 'tipo faixa', 'track type']) || 'Single';
    const spotify = getVal(['geral/spotify', 'geral spotify', 'spotify', 'spot']);
    const amazon = getVal(['amazon', 'amazon music', 'amz']);
    const deezer = getVal(['deezer', 'dzr']);
    const apple = getVal(['apple', 'apple music', 'itunes']);
    const ytm = getVal(['ytm', 'youtube music', 'youtube', 'yt music']);
    const releaseNotes = getVal(['release', 'release notes', 'press release', 'descrição']);
    const fotos = getVal(['fotos', 'photos', 'foto', 'press photo']);
    const s4a = getVal(['s4a', 'spotify for artists', 'sfa']);
    const am4a = getVal(['am4a', 'apple music for artists']);
    const comment = getVal(['comment', 'comentarios', 'comentários', 'observacoes', 'observações', 'notas']);
    const checkInDsps = getVal(['check in dsps', 'check dsps', 'conferido', 'check']);
    const internationalPotential = getVal(['international potential', 'potencial internacional', 'potencial']);

    records.push({
      id: `wr_imp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      bu: normalizeBu(rawBu) || 'Geral / Outros',
      data: normalizeDate(rawData) || new Date().toISOString().split('T')[0],
      artist: artist || 'Artista Não Informado',
      title: title || 'Lançamento',
      upc: upc || '',
      isrc: isrc || '',
      label,
      genre,
      format,
      focusTrack,
      tipoFaixa,
      spotify,
      amazon,
      deezer,
      apple,
      ytm,
      releaseNotes,
      fotos,
      s4a,
      am4a,
      comment,
      checkInDsps,
      internationalPotential,
      createdAt: new Date().toISOString(),
    });
  });

  return { records, errors };
}
