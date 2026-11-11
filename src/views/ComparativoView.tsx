import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle,
  HelpCircle,
  LogOut,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { ChartRecord, DSP_COLORS, DSPPlatform } from '../types';

interface ComparativoViewProps {
  charts: ChartRecord[];
}

export const ComparativoView: React.FC<ComparativoViewProps> = ({ charts }) => {
  // Platform selector
  const [selectedPlatform, setSelectedPlatform] = useState<DSPPlatform>('Spotify');

  // Available periods for selected platform
  const availablePeriods = useMemo(() => {
    const list = Array.from(
      new Set(
        charts
          .filter((c) => c.dsp === selectedPlatform)
          .map((c) => c.date)
      )
    ).filter(Boolean);
    return list;
  }, [charts, selectedPlatform]);

  // Selected periods
  const [currentWeek, setCurrentWeek] = useState<string>(() => availablePeriods[0] || '');
  const [previousWeek, setPreviousWeek] = useState<string>(() => availablePeriods[1] || availablePeriods[0] || '');

  // Keep weeks updated if platform changes
  React.useEffect(() => {
    if (availablePeriods.length > 0) {
      if (!availablePeriods.includes(currentWeek)) {
        setCurrentWeek(availablePeriods[0]);
      }
      if (!availablePeriods.includes(previousWeek)) {
        setPreviousWeek(availablePeriods[1] || availablePeriods[0]);
      }
    }
  }, [availablePeriods, currentWeek, previousWeek]);

  // Records for current week and previous week
  const currentChart = useMemo(() => {
    return charts.filter((c) => c.dsp === selectedPlatform && c.date === currentWeek);
  }, [charts, selectedPlatform, currentWeek]);

  const previousChart = useMemo(() => {
    return charts.filter((c) => c.dsp === selectedPlatform && c.date === previousWeek);
  }, [charts, selectedPlatform, previousWeek]);

  // ONErpm subsets
  const currentOnerpm = useMemo(() => currentChart.filter((c) => c.isOnerpm), [currentChart]);
  const previousOnerpm = useMemo(() => previousChart.filter((c) => c.isOnerpm), [previousChart]);

  // 1. Total Streams ONErpm
  const onerpmStreamsCurrent = useMemo(
    () => currentOnerpm.reduce((acc, c) => acc + (c.streams || 0), 0),
    [currentOnerpm]
  );
  const onerpmStreamsPrevious = useMemo(
    () => previousOnerpm.reduce((acc, c) => acc + (c.streams || 0), 0),
    [previousOnerpm]
  );
  const deltaOnerpmStreams = onerpmStreamsCurrent - onerpmStreamsPrevious;
  const pctOnerpmStreams =
    onerpmStreamsPrevious > 0 ? (deltaOnerpmStreams / onerpmStreamsPrevious) * 100 : 0;

  // 2. Total Streams Nacionais
  const natStreamsCurrent = useMemo(
    () => currentChart.filter((c) => c.nacInt === 'NAC').reduce((acc, c) => acc + (c.streams || 0), 0),
    [currentChart]
  );
  const natStreamsPrevious = useMemo(
    () => previousChart.filter((c) => c.nacInt === 'NAC').reduce((acc, c) => acc + (c.streams || 0), 0),
    [previousChart]
  );
  const deltaNatStreams = natStreamsCurrent - natStreamsPrevious;
  const pctNatStreams =
    natStreamsPrevious > 0 ? (deltaNatStreams / natStreamsPrevious) * 100 : 0;

  // 3. Total Geral de Streams
  const totalStreamsCurrent = useMemo(
    () => currentChart.reduce((acc, c) => acc + (c.streams || 0), 0),
    [currentChart]
  );
  const totalStreamsPrevious = useMemo(
    () => previousChart.reduce((acc, c) => acc + (c.streams || 0), 0),
    [previousChart]
  );
  const deltaTotalStreams = totalStreamsCurrent - totalStreamsPrevious;
  const pctTotalStreams =
    totalStreamsPrevious > 0 ? (deltaTotalStreams / totalStreamsPrevious) * 100 : 0;

  // 4. Faixa da semana atual com o melhor ranking
  const bestRankingTrack = useMemo(() => {
    if (currentOnerpm.length === 0) return null;
    const sorted = [...currentOnerpm].sort((a, b) => a.rank - b.rank);
    return sorted[0];
  }, [currentOnerpm]);

  // 5. Faixas que entraram (estão na semana atual e não estavam na semana comparada)
  const enteredTracks = useMemo(() => {
    const prevKeys = new Set(
      previousOnerpm.map((t) => `${t.artist.toLowerCase()} - ${t.trackName.toLowerCase()}`)
    );
    return currentOnerpm.filter(
      (t) => !prevKeys.has(`${t.artist.toLowerCase()} - ${t.trackName.toLowerCase()}`)
    );
  }, [currentOnerpm, previousOnerpm]);

  // 6. Faixas que saíram (estavam na semana comparada e não estão na atual)
  const exitedTracks = useMemo(() => {
    const curKeys = new Set(
      currentOnerpm.map((t) => `${t.artist.toLowerCase()} - ${t.trackName.toLowerCase()}`)
    );
    return previousOnerpm.filter(
      (t) => !curKeys.has(`${t.artist.toLowerCase()} - ${t.trackName.toLowerCase()}`)
    );
  }, [currentOnerpm, previousOnerpm]);

  // 7. Tendências de crescimento das faixas (rank gain/loss and stream growth)
  const trackGrowthTrends = useMemo(() => {
    const results: {
      artist: string;
      trackName: string;
      currentRank: number;
      previousRank: number;
      rankDiff: number; // positive = climbed
      currentStreams: number;
      previousStreams: number;
      streamsDiff: number;
      genre: string;
    }[] = [];

    currentOnerpm.forEach((cur) => {
      const matchPrev = previousOnerpm.find(
        (p) =>
          p.artist.toLowerCase() === cur.artist.toLowerCase() &&
          p.trackName.toLowerCase() === cur.trackName.toLowerCase()
      );

      if (matchPrev) {
        // rankDiff: if prev was #4 and current is #2 -> 4 - 2 = +2 (climbed 2 positions)
        const rankDiff = matchPrev.rank - cur.rank;
        const streamsDiff = cur.streams - matchPrev.streams;
        results.push({
          artist: cur.artist,
          trackName: cur.trackName,
          currentRank: cur.rank,
          previousRank: matchPrev.rank,
          rankDiff,
          currentStreams: cur.streams,
          previousStreams: matchPrev.streams,
          streamsDiff,
          genre: cur.genre,
        });
      }
    });

    // Sort by rankDiff descending (biggest climbers first)
    return results.sort((a, b) => b.rankDiff - a.rankDiff);
  }, [currentOnerpm, previousOnerpm]);

  // 8. Comparação da quantidade de faixas por gravadora entre os dois períodos (todas as gravadoras envolvidas)
  const labelComparison = useMemo(() => {
    const allLabels = Array.from(
      new Set([...currentChart.map((c) => c.label), ...previousChart.map((c) => c.label)])
    ).filter(Boolean);

    const data = allLabels.map((lbl) => {
      const countCur = currentChart.filter((c) => c.label === lbl).length;
      const countPrev = previousChart.filter((c) => c.label === lbl).length;
      const diff = countCur - countPrev;
      const isOnerpm = /onerpm/i.test(lbl);

      return {
        label: lbl,
        countCur,
        countPrev,
        diff,
        isOnerpm,
      };
    });

    // Sort descending by current count, ONErpm first if tied
    return data.sort((a, b) => {
      if (b.countCur !== a.countCur) return b.countCur - a.countCur;
      if (a.isOnerpm) return -1;
      if (b.isOnerpm) return 1;
      return b.countPrev - a.countPrev;
    });
  }, [currentChart, previousChart]);

  const dspsList: DSPPlatform[] = [
    'Spotify',
    'Deezer',
    'Amazon Music',
    'Apple Music',
    'YouTube Music',
    'Shazam Discovery',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Comparativo Semanal de Performance
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Análise comparativa direta entre semanas da mesma plataforma para o repertório ONErpm
        </p>
      </div>

      {/* Platform & Period Selectors */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        {/* Platform Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. Selecionar Plataforma DSP
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {dspsList.map((dsp) => {
              const isActive = selectedPlatform === dsp;
              const color = DSP_COLORS[dsp] || '#64748B';
              return (
                <button
                  key={dsp}
                  onClick={() => setSelectedPlatform(dsp)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span>{dsp}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Weeks Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          {/* Semana Atual */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Semana Atual (Referência)
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#FF5500] absolute left-3 top-2.5" />
              <select
                value={currentWeek}
                onChange={(e) => setCurrentWeek(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-300 rounded-lg pl-9 pr-3 py-2 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
              >
                {availablePeriods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Semana de Comparação */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Semana de Comparação (Anterior / Histórica)
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={previousWeek}
                onChange={(e) => setPreviousWeek(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-300 rounded-lg pl-9 pr-3 py-2 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
              >
                {availablePeriods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Comparative KPI Metrics with Triangle Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Streams ONErpm */}
        <div className="bg-white p-4 rounded-xl border border-orange-200 bg-orange-50/10 shadow-2xs space-y-2">
          <span className="text-[11px] font-bold text-[#FF5500] uppercase tracking-wider block">
            Streams ONErpm
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono-numbers">
            {onerpmStreamsCurrent.toLocaleString('pt-BR')}
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-orange-100">
            {deltaOnerpmStreams >= 0 ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 font-mono-numbers">
                <span>▲</span>
                <span>+{deltaOnerpmStreams.toLocaleString('pt-BR')}</span>
                <span className="text-[11px]">({pctOnerpmStreams >= 0 ? `+${pctOnerpmStreams.toFixed(1)}%` : `${pctOnerpmStreams.toFixed(1)}%`})</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-600 font-mono-numbers">
                <span>▼</span>
                <span>{deltaOnerpmStreams.toLocaleString('pt-BR')}</span>
                <span className="text-[11px]">({pctOnerpmStreams.toFixed(1)}%)</span>
              </span>
            )}
            <span className="text-[10px] text-slate-400">vs período anterior</span>
          </div>
        </div>

        {/* KPI 2: Total Streams Nacionais */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Streams Nacionais (NAC)
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono-numbers">
            {natStreamsCurrent.toLocaleString('pt-BR')}
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            {deltaNatStreams >= 0 ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 font-mono-numbers">
                <span>▲</span>
                <span>+{deltaNatStreams.toLocaleString('pt-BR')}</span>
                <span className="text-[11px]">({pctNatStreams >= 0 ? `+${pctNatStreams.toFixed(1)}%` : `${pctNatStreams.toFixed(1)}%`})</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-600 font-mono-numbers">
                <span>▼</span>
                <span>{deltaNatStreams.toLocaleString('pt-BR')}</span>
                <span className="text-[11px]">({pctNatStreams.toFixed(1)}%)</span>
              </span>
            )}
            <span className="text-[10px] text-slate-400">vs período anterior</span>
          </div>
        </div>

        {/* KPI 3: Total Geral */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Geral de Streams
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono-numbers">
            {totalStreamsCurrent.toLocaleString('pt-BR')}
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            {deltaTotalStreams >= 0 ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 font-mono-numbers">
                <span>▲</span>
                <span>+{deltaTotalStreams.toLocaleString('pt-BR')}</span>
                <span className="text-[11px]">({pctTotalStreams >= 0 ? `+${pctTotalStreams.toFixed(1)}%` : `${pctTotalStreams.toFixed(1)}%`})</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-600 font-mono-numbers">
                <span>▼</span>
                <span>{deltaTotalStreams.toLocaleString('pt-BR')}</span>
                <span className="text-[11px]">({pctTotalStreams.toFixed(1)}%)</span>
              </span>
            )}
            <span className="text-[10px] text-slate-400">vs período anterior</span>
          </div>
        </div>

        {/* KPI 4: Faixa com melhor ranking atual */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Melhor Ranking ONErpm
          </span>
          {bestRankingTrack ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#FF5500] font-mono-numbers">
                  #{bestRankingTrack.rank}
                </span>
                <span className="text-xs font-bold text-slate-800 truncate" title={bestRankingTrack.trackName}>
                  {bestRankingTrack.trackName}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {bestRankingTrack.artist} ({bestRankingTrack.streams.toLocaleString('pt-BR')} streams)
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-2">Nenhuma faixa ONErpm nesta semana</p>
          )}
        </div>
      </div>

      {/* Entries and Exits Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Entradas (Estão na semana atual e não estavam na comparada) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Faixas Que Entraram ({enteredTracks.length})
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700">
              Estreias / Retornos ONErpm
            </span>
          </div>

          <div className="p-4 divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {enteredTracks.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Nenhuma faixa nova entrou nesta semana em comparação ao período anterior.
              </p>
            ) : (
              enteredTracks.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-numbers font-bold text-slate-900 text-xs">
                        #{item.rank}
                      </span>
                      <span className="font-bold text-slate-800 text-xs truncate">
                        {item.trackName}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {item.artist} · {item.genre}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-600 font-mono-numbers block">
                      +{item.streams.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-xs font-bold uppercase">
                      NOVA
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Saídas (Estavam na semana comparada e não estão na atual) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                Faixas Que Saíram ({exitedTracks.length})
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-rose-700">
              Deixaram o chart
            </span>
          </div>

          <div className="p-4 divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {exitedTracks.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Nenhuma faixa ONErpm deixou o ranking em relação à semana comparada.
              </p>
            ) : (
              exitedTracks.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-numbers font-medium text-slate-400 text-xs line-through">
                        #{item.rank}
                      </span>
                      <span className="font-semibold text-slate-700 text-xs truncate">
                        {item.trackName}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {item.artist} · Estava com {item.streams.toLocaleString('pt-BR')} streams
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-xs font-bold uppercase">
                      SAIU
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tendências de Crescimento das Faixas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Tendências de Crescimento das Faixas ONErpm ({trackGrowthTrends.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Variação de posições no ranking e crescimento de volume de streams entre os dois períodos
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                <th className="py-2.5 px-3">Posição Atual</th>
                <th className="py-2.5 px-3">Faixa</th>
                <th className="py-2.5 px-3">Artista</th>
                <th className="py-2.5 px-3">Gênero</th>
                <th className="py-2.5 px-3 text-center">Variação de Ranking</th>
                <th className="py-2.5 px-3 text-right">Streams Atual</th>
                <th className="py-2.5 px-3 text-right">Streams Comparado</th>
                <th className="py-2.5 px-3 text-right">Variação Streams</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trackGrowthTrends.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    Sem faixas contínuas entre os dois períodos para traçar tendências.
                  </td>
                </tr>
              ) : (
                trackGrowthTrends.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    {/* Current Rank */}
                    <td className="py-2 px-3 font-mono-numbers font-black text-slate-900 w-16">
                      #{t.currentRank}
                    </td>

                    {/* Track */}
                    <td className="py-2 px-3 font-bold text-slate-900 max-w-[200px] truncate" title={t.trackName}>
                      {t.trackName}
                    </td>

                    {/* Artist */}
                    <td className="py-2 px-3 text-slate-700 max-w-[170px] truncate" title={t.artist}>
                      {t.artist}
                    </td>

                    {/* Genre */}
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                      {t.genre}
                    </td>

                    {/* Rank Diff */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      {t.rankDiff > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 font-mono-numbers text-xs">
                          <span>▲</span> +{t.rankDiff} posições
                        </span>
                      ) : t.rankDiff < 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-600 font-mono-numbers text-xs">
                          <span>▼</span> {t.rankDiff} posições
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-400 font-mono-numbers text-xs">
                          <Minus className="w-3 h-3" /> Manteve
                        </span>
                      )}
                    </td>

                    {/* Current Streams */}
                    <td className="py-2 px-3 text-right font-mono-numbers font-bold text-slate-900 whitespace-nowrap">
                      {t.currentStreams.toLocaleString('pt-BR')}
                    </td>

                    {/* Previous Streams */}
                    <td className="py-2 px-3 text-right font-mono-numbers text-slate-500 whitespace-nowrap">
                      {t.previousStreams.toLocaleString('pt-BR')}
                    </td>

                    {/* Streams Diff */}
                    <td className="py-2 px-3 text-right font-mono-numbers font-bold whitespace-nowrap">
                      {t.streamsDiff >= 0 ? (
                        <span className="text-emerald-600">
                          ▲ +{t.streamsDiff.toLocaleString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-rose-600">
                          ▼ {t.streamsDiff.toLocaleString('pt-BR')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparação da Quantidade de Faixas por Gravadora Entre os Dois Períodos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Comparação de Faixas por Gravadora Entre os Dois Períodos ({labelComparison.length} gravadoras)
            </h3>
            <p className="text-[11px] text-slate-500">
              Exibindo todas as gravadoras e distribuidoras presentes nas duas semanas
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                <th className="py-2.5 px-3">Gravadora / Selo</th>
                <th className="py-2.5 px-3 text-center">Semana Comparada ({previousWeek})</th>
                <th className="py-2.5 px-3 text-center">Semana Atual ({currentWeek})</th>
                <th className="py-2.5 px-3 text-center">Variação de Faixas</th>
                <th className="py-2.5 px-3">Proporção Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {labelComparison.map((row, idx) => {
                const maxVal = Math.max(...labelComparison.map((l) => Math.max(l.countCur, l.countPrev)), 1);
                const pct = (row.countCur / maxVal) * 100;

                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      row.isOnerpm ? 'bg-orange-50/25 font-semibold' : ''
                    }`}
                  >
                    {/* Gravadora */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      {row.isOnerpm ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-white bg-[#FF5500] px-2 py-0.5 rounded-sm shadow-2xs">
                            ONErpm
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-800 font-medium">{row.label}</span>
                      )}
                    </td>

                    {/* Semana Comparada */}
                    <td className="py-2 px-3 text-center font-mono-numbers text-slate-500">
                      {row.countPrev} faixas
                    </td>

                    {/* Semana Atual */}
                    <td className="py-2 px-3 text-center font-mono-numbers font-bold text-slate-900">
                      {row.countCur} faixas
                    </td>

                    {/* Variação */}
                    <td className="py-2 px-3 text-center font-mono-numbers font-bold whitespace-nowrap">
                      {row.diff > 0 ? (
                        <span className="text-emerald-600">▲ +{row.diff}</span>
                      ) : row.diff < 0 ? (
                        <span className="text-rose-600">▼ {row.diff}</span>
                      ) : (
                        <span className="text-slate-400">= 0</span>
                      )}
                    </td>

                    {/* Proporção visual */}
                    <td className="py-2 px-3 w-48">
                      <div className="w-full bg-slate-100 rounded-xs h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-xs transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: row.isOnerpm ? '#FF5500' : '#94A3B8',
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
