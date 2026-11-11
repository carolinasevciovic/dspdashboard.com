import React, { useState } from 'react';
import {
  Award,
  BarChart3,
  Calendar,
  Check,
  Filter,
  Layers,
  PieChart as PieChartIcon,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  BU_COLORS,
  DSP_COLORS,
  DSPAction,
  DSPPlatform,
  OFFICIAL_BUS,
} from '../types';
import { BarChart } from '../components/Charts/BarChart';
import { DonutChart } from '../components/Charts/DonutChart';

interface AcoesViewProps {
  actions: DSPAction[];
  actionTypes: string[];
  onAddAction: (action: DSPAction) => void;
  onDeleteAction: (id: string) => void;
  onAddActionType: (newType: string) => void;
}

const ALL_DSPS: DSPPlatform[] = [
  'Spotify',
  'Deezer',
  'Amazon Music',
  'Apple Music',
  'YouTube Music',
  'Claro Música',
  'Brisa Music',
  'Audiomack',
  'Nomo Music',
  'Beatport',
  'Qobuz',
  'TIDAL',
  'Shazam Discovery',
];

const ACTION_TYPE_PALETTE = [
  '#FF5500', // ONErpm orange
  '#00A8E1', // Amazon cyan
  '#1DB954', // Spotify green
  '#A238FF', // Deezer purple
  '#FA243C', // Apple red
  '#EAB308', // Amber
  '#EC4899', // Pink
  '#818CF8', // Indigo
  '#10B981', // Emerald
  '#F97316', // Orange
  '#64748B', // Slate
];

