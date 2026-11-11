export interface MonitoredNewPlaylist {
  dsp: string;
  playlistName: string;
  link: string;
  categoria: string;
  aliases: string[];
}

export const MONITORED_NOVIDADES_PLAYLISTS: MonitoredNewPlaylist[] = [
  {
    dsp: 'Amazon Music',
    playlistName: 'Novidades',
    link: 'https://music.amazon.com.br/playlists/B07XB7S9K6?utm_source=chatgpt.com',
    categoria: 'Geral',
    aliases: ['novidades', 'novidade'],
  },
  {
    dsp: 'Spotify',
    playlistName: 'Novidades da Semana',
    link: 'https://open.spotify.com/playlist/37i9dQZF1DX34KNiFQJNVm?utm_source=chatgpt.com',
    categoria: 'Geral',
    aliases: ['novidades da semana', 'novidades'],
  },
  {
    dsp: 'Deezer',
    playlistName: 'Novidades da Semana',
    link: 'https://www.deezer.com/br/playlist/1250202481?utm_source=chatgpt.com',
    categoria: 'Geral',
    aliases: ['novidades da semana', 'novidades'],
  },
  {
    dsp: 'Claro Música',
    playlistName: 'Novidades',
    link: 'https://www.claromusica.com/systemPlaylist/62665537/BR?utm_source=chatgpt.com',
    categoria: 'Geral',
    aliases: ['novidades', 'novidade'],
  },
  {
    dsp: 'Apple Music',
    playlistName: 'New Music Daily',
    link: 'https://music.apple.com/br/playlist/new-music-daily/pl.2b0e6e332fdf4b7a91164da3162127b5?utm_source=chatgpt.com',
    categoria: 'Geral',
    aliases: ['new music daily'],
  },
  {
    dsp: 'Apple Music',
    playlistName: 'Novidades do dia',
    link: 'https://music.apple.com/br/playlist/novidades-do-dia/pl.2b0e6e332fdf4b7a91164da3162127b5?utm_source=chatgpt.com',
    categoria: 'Geral',
    aliases: ['novidades do dia'],
  },
  {
    dsp: 'Apple Music',
    playlistName: 'Novidades da semana',
    link: 'https://music.apple.com/br/room/6831454565?utm_source=chatgpt.com',
    categoria: 'Geral',
    aliases: ['novidades da semana', 'novidades'],
  },
  {
    dsp: 'Brisa Music',
    playlistName: 'Novidades da Semana',
    link: 'https://app.brisamusic.com.br/index.html?utm_source=chatgpt.com#/playlist/1060/Novidades%20da%20Semana',
    categoria: 'Geral',
    aliases: ['novidades da semana', 'novidades'],
  },
  {
    dsp: 'YouTube Music',
    playlistName: 'Novidades / lançamentos',
    link: 'https://music.youtube.com/playlist?list=RDCLAK5uy_lJLWbvlgOPedbqoQeFUoxLTrzbBSb1qQA&utm_source=chatgpt.com',
    categoria: 'Geral',
    aliases: ['novidades / lançamentos', 'novidades', 'lançamentos', 'released'],
  },
  {
    dsp: 'Audiomack',
    playlistName: 'Made in Brasil',
    link: 'https://audiomack.com/audiomack-brasil/playlist/made-in-brasil?utm_source=chatgpt.com',
    categoria: 'Brasil',
    aliases: ['made in brasil'],
  },
  {
    dsp: 'Nomo Music',
    playlistName: 'Novos Lançamentos',
    link: 'https://nomomusic.com.br/?utm_source=chatgpt.com#/playlist/37669/Novos%20Lan%C3%A7amentos',
    categoria: 'Geral',
    aliases: ['novos lançamentos', 'novos lancamentos'],
  },
  {
    dsp: 'Qobuz',
    playlistName: 'Novidades',
    link: 'https://www.qobuz.com/br-pt/playlists/new-releases/7818912?utm_source=chatgpt.com',
    categoria: 'Geral',
    aliases: ['novidades', 'new releases'],
  },
  {
    dsp: 'TIDAL',
    playlistName: 'My New Arrivals',
    link: 'https://tidal.com/?utm_source=chatgpt.com',
    categoria: 'Personalizada',
    aliases: ['my new arrivals', 'new arrivals'],
  },
  {
    dsp: 'Beatport',
    playlistName: 'New Releases',
    link: 'https://www.beatport.com/new-releases?utm_source=chatgpt.com',
    categoria: 'Eletrônica',
    aliases: ['new releases', 'novidades'],
  },
];

/**
 * Normalizes text for lenient matching
 */
const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Identifies if a highlight is an entry in a "Novidades da Semana / New Releases" playlist
 */
export const isNovidadesHighlight = (destaque: string, dsp?: string): boolean => {
  if (!destaque) return false;
  const normalized = normalizeText(destaque);

  // Key terms that directly denote Novidades/Lançamentos weekly entries
  const generalTerms = [
    'novidades da semana',
    'novidades do dia',
    'novidades',
    'new music daily',
    'lancamentos',
    'novos lancamentos',
    'new releases',
    'my new arrivals',
    'made in brasil',
    'released',
  ];

  if (generalTerms.some((t) => normalized.includes(t))) {
    return true;
  }

  // Check against specific DSP aliases
  const dspNormalized = dsp ? normalizeText(dsp) : '';
  for (const item of MONITORED_NOVIDADES_PLAYLISTS) {
    if (!dspNormalized || normalizeText(item.dsp).includes(dspNormalized) || dspNormalized.includes(normalizeText(item.dsp))) {
      for (const alias of item.aliases) {
        if (normalized.includes(normalizeText(alias))) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Returns matching monitored playlist details for a given highlight
 */
export const getMatchingMonitoredPlaylist = (
  destaque: string,
  dsp?: string
): MonitoredNewPlaylist | null => {
  if (!destaque) return null;
  const normalized = normalizeText(destaque);
  const dspNorm = dsp ? normalizeText(dsp) : '';

  // 1. Exact DSP + alias match
  if (dspNorm) {
    const directMatch = MONITORED_NOVIDADES_PLAYLISTS.find((p) => {
      const pDspNorm = normalizeText(p.dsp);
      const isDspSame = pDspNorm.includes(dspNorm) || dspNorm.includes(pDspNorm);
      if (!isDspSame) return false;
      return p.aliases.some((alias) => normalized.includes(normalizeText(alias)));
    });
    if (directMatch) return directMatch;
  }

  // 2. Generic alias match across all monitored
  for (const p of MONITORED_NOVIDADES_PLAYLISTS) {
    if (p.aliases.some((alias) => normalized.includes(normalizeText(alias)))) {
      return p;
    }
  }

  return null;
};
