import React, { useMemo, useState } from 'react';
import {
  ExternalLink,
  Flame,
  Globe,
  Layers,
  ListFilter,
  Music2,
  Radio,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import { BU_COLORS, CoverItem, DSP_COLORS, HighlightRecord } from '../types';
import {
  getMatchingMonitoredPlaylist,
  isNovidadesHighlight,
  MONITORED_NOVIDADES_PLAYLISTS,
} from '../utils/monitoredPlaylists';
import { BarChart, BarDatum } from './Charts/BarChart';
import { DonutChart, DonutSlice } from './Charts/DonutChart';

interface NovidadesDashboardProps {
  highlights: HighlightRecord[];
  onOpenAddCoverModal?: (hl: HighlightRecord) => void;
  covers?: CoverItem[];
  initialDate?: string;
}

export const NovidadesDashboard: React.FC<NovidadesDashboardProps> = ({
  highlights,
  onOpenAddCoverModal,
  initialDate,
}) => {
  // Filters matching the dashboard: Data, DSP, BU, Artista, Título
  const [filterDate, setFilterDate] = useState<string>(initialDate || 'all');
  const [filterDsp, setFilterDsp] = useState<string>('all');
  const [filterBu, setFilterBu] = useState<string>('all');
  const [filterArtista, setFilterArtista] = useState<string>('all');
  const [searchTitulo, setSearchTitulo] = useState<string>('');
  const [activeTabTable, setActiveTabTable] = useState<'tracks' | 'monitoredList'>('tracks');

  // All highlights in Novidades da Semana
  const novidadesHighlights = useMemo(() => {
    return highlights.filter((h) => isNovidadesHighlight(h.destaque, h.dsp));
  }, [highlights]);

  // Available filter options
  const availableDates = useMemo(() => {
    const list = Array.from(new Set(novidadesHighlights.map((h) => h.data))).filter(Boolean);
    return list.sort().reverse();
  }, [novidadesHighlights]);

  const availableDsps = useMemo(() => {
    const list = Array.from(new Set(novidadesHighlights.map((h) => h.dsp))).filter(Boolean);
    return list.sort();
  }, [novidadesHighlights]);

  const availableBus = useMemo(() => {
    const list = Array.from(new Set(novidadesHighlights.map((h) => h.bu))).filter(Boolean);
    return list.sort();
  }, [novidadesHighlights]);

  const availableArtistas = useMemo(() => {
    const list = Array.from(new Set(novidadesHighlights.map((h) => h.artista))).filter(Boolean);
    return list.sort();
  }, [novidadesHighlights]);

  // Filtered highlights for the view
  const filteredHighlights = useMemo(() => {
    return novidadesHighlights.filter((h) => {
      if (filterDate !== 'all' && h.data !== filterDate) return false;
      if (filterDsp !== 'all' && h.dsp !== filterDsp) return false;
      if (filterBu !== 'all' && h.bu !== filterBu) return false;
      if (filterArtista !== 'all' && h.artista !== filterArtista) return false;
      if (searchTitulo.trim()) {
        const q = searchTitulo.toLowerCase();
        const matchesTitle = h.titulo.toLowerCase().includes(q);
        const matchesArtist = h.artista.toLowerCase().includes(q);
        const matchesDestaque = h.destaque.toLowerCase().includes(q);
        if (!matchesTitle && !matchesArtist && !matchesDestaque) return false;
      }
      return true;
    });
  }, [novidadesHighlights, filterDate, filterDsp, filterBu, filterArtista, searchTitulo]);

  // 1. Chart Data: Ranking de Destaques por plataforma dentro de "Novidades" (Horizontal Bar Chart)
  const dspRankingData: BarDatum[] = useMemo(() => {
    const countsByDsp: Record<string, number> = {};
    filteredHighlights.forEach((h) => {
      const dspName = h.dsp || 'Outros';
      countsByDsp[dspName] = (countsByDsp[dspName] || 0) + 1;
    });

    const items = Object.entries(countsByDsp).map(([dsp, count]) => ({
      label: dsp,
      value: count,
      color: DSP_COLORS[dsp] || '#64748B',
    }));

    // Sort descending by count
    return items.sort((a, b) => b.value - a.value);
  }, [filteredHighlights]);

  // 2. Chart Data: Share de Destaques por BU dentro de "Novidades" (Donut Chart)
  const buShareData: DonutSlice[] = useMemo(() => {
    const countsByBu: Record<string, number> = {};
    filteredHighlights.forEach((h) => {
      const buName = h.bu || 'Geral';
      countsByBu[buName] = (countsByBu[buName] || 0) + 1;
    });

    return Object.entries(countsByBu)
      .map(([bu, count]) => ({
        label: bu,
        value: count,
        color: BU_COLORS[bu] || '#64748B',
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredHighlights]);

  // 3. Chart Data: Destaque by Record Count (Donut Chart of playlist/vitrine names)
  const playlistNameShareData: DonutSlice[] = useMemo(() => {
    const countsByDestaque: Record<string, number> = {};
    filteredHighlights.forEach((h) => {
      // Group similar playlist names for cleaner chart
      const norm = h.destaque.trim();
      countsByDestaque[norm] = (countsByDestaque[norm] || 0) + 1;
    });

    const palette = [
      '#475569',
      '#DC2626',
      '#10B981',
      '#06B6D4',
      '#F59E0B',
      '#6366F1',
      '#8B5CF6',
      '#EC4899',
      '#14B8A6',
      '#F97316',
    ];

    return Object.entries(countsByDestaque)
      .map(([name, count], idx) => ({
        label: name.length > 20 ? `${name.substring(0, 18)}...` : name,
        value: count,
        color: palette[idx % palette.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredHighlights]);

  const handleResetFilters = () => {
    setFilterDate('all');
    setFilterDsp('all');
    setFilterBu('all');
    setFilterArtista('all');
    setSearchTitulo('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card matching PDF "Playlist Novidades da Semana" */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5500] to-amber-500 flex items-center justify-center text-white shadow-sm">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Playlist Novidades da Semana</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Radar Editorial
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoramento consolidado de lançamentos e entradas nas principais vitrines semanais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTabTable('tracks')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTabTable === 'tracks'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Destaques Monitorados ({filteredHighlights.length})
            </button>
            <button
              onClick={() => setActiveTabTable('monitoredList')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTabTable === 'monitoredList'
                  ? 'bg-[#FF5500] text-white'
                  : 'bg-orange-50 text-[#FF5500] border border-orange-200 hover:bg-orange-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Base 14 Playlists Oficiais</span>
            </button>
          </div>
        </div>

        {/* Filters Row: Data, DSP, BU, Artista, Título */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Data / Semana Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Data / Semana
            </label>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
            >
              <option value="all">Todas as Datas ({availableDates.length})</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* DSP Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              DSP
            </label>
            <select
              value={filterDsp}
              onChange={(e) => setFilterDsp(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
            >
              <option value="all">Todas as Plataformas ({availableDsps.length})</option>
              {availableDsps.map((dsp) => (
                <option key={dsp} value={dsp}>
                  {dsp}
                </option>
              ))}
            </select>
          </div>

          {/* BU Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              BU
            </label>
            <select
              value={filterBu}
              onChange={(e) => setFilterBu(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
            >
              <option value="all">Todas as BUs ({availableBus.length})</option>
              {availableBus.map((bu) => (
                <option key={bu} value={bu}>
                  {bu}
                </option>
              ))}
            </select>
          </div>

          {/* Artista Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Artista
            </label>
            <select
              value={filterArtista}
              onChange={(e) => setFilterArtista(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
            >
              <option value="all">Todos os Artistas ({availableArtistas.length})</option>
              {availableArtistas.map((art) => (
                <option key={art} value={art}>
                  {art}
                </option>
              ))}
            </select>
          </div>

          {/* Título Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Título
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por faixa ou vitrine..."
                value={searchTitulo}
                onChange={(e) => setSearchTitulo(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
              />
            </div>
          </div>
        </div>

        {(filterDate !== 'all' || filterDsp !== 'all' || filterBu !== 'all' || filterArtista !== 'all' || searchTitulo !== '') && (
          <div className="pt-3 flex justify-end">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 text-xs text-[#FF5500] hover:underline font-bold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar Filtros de Novidades
            </button>
          </div>
        )}
      </div>

      {/* KPI Counters (Record Count) matching PDF */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Record Count (Total)
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono-numbers">
            {filteredHighlights.length.toLocaleString('pt-BR')}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Destaques em playlists Novidades
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Record Count (Artistas)
          </span>
          <div className="text-2xl font-black text-[#FF5500] mt-1 font-mono-numbers">
            {new Set(filteredHighlights.map((h) => h.artista)).size}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Artistas únicos com entradas
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Plataformas Ativas
          </span>
          <div className="text-2xl font-black text-slate-800 mt-1 font-mono-numbers">
            {new Set(filteredHighlights.map((h) => h.dsp)).size}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            DSPs com destaques registrados
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Vitrines Monitoradas
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono-numbers">
            14
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Playlists oficiais catalogadas
          </span>
        </div>
      </div>

      {/* Visual Analytics Grid: 3 Charts matching the PDF */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Ranking de Destaques por plataforma dentro de "Novidades" (Horizontal Bar Chart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Ranking de Destaques por plataforma dentro de "Novidades"
              </h3>
              <p className="text-[11px] text-slate-500">
                Distribuição de entradas por plataforma DSP
              </p>
            </div>
          </div>

          <div className="pt-2">
            <BarChart
              data={dspRankingData}
              horizontal={true}
              height={280}
              valueFormatter={(v) => `${v} registros`}
              emptyMessage="Sem entradas para os filtros selecionados"
            />
          </div>
        </div>

        {/* Right Column: Share de Destaques por BU e Destaque by Record Count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Chart 2: Share de Destaques por BU dentro de "Novidades" */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Share de Destaques por BU
              </h3>
              <p className="text-[10px] text-slate-500">
                Dentro de "Novidades"
              </p>
            </div>

            <div className="py-2 flex items-center justify-center">
              <DonutChart
                data={buShareData}
                size={170}
                thickness={26}
                centerText={`${filteredHighlights.length}`}
                centerSubtext="entradas"
              />
            </div>

            <div className="text-[10px] text-slate-400 text-center font-mono-numbers">
              {buShareData.length} BUs representadas
            </div>
          </div>

          {/* Chart 3: Destaque by Record Count */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Destaque by Record Count
              </h3>
              <p className="text-[10px] text-slate-500">
                Vitrines e formatos de novidades
              </p>
            </div>

            <div className="py-2 flex items-center justify-center">
              <DonutChart
                data={playlistNameShareData}
                size={170}
                thickness={26}
                centerText={`${playlistNameShareData.length}`}
                centerSubtext="playlists"
              />
            </div>

            <div className="text-[10px] text-slate-400 text-center font-mono-numbers">
              Vitrines mais frequentes
            </div>
          </div>
        </div>
      </div>

      {/* Tab: Destaques Table or Monitored Playlists Directory */}
      {activeTabTable === 'tracks' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#FF5500]" />
                <span>Entradas em Novidades da Semana ({filteredHighlights.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Faixas da ONErpm posicionadas nas vitrines de novidades e lançamentos
              </p>
            </div>
            <span className="text-[11px] text-slate-500 font-mono-numbers">
              {filteredHighlights.length} de {novidadesHighlights.length} registros no radar
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-2.5 px-3">Tipo de Destaque</th>
                  <th className="py-2.5 px-3">Artista</th>
                  <th className="py-2.5 px-3">Título</th>
                  <th className="py-2.5 px-3">Playlist / Vitrine</th>
                  <th className="py-2.5 px-3">DSP</th>
                  <th className="py-2.5 px-3">BU</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3 text-center">Link Oficial</th>
                  {onOpenAddCoverModal && <th className="py-2.5 px-3 text-center">Capa</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHighlights.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                      Nenhum destaque de Novidades encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredHighlights.map((hl) => {
                    const matchedPlaylist = getMatchingMonitoredPlaylist(hl.destaque, hl.dsp);
                    const dspColor = DSP_COLORS[hl.dsp] || '#64748B';
                    const buColor = BU_COLORS[hl.bu] || '#64748B';

                    return (
                      <tr key={hl.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Tipo de Destaque */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {hl.tipoDestaque === 'CAPA' ? (
                            <span className="text-[10px] font-bold text-[#A238FF] bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-sm">
                              CAPA
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-[#FF5500] bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-sm">
                              DESTAQUE
                            </span>
                          )}
                        </td>

                        {/* Artista */}
                        <td className="py-2 px-3 font-bold text-slate-900 max-w-[170px] truncate" title={hl.artista}>
                          {hl.artista}
                        </td>

                        {/* Título */}
                        <td className="py-2 px-3 font-medium text-slate-700 max-w-[190px] truncate" title={hl.titulo}>
                          {hl.titulo}
                        </td>

                        {/* Playlist / Vitrine */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <Flame className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>{hl.destaque}</span>
                          </span>
                        </td>

                        {/* DSP */}
                        <td className="py-2 px-3 whitespace-nowrap font-bold" style={{ color: dspColor }}>
                          {hl.dsp}
                        </td>

                        {/* BU */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="font-semibold text-[11px]" style={{ color: buColor }}>
                            {hl.bu}
                          </span>
                        </td>

                        {/* Data */}
                        <td className="py-2 px-3 font-mono-numbers text-slate-600 whitespace-nowrap text-[11px]">
                          {hl.data}
                        </td>

                        {/* Link Oficial */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {matchedPlaylist ? (
                            <a
                              href={matchedPlaylist.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF5500] hover:text-[#E04B00] hover:underline"
                              title={`Abrir playlist "${matchedPlaylist.playlistName}" no ${matchedPlaylist.dsp}`}
                            >
                              <span>Acessar</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Capa Action if applicable */}
                        {onOpenAddCoverModal && (
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            {hl.tipoDestaque === 'CAPA' && (
                              <button
                                onClick={() => onOpenAddCoverModal(hl)}
                                className="text-[10px] font-bold text-[#A238FF] bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-sm"
                              >
                                Capa
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Base de monitoramento – Novidades e lançamentos Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#FF5500]" />
                <span>Base de Monitoramento – Novidades e Lançamentos (14 Vitrines)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Links oficiais das playlists de novidades monitoradas pela inteligência ONErpm
              </p>
            </div>
            <span className="text-[11px] text-slate-400">
              Links com acesso direto
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-2.5 px-3">DSP</th>
                  <th className="py-2.5 px-3">Playlist / Vitrine</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Link Direto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MONITORED_NOVIDADES_PLAYLISTS.map((item, idx) => {
                  const dspColor = DSP_COLORS[item.dsp] || '#64748B';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-bold" style={{ color: dspColor }}>
                        {item.dsp}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{item.playlistName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-sm">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#FF5500] hover:text-[#E04B00] hover:underline"
                        >
                          <span>Acessar</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
