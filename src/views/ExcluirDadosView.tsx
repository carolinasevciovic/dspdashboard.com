import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Edit2,
  FileSpreadsheet,
  Filter,
  Layers,
  Music2,
  RefreshCw,
  Search,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import {
  BU_COLORS,
  ChartRecord,
  DSP_COLORS,
  DSPPlatform,
  HighlightRecord,
  ImportedDocument,
} from '../types';

interface ExcluirDadosViewProps {
  documents: ImportedDocument[];
  highlights: HighlightRecord[];
  charts: ChartRecord[];
  onDeleteDocument: (docId: string) => void;
  onDeleteDocuments?: (docIds: string[]) => void;
  onDeleteHighlightsByDate: (dateString: string) => void;
  onDeleteHighlightsByDates?: (dateStrings: string[]) => void;
  onDeleteChartsByPlatformAndPeriod: (platform: DSPPlatform, period: string) => void;
  onDeleteChartsByPlatformAndPeriods?: (items: { platform: DSPPlatform; period: string }[]) => void;
  onDeleteHighlight?: (id: string) => void;
  onDeleteHighlights?: (ids: string[]) => void;
  onDeleteChart?: (id: string) => void;
  onDeleteCharts?: (ids: string[]) => void;
  onEditPeriod: (doc: ImportedDocument) => void;
  onResetSeed: () => void;
  onClearAll: () => void;
}