export const AcoesView: React.FC<AcoesViewProps> = ({
  actions,
  actionTypes,
  onAddAction,
  onDeleteAction,
  onAddActionType,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [showInlineNewType, setShowInlineNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  // Filters
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterBu, setFilterBu] = useState<string>('all');
  const [searchArtist, setSearchArtist] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState<Omit<DSPAction, 'id' | 'createdAt'>>({
    data: new Date().toISOString().split('T')[0],
    plataforma: 'Spotify',
    bu: 'Sertanejo',
    tipoAcao: actionTypes[0] || 'Pitching Editorial',
    territorio: 'Brasil',
    artista: '',
    acaoOuLancamento: '',
    detalhes: '',
  });

  // KPI & Chart Computations
  const totalActions = actions.length;

  // Actions per DSP (Ranking)
  const dspCountMap = actions.reduce<Record<string, number>>((acc, act) => {
    acc[act.plataforma] = (acc[act.plataforma] || 0) + 1;
    return acc;
  }, {});

  const actionsByDsp = Object.entries(dspCountMap)
    .map(([dsp, count]) => ({
      label: dsp,
      value: count,
      color: DSP_COLORS[dsp] || '#64748B',
      isHighlighted: false,
      subtext: `${((count / (totalActions || 1)) * 100).toFixed(0)}% das ações`,
    }))
    .sort((a, b) => b.value - a.value);

  const topDsp = actionsByDsp[0] || null;

  // Actions per BU
  const buCountMap = actions.reduce<Record<string, number>>((acc, act) => {
    acc[act.bu] = (acc[act.bu] || 0) + 1;
    return acc;
  }, {});

  const actionsByBu = Object.entries(buCountMap)
    .map(([bu, count]) => ({
      label: bu,
      value: count,
      color: BU_COLORS[bu] || '#64748B',
    }))
    .sort((a, b) => b.value - a.value);

  const topBu = actionsByBu[0] || null;

  // Actions per Type
  const typeCountMap = actions.reduce<Record<string, number>>((acc, act) => {
    acc[act.tipoAcao] = (acc[act.tipoAcao] || 0) + 1;
    return acc;
  }, {});

  const actionsByType = Object.entries(typeCountMap)
    .map(([type, count], idx) => ({
      label: type,
      value: count,
      color: ACTION_TYPE_PALETTE[idx % ACTION_TYPE_PALETTE.length],
    }))
    .sort((a, b) => b.value - a.value);

  const filteredActions = actions.filter((act) => {
    if (filterPlatform !== 'all' && act.plataforma !== filterPlatform) return false;
    if (filterType !== 'all' && act.tipoAcao !== filterType) return false;
    if (filterBu !== 'all' && act.bu !== filterBu) return false;
    if (searchArtist.trim()) {
      const q = searchArtist.toLowerCase();
      const matchArt = act.artista.toLowerCase().includes(q);
      const matchAcao = act.acaoOuLancamento.toLowerCase().includes(q);
      if (!matchArt && !matchAcao) return false;
    }
    return true;
  });

  const handleSaveAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.artista.trim() || !formData.acaoOuLancamento.trim()) return;

    const newAction: DSPAction = {
      ...formData,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    onAddAction(newAction);
    setModalOpen(false);
    setShowInlineNewType(false);
    // Reset form
    setFormData({
      data: new Date().toISOString().split('T')[0],
      plataforma: 'Spotify',
      bu: 'Sertanejo',
      tipoAcao: actionTypes[0] || 'Pitching Editorial',
      territorio: 'Brasil',
      artista: '',
      acaoOuLancamento: '',
      detalhes: '',
    });
  };

  const handleCreateCustomType = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTypeName.trim();
    if (!trimmed) return;

    onAddActionType(trimmed);
    setFormData((prev) => ({ ...prev, tipoAcao: trimmed }));
    setNewTypeName('');
    setShowInlineNewType(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Ações com Plataformas (DSPs)</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-[#FF5500]">
              {totalActions} registradas
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Contabilização de negociações, pitchings editoriais, mídias e qual plataforma recebeu mais ações
          </p>
        </div>

        <button
          onClick={() => {
            setShowInlineNewType(false);
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#FF5500] hover:bg-[#E04B00] rounded-lg shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Ação</span>
        </button>
      </div>

      {/* KPI Cards: Platform Leader, Total, BU Leader, Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Plataforma Líder */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Plataforma Líder em Ações
            </span>
            <Award className="w-4 h-4 text-[#FF5500]" />
          </div>
          <div>
            {topDsp ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: topDsp.color }}
                  />
                  <span className="text-lg font-black text-slate-900">{topDsp.label}</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  <strong className="text-slate-800 font-mono-numbers">{topDsp.value}</strong> ações (
                  {totalActions > 0 ? ((topDsp.value / totalActions) * 100).toFixed(0) : 0}% do total)
                </div>
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-400">Nenhuma ação</div>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            DSP onde a ONErpm mais emplacou ações
          </div>
        </div>

        {/* KPI 2: Total de Ações */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total de Ações</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers">{totalActions}</div>
            <div className="text-xs text-slate-500 mt-1">
              Distribuídas em {actionsByDsp.length} plataformas
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Pitchings, capas, mídias e parcerias
          </div>
        </div>

        {/* KPI 3: BU Mais Ativa */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">BU Mais Ativa</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            {topBu ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: topBu.color }}
                  />
                  <span className="text-lg font-black text-slate-900">{topBu.label}</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  <strong className="text-slate-800 font-mono-numbers">{topBu.value}</strong> ações (
                  {totalActions > 0 ? ((topBu.value / totalActions) * 100).toFixed(0) : 0}%)
                </div>
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-400">Sem dados</div>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Unidade de negócio com maior volume
          </div>
        </div>

        {/* KPI 4: Tipos Cadastrados */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Tipos de Ação Ativos
            </span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers">
              {actionTypes.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {actionsByType.length > 0 ? `${actionsByType.length} tipos com ações` : 'Nenhum tipo usado'}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Adicione novos tipos a qualquer momento
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Gráficos de Ação por Plataforma & BU */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Gráfico 1: Ações por Plataforma DSP (Ranking Horizontal) - 6 cols */}
        <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#FF5500]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Ranking de Ações por Plataforma (DSP)
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[#FF5500] bg-orange-50 px-2 py-0.5 rounded-full">
                Quem teve mais ações
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 mb-4">
              Contabilização direta de todas as ações por plataforma para identificar com qual parceiro a ONErpm atuou com mais intensidade.
            </p>

            {actionsByDsp.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                Nenhuma ação cadastrada para gerar o gráfico por plataforma.
              </div>
            ) : (
              <BarChart
                data={actionsByDsp}
                horizontal={true}
                valueFormatter={(val) => `${val} ${val === 1 ? 'ação' : 'ações'}`}
              />
            )}
          </div>

          {topDsp && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] bg-slate-50 p-2.5 rounded-lg">
              <span className="text-slate-600">
                Plataforma com maior relacionamento: <strong className="text-slate-900">{topDsp.label}</strong>
              </span>
              <span
                className="font-bold px-2 py-0.5 rounded-sm text-white text-[10px]"
                style={{ backgroundColor: topDsp.color }}
              >
                {topDsp.value} ações
              </span>
            </div>
          )}
        </div>

        {/* Gráfico 2: Ações por Unidade de Negócio (BU) - 3 cols */}
        <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Ações por BU
                </h3>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 mb-3">
              Divisão pelas 7 BUs oficiais da ONErpm.
            </p>

            {actionsByBu.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                Sem dados de BUs
              </div>
            ) : (
              <DonutChart
                data={actionsByBu}
                size={170}
                thickness={26}
                centerText={String(totalActions)}
                centerSubtext="Total Ações"
              />
            )}
          </div>
        </div>

        {/* Gráfico 3: Ações por Tipo de Ação - 3 cols */}
        <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Por Tipo de Ação
                </h3>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 mb-3">
              Proporção por categoria de ação realizada.
            </p>

            {actionsByType.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                Sem dados de tipos
              </div>
            ) : (
              <DonutChart
                data={actionsByType}
                size={170}
                thickness={26}
                centerText={String(totalActions)}
                centerSubtext="Total Ações"
              />
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Tabela Detalhada & Filtros</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono-numbers">
            Exibindo {filteredActions.length} de {actions.length} ações
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Platform */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Plataforma DSP
            </label>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
            >
              <option value="all">Todas as Plataformas</option>
              {ALL_DSPS.map((dsp) => (
                <option key={dsp} value={dsp}>
                  {dsp}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Ação */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Tipo de Ação
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
            >
              <option value="all">Todos os Tipos ({actionTypes.length})</option>
              {actionTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* BU */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Unidade de Negócio (BU)
            </label>
            <select
              value={filterBu}
              onChange={(e) => setFilterBu(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
            >
              <option value="all">Todas as BUs</option>
              {OFFICIAL_BUS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Artista / Lançamento
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar artista ou ação..."
                value={searchArtist}
                onChange={(e) => setSearchArtist(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
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
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    Nenhuma ação registrada encontrada. Clique em "Nova Ação" para adicionar.
                  </td>
                </tr>
              ) : (
                filteredActions.map((act) => {
                  const dspColor = DSP_COLORS[act.plataforma] || '#64748B';
                  const buColor = BU_COLORS[act.bu] || '#64748B';

                  return (
                    <tr key={act.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Data */}
                      <td className="py-2 px-3 font-mono-numbers text-slate-600 whitespace-nowrap">
                        {act.data}
                      </td>

                      {/* Plataforma */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 font-bold text-[11px]"
                          style={{ color: dspColor }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: dspColor }}
                          />
                          {act.plataforma}
                        </span>
                      </td>

                      {/* BU */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className="font-semibold text-[11px]"
                          style={{ color: buColor }}
                        >
                          {act.bu}
                        </span>
                      </td>

                      {/* Tipo de Ação */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-sm">
                          {act.tipoAcao}
                        </span>
                      </td>

                      {/* Território */}
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {act.territorio}
                      </td>

                      {/* Artista */}
                      <td className="py-2 px-3 font-bold text-slate-900 max-w-[150px] truncate" title={act.artista}>
                        {act.artista}
                      </td>

                      {/* Ação ou Lançamento */}
                      <td className="py-2 px-3 font-semibold text-slate-800 max-w-[200px] truncate" title={act.acaoOuLancamento}>
                        {act.acaoOuLancamento}
                      </td>

                      {/* Detalhes */}
                      <td className="py-2 px-3 text-slate-500 max-w-[250px] truncate" title={act.detalhes || 'Sem detalhes'}>
                        {act.detalhes || '—'}
                      </td>

                      {/* Delete */}
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => onDeleteAction(act.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-sm transition-colors cursor-pointer"
                          title="Excluir ação"
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

      {/* Modal: Nova Ação */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-[#FF5500]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Cadastrar Nova Ação com Plataforma
                  </h2>
                  <p className="text-xs text-slate-500">
                    Registro de negociação editorial, pitching ou marketing com DSPs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAction} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Data */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>

                {/* Plataforma */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Plataforma DSP *
                  </label>
                  <select
                    value={formData.plataforma}
                    onChange={(e) => setFormData({ ...formData, plataforma: e.target.value as any })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  >
                    {ALL_DSPS.map((dsp) => (
                      <option key={dsp} value={dsp}>
                        {dsp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* BU */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    BU Oficial *
                  </label>
                  <select
                    value={formData.bu}
                    onChange={(e) => setFormData({ ...formData, bu: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  >
                    {OFFICIAL_BUS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Território */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Território *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Brasil, Global, Latam"
                    value={formData.territorio}
                    onChange={(e) => setFormData({ ...formData, territorio: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
              </div>

              {/* Tipo de Ação with inline addition & immediate dropdown update */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">
                    Tipo de Ação *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowInlineNewType(!showInlineNewType)}
                    className="text-[11px] font-bold text-[#FF5500] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showInlineNewType ? 'Fechar' : 'Adicionar Novo Tipo'}</span>
                  </button>
                </div>

                {showInlineNewType ? (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2 mb-2">
                    <p className="text-[11px] text-slate-600 font-medium">
                      Digite o novo tipo de ação. Ele será adicionado imediatamente ao dropdown:
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Ex: Billboard Times Square, Live Session, Mídia Exclusiva"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateCustomType();
                          }
                        }}
                        className="flex-1 text-xs border border-orange-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => handleCreateCustomType()}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-[#FF5500] hover:bg-[#E04B00] rounded-lg shrink-0 cursor-pointer"
                      >
                        Salvar e Selecionar
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={formData.tipoAcao}
                    onChange={(e) => {
                      if (e.target.value === '__NEW_TYPE__') {
                        setShowInlineNewType(true);
                      } else {
                        setFormData({ ...formData, tipoAcao: e.target.value });
                      }
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
                  >
                    {actionTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    <option value="__NEW_TYPE__">+ Adicionar novo tipo de ação...</option>
                  </select>
                )}
              </div>

              {/* Artista */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Artista *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do artista"
                  value={formData.artista}
                  onChange={(e) => setFormData({ ...formData, artista: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>

              {/* Ação ou Lançamento */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Ação ou Lançamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Capa da Playlist Novidades da Semana / Single Focus"
                  value={formData.acaoOuLancamento}
                  onChange={(e) => setFormData({ ...formData, acaoOuLancamento: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>

              {/* Detalhes Opcionais */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Detalhes Opcionais
                </label>
                <textarea
                  rows={2}
                  placeholder="Observações da negociação, contatos de editores, links..."
                  value={formData.detalhes}
                  onChange={(e) => setFormData({ ...formData, detalhes: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#FF5500] hover:bg-[#E04B00] rounded-lg shadow-2xs cursor-pointer"
                >
                  Salvar Ação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
