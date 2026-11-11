import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  Edit2,
  Filter,
  Flame,
  Layers,
  Music,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { BarChart } from '../components/Charts/BarChart';
import { DonutChart } from '../components/Charts/DonutChart';
import { LineChart, LineSeries } from '../components/Charts/LineChart';
import { BU_COLORS, ChartRecord, DSP_COLORS, DSPPlatform, ImportedDocument } from '../types';

interface ChartsViewProps {
  documents: ImportedDocument[];
  charts: ChartRecord[];
  onOpenImport: () => void;
  onEditPeriod: (doc: ImportedDocument) => void;
  onDeleteChart?: (id: string) => void;
}

export const ChartsView: React.FC<ChartsViewProps> = ({
  documents,
  charts,
  onOpenImport,
  onEditPeriod,
  onDeleteChart,
}) => {
  // Filters (independent for Charts page)
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | DSPPlatform>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [onerpmOnly, setOnerpmOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chartToDelete, setChartToDelete] = useState<ChartRecord | null>(null);

  // All chart documents for current platform (or all platforms when 'all')
  const platformDocs = useMemo(() => {
    if (selectedPlatform === 'all') {
      return documents.filter((d) => d.type === 'chart');
    }
    return documents.filter((d) => d.type === 'chart' && d.dsp === selectedPlatform);
  }, [documents, selectedPlatform]);

  // Available weeks/periods for this platform (or all platforms when 'all')
  const availablePeriods = useMemo(() => {
    let periods: string[] = [];
    if (selectedPlatform === 'all') {
      periods = Array.from(new Set(charts.map((c) => c.date))).filter(Boolean);
    } else {
      periods = Array.from(
        new Set(
          charts
            .filter((c) => c.dsp === selectedPlatform)
            .map((c) => c.date)
        )
      ).filter(Boolean);
    }

    // If documents have identified periods, use those
    platformDocs.forEach((doc) => {
      if (doc.identifiedPeriod && !periods.includes(doc.identifiedPeriod)) {
        periods.push(doc.identifiedPeriod);
      }
    });

    return periods.sort().reverse();
  }, [charts, selectedPlatform, platformDocs]);

  // Documents with unidentified period for this platform
  const unidentifiedDocs = useMemo(() => {
    return platformDocs.filter((d) => !d.isPeriodIdentified);
  }, [platformDocs]);

  // Filtered chart records for indicators and table
  const filteredCharts = useMemo(() => {
    return charts.filter((c) => {
      if (selectedPlatform !== 'all' && c.dsp !== selectedPlatform) return false;
      if (selectedWeek !== 'all' && c.date !== selectedWeek) return false;
      if (onerpmOnly && !c.isOnerpm) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesArtist = c.artist.toLowerCase().includes(q);
        const matchesTrack = c.trackName.toLowerCase().includes(q);
        const matchesLabel = c.label.toLowerCase().includes(q);
        if (!matchesArtist && !matchesTrack && !matchesLabel) return false;
      }
      return true;
    });
  }, [charts, selectedPlatform, selectedWeek, onerpmOnly, searchQuery]);

  // Indicators:
  // 1. Soma de streams totais
  const totalStreams = useMemo(() => {
    return filteredCharts.reduce((sum, c) => sum + (c.streams || 0), 0);
  }, [filteredCharts]);

  // 2. Soma de streams nacionais
  const nationalStreams = useMemo(() => {
    return filteredCharts
      .filter((c) => c.nacInt === 'NAC')
      .reduce((sum, c) => sum + (c.streams || 0), 0);
  }, [filteredCharts]);

  // 3. Soma de streams de faixas da ONErpm
  const onerpmStreams = useMemo(() => {
    return filteredCharts
      .filter((c) => c.isOnerpm)
      .reduce((sum, c) => sum + (c.streams || 0), 0);
  }, [filteredCharts]);

  // ONErpm Share of Streams
  const onerpmShare = useMemo(() => {
    if (totalStreams === 0) return 0;
    return (onerpmStreams / totalStreams) * 100;
  }, [totalStreams, onerpmStreams]);

  // Rankings de Gravadoras/Distribuidoras por número de faixas (ordenado, ONErpm sempre visível)
  const labelRankingData = useMemo(() => {
    const labelCounts: Record<string, { count: number; streams: number; isOnerpm: boolean }> = {};

    filteredCharts.forEach((c) => {
      const lbl = c.label || 'Outros';
      if (!labelCounts[lbl]) {
        labelCounts[lbl] = {
          count: 0,
          streams: 0,
          isOnerpm: c.isOnerpm,
        };
      }
      labelCounts[lbl].count += 1;
      labelCounts[lbl].streams += c.streams || 0;
    });

    const entries = Object.entries(labelCounts).map(([label, info]) => ({
      label,
      value: info.count,
      isHighlighted: info.isOnerpm,
      subtext: `${info.streams.toLocaleString('pt-BR')} streams`,
    }));

    // Sort descending by number of tracks
    entries.sort((a, b) => b.value - a.value);

    // CRITICAL: Ensure ONErpm is visible even if not in top positions
    const hasOnerpmInList = entries.some((e) => e.isHighlighted);
    if (!hasOnerpmInList && onerpmStreams > 0) {
      entries.push({
        label: 'ONErpm',
        value: filteredCharts.filter((c) => c.isOnerpm).length,
        isHighlighted: true,
        subtext: `${onerpmStreams.toLocaleString('pt-BR')} streams`,
      });
    }

    return entries;
  }, [filteredCharts, onerpmStreams]);

  // Distribuição por BU (com cores próprias)
  const buDistributionData = useMemo(() => {
    const buCounts: Record<string, number> = {};
    filteredCharts.forEach((c) => {
      const bu = c.genre || 'Geral / Outros';
      buCounts[bu] = (buCounts[bu] || 0) + 1;
    });

    return Object.entries(buCounts)
      .map(([bu, count]) => ({
        label: bu,
        value: count,
        color: BU_COLORS[bu] || '#64748B',
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCharts]);

  // Evolução de streams da ONErpm por plataforma ao longo de todo o período disponível
  // Usando o período identificado em cada CSV
  const onerpmEvolutionData = useMemo(() => {
    // Unique periods across all charts
    const allPeriods = Array.from(new Set(charts.map((c) => c.date))).filter(Boolean).sort();
    const platforms: DSPPlatform[] = [
      'Spotify',
      'Deezer',
      'Amazon Music',
      'Apple Music',
      'YouTube Music',
    ];

    const seriesList: LineSeries[] = platforms.map((p) => {
      const color = DSP_COLORS[p] || '#64748B';
      const data = allPeriods.map((period) => {
        const streams = charts
          .filter((c) => c.dsp === p && c.date === period && c.isOnerpm)
          .reduce((acc, c) => acc + (c.streams || 0), 0);
        return { x: period, y: streams };
      });

      return { id: p, label: p, color, data };
    });

    return seriesList.filter((s) => s.data.some((d) => d.y > 0));
  }, [charts]);

  // Gráfico de streams mensais da ONErpm por plataforma
  const onerpmMonthlyStreamsData = useMemo(() => {
    const platforms: DSPPlatform[] = [
      'Spotify',
      'Deezer',
      'Amazon Music',
      'Apple Music',
      'YouTube Music',
      'Shazam Discovery',
    ];

    return platforms.map((p) => {
      const total = charts
        .filter((c) => c.dsp === p && c.isOnerpm)
        .reduce((acc, c) => acc + (c.streams || 0), 0);
      return {
        label: p,
        value: total,
        color: DSP_COLORS[p] || '#64748B',
      };
    });
  }, [charts]);

  const dspsList: DSPPlatform[] = [
    'Spotify',
    'Deezer',
    'Amazon Music',
    'Apple Music',
    'YouTube Music',
    'Shazam Discovery',
  ];

  const downloadChartTemplate = () => {
    const csvContent = 'Rank,Artist,Track Name,Streams,Label,Nac/Int,Genre,Date\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_charts_semanal.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and Platform Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {selectedPlatform === 'all'
              ? 'Charts Semanais (Todas as Plataformas)'
              : `Charts Semanais: ${selectedPlatform}`}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedPlatform === 'all'
              ? 'Visão geral comparativa entre plataformas, rankings unificados e performance consolidada'
              : `Monitoramento de rankings, streams de faixas e performance das gravadoras no ${selectedPlatform}`}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Template Download Button */}
          <button
            onClick={downloadChartTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
            title="Baixar arquivo modelo CSV para preenchimento de Charts"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Template CSV</span>
          </button>

          {/* Import Button */}
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#FF5500] hover:bg-[#E04B00] rounded-lg shadow-2xs transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Importar Chart CSV</span>
          </button>
        </div>
      </div>

      {/* Platform Segmented Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 overflow-x-auto">
        {/* Tab 1: Visão Geral (Todas as Plataformas) */}
        <button
          onClick={() => {
            setSelectedPlatform('all');
            setSelectedWeek('all');
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            selectedPlatform === 'all'
              ? 'bg-slate-900 text-white shadow-xs ring-2 ring-slate-900/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#FF5500] to-amber-400 shrink-0" />
          <span>🌐 Todas as Plataformas (Geral)</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-xs font-mono-numbers font-bold ${
              selectedPlatform === 'all'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {charts.length}
          </span>
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />

        {/* Individual DSP Tabs */}
        {dspsList.map((dsp) => {
          const isActive = selectedPlatform === dsp;
          const color = DSP_COLORS[dsp] || '#64748B';
          const count = charts.filter((c) => c.dsp === dsp).length;

          return (
            <button
              key={dsp}
              onClick={() => {
                setSelectedPlatform(dsp);
                setSelectedWeek('all');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-slate-100 text-slate-900 shadow-2xs ring-1 ring-slate-300 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span>{dsp}</span>
              <span className="text-[10px] bg-slate-200/60 text-slate-600 px-1.5 py-0.2 rounded-xs font-mono-numbers">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Warning for Unidentified Periods */}
      {unidentifiedDocs.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Atenção: {unidentifiedDocs.length} arquivo(s) com "Período Não Identificado"
              </h4>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Não foi possível reconhecer as datas pelo nome do arquivo. Corrija o período manualmente para incluir os dados nos gráficos e filtros.
              </p>
            </div>
          </div>
          <button
            onClick={() => onEditPeriod(unidentifiedDocs[0])}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Edit2 className="w-3 h-3" />
            Corrigir Período
          </button>
        </div>
      )}

      {/* Week / Period Selector & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Week Selector displaying identified period */}
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="w-4 h-4 text-[#FF5500] shrink-0" />
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                Período da Chart {selectedPlatform === 'all' ? '(Consolidado - Todas as DSPs)' : `(${selectedPlatform})`}
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
              >
                <option value="all">Todos os Períodos Disponíveis ({availablePeriods.length})</option>
                {availablePeriods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Filter: ONErpm Only toggle */}
          <div className="flex items-center gap-4 shrink-0 pt-2 sm:pt-0">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={onerpmOnly}
                onChange={(e) => setOnerpmOnly(e.target.checked)}
                className="rounded-xs text-[#FF5500] focus:ring-[#FF5500] w-4 h-4"
              />
              <span className="text-[#FF5500]">Apenas Faixas ONErpm</span>
            </label>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar artista, faixa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500] w-48"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stream Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Soma de Streams Totais */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Soma de Streams Totais
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers mt-1">
              {totalStreams.toLocaleString('pt-BR')}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Todas as faixas no período selecionado
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Soma de Streams Nacionais */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Soma de Streams Nacionais (NAC)
            </span>
            <div className="text-2xl font-black text-emerald-600 font-mono-numbers mt-1">
              {nationalStreams.toLocaleString('pt-BR')}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {totalStreams > 0 ? ((nationalStreams / totalStreams) * 100).toFixed(1) : 0}% do total
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Soma de Streams de Faixas da ONErpm */}
        <div className="bg-white p-4 rounded-xl border border-orange-200 bg-orange-50/10 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#FF5500] uppercase tracking-wider block">
              Streams ONErpm
            </span>
            <div className="text-2xl font-black text-[#FF5500] font-mono-numbers mt-1">
              {onerpmStreams.toLocaleString('pt-BR')}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Share de {onerpmShare.toFixed(1)}% das streams no período
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-[#FF5500]">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visualizations: Label Ranking & BU Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Ranking de Gravadoras/Distribuidoras por número de faixas */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Ranking de Gravadoras por Número de Faixas
              </h3>
              <p className="text-[11px] text-slate-500">
                Sempre ordenado. ONErpm destacada em laranja mesmo entre as últimas posições
              </p>
            </div>
            <Award className="w-4 h-4 text-[#FF5500]" />
          </div>
          <BarChart data={labelRankingData} horizontal height={240} />
        </div>

        {/* Graph 2: Distribuição por BU */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Distribuição por BU (Gênero)
              </h3>
              <p className="text-[11px] text-slate-500">
                Representatividade por gênero musical com cores exclusivas
              </p>
            </div>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <DonutChart data={buDistributionData} size={180} thickness={28} />
        </div>
      </div>

      {/* Time Evolutions (Full Period) - Rendered ONLY on General view ('all') and hidden on individual platform pages */}
      {selectedPlatform === 'all' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graph 3: Evolução de streams da ONErpm por plataforma ao longo de todo o período */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Evolução de Streams ONErpm por Plataforma
                </h3>
                <p className="text-[11px] text-slate-500">
                  Streams semanais da ONErpm em todo o histórico de CSVs importados
                </p>
              </div>
            </div>
            <LineChart
              series={onerpmEvolutionData}
              height={220}
              valueFormatter={(v) => `${(v / 1000000).toFixed(2)}M`}
              emptyMessage="Sem dados de histórico de streams para ONErpm"
            />
          </div>

          {/* Graph 4: Gráfico de streams totais da ONErpm por plataforma */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Volume Total de Streams ONErpm por DSP
                </h3>
                <p className="text-[11px] text-slate-500">
                  Soma acumulada de streams das faixas ONErpm em cada plataforma
                </p>
              </div>
            </div>
            <BarChart
              data={onerpmMonthlyStreamsData}
              height={220}
              valueFormatter={(v) => v.toLocaleString('pt-BR')}
            />
          </div>
        </div>
      )}

      {/* Detailed Chart Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Tabela da Chart: {selectedPlatform === 'all' ? 'Todas as Plataformas (Geral)' : selectedPlatform} ({filteredCharts.length} faixas)
            </h3>
            <p className="text-[11px] text-slate-500">
              {selectedWeek === 'all' ? 'Exibindo todos os períodos' : `Período: ${selectedWeek}`}
            </p>
          </div>
          <span className="text-[11px] text-slate-500 font-mono-numbers">
            {filteredCharts.filter((c) => c.isOnerpm).length} faixas ONErpm
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                <th className="py-2.5 px-3">#</th>
                {selectedPlatform === 'all' && (
                  <th className="py-2.5 px-3">DSP</th>
                )}
                <th className="py-2.5 px-3">Faixa</th>
                <th className="py-2.5 px-3">Artista</th>
                <th className="py-2.5 px-3">Gravadora</th>
                <th className="py-2.5 px-3">BU / Gênero</th>
                <th className="py-2.5 px-3">Origem</th>
                <th className="py-2.5 px-3 text-right">Streams</th>
                <th className="py-2.5 px-3">Período</th>
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCharts.length === 0 ? (
                <tr>
                  <td colSpan={selectedPlatform === 'all' ? 10 : 9} className="py-8 text-center text-slate-400 text-xs">
                    Nenhuma faixa encontrada na chart para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredCharts.map((item) => {
                  const buColor = BU_COLORS[item.genre] || '#64748B';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        item.isOnerpm ? 'bg-orange-50/20' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-2 px-3 font-mono-numbers font-bold text-slate-900 w-12">
                        #{item.rank}
                      </td>

                      {/* DSP (Shown in General View) */}
                      {selectedPlatform === 'all' && (
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-sm text-white shadow-2xs"
                            style={{ backgroundColor: DSP_COLORS[item.dsp] || '#64748B' }}
                          >
                            {item.dsp}
                          </span>
                        </td>
                      )}

                      {/* Track Name */}
                      <td className="py-2 px-3 font-bold text-slate-900 max-w-[200px] truncate" title={item.trackName}>
                        {item.trackName}
                      </td>

                      {/* Artist */}
                      <td className="py-2 px-3 font-medium text-slate-700 max-w-[170px] truncate" title={item.artist}>
                        {item.artist}
                      </td>

                      {/* Label */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {item.isOnerpm ? (
                          <span className="text-[10px] font-black text-white bg-[#FF5500] px-2 py-0.5 rounded-sm inline-block shadow-2xs">
                            ONErpm
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px] font-medium">
                            {item.label}
                          </span>
                        )}
                      </td>

                      {/* Genre / BU */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className="font-semibold text-[11px]"
                          style={{ color: buColor }}
                        >
                          {item.genre}
                        </span>
                      </td>

                      {/* Nac/Int */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-xs ${
                            item.nacInt === 'NAC'
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-indigo-700 bg-indigo-50'
                          }`}
                        >
                          {item.nacInt}
                        </span>
                      </td>

                      {/* Streams */}
                      <td className="py-2 px-3 text-right font-mono-numbers font-bold text-slate-900 whitespace-nowrap">
                        {item.streams.toLocaleString('pt-BR')}
                      </td>

                      {/* Date */}
                      <td className="py-2 px-3 text-slate-500 font-mono-numbers whitespace-nowrap text-[11px]">
                        {item.date}
                      </td>

                      {/* Ações */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {onDeleteChart && (
                          <button
                            onClick={() => setChartToDelete(item)}
                            className="p-1 rounded-sm text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir faixa da chart"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Confirm Delete Chart Record */}
      {chartToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900">
                Excluir Faixa da Chart?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Deseja remover "#{chartToDelete.rank} {chartToDelete.artist} - {chartToDelete.trackName}" da base?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setChartToDelete(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onDeleteChart) {
                    onDeleteChart(chartToDelete.id);
                  }
                  setChartToDelete(null);
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
