import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  FileDown,
  FileText,
  Filter,
  Image as ImageIcon,
  Printer,
  Sparkles,
} from 'lucide-react';
import {
  BU_COLORS,
  ChartRecord,
  CoverItem,
  DSP_COLORS,
  DSPAction,
  DSPPlatform,
  HighlightRecord,
} from '../types';

interface PdfReportViewProps {
  highlights: HighlightRecord[];
  charts: ChartRecord[];
  actions: DSPAction[];
  covers: CoverItem[];
}

export type ReportType =
  | 'artista_semanal'
  | 'destaques_geral'
  | 'charts_semanal'
  | 'comparativo_onerpm'
  | 'acoes_dsp';

export const PdfReportView: React.FC<PdfReportViewProps> = ({
  highlights,
  charts,
  actions,
  covers,
}) => {
  const [reportType, setReportType] = useState<ReportType>('artista_semanal');
  const [selectedArtist, setSelectedArtist] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<DSPPlatform>('Spotify');

  // UPC to cover mapping
  const upcCoverMap = useMemo(() => {
    const map = new Map<string, CoverItem>();
    covers.forEach((c) => {
      if (c.upc) map.set(c.upc.trim(), c);
    });
    return map;
  }, [covers]);

  // Available artists for weekly artist report
  const availableArtists = useMemo(() => {
    const list = Array.from(new Set(highlights.map((h) => h.artista))).filter(Boolean).sort();
    return list;
  }, [highlights]);

  // Available weeks
  const availableWeeks = useMemo(() => {
    const list = Array.from(
      new Set([...highlights.map((h) => h.data), ...charts.map((c) => c.date)])
    ).filter(Boolean).sort();
    return list;
  }, [highlights, charts]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Hidden when printing) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Relatórios Executivos & Exportação PDF
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pré-visualize relatórios institucionais com a identidade visual ONErpm e faça o download em PDF
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#FF5500] hover:bg-[#E04B00] rounded-lg shadow-sm transition-all active:scale-95 self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Salvar em PDF</span>
        </button>
      </div>

      {/* Report Controls (Hidden when printing) */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Tipo de Relatório */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Seção / Tipo de Relatório
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
            >
              <option value="artista_semanal">
                Relatório Semanal por Artista (com Capas)
              </option>
              <option value="destaques_geral">Destaques & Capas (Geral)</option>
              <option value="charts_semanal">Charts Semanais por Plataforma</option>
              <option value="comparativo_onerpm">Comparativo Semanal ONErpm</option>
              <option value="acoes_dsp">Histórico de Ações DSPs</option>
            </select>
          </div>

          {/* Artista Filter (active if artista_semanal or destaques) */}
          {(reportType === 'artista_semanal' || reportType === 'destaques_geral') && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Artista em Foco
              </label>
              <select
                value={selectedArtist}
                onChange={(e) => setSelectedArtist(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
              >
                <option value="all">Todos os Artistas ({availableArtists.length})</option>
                {availableArtists.map((art) => (
                  <option key={art} value={art}>
                    {art}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Week Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Semana / Período
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
            >
              <option value="all">Todas as Semanas</option>
              {availableWeeks.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* Platform Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Plataforma DSP
            </label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as DSPPlatform)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
            >
              <option value="Spotify">Spotify</option>
              <option value="Deezer">Deezer</option>
              <option value="Amazon Music">Amazon Music</option>
              <option value="Apple Music">Apple Music</option>
              <option value="YouTube Music">YouTube Music</option>
              <option value="Shazam Discovery">Shazam Discovery</option>
            </select>
          </div>
        </div>
      </div>

      {/* REPORT PREVIEW CONTAINER (Styled like an executive printed paper report) */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-md p-8 sm:p-12 max-w-5xl mx-auto print:border-none print:shadow-none print:p-0">
        {/* ONErpm Report Header */}
        <div className="border-b-2 border-[#FF5500] pb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FF5500] flex items-center justify-center text-white font-black text-xl tracking-tighter">
              1R
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 tracking-tight block">
                ONErpm DSP Highlights
              </span>
              <span className="text-xs font-bold text-[#FF5500] uppercase tracking-wider block">
                Relatório Executivo Semanal de Destaques & Performance
              </span>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500 font-mono-numbers">
            <div>
              <strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')}
            </div>
            <div>
              <strong>Período:</strong> {selectedWeek === 'all' ? 'Consolidado' : selectedWeek}
            </div>
          </div>
        </div>

        {/* Dynamic Report Content based on selected reportType */}

        {/* 1. RELATÓRIO SEMANAL POR ARTISTA COM DESTAQUES, CAPAS E IMAGENS */}
        {reportType === 'artista_semanal' && (
          <div className="py-6 space-y-8">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Destaques Semanais por Artista & Galeria de Capas
              </h2>
              <p className="text-xs text-slate-500">
                Acompanhamento individualizado com capas oficiais, playlists conquistadas e posições editoriais
              </p>
            </div>

            {/* List of Artists */}
            {availableArtists
              .filter((art) => selectedArtist === 'all' || art === selectedArtist)
              .map((artistName) => {
                const artistHighlights = highlights.filter(
                  (h) =>
                    h.artista === artistName &&
                    (selectedWeek === 'all' || h.data === selectedWeek)
                );

                if (artistHighlights.length === 0) return null;

                // Find associated covers
                const artistUpcs = Array.from(new Set(artistHighlights.map((h) => h.upc).filter(Boolean)));
                const artistCovers = artistUpcs
                  .map((upc) => upcCoverMap.get(upc))
                  .filter(Boolean) as CoverItem[];

                return (
                  <div
                    key={artistName}
                    className="border border-slate-200 rounded-xl p-5 space-y-4 print-break-inside-avoid bg-white shadow-2xs"
                  >
                    {/* Artist Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">
                          {artistName}
                        </h3>
                        <span className="text-xs text-slate-500">
                          BU: {artistHighlights[0]?.bu} · {artistHighlights.length} destaques no período
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#FF5500] bg-orange-50 px-2.5 py-1 rounded-sm">
                        ONErpm Artist
                      </span>
                    </div>

                    {/* Associated Covers Showcase */}
                    {artistCovers.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                          Capas Oficiais Associadas (UPC):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {artistCovers.map((c) => (
                            <div
                              key={c.id}
                              className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50"
                            >
                              <div className="aspect-square w-full">
                                <img
                                  src={c.imageUrl}
                                  alt={c.titulo}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="p-2 text-[10px]">
                                <div className="font-bold text-slate-800 truncate">{c.titulo}</div>
                                <div className="font-mono-numbers text-slate-500">UPC: {c.upc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Highlights Table */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Placements & Conquistas Editoriais:
                      </span>
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/70 text-slate-600 font-bold text-[10px] uppercase">
                            <th className="py-1.5 px-2">Data</th>
                            <th className="py-1.5 px-2">DSP</th>
                            <th className="py-1.5 px-2">Lançamento / Faixa</th>
                            <th className="py-1.5 px-2">Destaque Conquistado</th>
                            <th className="py-1.5 px-2">Tipo</th>
                            <th className="py-1.5 px-2">Território</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {artistHighlights.map((h) => (
                            <tr key={h.id}>
                              <td className="py-1.5 px-2 font-mono-numbers text-slate-600">{h.data}</td>
                              <td className="py-1.5 px-2 font-semibold" style={{ color: DSP_COLORS[h.dsp] }}>
                                {h.dsp}
                              </td>
                              <td className="py-1.5 px-2 font-bold text-slate-800">{h.titulo}</td>
                              <td className="py-1.5 px-2 text-slate-700">{h.destaque}</td>
                              <td className="py-1.5 px-2">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-xs ${
                                    h.tipoDestaque === 'CAPA'
                                      ? 'text-purple-700 bg-purple-50'
                                      : 'text-orange-700 bg-orange-50'
                                  }`}
                                >
                                  {h.tipoDestaque}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-slate-500">{h.territorio}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* 2. RELATÓRIO GERAL DE DESTAQUES */}
        {reportType === 'destaques_geral' && (
          <div className="py-6 space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Destaques Gerais & Capas ONErpm
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Total Destaques</span>
                <div className="text-xl font-bold font-mono-numbers text-slate-900">
                  {highlights.filter((h) => h.tipoDestaque === 'DESTAQUE').length}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Total Capas</span>
                <div className="text-xl font-bold font-mono-numbers text-[#A238FF]">
                  {highlights.filter((h) => h.tipoDestaque === 'CAPA').length}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Nacionais (NAC)</span>
                <div className="text-xl font-bold font-mono-numbers text-emerald-600">
                  {highlights.filter((h) => h.origem === 'NAC').length}
                </div>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse mt-4">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                  <th className="py-2 px-2.5">Data</th>
                  <th className="py-2 px-2.5">DSP</th>
                  <th className="py-2 px-2.5">BU</th>
                  <th className="py-2 px-2.5">Artista</th>
                  <th className="py-2 px-2.5">Título</th>
                  <th className="py-2 px-2.5">Destaque</th>
                  <th className="py-2 px-2.5">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {highlights.map((h) => (
                  <tr key={h.id}>
                    <td className="py-1.5 px-2.5 font-mono-numbers">{h.data}</td>
                    <td className="py-1.5 px-2.5 font-semibold">{h.dsp}</td>
                    <td className="py-1.5 px-2.5 font-semibold" style={{ color: BU_COLORS[h.bu] }}>
                      {h.bu}
                    </td>
                    <td className="py-1.5 px-2.5 font-bold text-slate-900">{h.artista}</td>
                    <td className="py-1.5 px-2.5 text-slate-800">{h.titulo}</td>
                    <td className="py-1.5 px-2.5 text-slate-600">{h.destaque}</td>
                    <td className="py-1.5 px-2.5 font-bold text-[10px]">{h.tipoDestaque}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. RELATÓRIO DE CHARTS SEMANAIS */}
        {reportType === 'charts_semanal' && (
          <div className="py-6 space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Desempenho em Charts: {selectedPlatform}
            </h2>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Faixa</th>
                  <th className="py-2 px-2">Artista</th>
                  <th className="py-2 px-2">Gravadora</th>
                  <th className="py-2 px-2">Gênero / BU</th>
                  <th className="py-2 px-2 text-right">Streams</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {charts
                  .filter((c) => c.dsp === selectedPlatform)
                  .map((c) => (
                    <tr key={c.id} className={c.isOnerpm ? 'bg-orange-50/30' : ''}>
                      <td className="py-1.5 px-2 font-mono-numbers font-bold">#{c.rank}</td>
                      <td className="py-1.5 px-2 font-bold text-slate-900">{c.trackName}</td>
                      <td className="py-1.5 px-2 text-slate-700">{c.artist}</td>
                      <td className="py-1.5 px-2 font-semibold">
                        {c.isOnerpm ? (
                          <span className="text-[#FF5500] font-black">ONErpm</span>
                        ) : (
                          c.label
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-slate-600">{c.genre}</td>
                      <td className="py-1.5 px-2 text-right font-mono-numbers font-bold">
                        {c.streams.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. COMPARATIVO ONERPM */}
        {reportType === 'comparativo_onerpm' && (
          <div className="py-6 space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Relatório Comparativo Semanal ONErpm ({selectedPlatform})
            </h2>
            <p className="text-xs text-slate-600">
              Variações absolutas e percentuais do repertório ONErpm no ranking
            </p>
            <table className="w-full text-xs text-left border-collapse mt-4">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                  <th className="py-2 px-2">Faixa</th>
                  <th className="py-2 px-2">Artista</th>
                  <th className="py-2 px-2">Posição Atual</th>
                  <th className="py-2 px-2 text-right">Streams</th>
                  <th className="py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {charts
                  .filter((c) => c.dsp === selectedPlatform && c.isOnerpm)
                  .map((c) => (
                    <tr key={c.id}>
                      <td className="py-1.5 px-2 font-bold text-slate-900">{c.trackName}</td>
                      <td className="py-1.5 px-2 text-slate-700">{c.artist}</td>
                      <td className="py-1.5 px-2 font-mono-numbers font-bold">#{c.rank}</td>
                      <td className="py-1.5 px-2 text-right font-mono-numbers font-bold">
                        {c.streams.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-1.5 px-2">
                        <span className="text-emerald-700 bg-emerald-50 text-[10px] font-bold px-1.5 py-0.5 rounded-xs">
                          ATIVO
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. AÇÕES DSPs */}
        {reportType === 'acoes_dsp' && (
          <div className="py-6 space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Histórico de Ações & Pitching com DSPs
            </h2>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                  <th className="py-2 px-2">Data</th>
                  <th className="py-2 px-2">Plataforma</th>
                  <th className="py-2 px-2">BU</th>
                  <th className="py-2 px-2">Tipo de Ação</th>
                  <th className="py-2 px-2">Artista</th>
                  <th className="py-2 px-2">Lançamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actions.map((act) => (
                  <tr key={act.id}>
                    <td className="py-1.5 px-2 font-mono-numbers">{act.data}</td>
                    <td className="py-1.5 px-2 font-bold" style={{ color: DSP_COLORS[act.plataforma] }}>
                      {act.plataforma}
                    </td>
                    <td className="py-1.5 px-2 font-semibold">{act.bu}</td>
                    <td className="py-1.5 px-2 font-bold text-slate-800">{act.tipoAcao}</td>
                    <td className="py-1.5 px-2 font-bold">{act.artista}</td>
                    <td className="py-1.5 px-2 text-slate-700">{act.acaoOuLancamento}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer of the PDF Document */}
        <div className="border-t border-slate-200 pt-6 mt-8 flex items-center justify-between text-[11px] text-slate-400">
          <div>ONErpm Music Solutions · DSP Intelligence Group</div>
          <div>Documento confidencial para uso interno e prestação de contas aos artistas</div>
        </div>
      </div>
    </div>
  );
};
