import React, { useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Filter,
  Layers,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { ChartRecord, DSPAction, HighlightRecord } from '../types';

interface BaseAnaliticaViewProps {
  highlights: HighlightRecord[];
  charts: ChartRecord[];
  actions: DSPAction[];
  onDeleteHighlight?: (id: string) => void;
  onDeleteChart?: (id: string) => void;
  onDeleteAction?: (id: string) => void;
}

export const BaseAnaliticaView: React.FC<BaseAnaliticaViewProps> = ({
  highlights,
  charts,
  actions,
  onDeleteHighlight,
  onDeleteChart,
  onDeleteAction,
}) => {
  const [activeDataset, setActiveDataset] = useState<'highlights' | 'charts' | 'actions'>('highlights');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter highlights
  const filteredHighlights = useMemo(() => {
    if (!searchQuery.trim()) return highlights;
    const q = searchQuery.toLowerCase();
    return highlights.filter(
      (h) =>
        h.artista.toLowerCase().includes(q) ||
        h.titulo.toLowerCase().includes(q) ||
        h.destaque.toLowerCase().includes(q) ||
        h.bu.toLowerCase().includes(q) ||
        h.dsp.toLowerCase().includes(q) ||
        h.upc.toLowerCase().includes(q)
    );
  }, [highlights, searchQuery]);

  // Filter charts
  const filteredCharts = useMemo(() => {
    if (!searchQuery.trim()) return charts;
    const q = searchQuery.toLowerCase();
    return charts.filter(
      (c) =>
        c.artist.toLowerCase().includes(q) ||
        c.trackName.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q) ||
        c.genre.toLowerCase().includes(q) ||
        c.dsp.toLowerCase().includes(q) ||
        c.date.toLowerCase().includes(q)
    );
  }, [charts, searchQuery]);

  // Filter actions
  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) return actions;
    const q = searchQuery.toLowerCase();
    return actions.filter(
      (a) =>
        a.artista.toLowerCase().includes(q) ||
        a.acaoOuLancamento.toLowerCase().includes(q) ||
        a.tipoAcao.toLowerCase().includes(q) ||
        a.plataforma.toLowerCase().includes(q) ||
        a.bu.toLowerCase().includes(q)
    );
  }, [actions, searchQuery]);

  // Pagination helper
  const getCurrentRecords = () => {
    if (activeDataset === 'highlights') {
      const start = (currentPage - 1) * pageSize;
      return filteredHighlights.slice(start, start + pageSize);
    }
    if (activeDataset === 'charts') {
      const start = (currentPage - 1) * pageSize;
      return filteredCharts.slice(start, start + pageSize);
    }
    const start = (currentPage - 1) * pageSize;
    return filteredActions.slice(start, start + pageSize);
  };

  const totalCount =
    activeDataset === 'highlights'
      ? filteredHighlights.length
      : activeDataset === 'charts'
      ? filteredCharts.length
      : filteredActions.length;

  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);

  // Export to CSV
  const handleExportCsv = () => {
    let csvContent = '';
    if (activeDataset === 'highlights') {
      const headers = ['Data', 'DSP', 'BU', 'Artista', 'Título', 'Destaque', 'UPC', 'Tipo', 'Território', 'Origem'];
      const rows = filteredHighlights.map((h) => [
        h.data,
        h.dsp,
        h.bu,
        `"${h.artista.replace(/"/g, '""')}"`,
        `"${h.titulo.replace(/"/g, '""')}"`,
        `"${h.destaque.replace(/"/g, '""')}"`,
        h.upc,
        h.tipoDestaque,
        h.territorio,
        h.origem,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeDataset === 'charts') {
      const headers = ['Rank', 'Artist', 'Track Name', 'Streams', 'Label', 'Is ONErpm', 'Nac/Int', 'Genre', 'Date', 'DSP'];
      const rows = filteredCharts.map((c) => [
        c.rank,
        `"${c.artist.replace(/"/g, '""')}"`,
        `"${c.trackName.replace(/"/g, '""')}"`,
        c.streams,
        `"${c.label.replace(/"/g, '""')}"`,
        c.isOnerpm ? 'SIM' : 'NAO',
        c.nacInt,
        c.genre,
        `"${c.date}"`,
        c.dsp,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else {
      const headers = ['Data', 'Plataforma', 'BU', 'Tipo de Ação', 'Território', 'Artista', 'Ação / Lançamento', 'Detalhes'];
      const rows = filteredActions.map((a) => [
        a.data,
        a.plataforma,
        a.bu,
        `"${a.tipoAcao}"`,
        a.territorio,
        `"${a.artista.replace(/"/g, '""')}"`,
        `"${a.acaoOuLancamento.replace(/"/g, '""')}"`,
        `"${(a.detalhes || '').replace(/"/g, '""')}"`,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `base_analitica_${activeDataset}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Base Analítica de Registros
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulta detalhada, auditoria e exportação de todos os dados importados no sistema
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-[#FF5500]" />
          <span>Exportar Consulta CSV</span>
        </button>
      </div>

      {/* Dataset Picker & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segmented Dataset Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => {
                setActiveDataset('highlights');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeDataset === 'highlights'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Destaques ({highlights.length})
            </button>
            <button
              onClick={() => {
                setActiveDataset('charts');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeDataset === 'charts'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Charts ({charts.length})
            </button>
            <button
              onClick={() => {
                setActiveDataset('actions');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeDataset === 'actions'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ações DSPs ({actions.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar em qualquer campo..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500] w-64"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {activeDataset === 'highlights' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">DSP</th>
                  <th className="py-2.5 px-3">BU</th>
                  <th className="py-2.5 px-3">Artista</th>
                  <th className="py-2.5 px-3">Título</th>
                  <th className="py-2.5 px-3">Destaque</th>
                  <th className="py-2.5 px-3">UPC</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Território</th>
                  <th className="py-2.5 px-3">Origem</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(getCurrentRecords() as HighlightRecord[]).map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 font-mono-numbers text-slate-600">{h.data}</td>
                    <td className="py-2 px-3 font-bold">{h.dsp}</td>
                    <td className="py-2 px-3 font-semibold">{h.bu}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{h.artista}</td>
                    <td className="py-2 px-3 text-slate-800">{h.titulo}</td>
                    <td className="py-2 px-3 text-slate-600">{h.destaque}</td>
                    <td className="py-2 px-3 font-mono-numbers text-slate-500">{h.upc || '—'}</td>
                    <td className="py-2 px-3 font-bold text-[10px]">{h.tipoDestaque}</td>
                    <td className="py-2 px-3 text-slate-500">{h.territorio}</td>
                    <td className="py-2 px-3 font-mono-numbers">{h.origem}</td>
                    <td className="py-2 px-3 text-center">
                      {onDeleteHighlight && (
                        <button
                          onClick={() => onDeleteHighlight(h.id)}
                          className="p-1 rounded-sm text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Excluir destaque"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeDataset === 'charts' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Faixa</th>
                  <th className="py-2.5 px-3">Artista</th>
                  <th className="py-2.5 px-3 text-right">Streams</th>
                  <th className="py-2.5 px-3">Gravadora</th>
                  <th className="py-2.5 px-3">ONErpm</th>
                  <th className="py-2.5 px-3">Nac/Int</th>
                  <th className="py-2.5 px-3">BU / Gênero</th>
                  <th className="py-2.5 px-3">DSP</th>
                  <th className="py-2.5 px-3">Período</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(getCurrentRecords() as ChartRecord[]).map((c) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      c.isOnerpm ? 'bg-orange-50/20' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-mono-numbers font-bold">#{c.rank}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{c.trackName}</td>
                    <td className="py-2 px-3 text-slate-700">{c.artist}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers font-bold text-slate-900">
                      {c.streams.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2 px-3 font-semibold">{c.label}</td>
                    <td className="py-2 px-3">
                      {c.isOnerpm ? (
                        <span className="text-[10px] font-black text-[#FF5500] bg-orange-100 px-1.5 py-0.5 rounded-xs">
                          SIM
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">NÃO</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-semibold text-[10px]">{c.nacInt}</td>
                    <td className="py-2 px-3 text-slate-600">{c.genre}</td>
                    <td className="py-2 px-3 font-semibold">{c.dsp}</td>
                    <td className="py-2 px-3 text-slate-500 font-mono-numbers text-[11px] whitespace-nowrap">
                      {c.date}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {onDeleteChart && (
                        <button
                          onClick={() => onDeleteChart(c.id)}
                          className="p-1 rounded-sm text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Excluir faixa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeDataset === 'actions' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Plataforma</th>
                  <th className="py-2.5 px-3">BU</th>
                  <th className="py-2.5 px-3">Tipo de Ação</th>
                  <th className="py-2.5 px-3">Território</th>
                  <th className="py-2.5 px-3">Artista</th>
                  <th className="py-2.5 px-3">Ação / Lançamento</th>
                  <th className="py-2.5 px-3">Detalhes</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(getCurrentRecords() as DSPAction[]).map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 font-mono-numbers text-slate-600">{a.data}</td>
                    <td className="py-2 px-3 font-bold">{a.plataforma}</td>
                    <td className="py-2 px-3 font-semibold">{a.bu}</td>
                    <td className="py-2 px-3 font-bold">{a.tipoAcao}</td>
                    <td className="py-2 px-3 text-slate-500">{a.territorio}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{a.artista}</td>
                    <td className="py-2 px-3 text-slate-800">{a.acaoOuLancamento}</td>
                    <td className="py-2 px-3 text-slate-500 max-w-xs truncate">{a.detalhes || '—'}</td>
                    <td className="py-2 px-3 text-center">
                      {onDeleteAction && (
                        <button
                          onClick={() => onDeleteAction(a.id)}
                          className="p-1 rounded-sm text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Excluir ação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="font-mono-numbers">
            Página {currentPage} de {totalPages} ({totalCount} registros)
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