interface ConfirmModalState {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

interface ChartBatchItem {
  id: string; // `${dsp}:::${date}`
  dsp: DSPPlatform;
  period: string;
  count: number;
}

export const ExcluirDadosView: React.FC<ExcluirDadosViewProps> = ({
  documents,
  highlights,
  charts,
  onDeleteDocument,
  onDeleteDocuments,
  onDeleteHighlightsByDate,
  onDeleteHighlightsByDates,
  onDeleteChartsByPlatformAndPeriod,
  onDeleteChartsByPlatformAndPeriods,
  onDeleteHighlight,
  onDeleteHighlights,
  onDeleteChart,
  onDeleteCharts,
  onEditPeriod,
  onResetSeed,
  onClearAll,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'docs' | 'singleHighlights' | 'singleCharts'>('docs');

  // Multi-selection states for Lists
  const [selectedHighlightDates, setSelectedHighlightDates] = useState<Set<string>>(new Set());
  const [dateSearchFilter, setDateSearchFilter] = useState<string>('');

  const [selectedChartBatches, setSelectedChartBatches] = useState<Set<string>>(new Set());
  const [chartFilterDsp, setChartFilterDsp] = useState<string>('all');
  const [chartSearchPeriod, setChartSearchPeriod] = useState<string>('');

  // Multi-selection states for Document history table
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // Multi-selection states for Individual Deletions
  const [selectedHighlightIds, setSelectedHighlightIds] = useState<Set<string>>(new Set());
  const [searchHighlight, setSearchHighlight] = useState<string>('');

  const [selectedChartIds, setSelectedChartIds] = useState<Set<string>>(new Set());
  const [searchChart, setSearchChart] = useState<string>('');

  // In-app confirmation modal (replaces window.confirm entirely)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // 1. Destaques Grouped by Date (List)
  const highlightDatesList = useMemo(() => {
    const countsMap = new Map<string, number>();
    highlights.forEach((h) => {
      if (h.data) {
        countsMap.set(h.data, (countsMap.get(h.data) || 0) + 1);
      }
    });

    const list = Array.from(countsMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    return list.sort((a, b) => a.date.localeCompare(b.date)); // Ascending
  }, [highlights]);

  const filteredHighlightDates = useMemo(() => {
    if (!dateSearchFilter.trim()) return highlightDatesList;
    const q = dateSearchFilter.toLowerCase();
    return highlightDatesList.filter((item) => item.date.toLowerCase().includes(q));
  }, [highlightDatesList, dateSearchFilter]);

  // 2. Charts Grouped by Platform & Period (List)
  const chartBatchesList = useMemo<ChartBatchItem[]>(() => {
    const map = new Map<string, ChartBatchItem>();
    charts.forEach((c) => {
      const key = `${c.dsp}:::${c.date}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          id: key,
          dsp: c.dsp,
          period: c.date,
          count: 1,
        });
      }
    });

    const items = Array.from(map.values());
    return items.sort((a, b) => {
      if (a.dsp !== b.dsp) return a.dsp.localeCompare(b.dsp);
      return a.period.localeCompare(b.period);
    });
  }, [charts]);

  const availableChartDsps = useMemo(() => {
    const set = new Set(charts.map((c) => c.dsp));
    return Array.from(set).sort();
  }, [charts]);

  const filteredChartBatches = useMemo(() => {
    return chartBatchesList.filter((b) => {
      if (chartFilterDsp !== 'all' && b.dsp !== chartFilterDsp) return false;
      if (chartSearchPeriod.trim()) {
        const q = chartSearchPeriod.toLowerCase();
        if (!b.period.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [chartBatchesList, chartFilterDsp, chartSearchPeriod]);

  // 3. Filtered Single Highlights
  const filteredSingleHighlights = useMemo(() => {
    if (!searchHighlight.trim()) return highlights.slice(0, 60);
    const q = searchHighlight.toLowerCase();
    return highlights
      .filter(
        (h) =>
          h.artista.toLowerCase().includes(q) ||
          h.titulo.toLowerCase().includes(q) ||
          h.destaque.toLowerCase().includes(q) ||
          h.dsp.toLowerCase().includes(q) ||
          h.bu.toLowerCase().includes(q) ||
          (h.upc && h.upc.includes(q))
      )
      .slice(0, 100);
  }, [highlights, searchHighlight]);

  // 4. Filtered Single Charts
  const filteredSingleCharts = useMemo(() => {
    if (!searchChart.trim()) return charts.slice(0, 60);
    const q = searchChart.toLowerCase();
    return charts
      .filter(
        (c) =>
          c.artist.toLowerCase().includes(q) ||
          c.trackName.toLowerCase().includes(q) ||
          c.label.toLowerCase().includes(q) ||
          c.genre.toLowerCase().includes(q) ||
          c.dsp.toLowerCase().includes(q) ||
          c.date.includes(q)
      )
      .slice(0, 100);
  }, [charts, searchChart]);

  // Handlers: Destaques por Data (Individual & Multi-Select)
  const toggleSelectDate = (date: string) => {
    setSelectedHighlightDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const toggleSelectAllDates = () => {
    if (selectedHighlightDates.size === filteredHighlightDates.length) {
      setSelectedHighlightDates(new Set());
    } else {
      setSelectedHighlightDates(new Set(filteredHighlightDates.map((item) => item.date)));
    }
  };

  const requestDeleteSingleDate = (date: string, count: number) => {
    setConfirmModal({
      title: 'Excluir Data de Destaque',
      message: `Tem certeza que deseja excluir todos os ${count} registros correspondentes à data "${date}"?`,
      confirmLabel: 'Sim, Excluir Data',
      onConfirm: () => {
        onDeleteHighlightsByDate(date);
        setSelectedHighlightDates((prev) => {
          const next = new Set(prev);
          next.delete(date);
          return next;
        });
        showToast(`Destaques da data ${date} excluídos com sucesso.`);
      },
    });
  };

  const requestDeleteSelectedDates = () => {
    const dates = Array.from(selectedHighlightDates);
    if (dates.length === 0) return;

    const totalRecords = highlights.filter((h) => dates.includes(h.data)).length;

    setConfirmModal({
      title: `Excluir ${dates.length} Datas Selecionadas?`,
      message: `Esta ação excluirá permanentemente ${totalRecords} destaques e capas de ${dates.length} datas selecionadas (${dates.join(', ')}). Deseja continuar?`,
      confirmLabel: `Sim, Excluir ${dates.length} Datas`,
      onConfirm: () => {
        if (onDeleteHighlightsByDates) {
          onDeleteHighlightsByDates(dates);
        } else {
          dates.forEach((d) => onDeleteHighlightsByDate(d));
        }
        setSelectedHighlightDates(new Set());
        showToast(`${dates.length} datas excluídas com sucesso (${totalRecords} registros removidos).`);
      },
    });
  };

  // Handlers: Charts por Plataforma & Período (Individual & Multi-Select)
  const toggleSelectChartBatch = (batchId: string) => {
    setSelectedChartBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const toggleSelectAllChartBatches = () => {
    if (selectedChartBatches.size === filteredChartBatches.length) {
      setSelectedChartBatches(new Set());
    } else {
      setSelectedChartBatches(new Set(filteredChartBatches.map((b) => b.id)));
    }
  };

  const requestDeleteSingleChartBatch = (batch: ChartBatchItem) => {
    setConfirmModal({
      title: `Excluir Chart de ${batch.dsp}`,
      message: `Excluir todas as ${batch.count} faixas de "${batch.dsp}" para o período "${batch.period}"?`,
      confirmLabel: 'Sim, Excluir Período',
      onConfirm: () => {
        onDeleteChartsByPlatformAndPeriod(batch.dsp, batch.period);
        setSelectedChartBatches((prev) => {
          const next = new Set(prev);
          next.delete(batch.id);
          return next;
        });
        showToast(`Chart de ${batch.dsp} (${batch.period}) excluída.`);
      },
    });
  };

  const requestDeleteSelectedChartBatches = () => {
    const batchIds = Array.from(selectedChartBatches);
    if (batchIds.length === 0) return;

    const itemsToDelete = batchIds.map((id) => {
      const [dsp, period] = id.split(':::');
      return { platform: dsp as DSPPlatform, period };
    });

    const totalTracks = charts.filter((c) =>
      itemsToDelete.some((item) => item.platform === c.dsp && item.period === c.date)
    ).length;

    setConfirmModal({
      title: `Excluir ${itemsToDelete.length} Charts Selecionadas?`,
      message: `Esta ação excluirá permanentemente ${totalTracks} faixas de ${itemsToDelete.length} períodos/plataformas selecionados. Deseja continuar?`,
      confirmLabel: `Sim, Excluir ${itemsToDelete.length} Charts`,
      onConfirm: () => {
        if (onDeleteChartsByPlatformAndPeriods) {
          onDeleteChartsByPlatformAndPeriods(itemsToDelete);
        } else {
          itemsToDelete.forEach((item) => onDeleteChartsByPlatformAndPeriod(item.platform, item.period));
        }
        setSelectedChartBatches(new Set());
        showToast(`${itemsToDelete.length} charts excluídas com sucesso (${totalTracks} faixas removidas).`);
      },
    });
  };

  // Handlers: Documentos Importados (Multi-Select & Single)
  const toggleSelectDoc = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const toggleSelectAllDocs = () => {
    if (selectedDocIds.size === documents.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(documents.map((d) => d.id)));
    }
  };

  const requestDeleteDocument = (doc: ImportedDocument) => {
    setConfirmModal({
      title: `Excluir Documento "${doc.fileName}"`,
      message: `Esta ação excluirá o arquivo e todos os seus ${doc.recordCount} registros associados. Deseja continuar?`,
      confirmLabel: 'Excluir Documento',
      onConfirm: () => {
        onDeleteDocument(doc.id);
        setSelectedDocIds((prev) => {
          const next = new Set(prev);
          next.delete(doc.id);
          return next;
        });
        showToast(`Documento "${doc.fileName}" excluído com sucesso.`);
      },
    });
  };

  const requestDeleteSelectedDocs = () => {
    const ids = Array.from(selectedDocIds);
    if (ids.length === 0) return;

    setConfirmModal({
      title: `Excluir ${ids.length} Documentos Selecionados?`,
      message: `Esta ação excluirá todos os ${ids.length} arquivos selecionados e todos os seus registros de faixas/destaques associados. Deseja continuar?`,
      confirmLabel: `Sim, Excluir ${ids.length} Arquivos`,
      onConfirm: () => {
        if (onDeleteDocuments) {
          onDeleteDocuments(ids);
        } else {
          ids.forEach((id) => onDeleteDocument(id));
        }
        setSelectedDocIds(new Set());
        showToast(`${ids.length} documentos excluídos com sucesso.`);
      },
    });
  };

  // Handlers: Single Highlights Multi-select
  const toggleSelectHighlight = (id: string) => {
    setSelectedHighlightIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFilteredHighlights = () => {
    if (selectedHighlightIds.size === filteredSingleHighlights.length) {
      setSelectedHighlightIds(new Set());
    } else {
      setSelectedHighlightIds(new Set(filteredSingleHighlights.map((h) => h.id)));
    }
  };

  const requestDeleteSingleHighlight = (hl: HighlightRecord) => {
    setConfirmModal({
      title: 'Excluir Destaque Individual',
      message: `Excluir o registro "${hl.artista} - ${hl.titulo}" (${hl.dsp} · ${hl.data})?`,
      confirmLabel: 'Excluir Registro',
      onConfirm: () => {
        if (onDeleteHighlight) {
          onDeleteHighlight(hl.id);
          setSelectedHighlightIds((prev) => {
            const next = new Set(prev);
            next.delete(hl.id);
            return next;
          });
          showToast(`Registro de "${hl.artista}" excluído.`);
        }
      },
    });
  };

  const requestDeleteSelectedHighlights = () => {
    const ids = Array.from(selectedHighlightIds);
    if (ids.length === 0) return;

    setConfirmModal({
      title: `Excluir ${ids.length} Destaques Selecionados?`,
      message: `Deseja realmente excluir os ${ids.length} destaques selecionados da base de dados?`,
      confirmLabel: `Sim, Excluir ${ids.length} Destaques`,
      onConfirm: () => {
        if (onDeleteHighlights) {
          onDeleteHighlights(ids);
        } else if (onDeleteHighlight) {
          ids.forEach((id) => onDeleteHighlight(id));
        }
        setSelectedHighlightIds(new Set());
        showToast(`${ids.length} destaques excluídos com sucesso.`);
      },
    });
  };

  // Handlers: Single Charts Multi-select
  const toggleSelectChart = (id: string) => {
    setSelectedChartIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFilteredCharts = () => {
    if (selectedChartIds.size === filteredSingleCharts.length) {
      setSelectedChartIds(new Set());
    } else {
      setSelectedChartIds(new Set(filteredSingleCharts.map((c) => c.id)));
    }
  };

  const requestDeleteSingleChart = (chartItem: ChartRecord) => {
    setConfirmModal({
      title: 'Excluir Faixa de Chart Individual',
      message: `Excluir a faixa "#${chartItem.rank} ${chartItem.artist} - ${chartItem.trackName}" (${chartItem.dsp})?`,
      confirmLabel: 'Excluir Faixa',
      onConfirm: () => {
        if (onDeleteChart) {
          onDeleteChart(chartItem.id);
          setSelectedChartIds((prev) => {
            const next = new Set(prev);
            next.delete(chartItem.id);
            return next;
          });
          showToast(`Faixa "${chartItem.trackName}" excluída.`);
        }
      },
    });
  };

  const requestDeleteSelectedCharts = () => {
    const ids = Array.from(selectedChartIds);
    if (ids.length === 0) return;

    setConfirmModal({
      title: `Excluir ${ids.length} Faixas de Charts?`,
      message: `Deseja realmente excluir as ${ids.length} faixas selecionadas da base de charts?`,
      confirmLabel: `Sim, Excluir ${ids.length} Faixas`,
      onConfirm: () => {
        if (onDeleteCharts) {
          onDeleteCharts(ids);
        } else if (onDeleteChart) {
          ids.forEach((id) => onDeleteChart(id));
        }
        setSelectedChartIds(new Set());
        showToast(`${ids.length} faixas excluídas com sucesso.`);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-fade-in border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Gestão & Exclusão de Dados
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Exclua diretamente pelas listas interativas com suporte a seleção múltipla e exclusão pontual
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={onResetSeed}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Restaurar Base Demonstração</span>
          </button>

          <button
            onClick={() =>
              setConfirmModal({
                title: 'Limpar Todos os Dados?',
                message:
                  'Esta ação apagará todos os documentos, destaques, charts e capas armazenadas no navegador. Esta ação não pode ser desfeita.',
                confirmLabel: 'Sim, Limpar Tudo',
                onConfirm: () => {
                  onClearAll();
                  showToast('Toda a base de dados foi limpa.');
                },
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Toda a Base</span>
          </button>
        </div>
      </div>

      {/* Mode Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
        <button
          onClick={() => setActiveSubTab('docs')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeSubTab === 'docs'
              ? 'bg-[#FF5500] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Listas por Datas, Períodos & Documentos
        </button>
        <button
          onClick={() => setActiveSubTab('singleHighlights')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeSubTab === 'singleHighlights'
              ? 'bg-[#FF5500] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Destaques Individuais ({highlights.length})
        </button>
        <button
          onClick={() => setActiveSubTab('singleCharts')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeSubTab === 'singleCharts'
              ? 'bg-[#FF5500] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Faixas de Charts Individuais ({charts.length})
        </button>
      </div>

      {/* SubTab 1: Listas Interativas com Seleção Múltipla & Exclusão Direta */}
      {activeSubTab === 'docs' && (
        <div className="space-y-6">
          {/* Two Interactive Lists: Destaques por Data & Charts por Plataforma/Período */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LIST 1: Destaques por Data (Sem Dropdown, Lista com Seleção Múltipla) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#FF5500]" />
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Lista de Destaques por Data
                    </h2>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-mono-numbers">
                    {highlightDatesList.length} datas
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Selecione uma ou mais datas para excluir em lote, ou clique na lixeira ao lado de qualquer data para excluir diretamente.
                </p>

                {/* Filter & Multi-select Toolbar */}
                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <div className="relative flex-1 min-w-[140px]">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filtrar datas..."
                      value={dateSearchFilter}
                      onChange={(e) => setDateSearchFilter(e.target.value)}
                      className="w-full pl-7 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleSelectAllDates}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {selectedHighlightDates.size > 0 &&
                      selectedHighlightDates.size === filteredHighlightDates.length ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[#FF5500]" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>
                        {selectedHighlightDates.size === filteredHighlightDates.length && filteredHighlightDates.length > 0
                          ? 'Desmarcar'
                          : 'Marcar Todas'}
                      </span>
                    </button>

                    {selectedHighlightDates.size > 0 && (
                      <button
                        onClick={requestDeleteSelectedDates}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer animate-fade-in"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir Selecionadas ({selectedHighlightDates.size})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Scrollable List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 flex-1">
                {filteredHighlightDates.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Nenhuma data de destaque encontrada.
                  </div>
                ) : (
                  filteredHighlightDates.map((item) => {
                    const isSelected = selectedHighlightDates.has(item.date);

                    return (
                      <div
                        key={item.date}
                        className={`flex items-center justify-between px-4 py-2.5 transition-colors ${
                          isSelected ? 'bg-orange-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 pr-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectDate(item.date)}
                            className="w-4 h-4 rounded-sm border-slate-300 text-[#FF5500] focus:ring-[#FF5500] cursor-pointer"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 font-mono-numbers">
                              {item.date}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono-numbers">
                              {item.count} {item.count === 1 ? 'registro' : 'registros'}
                            </span>
                          </div>
                        </label>

                        {/* Direct Delete Button */}
                        <button
                          onClick={() => requestDeleteSingleDate(item.date, item.count)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title={`Excluir todos os ${item.count} registros da data ${item.date}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* LIST 2: Charts por Plataforma & Período (Sem Dropdown, Lista com Seleção Múltipla) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Music2 className="w-4 h-4 text-[#FF5500]" />
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Lista de Charts por Plataforma & Período
                    </h2>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-mono-numbers">
                    {chartBatchesList.length} períodos
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Selecione uma ou mais charts para exclusão múltipla, ou exclua diretamente na linha do período desejado.
                </p>

                {/* DSP Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setChartFilterDsp('all')}
                    className={`px-2 py-0.8 text-[11px] font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      chartFilterDsp === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Todas DSPs
                  </button>
                  {availableChartDsps.map((dsp) => (
                    <button
                      key={dsp}
                      onClick={() => setChartFilterDsp(dsp)}
                      className={`px-2 py-0.8 text-[11px] font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        chartFilterDsp === dsp
                          ? 'text-white'
                          : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                      style={{
                        backgroundColor: chartFilterDsp === dsp ? DSP_COLORS[dsp] || '#64748B' : undefined,
                      }}
                    >
                      {dsp}
                    </button>
                  ))}
                </div>

                {/* Search & Actions Toolbar */}
                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <div className="relative flex-1 min-w-[140px]">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filtrar por período..."
                      value={chartSearchPeriod}
                      onChange={(e) => setChartSearchPeriod(e.target.value)}
                      className="w-full pl-7 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleSelectAllChartBatches}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {selectedChartBatches.size > 0 &&
                      selectedChartBatches.size === filteredChartBatches.length ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[#FF5500]" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>
                        {selectedChartBatches.size === filteredChartBatches.length && filteredChartBatches.length > 0
                          ? 'Desmarcar'
                          : 'Marcar Todas'}
                      </span>
                    </button>

                    {selectedChartBatches.size > 0 && (
                      <button
                        onClick={requestDeleteSelectedChartBatches}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer animate-fade-in"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir Selecionadas ({selectedChartBatches.size})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Scrollable List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 flex-1">
                {filteredChartBatches.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Nenhum período de chart encontrado com os filtros atuais.
                  </div>
                ) : (
                  filteredChartBatches.map((batch) => {
                    const isSelected = selectedChartBatches.has(batch.id);
                    const dspColor = DSP_COLORS[batch.dsp] || '#64748B';

                    return (
                      <div
                        key={batch.id}
                        className={`flex items-center justify-between px-4 py-2.5 transition-colors ${
                          isSelected ? 'bg-orange-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 pr-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectChartBatch(batch.id)}
                            className="w-4 h-4 rounded-sm border-slate-300 text-[#FF5500] focus:ring-[#FF5500] cursor-pointer"
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-sm text-white"
                              style={{ backgroundColor: dspColor }}
                            >
                              {batch.dsp}
                            </span>
                            <span className="text-xs font-bold text-slate-900 font-mono-numbers">
                              {batch.period}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono-numbers">
                              {batch.count} faixas
                            </span>
                          </div>
                        </label>

                        {/* Direct Delete Button */}
                        <button
                          onClick={() => requestDeleteSingleChartBatch(batch)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title={`Excluir ${batch.count} faixas de ${batch.dsp} (${batch.period})`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Document History Table (With Multi-Selection & Direct Deletion) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/70">
              <div>
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#FF5500]" />
                  <span>Documentos Importados ({documents.length} arquivos no histórico)</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cada arquivo permanece como um documento separado. Selecione múltiplos para exclusão em lote ou use a lixeira individual.
                </p>
              </div>

              {selectedDocIds.size > 0 && (
                <button
                  onClick={requestDeleteSelectedDocs}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Documentos Selecionados ({selectedDocIds.size})</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-2.5 px-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={selectedDocIds.size > 0 && selectedDocIds.size === documents.length}
                        onChange={toggleSelectAllDocs}
                        className="w-3.5 h-3.5 rounded-sm border-slate-300 text-[#FF5500] focus:ring-[#FF5500] cursor-pointer"
                        title="Marcar todos os documentos"
                      />
                    </th>
                    <th className="py-2.5 px-3">Nome do Arquivo</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Plataforma</th>
                    <th className="py-2.5 px-3">Data de Importação</th>
                    <th className="py-2.5 px-3">Período Identificado</th>
                    <th className="py-2.5 px-3 text-right">Registros</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        Nenhum documento cadastrado. Use o botão "Importar CSVs" para carregar seus arquivos.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => {
                      const dspColor = doc.dsp ? DSP_COLORS[doc.dsp] : '#64748B';
                      const isSelected = selectedDocIds.has(doc.id);

                      return (
                        <tr
                          key={doc.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-orange-50/50' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectDoc(doc.id)}
                              className="w-3.5 h-3.5 rounded-sm border-slate-300 text-[#FF5500] focus:ring-[#FF5500] cursor-pointer"
                            />
                          </td>

                          {/* File Name */}
                          <td
                            className="py-2.5 px-3 font-semibold text-slate-800 max-w-[200px] truncate"
                            title={doc.fileName}
                          >
                            <div className="flex items-center gap-1.5">
                              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{doc.fileName}</span>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                              {doc.type === 'destaques' ? 'Destaques' : 'Chart'}
                            </span>
                          </td>

                          {/* DSP */}
                          <td className="py-2.5 px-3 whitespace-nowrap font-semibold" style={{ color: dspColor }}>
                            {doc.dsp || '—'}
                          </td>

                          {/* Import Date */}
                          <td className="py-2.5 px-3 text-slate-500 font-mono-numbers whitespace-nowrap text-[11px]">
                            {new Date(doc.importDate).toLocaleString('pt-BR')}
                          </td>

                          {/* Identified Period */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {!doc.isPeriodIdentified ? (
                              <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-sm text-[11px] font-bold">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Período Não Identificado</span>
                                <button
                                  onClick={() => onEditPeriod(doc)}
                                  className="text-[#FF5500] hover:underline ml-1 font-bold cursor-pointer"
                                >
                                  Corrigir
                                </button>
                              </div>
                            ) : (
                              <span className="font-mono-numbers text-slate-800 text-[11px] font-medium">
                                {doc.identifiedPeriod}
                              </span>
                            )}
                          </td>

                          {/* Records */}
                          <td className="py-2.5 px-3 text-right font-mono-numbers font-bold text-slate-900">
                            {doc.recordCount}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => onEditPeriod(doc)}
                                className="p-1.5 rounded-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Editar nome / período"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => requestDeleteDocument(doc)}
                                className="p-1.5 rounded-sm text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Excluir este documento individualmente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: Excluir Destaques Individuais (With Multi-Selection & Direct Deletion) */}
      {activeSubTab === 'singleHighlights' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Exclusão Individual de Destaques
              </h2>
              <p className="text-[11px] text-slate-500">
                Selecione múltiplos destaques com as caixas de seleção ou exclua registros pontualmente
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedHighlightIds.size > 0 && (
                <button
                  onClick={requestDeleteSelectedHighlights}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Destaques Selecionados ({selectedHighlightIds.size})</span>
                </button>
              )}

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por artista, faixa, DSP..."
                  value={searchHighlight}
                  onChange={(e) => setSearchHighlight(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-2 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedHighlightIds.size > 0 &&
                        selectedHighlightIds.size === filteredSingleHighlights.length
                      }
                      onChange={toggleSelectAllFilteredHighlights}
                      className="w-3.5 h-3.5 rounded-sm border-slate-300 text-[#FF5500] focus:ring-[#FF5500] cursor-pointer"
                      title="Marcar todos os visíveis"
                    />
                  </th>
                  <th className="py-2 px-3">Data</th>
                  <th className="py-2 px-3">DSP</th>
                  <th className="py-2 px-3">BU</th>
                  <th className="py-2 px-3">Artista</th>
                  <th className="py-2 px-3">Título</th>
                  <th className="py-2 px-3">Tipo</th>
                  <th className="py-2 px-3">UPC</th>
                  <th className="py-2 px-3 text-center">Excluir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSingleHighlights.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                      Nenhum destaque encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredSingleHighlights.map((hl) => {
                    const isSelected = selectedHighlightIds.has(hl.id);

                    return (
                      <tr
                        key={hl.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-orange-50/60' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectHighlight(hl.id)}
                            className="w-3.5 h-3.5 rounded-sm border-slate-300 text-[#FF5500] focus:ring-[#FF5500] cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono-numbers text-slate-600">{hl.data}</td>
                        <td className="py-2 px-3 font-semibold" style={{ color: DSP_COLORS[hl.dsp] || '#64748B' }}>
                          {hl.dsp}
                        </td>
                        <td className="py-2 px-3 font-medium" style={{ color: BU_COLORS[hl.bu] || '#64748B' }}>
                          {hl.bu}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">{hl.artista}</td>
                        <td className="py-2 px-3 text-slate-700">{hl.titulo}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-xs ${
                              hl.tipoDestaque === 'CAPA'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {hl.tipoDestaque}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono-numbers text-slate-500 text-[11px]">
                          {hl.upc || '—'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => requestDeleteSingleHighlight(hl)}
                            className="p-1 rounded-sm text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir este destaque"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 3: Excluir Faixas de Charts Individuais (With Multi-Selection & Direct Deletion) */}
      {activeSubTab === 'singleCharts' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Exclusão Individual de Faixas de Charts
              </h2>
              <p className="text-[11px] text-slate-500">
                Selecione múltiplas faixas com as caixas de seleção ou exclua registros pontualmente
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedChartIds.size > 0 && (
                <button
                  onClick={requestDeleteSelectedCharts}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Faixas Selecionadas ({selectedChartIds.size})</span>
                </button>
              )}

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por artista, faixa, gravadora..."
                  value={searchChart}
                  onChange={(e) => setSearchChart(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-2 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedChartIds.size > 0 &&
                        selectedChartIds.size === filteredSingleCharts.length
                      }
                      onChange={toggleSelectAllFilteredCharts}
                      className="w-3.5 h-3.5 rounded-sm border-slate-300 text-[#FF5500] focus:ring-[#FF5500] cursor-pointer"
                      title="Marcar todas as faixas visíveis"
                    />
                  </th>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Faixa</th>
                  <th className="py-2 px-3">Artista</th>
                  <th className="py-2 px-3">Plataforma</th>
                  <th className="py-2 px-3">Período</th>
                  <th className="py-2 px-3">Gravadora</th>
                  <th className="py-2 px-3 text-right">Streams</th>
                  <th className="py-2 px-3 text-center">Excluir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSingleCharts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                      Nenhuma faixa encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredSingleCharts.map((item) => {
                    const isSelected = selectedChartIds.has(item.id);

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-orange-50/60' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectChart(item.id)}
                            className="w-3.5 h-3.5 rounded-sm border-slate-300 text-[#FF5500] focus:ring-[#FF5500] cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono-numbers font-bold">#{item.rank}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{item.trackName}</td>
                        <td className="py-2 px-3 text-slate-700">{item.artist}</td>
                        <td className="py-2 px-3 font-semibold" style={{ color: DSP_COLORS[item.dsp] || '#64748B' }}>
                          {item.dsp}
                        </td>
                        <td className="py-2 px-3 font-mono-numbers text-slate-500 text-[11px]">{item.date}</td>
                        <td className="py-2 px-3">{item.label}</td>
                        <td className="py-2 px-3 text-right font-mono-numbers font-bold">
                          {item.streams.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => requestDeleteSingleChart(item)}
                            className="p-1 rounded-sm text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir esta faixa da chart"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Global In-App Confirmation Modal (NO window.confirm!) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h2 className="text-sm font-bold text-slate-900">
                {confirmModal.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {confirmModal.message}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
              >
                {confirmModal.confirmLabel || 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
