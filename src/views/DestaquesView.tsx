import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  Flame,
  Globe2,
  Image as ImageIcon,
  Layers,
  Music2,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { BarChart } from '../components/Charts/BarChart';
import { DonutChart } from '../components/Charts/DonutChart';
import { LineChart, LineSeries } from '../components/Charts/LineChart';
import { NovidadesDashboard } from '../components/NovidadesDashboard';
import { BU_COLORS, CoverItem, DSP_COLORS, DSPPlatform, HighlightRecord, OFFICIAL_BUS } from '../types';
import {
  getMatchingMonitoredPlaylist,
  isNovidadesHighlight,
} from '../utils/monitoredPlaylists';

interface DestaquesViewProps {
  highlights: HighlightRecord[];
  covers: CoverItem[];
  onAddCover?: () => void;
  onOpenBulkImport?: () => void;
  onAddManualHighlight?: (highlight: HighlightRecord) => void;
  onAddCoverToHighlight?: (
    highlightId: string,
    coverData: {
      upc: string;
      imageUrl: string;
      artista: string;
      titulo: string;
      dataDestaque: string;
      dsp: DSPPlatform;
      bu: string;
    }
  ) => void;
  onLinkUpcCover?: (upc: string, artist: string, title: string) => void;
}

export const DestaquesView: React.FC<DestaquesViewProps> = ({
  highlights,
  covers,
  onAddCover,
  onOpenBulkImport,
  onAddManualHighlight,
  onAddCoverToHighlight,
}) => {
  // Page-specific filter states (independent as specified)
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedBu, setSelectedBu] = useState<string>('all');
  const [selectedArtista, setSelectedArtista] = useState<string>('all');
  const [searchTrack, setSearchTrack] = useState<string>('');
  const [selectedTerritorio, setSelectedTerritorio] = useState<string>('all');
  const [searchUpc, setSearchUpc] = useState<string>('');
  const [previewCover, setPreviewCover] = useState<CoverItem | null>(null);

  // View Mode: 'geral' (all highlights) or 'novidades' (PDF dashboard replica)
  const [destaquesViewMode, setDestaquesViewMode] = useState<'geral' | 'novidades'>('geral');
  const [onlyNovidades, setOnlyNovidades] = useState<boolean>(false);

  // Total count of highlights in Novidades da Semana
  const novidadesTotalCount = useMemo(() => {
    return highlights.filter((h) => isNovidadesHighlight(h.destaque, h.dsp)).length;
  }, [highlights]);

  // Add Cover directly to Highlight Modal State
  const [selectedHighlightForCover, setSelectedHighlightForCover] = useState<HighlightRecord | null>(null);
  const [coverModalUpc, setCoverModalUpc] = useState<string>('');
  const [coverModalImageUrl, setCoverModalImageUrl] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const sampleCoverPresets = [
    {
      name: 'Sertanejo VIP',
      url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Hits Funk / Urban',
      url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Pop Brasil Radar',
      url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Gospel & Louvor',
      url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    },
  ];

  const handleOpenAddCoverModal = (hl: HighlightRecord) => {
    const existing = hl.upc ? upcCoverMap.get(hl.upc.trim()) : null;
    setSelectedHighlightForCover(hl);
    setCoverModalUpc(hl.upc?.trim() || `789${Date.now().toString().slice(-10)}`);
    setCoverModalImageUrl(existing ? existing.imageUrl : '');
  };

  const handleCoverFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const objectUrl = URL.createObjectURL(file);
    setCoverModalImageUrl(objectUrl);
  };

  const handleSaveCoverForHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHighlightForCover || !coverModalImageUrl.trim() || !coverModalUpc.trim()) return;

    if (onAddCoverToHighlight) {
      onAddCoverToHighlight(selectedHighlightForCover.id, {
        upc: coverModalUpc.trim(),
        imageUrl: coverModalImageUrl.trim(),
        artista: selectedHighlightForCover.artista,
        titulo: selectedHighlightForCover.titulo,
        dataDestaque: selectedHighlightForCover.data,
        dsp: selectedHighlightForCover.dsp,
        bu: selectedHighlightForCover.bu,
      });
    }

    setSelectedHighlightForCover(null);
  };

  // Manual Highlight Modal State
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    data: new Date().toISOString().split('T')[0],
    dsp: 'Spotify' as DSPPlatform,
    bu: 'Sertanejo',
    artista: '',
    titulo: '',
    destaque: '',
    upc: '',
    tipoDestaque: 'DESTAQUE' as 'DESTAQUE' | 'CAPA',
    territorio: 'Brasil',
    origem: 'NAC' as 'NAC' | 'INT',
  });

  const downloadDestaquesTemplate = () => {
    const csvContent = 'Data,DSP,BU,Artista,Título,Destaque,UPC,Tipo de Destaque,Território de destaque,Nac/Int\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_destaques_onerpm.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveManualHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.artista.trim() || !manualForm.titulo.trim()) return;

    if (onAddManualHighlight) {
      onAddManualHighlight({
        id: `hl_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        documentId: 'doc_manual_entry',
        data: manualForm.data,
        dsp: manualForm.dsp,
        bu: manualForm.bu,
        artista: manualForm.artista.trim(),
        titulo: manualForm.titulo.trim(),
        destaque: manualForm.destaque.trim() || 'Destaque Geral',
        upc: manualForm.upc.trim(),
        tipoDestaque: manualForm.tipoDestaque,
        territorio: manualForm.territorio.trim() || 'Brasil',
        origem: manualForm.origem,
      });
    }

    setManualModalOpen(false);
    setManualForm({
      data: new Date().toISOString().split('T')[0],
      dsp: 'Spotify',
      bu: 'Sertanejo',
      artista: '',
      titulo: '',
      destaque: '',
      upc: '',
      tipoDestaque: 'DESTAQUE',
      territorio: 'Brasil',
      origem: 'NAC',
    });
  };

  // Extract unique filter options from current highlights
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(highlights.map((h) => h.data))).filter(Boolean);
    return dates.sort(); // Ascending chronological
  }, [highlights]);

  const availableBus = useMemo(() => {
    return Array.from(new Set(highlights.map((h) => h.bu))).filter(Boolean).sort();
  }, [highlights]);

  const availableArtistas = useMemo(() => {
    return Array.from(new Set(highlights.map((h) => h.artista))).filter(Boolean).sort();
  }, [highlights]);

  const availableTerritorios = useMemo(() => {
    return Array.from(new Set(highlights.map((h) => h.territorio))).filter(Boolean).sort();
  }, [highlights]);

  // Map UPC to cover item for fast lookup
  const upcCoverMap = useMemo(() => {
    const map = new Map<string, CoverItem>();
    covers.forEach((c) => {
      if (c.upc) {
        map.set(c.upc.trim(), c);
      }
    });
    return map;
  }, [covers]);

  // Apply filters
  const filteredHighlights = useMemo(() => {
    return highlights.filter((h) => {
      if (selectedDate !== 'all' && h.data !== selectedDate) return false;
      if (selectedBu !== 'all' && h.bu !== selectedBu) return false;
      if (selectedArtista !== 'all' && h.artista !== selectedArtista) return false;
      if (selectedTerritorio !== 'all' && h.territorio !== selectedTerritorio) return false;
      if (searchTrack.trim()) {
        const query = searchTrack.toLowerCase();
        const matchesTitle = h.titulo.toLowerCase().includes(query);
        const matchesArtist = h.artista.toLowerCase().includes(query);
        if (!matchesTitle && !matchesArtist) return false;
      }
      if (searchUpc.trim()) {
        const cleanUpcQuery = searchUpc.trim().toLowerCase();
        if (!h.upc.toLowerCase().includes(cleanUpcQuery)) return false;
      }
      if (onlyNovidades && !isNovidadesHighlight(h.destaque, h.dsp)) return false;
      return true;
    });
  }, [
    highlights,
    selectedDate,
    selectedBu,
    selectedArtista,
    selectedTerritorio,
    searchTrack,
    searchUpc,
    onlyNovidades,
  ]);

  // Calculate Indicators
  const totalDestaques = useMemo(() => {
    return filteredHighlights.filter((h) => h.tipoDestaque === 'DESTAQUE').length;
  }, [filteredHighlights]);

  const totalCapas = useMemo(() => {
    return filteredHighlights.filter((h) => h.tipoDestaque === 'CAPA').length;
  }, [filteredHighlights]);

  // National vs International Breakdown (NAC vs INT)
  const nacIntData = useMemo(() => {
    let nac = 0;
    let intl = 0;
    filteredHighlights.forEach((h) => {
      if (h.origem === 'INT') intl++;
      else nac++;
    });
    return [
      { label: 'Nacional (NAC)', value: nac, color: '#10B981' },
      { label: 'Internacional (INT)', value: intl, color: '#6366F1' },
    ];
  }, [filteredHighlights]);

  // Line Charts Data: Destaques por BU ao longo do tempo
  // Organizado em ordem cronológica crescente
  const lineDestaquesByBu = useMemo(() => {
    const dates = Array.from(new Set(highlights.map((h) => h.data))).sort();
    const buList = Array.from(new Set(highlights.map((h) => h.bu)));

    const seriesList: LineSeries[] = buList.slice(0, 6).map((bu) => {
      const color = BU_COLORS[bu] || '#64748B';
      const data = dates.map((d) => {
        const count = highlights.filter(
          (h) => h.bu === bu && h.data === d && h.tipoDestaque === 'DESTAQUE'
        ).length;
        return { x: d, y: count };
      });
      return { id: bu, label: bu, color, data };
    });

    return seriesList.filter((s) => s.data.some((d) => d.y > 0));
  }, [highlights]);

  // Line Charts Data: Capas por BU ao longo do tempo
  const lineCapasByBu = useMemo(() => {
    const dates = Array.from(new Set(highlights.map((h) => h.data))).sort();
    const buList = Array.from(new Set(highlights.map((h) => h.bu)));

    const seriesList: LineSeries[] = buList.slice(0, 6).map((bu) => {
      const color = BU_COLORS[bu] || '#64748B';
      const data = dates.map((d) => {
        const count = highlights.filter(
          (h) => h.bu === bu && h.data === d && h.tipoDestaque === 'CAPA'
        ).length;
        return { x: d, y: count };
      });
      return { id: bu, label: bu, color, data };
    });

    return seriesList.filter((s) => s.data.some((d) => d.y > 0));
  }, [highlights]);

  // Bar Charts Data: Destaques por Plataforma
  const barDestaquesByDsp = useMemo(() => {
    const dsps: DSPPlatform[] = [
      'Spotify',
      'Deezer',
      'Amazon Music',
      'Apple Music',
      'YouTube Music',
      'Shazam Discovery',
    ];
    return dsps.map((dsp) => {
      const count = filteredHighlights.filter(
        (h) => h.dsp === dsp && h.tipoDestaque === 'DESTAQUE'
      ).length;
      return {
        label: dsp,
        value: count,
        color: DSP_COLORS[dsp] || '#64748B',
      };
    });
  }, [filteredHighlights]);

  // Bar Charts Data: Capas por Plataforma
  const barCapasByDsp = useMemo(() => {
    const dsps: DSPPlatform[] = [
      'Spotify',
      'Deezer',
      'Amazon Music',
      'Apple Music',
      'YouTube Music',
      'Shazam Discovery',
    ];
    return dsps.map((dsp) => {
      const count = filteredHighlights.filter(
        (h) => h.dsp === dsp && h.tipoDestaque === 'CAPA'
      ).length;
      return {
        label: dsp,
        value: count,
        color: DSP_COLORS[dsp] || '#64748B',
      };
    });
  }, [filteredHighlights]);

  const handleResetFilters = () => {
    setSelectedDate('all');
    setSelectedBu('all');
    setSelectedArtista('all');
    setSearchTrack('');
    setSelectedTerritorio('all');
    setSearchUpc('');
    setOnlyNovidades(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Destaques & Capas em DSPs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento de posições editoriais, playlists e capas conquistadas pela ONErpm
          </p>
        </div>

        {/* Action Buttons: Template, Bulk Upload, Manual, Search UPC */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Template Download */}
          <button
            onClick={downloadDestaquesTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
            title="Baixar arquivo modelo CSV para preenchimento"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Template CSV</span>
          </button>

          {/* Bulk Upload Button */}
          {onOpenBulkImport && (
            <button
              onClick={onOpenBulkImport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#FF5500] hover:bg-[#E04B00] rounded-lg shadow-2xs transition-colors active:scale-95"
              title="Importar múltiplos CSVs de destaques em lote"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload em Lote (Bulk)</span>
            </button>
          )}

          {/* Manual Highlight Button */}
          <button
            onClick={() => setManualModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Novo Destaque Manual</span>
          </button>

          {/* UPC Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por UPC..."
              value={searchUpc}
              onChange={(e) => setSearchUpc(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#FF5500]/30 focus:border-[#FF5500] w-40 font-mono-numbers"
            />
          </div>

          {onAddCover && (
            <button
              onClick={onAddCover}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>Capas</span>
            </button>
          )}
        </div>
      </div>

      {/* View Mode Selector Tabs: Geral vs. Playlist Novidades da Semana */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
        <button
          onClick={() => setDestaquesViewMode('geral')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            destaquesViewMode === 'geral'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Visão Geral de Destaques
        </button>
        <button
          onClick={() => setDestaquesViewMode('novidades')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            destaquesViewMode === 'novidades'
              ? 'bg-[#FF5500] text-white shadow-xs ring-2 ring-[#FF5500]/20'
              : 'text-[#FF5500] bg-orange-50 hover:bg-orange-100 border border-orange-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Playlist Novidades da Semana</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              destaquesViewMode === 'novidades'
                ? 'bg-white/20 text-white'
                : 'bg-[#FF5500] text-white'
            }`}
          >
            {novidadesTotalCount}
          </span>
        </button>
      </div>

      {/* Sub-view switcher */}
      {destaquesViewMode === 'novidades' ? (
        <NovidadesDashboard
          highlights={highlights}
          onOpenAddCoverModal={handleOpenAddCoverModal}
          covers={covers}
          initialDate={selectedDate !== 'all' ? selectedDate : undefined}
        />
      ) : (
        <>
          {/* Filter Bar (isolated to this page) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Filter className="w-3.5 h-3.5 text-[#FF5500]" />
                  <span>Filtros de Destaques</span>
                </div>

                {/* Quick Toggle: Apenas Novidades da Semana */}
                <button
                  type="button"
                  onClick={() => setOnlyNovidades(!onlyNovidades)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer border ${
                    onlyNovidades
                      ? 'bg-amber-500 text-white border-amber-600 shadow-2xs ring-1 ring-amber-400'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                  title="Filtrar tabela para exibir apenas faixas em playlists de Novidades da Semana"
                >
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span>Apenas Novidades ({novidadesTotalCount})</span>
                </button>
              </div>

              {(selectedDate !== 'all' ||
                selectedBu !== 'all' ||
                selectedArtista !== 'all' ||
                selectedTerritorio !== 'all' ||
                searchTrack !== '' ||
                searchUpc !== '' ||
                onlyNovidades) && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-[11px] text-[#FF5500] hover:text-[#E04B00] font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpar Filtros
                </button>
              )}
            </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Data / Semana */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Data / Semana do Destaque
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
            >
              <option value="all">Todas as Datas ({availableDates.length})</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
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
              value={selectedBu}
              onChange={(e) => setSelectedBu(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
            >
              <option value="all">Todas as BUs ({availableBus.length})</option>
              {availableBus.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Artista */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Artista
            </label>
            <select
              value={selectedArtista}
              onChange={(e) => setSelectedArtista(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
            >
              <option value="all">Todos os Artistas ({availableArtistas.length})</option>
              {availableArtistas.map((art) => (
                <option key={art} value={art}>
                  {art}
                </option>
              ))}
            </select>
          </div>

          {/* Título da faixa */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Título da Faixa
            </label>
            <input
              type="text"
              placeholder="Filtrar por título..."
              value={searchTrack}
              onChange={(e) => setSearchTrack(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
            />
          </div>

          {/* Território */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Território
            </label>
            <select
              value={selectedTerritorio}
              onChange={(e) => setSelectedTerritorio(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
            >
              <option value="all">Todos os Territórios ({availableTerritorios.length})</option>
              {availableTerritorios.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* KPI 1: Total Destaques */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total de Destaques
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers mt-1">
              {totalDestaques}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Apenas registros tipo DESTAQUE
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF5500]">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Total Capas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total de Capas
            </span>
            <div className="text-2xl font-black text-[#A238FF] font-mono-numbers mt-1">
              {totalCapas}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Apenas registros tipo CAPA
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-[#A238FF]">
            <ImageIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Nacional vs Internacional (NAC vs INT) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Origem: Nacional vs Internacional
              </h3>
              <p className="text-[11px] text-slate-500">
                Distribuição de destaques NAC e INT no período filtrado
              </p>
            </div>
            <Globe2 className="w-4 h-4 text-slate-400" />
          </div>
          <DonutChart data={nacIntData} size={180} thickness={28} />
        </div>

        {/* Chart 2: Destaques por Plataforma (Barras) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Destaques por Plataforma
              </h3>
              <p className="text-[11px] text-slate-500">
                Quantidade de destaques editoriais por DSP
              </p>
            </div>
          </div>
          <BarChart data={barDestaquesByDsp} height={200} />
        </div>

        {/* Chart 3: Capas por Plataforma (Barras) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Capas por Plataforma
              </h3>
              <p className="text-[11px] text-slate-500">
                Quantidade de capas de playlist conquistadas por DSP
              </p>
            </div>
          </div>
          <BarChart data={barCapasByDsp} height={200} />
        </div>
      </div>

      {/* Evolution Over Time Lines (Destaques por BU e Capas por BU) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line 1: Destaques por BU ao longo do tempo */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Evolução: Destaques por BU ao Longo do Tempo
              </h3>
              <p className="text-[11px] text-slate-500">
                Histórico cronológico crescente de destaques por Unidade de Negócio
              </p>
            </div>
          </div>
          <LineChart
            series={lineDestaquesByBu}
            height={220}
            emptyMessage="Sem dados temporais suficientes de Destaques"
          />
        </div>

        {/* Line 2: Capas por BU ao longo do tempo */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Evolução: Capas por BU ao Longo do Tempo
              </h3>
              <p className="text-[11px] text-slate-500">
                Histórico cronológico crescente de capas por Unidade de Negócio
              </p>
            </div>
          </div>
          <LineChart
            series={lineCapasByBu}
            height={220}
            emptyMessage="Sem dados temporais suficientes de Capas"
          />
        </div>
      </div>

      {/* Complete Table of Highlights and Covers */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Lista Completa de Destaques e Capas ({filteredHighlights.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Registros com associação de capa via código UPC quando disponível
            </p>
          </div>
          <span className="text-[11px] text-slate-500 font-mono-numbers">
            Mostrando {filteredHighlights.length} de {highlights.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                <th className="py-2.5 px-3">Capa</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">DSP</th>
                <th className="py-2.5 px-3">BU</th>
                <th className="py-2.5 px-3">Artista</th>
                <th className="py-2.5 px-3">Título</th>
                <th className="py-2.5 px-3">Destaque</th>
                <th className="py-2.5 px-3">UPC</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Território</th>
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHighlights.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredHighlights.map((hl) => {
                  const cover = hl.upc ? upcCoverMap.get(hl.upc.trim()) : null;
                  const buColor = BU_COLORS[hl.bu] || '#64748B';
                  const dspColor = DSP_COLORS[hl.dsp] || '#64748B';
                  const isNovidades = isNovidadesHighlight(hl.destaque, hl.dsp);
                  const matchedPlaylist = isNovidades ? getMatchingMonitoredPlaylist(hl.destaque, hl.dsp) : null;

                  return (
                    <tr
                      key={hl.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isNovidades ? 'bg-amber-50/15' : ''
                      }`}
                    >
                      {/* Cover Thumbnail */}
                      <td className="py-2 px-3 shrink-0">
                        {cover ? (
                          <div className="flex items-center gap-1.5">
                            <div
                              onClick={() => setPreviewCover(cover)}
                              className="w-10 h-10 rounded-md overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 hover:ring-[#A238FF] transition-all relative group bg-slate-100 shrink-0 shadow-2xs"
                              title="Clique para ver capa ampliada"
                            >
                              <img
                                src={cover.imageUrl}
                                alt={hl.titulo}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                            {hl.tipoDestaque === 'CAPA' && (
                              <button
                                onClick={() => handleOpenAddCoverModal(hl)}
                                className="text-[10px] text-purple-700 hover:text-purple-900 font-bold hover:underline cursor-pointer"
                                title="Alterar imagem da capa"
                              >
                                Alterar
                              </button>
                            )}
                          </div>
                        ) : hl.tipoDestaque === 'CAPA' ? (
                          <button
                            onClick={() => handleOpenAddCoverModal(hl)}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold transition-all shadow-2xs group cursor-pointer whitespace-nowrap"
                            title="Adicionar imagem de capa referente a este destaque"
                          >
                            <Upload className="w-3 h-3 text-[#A238FF]" />
                            <span>+ Capa</span>
                          </button>
                        ) : (
                          <div
                            className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-[10px]"
                            title="Sem capa (registro do tipo DESTAQUE)"
                          >
                            <Music2 className="w-4 h-4 text-slate-300" />
                          </div>
                        )}
                      </td>

                      {/* Data */}
                      <td className="py-2 px-3 font-mono-numbers text-slate-600 whitespace-nowrap">
                        {hl.data}
                      </td>

                      {/* DSP */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 font-semibold text-[11px]"
                          style={{ color: dspColor }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: dspColor }}
                          />
                          {hl.dsp}
                        </span>
                      </td>

                      {/* BU */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className="font-semibold text-[11px]"
                          style={{ color: buColor }}
                        >
                          {hl.bu}
                        </span>
                      </td>

                      {/* Artista */}
                      <td className="py-2 px-3 font-bold text-slate-900 max-w-[150px] truncate" title={hl.artista}>
                        {hl.artista}
                      </td>

                      {/* Título */}
                      <td className="py-2 px-3 font-medium text-slate-700 max-w-[170px] truncate" title={hl.titulo}>
                        {hl.titulo}
                      </td>

                      {/* Destaque */}
                      <td className="py-2 px-3 text-slate-600 max-w-[220px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-slate-800 truncate" title={hl.destaque}>
                            {hl.destaque}
                          </span>
                          {isNovidades && (
                            <div>
                              {matchedPlaylist ? (
                                <a
                                  href={matchedPlaylist.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-sm transition-colors cursor-pointer w-fit shadow-2xs"
                                  title={`Playlist "${matchedPlaylist.playlistName}" (${matchedPlaylist.dsp}) - Clique para abrir`}
                                >
                                  <Flame className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                  <span className="truncate max-w-[130px]">{matchedPlaylist.playlistName}</span>
                                  <ExternalLink className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-sm w-fit">
                                  <Flame className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                  <span>Novidades da Semana</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* UPC */}
                      <td className="py-2 px-3 font-mono-numbers text-slate-500 text-[11px]">
                        {hl.upc || '—'}
                      </td>

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

                      {/* Território */}
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {hl.territorio}
                      </td>

                      {/* Ações */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {hl.tipoDestaque === 'CAPA' ? (
                          <button
                            onClick={() => handleOpenAddCoverModal(hl)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-white bg-[#A238FF] hover:bg-[#8e22ea] rounded-md shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                            title={cover ? "Alterar a imagem da capa deste destaque" : "Adicionar a imagem da capa deste destaque"}
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>{cover ? "Alterar Capa" : "+ Adicionar Capa"}</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs font-mono">—</span>
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
    </>
  )}

      {/* Cover Preview Modal */}
      {previewCover && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
          onClick={() => setPreviewCover(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 truncate">
                {previewCover.artista} - {previewCover.titulo}
              </span>
              <button
                onClick={() => setPreviewCover(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-100 shadow-xs">
              <img
                src={previewCover.imageUrl}
                alt={previewCover.titulo}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div>
                <strong>UPC:</strong> <span className="font-mono-numbers">{previewCover.upc}</span>
              </div>
              <div>
                <strong>Data do Destaque:</strong> {previewCover.dataDestaque}
              </div>
              {previewCover.dsp && (
                <div>
                  <strong>DSP:</strong> {previewCover.dsp}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Destaque Manual */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-[#FF5500]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Novo Destaque Manual</h3>
                  <p className="text-xs text-slate-500">Cadastrar destaque individual no dashboard</p>
                </div>
              </div>
              <button
                onClick={() => setManualModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualHighlight} className="p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {/* Data */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={manualForm.data}
                    onChange={(e) => setManualForm({ ...manualForm, data: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>

                {/* DSP */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    DSP (Plataforma) *
                  </label>
                  <select
                    value={manualForm.dsp}
                    onChange={(e) => setManualForm({ ...manualForm, dsp: e.target.value as DSPPlatform })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
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

              <div className="grid grid-cols-2 gap-3">
                {/* BU */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Unidade de Negócio (BU) *
                  </label>
                  <select
                    value={manualForm.bu}
                    onChange={(e) => setManualForm({ ...manualForm, bu: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  >
                    {OFFICIAL_BUS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Destaque */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tipo de Destaque *
                  </label>
                  <select
                    value={manualForm.tipoDestaque}
                    onChange={(e) => setManualForm({ ...manualForm, tipoDestaque: e.target.value as any })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                  >
                    <option value="DESTAQUE">DESTAQUE (Posição / Playlist)</option>
                    <option value="CAPA">CAPA (Capa de Playlist)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Artista */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Artista *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do artista"
                    value={manualForm.artista}
                    onChange={(e) => setManualForm({ ...manualForm, artista: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>

                {/* Título */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Título da Faixa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Título da música"
                    value={manualForm.titulo}
                    onChange={(e) => setManualForm({ ...manualForm, titulo: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
              </div>

              {/* Destaque */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Destaque Conquistado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Capa da Playlist Top Brasil ou Posição #01 em Novidades"
                  value={manualForm.destaque}
                  onChange={(e) => setManualForm({ ...manualForm, destaque: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* UPC */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Código UPC
                  </label>
                  <input
                    type="text"
                    placeholder="789..."
                    value={manualForm.upc}
                    onChange={(e) => setManualForm({ ...manualForm, upc: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono-numbers"
                  />
                </div>

                {/* Território */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Território
                  </label>
                  <input
                    type="text"
                    placeholder="Brasil, Global"
                    value={manualForm.territorio}
                    onChange={(e) => setManualForm({ ...manualForm, territorio: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>

                {/* Origem */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Origem
                  </label>
                  <select
                    value={manualForm.origem}
                    onChange={(e) => setManualForm({ ...manualForm, origem: e.target.value as any })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                  >
                    <option value="NAC">NAC (Nacional)</option>
                    <option value="INT">INT (Internacional)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#FF5500] hover:bg-[#E04B00] rounded-lg shadow-2xs transition-colors"
                >
                  Salvar Destaque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar/Alterar Capa Referente ao Destaque */}
      {selectedHighlightForCover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-purple-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-[#A238FF]">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Capa do Destaque ({selectedHighlightForCover.tipoDestaque})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedHighlightForCover.artista} - {selectedHighlightForCover.titulo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHighlightForCover(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCoverForHighlight} className="p-5 space-y-4">
              {/* Highlight summary card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Plataforma (DSP):</span>
                  <span className="font-bold text-slate-800">{selectedHighlightForCover.dsp}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Data do Destaque:</span>
                  <span className="font-mono-numbers text-slate-800">{selectedHighlightForCover.data}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">BU / Território:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedHighlightForCover.bu} · {selectedHighlightForCover.territorio}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Destaque:</span>
                  <span className="text-slate-700 truncate max-w-[200px]" title={selectedHighlightForCover.destaque}>
                    {selectedHighlightForCover.destaque}
                  </span>
                </div>
              </div>

              {/* UPC Code */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Código UPC do Lançamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 7891234567890"
                  value={coverModalUpc}
                  onChange={(e) => setCoverModalUpc(e.target.value)}
                  className="w-full text-xs font-mono-numbers border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  O UPC vincula a imagem da capa a todos os destaques deste lançamento.
                </p>
              </div>

              {/* Image Preview & Upload */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Imagem da Capa *
                </label>

                {coverModalImageUrl ? (
                  <div className="space-y-2">
                    <div className="w-36 h-36 mx-auto rounded-lg overflow-hidden border-2 border-purple-300 bg-slate-100 shadow-sm relative group">
                      <img
                        src={coverModalImageUrl}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                      >
                        Trocar Arquivo
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoverModalImageUrl('')}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-purple-200 hover:border-[#A238FF] bg-purple-50/30 rounded-xl p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-[#A238FF]">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-purple-900 block">
                        Clique para escolher imagem do computador
                      </span>
                      <span className="text-[11px] text-slate-500">
                        PNG, JPG ou WEBP (formato 1:1 recomendado)
                      </span>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => handleCoverFileUpload(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* Or paste URL */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Ou cole o Link / URL direto da Imagem
                </label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/capa.jpg"
                  value={coverModalImageUrl.startsWith('blob:') ? '' : coverModalImageUrl}
                  onChange={(e) => setCoverModalImageUrl(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
                />
              </div>

              {/* Sample Presets */}
              <div className="pt-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                  Ou escolha uma capa de exemplo rápida:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {sampleCoverPresets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setCoverModalImageUrl(preset.url)}
                      className="text-[11px] py-1 px-2 text-left bg-slate-50 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 rounded-md font-medium truncate cursor-pointer transition-colors"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedHighlightForCover(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!coverModalImageUrl.trim() || !coverModalUpc.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#A238FF] hover:bg-[#8e22ea] rounded-lg shadow-2xs transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Salvar Capa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
