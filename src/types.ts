export type DSPPlatform =
  | 'Spotify'
  | 'Deezer'
  | 'Amazon Music'
  | 'Apple Music'
  | 'YouTube Music'
  | 'Shazam Discovery'
  | 'Claro Música'
  | 'Brisa Music'
  | 'Nomo Music'
  | 'Beatport'
  | 'Audiomack'
  | 'Qobuz'
  | 'TIDAL'
  | string;

export const DSP_COLORS: Record<string, string> = {
  'Spotify': '#1DB954',
  'Deezer': '#A238FF',
  'Amazon Music': '#00A8E1',
  'Amazon': '#00A8E1',
  'Apple Music': '#FA243C',
  'YouTube Music': '#FF0000',
  'Shazam Discovery': '#0088FF',
  'Claro Música': '#E52213',
  'Brisa Music': '#FF5722',
  'Brisamusic': '#FF5722',
  'Nomo Music': '#FF7A00',
  'Beatport': '#02B376',
  'Audiomack': '#FFA200',
  'Qobuz': '#0055A5',
  'TIDAL': '#111827',
  'Outros': '#64748B',
};

export const OFFICIAL_BUS = [
  'Eletrônico',
  'Funk',
  'NNE',
  'Gospel',
  'Sertanejo',
  'Samba & Pagode',
  'MPB',
] as const;

export type OfficialBU = typeof OFFICIAL_BUS[number];

export const BU_COLORS: Record<string, string> = {
  'Eletrônico': '#EC4899',       // Pink
  'Funk': '#818CF8',             // Indigo / Violet
  'NNE': '#EAB308',              // Amber
  'Gospel': '#3B82F6',           // Blue
  'Sertanejo': '#F97316',        // Orange
  'Samba & Pagode': '#FDE047',   // Yellow
  'MPB': '#10B981',              // Emerald / Green
  // Aliases for historical / import compatibility
  'EDM': '#EC4899',
  'Eletrônica': '#EC4899',
  'Samba': '#FDE047',
  'Pagode': '#FDE047',
  'Samba / Pagode': '#FDE047',
  'Gospel / Religioso': '#3B82F6',
  'Hip Hop': '#DC2626',
  'Geral / Outros': '#64748B',
};

export interface HighlightRecord {
  id: string;
  documentId: string;
  data: string; // YYYY-MM-DD or MM/DD
  dsp: DSPPlatform;
  bu: string;
  artista: string;
  titulo: string;
  destaque: string; // e.g. Playlist or placement name
  upc: string;
  tipoDestaque: 'DESTAQUE' | 'CAPA' | string;
  territorio: string;
  origem: 'NAC' | 'INT';
}

export interface ChartRecord {
  id: string;
  documentId: string;
  rank: number;
  artist: string;
  trackName: string;
  streams: number;
  label: string;
  isOnerpm: boolean;
  nacInt: 'NAC' | 'INT';
  genre: string; // BU
  date: string; // Associated week date/period
  dsp: DSPPlatform;
}

export interface ImportedDocument {
  id: string;
  fileName: string;
  type: 'destaques' | 'chart';
  dsp: DSPPlatform;
  importDate: string;
  identifiedPeriod: string; // e.g., "14/10/2024 a 20/10/2024" or empty if not detected
  isPeriodIdentified: boolean;
  periodStartDate?: string;
  periodEndDate?: string;
  recordCount: number;
  fileSize?: number;
}

export interface DSPAction {
  id: string;
  data: string;
  plataforma: DSPPlatform;
  bu: string;
  tipoAcao: string;
  territorio: string;
  artista: string;
  acaoOuLancamento: string;
  detalhes?: string;
  createdAt?: string;
}

export interface CoverItem {
  id: string;
  upc: string;
  artista: string;
  titulo: string;
  imageUrl: string;
  dataDestaque: string;
  dsp?: string;
  fileName?: string;
  bu?: string;
  createdAt: string;
}

export interface WorkedReleaseRecord {
  id: string;
  bu: string;
  data: string; // YYYY-MM-DD
  artist: string;
  title: string;
  upc: string;
  isrc: string;
  label: string;
  genre: string;
  format: string; // Single, EP, Álbum, etc.
  focusTrack: string;
  tipoFaixa: string; // Focus, Single, Remix, etc.
  spotify: string; // Geral/Spotify
  amazon: string;
  deezer: string;
  apple: string;
  ytm: string;
  releaseNotes: string; // Release
  fotos: string;
  s4a: string;
  am4a: string;
  comment: string;
  checkInDsps: string;
  internationalPotential: string;
  createdAt?: string;
}

export type ActiveTab =
  | 'destaques'
  | 'charts'
  | 'comparativo'
  | 'lancamentos'
  | 'acoes'
  | 'capas'
  | 'relatorio'
  | 'analitica'
  | 'excluir';

