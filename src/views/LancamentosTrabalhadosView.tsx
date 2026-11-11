import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Disc,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  Filter,
  Flame,
  Layers,
  Music2,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import {
  BU_COLORS,
  DSP_COLORS,
  HighlightRecord,
  OFFICIAL_BUS,
  WorkedReleaseRecord,
} from '../types';
import { isNovidadesHighlight } from '../utils/monitoredPlaylists';
import {
  downloadWorkedReleasesTemplate,
  exportWorkedReleasesToCsv,
  parseWorkedReleasesCsv,
  triggerCsvDownload,
} from '../utils/workedReleasesCsv';

interface LancamentosTrabalhadosViewProps {
  workedReleases: WorkedReleaseRecord[];
  highlights: HighlightRecord[];
  onAddWorkedRelease: (release: WorkedReleaseRecord) => void;
  onBatchAddWorkedReleases: (releases: WorkedReleaseRecord[]) => void;
  onUpdateWorkedRelease: (release: WorkedReleaseRecord) => void;
  onDeleteWorkedRelease: (id: string) => void;
  onNavigateToDestaques?: () => void;
}

export const LancamentosTrabalhadosView: React.FC<LancamentosTrabalhadosViewProps> = ({
  workedReleases,
  highlights,
  onAddWorkedRelease,
  onBatchAddWorkedReleases,
  onUpdateWorkedRelease,
  onDeleteWorkedRelease,
  onNavigateToDestaques,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active subview: 'dashboard' (comparativo e gráficos) or 'table' (planilha completa de lançamentos)
  const [activeSubView, setActiveSubView] = useState<'dashboard' | 'table'>('dashboard');

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedBu, setSelectedBu] = useState<string>('all');
  const [selectedDspWorked, setSelectedDspWorked] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all'); // 'all', 'with_highlight', 'without_highlight', 'with_cover', 'with_novidades'
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<WorkedReleaseRecord | null>(null);
  const [inspectingMatch, setInspectingMatch] = useState<{
    release: WorkedReleaseRecord;
    matched: HighlightRecord[];
  } | null>(null);
  const [importNotice, setImportNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Omit<WorkedReleaseRecord, 'id' | 'createdAt'>>({
    bu: 'Sertanejo',
    data: new Date().toISOString().split('T')[0],
    artist: '',
    title: '',
    upc: '',
    isrc: '',
    label: 'ONErpm',
    genre: 'Sertanejo',
    format: 'Single',
    focusTrack: '',
    tipoFaixa: 'Focus Track',
    spotify: 'Pitching Editorial',
    amazon: 'Pitching Novidades',
    deezer: 'Pitching Novidades da Semana',
    apple: 'New Music Daily',
    ytm: 'Pitching Lançamentos',
    releaseNotes: '',
    fotos: 'Sim',
    s4a: 'Pitched',
    am4a: 'Pitched',
    comment: '',
    checkInDsps: 'OK - Conferido no ar',
    internationalPotential: 'Não',
  });

  // Extract available years from worked releases dates
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    workedReleases.forEach((r) => {
      if (r.data && r.data.length >= 4) {
        const yr = r.data.substring(0, 4);
        if (/^\d{4}$/.test(yr)) set.add(yr);
      }
    });
    return Array.from(set).sort().reverse();
  }, [workedReleases]);

  // Index highlights by UPC and normalized artist/title for instant cross-referencing
  const highlightsIndex = useMemo(() => {
    const byUpc = new Map<string, HighlightRecord[]>();
    const byArtistTitle = new Map<string, HighlightRecord[]>();

    highlights.forEach((h) => {
      // Index by UPC
      if (h.upc && h.upc.trim()) {
        const cleanUpc = h.upc.trim();
        const list = byUpc.get(cleanUpc) || [];
        list.push(h);
        byUpc.set(cleanUpc, list);
      }

      // Index by normalized Artist + Title
      const key = `${h.artista?.toLowerCase().trim()}___${h.titulo?.toLowerCase().trim()}`;
      const list = byArtistTitle.get(key) || [];
      list.push(h);
      byArtistTitle.set(key, list);
    });

    return { byUpc, byArtistTitle };
  }, [highlights]);

  // Match each release with its corresponding highlights
  const releaseMatchesMap = useMemo(() => {
    const map = new Map<
      string,
      {
        matchedHighlights: HighlightRecord[];
        destaquesCount: number;
        hasCover: boolean;
        hasNovidades: boolean;
        dsps: string[];
      }
    >();

    workedReleases.forEach((rel) => {
      let matched: HighlightRecord[] = [];

      // 1. Match by UPC
      if (rel.upc && rel.upc.trim() && highlightsIndex.byUpc.has(rel.upc.trim())) {
        matched = highlightsIndex.byUpc.get(rel.upc.trim()) || [];
      } else {
        // 2. Fallback: match by Artist + Title
        const key = `${rel.artist?.toLowerCase().trim()}___${rel.title?.toLowerCase().trim()}`;
        if (highlightsIndex.byArtistTitle.has(key)) {
          matched = highlightsIndex.byArtistTitle.get(key) || [];
        } else {
          // 3. Substring fuzzy match
          const relArt = rel.artist?.toLowerCase().trim();
          const relTit = rel.title?.toLowerCase().trim();
          if (relArt && relTit) {
            matched = highlights.filter((h) => {
              const hArt = h.artista?.toLowerCase().trim();
              const hTit = h.titulo?.toLowerCase().trim();
              return (
                (hArt?.includes(relArt) || relArt.includes(hArt)) &&
                (hTit?.includes(relTit) || relTit.includes(hTit))
              );
            });
          }
        }
      }

      const hasCover = matched.some(
        (h) => h.tipoDestaque === 'CAPA' || h.destaque?.toLowerCase().includes('capa')
      );
      const hasNovidades = matched.some((h) => isNovidadesHighlight(h.destaque, h.dsp));
      const dsps = Array.from(new Set(matched.map((h) => h.dsp))).filter(Boolean);

      map.set(rel.id, {
        matchedHighlights: matched,
        destaquesCount: matched.length,
        hasCover,
        hasNovidades,
        dsps,
      });
    });

    return map;
  }, [workedReleases, highlightsIndex, highlights]);

  // Filtered releases
  const filteredReleases = useMemo(() => {
    return workedReleases.filter((rel) => {
      // Year filter
      if (selectedYear !== 'all') {
        if (!rel.data || !rel.data.startsWith(selectedYear)) return false;
      }

      // BU filter
      if (selectedBu !== 'all') {
        if (rel.bu !== selectedBu) return false;
      }

      // DSP filter (did we pitch to this DSP?)
      if (selectedDspWorked !== 'all') {
        const val = selectedDspWorked.toLowerCase();
        let pitched = false;
        if (val.includes('spot') && rel.spotify?.trim()) pitched = true;
        if (val.includes('amazon') && rel.amazon?.trim()) pitched = true;
        if (val.includes('deez') && rel.deezer?.trim()) pitched = true;
        if (val.includes('apple') && rel.apple?.trim()) pitched = true;
        if ((val.includes('yt') || val.includes('you')) && rel.ytm?.trim()) pitched = true;
        if (!pitched) return false;
      }

      // Status / Conversion filter
      const match = releaseMatchesMap.get(rel.id);
      if (selectedStatusFilter === 'with_highlight') {
        if (!match || match.destaquesCount === 0) return false;
      } else if (selectedStatusFilter === 'without_highlight') {
        if (match && match.destaquesCount > 0) return false;
      } else if (selectedStatusFilter === 'with_cover') {
        if (!match || !match.hasCover) return false;
      } else if (selectedStatusFilter === 'with_novidades') {
        if (!match || !match.hasNovidades) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchArt = rel.artist?.toLowerCase().includes(q);
        const matchTit = rel.title?.toLowerCase().includes(q);
        const matchUpc = rel.upc?.toLowerCase().includes(q);
        const matchIsrc = rel.isrc?.toLowerCase().includes(q);
        const matchLabel = rel.label?.toLowerCase().includes(q);
        if (!matchArt && !matchTit && !matchUpc && !matchIsrc && !matchLabel) return false;
      }

      return true;
    });
  }, [workedReleases, selectedYear, selectedBu, selectedDspWorked, selectedStatusFilter, searchQuery, releaseMatchesMap]);

  // Aggregate Metrics & Comparison Calculations
  const metrics = useMemo(() => {
    const totalWorked = filteredReleases.length;

    let releasesWithHighlights = 0;
    let totalDestaquesConquistados = 0;
    let releasesWithCover = 0;
    let releasesWithNovidades = 0;

    // Count by DSP worked (how many releases were pitched to each DSP)
    const workedDspCounts = {
      Spotify: 0,
      Amazon: 0,
      Deezer: 0,
      Apple: 0,
      YTM: 0,
    };

    // Submissions
    let s4aCount = 0;
    let am4aCount = 0;

    // Grouping by BU
    const buStatsMap = new Map<
      string,
      {
        bu: string;
        workedCount: number;
        withHighlightCount: number;
        destaquesCount: number;
        coversCount: number;
        novidadesCount: number;
      }
    >();

    OFFICIAL_BUS.forEach((bu) => {
      buStatsMap.set(bu, {
        bu,
        workedCount: 0,
        withHighlightCount: 0,
        destaquesCount: 0,
        coversCount: 0,
        novidadesCount: 0,
      });
    });

    filteredReleases.forEach((rel) => {
      const match = releaseMatchesMap.get(rel.id);
      const hasHl = match && match.destaquesCount > 0;

      if (hasHl) {
        releasesWithHighlights++;
        totalDestaquesConquistados += match.destaquesCount;
      }
      if (match?.hasCover) releasesWithCover++;
      if (match?.hasNovidades) releasesWithNovidades++;

      // Check DSP pitch counts
      if (rel.spotify && rel.spotify.trim().length > 0 && !rel.spotify.toLowerCase().includes('não')) {
        workedDspCounts.Spotify++;
      }
      if (rel.amazon && rel.amazon.trim().length > 0 && !rel.amazon.toLowerCase().includes('não')) {
        workedDspCounts.Amazon++;
      }
      if (rel.deezer && rel.deezer.trim().length > 0 && !rel.deezer.toLowerCase().includes('não')) {
        workedDspCounts.Deezer++;
      }
      if (rel.apple && rel.apple.trim().length > 0 && !rel.apple.toLowerCase().includes('não')) {
        workedDspCounts.Apple++;
      }
      if (rel.ytm && rel.ytm.trim().length > 0 && !rel.ytm.toLowerCase().includes('não')) {
        workedDspCounts.YTM++;
      }

      if (rel.s4a && !rel.s4a.toLowerCase().includes('não') && !rel.s4a.toLowerCase().includes('pendente')) {
        s4aCount++;
      }
      if (rel.am4a && !rel.am4a.toLowerCase().includes('não') && !rel.am4a.toLowerCase().includes('pendente')) {
        am4aCount++;
      }

      // BU stats
      const buKey = rel.bu || 'Geral / Outros';
      let stat = buStatsMap.get(buKey);
      if (!stat) {
        stat = {
          bu: buKey,
          workedCount: 0,
          withHighlightCount: 0,
          destaquesCount: 0,
          coversCount: 0,
          novidadesCount: 0,
        };
        buStatsMap.set(buKey, stat);
      }

      stat.workedCount++;
      if (hasHl) {
        stat.withHighlightCount++;
        stat.destaquesCount += match.destaquesCount;
      }
      if (match?.hasCover) stat.coversCount++;
      if (match?.hasNovidades) stat.novidadesCount++;
    });

    const globalConversionRate =
      totalWorked > 0 ? ((releasesWithHighlights / totalWorked) * 100).toFixed(1) : '0.0';

    const efficiencyRatio =
      totalWorked > 0 ? (totalDestaquesConquistados / totalWorked).toFixed(1) : '0.0';

    // BU Comparison Array
    const buComparisonList = Array.from(buStatsMap.values()).map((s) => ({
      ...s,
      conversionRate: s.workedCount > 0 ? ((s.withHighlightCount / s.workedCount) * 100).toFixed(1) : '0.0',
      avgDestaquesPerRelease: s.workedCount > 0 ? (s.destaquesCount / s.workedCount).toFixed(1) : '0.0',
    }));

    // Destaques reais obtidos nas mesmas DSPs na aba de destaques
    const destaquesByDspReal = highlights.reduce<Record<string, number>>((acc, h) => {
      acc[h.dsp] = (acc[h.dsp] || 0) + 1;
      return acc;
    }, {});

    return {
      totalWorked,
      releasesWithHighlights,
      totalDestaquesConquistados,
      globalConversionRate,
      efficiencyRatio,
      releasesWithCover,
      releasesWithNovidades,
      workedDspCounts,
      destaquesByDspReal,
      s4aCount,
      am4aCount,
      buComparisonList,
    };
  }, [filteredReleases, releaseMatchesMap, highlights]);

  // Export CSV Handler
  const handleExportCsv = (delimiter: ';' | ',' | '\t' = ';') => {
    const csvContent = exportWorkedReleasesToCsv(filteredReleases, delimiter);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `lancamentos_trabalhados_onerpm_${selectedYear !== 'all' ? selectedYear + '_' : ''}${dateStr}.csv`;
    triggerCsvDownload(csvContent, fileName);
  };

  // Import CSV Handler
  const handleImportFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const { records, errors } = parseWorkedReleasesCsv(text);
      if (records.length > 0) {
        onBatchAddWorkedReleases(records);
        setImportNotice({
          message: `${records.length} lançamentos trabalhados foram importados com sucesso!`,
          type: 'success',
        });
      } else {
        setImportNotice({
          message: `Nenhum lançamento válido foi encontrado no arquivo. ${errors[0] || 'Verifique o cabeçalho.'}`,
          type: 'error',
        });
      }
    };
    reader.readAsText(file);
  };

  // Submit Add / Edit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.artist.trim() || !formData.title.trim()) return;

    if (editingRelease) {
      const updated: WorkedReleaseRecord = {
        ...editingRelease,
        ...formData,
      };
      onUpdateWorkedRelease(updated);
      setEditingRelease(null);
    } else {
      const created: WorkedReleaseRecord = {
        ...formData,
        id: `wr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      onAddWorkedRelease(created);
    }

    setIsAddModalOpen(false);
  };

  // Open Edit Modal
  const handleOpenEdit = (rel: WorkedReleaseRecord) => {
    setEditingRelease(rel);
    setFormData({
      bu: rel.bu,
      data: rel.data,
      artist: rel.artist,
      title: rel.title,
      upc: rel.upc,
      isrc: rel.isrc,
      label: rel.label,
      genre: rel.genre,
      format: rel.format,
      focusTrack: rel.focusTrack,
      tipoFaixa: rel.tipoFaixa,
      spotify: rel.spotify,
      amazon: rel.amazon,
      deezer: rel.deezer,
      apple: rel.apple,
      ytm: rel.ytm,
      releaseNotes: rel.releaseNotes,
      fotos: rel.fotos,
      s4a: rel.s4a,
      am4a: rel.am4a,
      comment: rel.comment,
      checkInDsps: rel.checkInDsps,
      internationalPotential: rel.internationalPotential,
    });
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for CSV Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={(e) => {
          handleImportFile(e.target.files?.[0] || null);
          e.target.value = '';
        }}
      />

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Lançamentos Trabalhados por DSP</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-[#FF5500]">
              {metrics.totalWorked} lançamentos
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Contabilização anual de pitching editorial, distribuição por BU e taxa de conversão em destaques reais
          </p>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download CSV Template */}
          <button
            onClick={downloadWorkedReleasesTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Baixar planilha modelo com o cabeçalho oficial"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Baixar Modelo</span>
          </button>

          {/* Import CSV */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Importar planilha de lançamentos trabalhados (CSV)"
          >
            <Upload className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Importar CSV</span>
          </button>

          {/* Export CSV with Exact Headers */}
          <div className="relative group">
            <button
              onClick={() => handleExportCsv(';')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Exportar planilha completa no formato oficial solicitado"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar CSV Oficial</span>
            </button>
          </div>

          {/* New Release Manual */}
          <button
            onClick={() => {
              setEditingRelease(null);
              setFormData({
                bu: 'Sertanejo',
                data: new Date().toISOString().split('T')[0],
                artist: '',
                title: '',
                upc: '',
                isrc: '',
                label: 'ONErpm',
                genre: 'Sertanejo',
                format: 'Single',
                focusTrack: '',
                tipoFaixa: 'Focus Track',
                spotify: 'Pitching Editorial',
                amazon: 'Pitching Novidades',
                deezer: 'Pitching Novidades da Semana',
                apple: 'New Music Daily',
                ytm: 'Pitching Lançamentos',
                releaseNotes: '',
                fotos: 'Sim',
                s4a: 'Pitched',
                am4a: 'Pitched',
                comment: '',
                checkInDsps: 'OK - Conferido no ar',
                internationalPotential: 'Não',
              });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#FF5500] hover:bg-[#E04B00] rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Notification banner on import */}
      {importNotice && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between ${
            importNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 shrink-0" />
            <span>{importNotice.message}</span>
          </div>
          <button
            onClick={() => setImportNotice(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary KPI Row: Total Trabalhados, Destaques, Conversão Global, Eficiência */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Lançamentos Trabalhados */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Trabalhados</span>
            <Disc className="w-3.5 h-3.5 text-[#FF5500]" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 font-mono-numbers">
              {metrics.totalWorked}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Faixas submetidas a DSPs</p>
          </div>
        </div>

        {/* KPI 2: Destaques Conquistados */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Destaques</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 font-mono-numbers">
              {metrics.totalDestaquesConquistados}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Posições editoriais na aba</p>
          </div>
        </div>

        {/* KPI 3: Taxa de Conversão */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Conversão</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-600 font-mono-numbers">
              {metrics.globalConversionRate}%
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {metrics.releasesWithHighlights} de {metrics.totalWorked} com destaque
            </p>
          </div>
        </div>

        {/* KPI 4: Média Destaques/Lançamento */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Eficiência</span>
            <Award className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 font-mono-numbers">
              {metrics.efficiencyRatio}x
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Média de destaques/faixa</p>
          </div>
        </div>

        {/* KPI 5: Capas de Playlist */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Capas</span>
            <Layers className="w-3.5 h-3.5 text-[#FF5500]" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 font-mono-numbers">
              {metrics.releasesWithCover}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Lançamentos capa de playlist</p>
          </div>
        </div>

        {/* KPI 6: Novidades da Semana */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Novidades</span>
            <Flame className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 font-mono-numbers">
              {metrics.releasesWithNovidades}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Em playlists de novidades</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Subview Switcher */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Subview Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            <button
              onClick={() => setActiveSubView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeSubView === 'dashboard'
                  ? 'bg-white text-[#FF5500] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Painel Comparativo & Gráficos</span>
            </button>
            <button
              onClick={() => setActiveSubView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeSubView === 'table'
                  ? 'bg-white text-[#FF5500] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Planilha de Lançamentos & Cruzamento</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono-numbers">
            <span>Exibindo {filteredReleases.length} de {workedReleases.length} lançamentos</span>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Ano */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Ano do Lançamento
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
            >
              <option value="all">Todos os Anos</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* BU Oficial */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Unidade de Negócio (BU)
            </label>
            <select
              value={selectedBu}
              onChange={(e) => setSelectedBu(e.target.value)}
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

          {/* DSP Trabalhada */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              DSP Trabalhada
            </label>
            <select
              value={selectedDspWorked}
              onChange={(e) => setSelectedDspWorked(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
            >
              <option value="all">Todas as DSPs</option>
              <option value="Spotify">Spotify</option>
              <option value="Amazon Music">Amazon Music</option>
              <option value="Deezer">Deezer</option>
              <option value="Apple Music">Apple Music</option>
              <option value="YouTube Music">YouTube Music</option>
            </select>
          </div>

          {/* Status de Destaque / Conversão */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Status na Aba Destaques
            </label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
            >
              <option value="all">Todos os Status</option>
              <option value="with_highlight">🟢 Com Destaque Conquistado</option>
              <option value="without_highlight">⚪ Sem Destaque Conquistado</option>
              <option value="with_cover">⭐ Com Capa de Playlist</option>
              <option value="with_novidades">🔥 Em Novidades da Semana</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Buscar Artista / Título / UPC
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar lançamento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBVIEW 1: PAINEL COMPARATIVO & GRÁFICOS (DASHBOARD)                       */}
      {/* ========================================================================= */}
      {activeSubView === 'dashboard' && (
        <div className="space-y-6">
          {/* Section: COMPARAÇÃO COM OS DESTAQUES CONTABILIZADOS NA ABA DE DESTAQUE */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF5500]" />
                  <span>Comparativo: Lançamentos Trabalhados vs. Destaques Conquistados</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cruzamento direto entre o que foi trabalhado pela equipe e os resultados editoriais registrados na aba Destaques
                </p>
              </div>

              {onNavigateToDestaques && (
                <button
                  onClick={onNavigateToDestaques}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#FF5500] bg-slate-50 hover:bg-orange-50 border border-slate-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <span>Ir para Aba Destaques</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Comparativo BU a BU em Formato de Tabela com Métricas de Conversão */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-2.5 px-3">Unidade de Negócio (BU)</th>
                    <th className="py-2.5 px-3 text-center">Trabalhados</th>
                    <th className="py-2.5 px-3 text-center">Com Destaque</th>
                    <th className="py-2.5 px-3">Taxa de Conversão</th>
                    <th className="py-2.5 px-3 text-center">Destaques Conquistados</th>
                    <th className="py-2.5 px-3 text-center">Capas</th>
                    <th className="py-2.5 px-3 text-center">Novidades da Semana</th>
                    <th className="py-2.5 px-3 text-right">Eficiência (Destaques/Faixa)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.buComparisonList.map((buItem) => {
                    const buColor = BU_COLORS[buItem.bu] || '#64748B';
                    const convNum = parseFloat(buItem.conversionRate);

                    return (
                      <tr key={buItem.bu} className="hover:bg-slate-50/70 transition-colors">
                        {/* BU Name with color indicator */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-2 font-bold text-xs"
                            style={{ color: buColor }}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: buColor }}
                            />
                            {buItem.bu}
                          </span>
                        </td>

                        {/* Trabalhados */}
                        <td className="py-2.5 px-3 text-center font-mono-numbers font-bold text-slate-900">
                          {buItem.workedCount}
                        </td>

                        {/* Com Destaque */}
                        <td className="py-2.5 px-3 text-center font-mono-numbers font-semibold text-emerald-700">
                          {buItem.withHighlightCount}
                        </td>

                        {/* Taxa de Conversão Progress Bar */}
                        <td className="py-2.5 px-3 min-w-[160px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-xs h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-xs transition-all ${
                                  convNum >= 70
                                    ? 'bg-emerald-500'
                                    : convNum >= 40
                                    ? 'bg-amber-500'
                                    : 'bg-slate-400'
                                }`}
                                style={{ width: `${Math.min(convNum, 100)}%` }}
                              />
                            </div>
                            <span
                              className={`font-mono-numbers text-[11px] font-bold shrink-0 ${
                                convNum >= 70
                                  ? 'text-emerald-700'
                                  : convNum >= 40
                                  ? 'text-amber-700'
                                  : 'text-slate-600'
                              }`}
                            >
                              {buItem.conversionRate}%
                            </span>
                          </div>
                        </td>

                        {/* Total Destaques Conquistados */}
                        <td className="py-2.5 px-3 text-center font-mono-numbers font-bold text-[#FF5500]">
                          {buItem.destaquesCount}
                        </td>

                        {/* Capas */}
                        <td className="py-2.5 px-3 text-center font-mono-numbers font-medium text-slate-700">
                          {buItem.coversCount > 0 ? (
                            <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-xs">
                              ⭐ {buItem.coversCount}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* Novidades da Semana */}
                        <td className="py-2.5 px-3 text-center font-mono-numbers font-medium text-slate-700">
                          {buItem.novidadesCount > 0 ? (
                            <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-xs">
                              🔥 {buItem.novidadesCount}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* Eficiência (Destaques / Lançamento) */}
                        <td className="py-2.5 px-3 text-right font-mono-numbers font-bold text-slate-900">
                          {buItem.avgDestaquesPerRelease}x
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-xs text-slate-900">
                    <td className="py-3 px-3 uppercase text-[11px]">Total Geral</td>
                    <td className="py-3 px-3 text-center font-mono-numbers text-sm">
                      {metrics.totalWorked}
                    </td>
                    <td className="py-3 px-3 text-center font-mono-numbers text-sm text-emerald-700">
                      {metrics.releasesWithHighlights}
                    </td>
                    <td className="py-3 px-3 font-mono-numbers text-sm text-emerald-700">
                      {metrics.globalConversionRate}%
                    </td>
                    <td className="py-3 px-3 text-center font-mono-numbers text-sm text-[#FF5500]">
                      {metrics.totalDestaquesConquistados}
                    </td>
                    <td className="py-3 px-3 text-center font-mono-numbers text-sm text-amber-600">
                      {metrics.releasesWithCover}
                    </td>
                    <td className="py-3 px-3 text-center font-mono-numbers text-sm text-rose-600">
                      {metrics.releasesWithNovidades}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers text-sm">
                      {metrics.efficiencyRatio}x
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Comparativo de Pitching vs. Destaques por Plataforma (DSP) */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Comparativo por Plataforma: Lançamentos Trabalhados vs. Destaques Reais Obtidos
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  {
                    name: 'Spotify',
                    worked: metrics.workedDspCounts.Spotify,
                    dspName: 'Spotify',
                    subBadge: metrics.s4aCount > 0 ? `${metrics.s4aCount} S4A pitched` : undefined,
                  },
                  { name: 'Amazon Music', worked: metrics.workedDspCounts.Amazon, dspName: 'Amazon Music' },
                  { name: 'Deezer', worked: metrics.workedDspCounts.Deezer, dspName: 'Deezer' },
                  {
                    name: 'Apple Music',
                    worked: metrics.workedDspCounts.Apple,
                    dspName: 'Apple Music',
                    subBadge: metrics.am4aCount > 0 ? `${metrics.am4aCount} AM4A pitched` : undefined,
                  },
                  { name: 'YouTube Music', worked: metrics.workedDspCounts.YTM, dspName: 'YouTube Music' },
                ].map((dspItem) => {
                  const dspColor = DSP_COLORS[dspItem.dspName] || '#64748B';
                  const destaquesReal = metrics.destaquesByDspReal[dspItem.dspName] || 0;

                  return (
                    <div
                      key={dspItem.name}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: dspColor }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dspColor }} />
                          <span>{dspItem.name}</span>
                        </div>
                        {dspItem.subBadge && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded-xs border border-slate-200">
                            {dspItem.subBadge}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[11px]">Trabalhados:</span>
                          <strong className="font-mono-numbers text-slate-900">{dspItem.worked}</strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[11px]">Destaques Reais:</span>
                          <strong className="font-mono-numbers text-emerald-700">{destaquesReal}</strong>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400">
                        {dspItem.worked > 0
                          ? `Índice de aproveitamento: ${(destaquesReal / dspItem.worked).toFixed(1)}x`
                          : 'Sem dados de pitching'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBVIEW 2: PLANILHA DE LANÇAMENTOS TRABALHADOS (TABLE)                    */}
      {/* ========================================================================= */}
      {activeSubView === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Planilha Completa de Lançamentos Trabalhados & Cruzamento com Destaques
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Clique no selo de destaques para inspecionar as playlists oficiais conquistadas na aba Destaques
              </p>
            </div>
            <button
              onClick={() => handleExportCsv(';')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar (.csv)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">BU</th>
                  <th className="py-2.5 px-3">Artista & Título</th>
                  <th className="py-2.5 px-3">UPC / ISRC</th>
                  <th className="py-2.5 px-3">Formato</th>
                  <th className="py-2.5 px-3">Pitching DSPs</th>
                  <th className="py-2.5 px-3">S4A / AM4A</th>
                  <th className="py-2.5 px-3 text-center">Status em Destaques</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReleases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                      Nenhum lançamento encontrado com os filtros selecionados. Clique em "Novo Lançamento" ou "Importar CSV".
                    </td>
                  </tr>
                ) : (
                  filteredReleases.map((rel) => {
                    const buColor = BU_COLORS[rel.bu] || '#64748B';
                    const match = releaseMatchesMap.get(rel.id);
                    const destaquesCount = match ? match.destaquesCount : 0;
                    const hasCover = match ? match.hasCover : false;
                    const hasNovidades = match ? match.hasNovidades : false;

                    return (
                      <tr key={rel.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Data */}
                        <td className="py-2.5 px-3 font-mono-numbers text-slate-600 whitespace-nowrap text-[11px]">
                          {rel.data}
                        </td>

                        {/* BU */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-semibold text-[11px]" style={{ color: buColor }}>
                            {rel.bu}
                          </span>
                        </td>

                        {/* Artista & Título */}
                        <td className="py-2.5 px-3 max-w-[220px]">
                          <div className="font-bold text-slate-900 truncate" title={rel.artist}>
                            {rel.artist}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate" title={rel.title}>
                            {rel.title}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{rel.label}</div>
                        </td>

                        {/* UPC / ISRC */}
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono-numbers text-[10px] text-slate-500">
                          <div>UPC: {rel.upc || '—'}</div>
                          {rel.isrc && <div>ISRC: {rel.isrc}</div>}
                        </td>

                        {/* Formato & Tipo */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">
                          <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-xs">
                            {rel.format || 'Single'}
                          </span>
                        </td>

                        {/* Pitching DSPs Summary */}
                        <td className="py-2.5 px-3 max-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {rel.spotify && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.2 rounded-xs text-white"
                                style={{ backgroundColor: DSP_COLORS['Spotify'] }}
                                title={`Spotify: ${rel.spotify}`}
                              >
                                Spotify
                              </span>
                            )}
                            {rel.amazon && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.2 rounded-xs text-white"
                                style={{ backgroundColor: DSP_COLORS['Amazon Music'] }}
                                title={`Amazon: ${rel.amazon}`}
                              >
                                Amazon
                              </span>
                            )}
                            {rel.deezer && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.2 rounded-xs text-white"
                                style={{ backgroundColor: DSP_COLORS['Deezer'] }}
                                title={`Deezer: ${rel.deezer}`}
                              >
                                Deezer
                              </span>
                            )}
                            {rel.apple && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.2 rounded-xs text-white"
                                style={{ backgroundColor: DSP_COLORS['Apple Music'] }}
                                title={`Apple: ${rel.apple}`}
                              >
                                Apple
                              </span>
                            )}
                            {rel.ytm && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.2 rounded-xs text-white"
                                style={{ backgroundColor: DSP_COLORS['YouTube Music'] }}
                                title={`YouTube Music: ${rel.ytm}`}
                              >
                                YTM
                              </span>
                            )}
                          </div>
                        </td>

                        {/* S4A / AM4A */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-[10px] text-slate-600">
                          <div>S4A: <strong className="text-slate-800">{rel.s4a || 'Pendente'}</strong></div>
                          <div>AM4A: <strong className="text-slate-800">{rel.am4a || 'Pendente'}</strong></div>
                        </td>

                        {/* Cruzamento com Destaques (Click to Inspect) */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {destaquesCount > 0 ? (
                            <button
                              onClick={() =>
                                setInspectingMatch({
                                  release: rel,
                                  matched: match?.matchedHighlights || [],
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                              title="Clique para ver os destaques conquistados"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{destaquesCount} {destaquesCount === 1 ? 'Destaque' : 'Destaques'}</span>
                              {hasCover && <span title="Capa de Playlist">⭐</span>}
                              {hasNovidades && <span title="Novidades da Semana">🔥</span>}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                              Sem destaque
                            </span>
                          )}
                        </td>

                        {/* Row Actions: Edit & Delete */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEdit(rel)}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded-sm transition-colors cursor-pointer mr-1"
                            title="Editar lançamento"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteWorkedRelease(rel.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-sm transition-colors cursor-pointer"
                            title="Excluir lançamento"
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

      {/* ========================================================================= */}
      {/* MODAL: INSPEÇÃO DE DESTAQUES CONQUISTADOS PELO LANÇAMENTO                   */}
      {/* ========================================================================= */}
      {inspectingMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => setInspectingMatch(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-[#FF5500]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Destaques Conquistados na Aba Destaques
                  </h3>
                  <p className="text-xs text-slate-500">
                    {inspectingMatch.release.artist} - {inspectingMatch.release.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingMatch(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Código UPC:</span>
                <span className="font-mono-numbers font-semibold">{inspectingMatch.release.upc || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">BU Oficial:</span>
                <span className="font-semibold">{inspectingMatch.release.bu}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Data do Lançamento:</span>
                <span className="font-semibold">{inspectingMatch.release.data}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Total de Destaques:</span>
                <span className="font-bold text-[#FF5500] font-mono-numbers">
                  {inspectingMatch.matched.length} posições conquistadas
                </span>
              </div>
            </div>

            {/* List of matched highlights */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Posições e Playlists Obtidas:
              </h4>

              {inspectingMatch.matched.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Nenhum destaque encontrado na aba Destaques para este UPC ou Artista.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {inspectingMatch.matched.map((hl) => {
                    const dspColor = DSP_COLORS[hl.dsp] || '#64748B';
                    const isCapa = hl.tipoDestaque === 'CAPA' || hl.destaque.toLowerCase().includes('capa');
                    const isNovidades = isNovidadesHighlight(hl.destaque, hl.dsp);

                    return (
                      <div key={hl.id} className="p-3 hover:bg-slate-50/70 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-bold text-[11px] px-2 py-0.2 rounded-xs text-white"
                              style={{ backgroundColor: dspColor }}
                            >
                              {hl.dsp}
                            </span>
                            <span className="font-bold text-slate-900">{hl.destaque}</span>
                            {isCapa && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-xs">
                                ⭐ Capa
                              </span>
                            )}
                            {isNovidades && (
                              <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded-xs">
                                🔥 Novidades da Semana
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono-numbers">
                            Data do Destaque: {hl.data} · Território: {hl.territorio} · Origem: {hl.origem}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectingMatch(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADICIONAR / EDITAR LANÇAMENTO TRABALHADO                          */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-[#FF5500]">
                  <Disc className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingRelease ? 'Editar Lançamento Trabalhado' : 'Novo Lançamento Trabalhado'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cadastro de dados de pitching e metadados para acompanhamento de DSPs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Row 1: BU, Data, Formato */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    BU Oficial *
                  </label>
                  <select
                    value={formData.bu}
                    onChange={(e) => setFormData({ ...formData, bu: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
                  >
                    {OFFICIAL_BUS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Data do Lançamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Formato
                  </label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
                  >
                    <option value="Single">Single</option>
                    <option value="EP">EP</option>
                    <option value="Álbum">Álbum</option>
                    <option value="Remix">Remix</option>
                    <option value="Ao Vivo">Ao Vivo</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Artista e Título */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Artista *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do artista principal"
                    value={formData.artist}
                    onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Título do Lançamento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Título do single / álbum"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
              </div>

              {/* Row 3: UPC, ISRC, Label */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Código UPC (Chave de Destaque)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 7891234567890"
                    value={formData.upc}
                    onChange={(e) => setFormData({ ...formData, upc: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Código ISRC
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: BR-1R1-24-00101"
                    value={formData.isrc}
                    onChange={(e) => setFormData({ ...formData, isrc: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Label / Selo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ONErpm"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
              </div>

              {/* Row 4: Focus Track & Tipo de Faixa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Focus Track
                  </label>
                  <input
                    type="text"
                    placeholder="Nome da faixa foco para curadoria"
                    value={formData.focusTrack}
                    onChange={(e) => setFormData({ ...formData, focusTrack: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tipo de Faixa
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Focus Track, Single, Remix"
                    value={formData.tipoFaixa}
                    onChange={(e) => setFormData({ ...formData, tipoFaixa: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
              </div>

              {/* Pitching DSPs Grid */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700 uppercase block mb-2">
                  Pitching por DSP (Informações da Planilha)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Geral/Spotify
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Pitching Editorial / Capa"
                      value={formData.spotify}
                      onChange={(e) => setFormData({ ...formData, spotify: e.target.value })}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Amazon
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Pitching Novidades"
                      value={formData.amazon}
                      onChange={(e) => setFormData({ ...formData, amazon: e.target.value })}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Deezer
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Novidades da Semana"
                      value={formData.deezer}
                      onChange={(e) => setFormData({ ...formData, deezer: e.target.value })}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Apple
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: New Music Daily"
                      value={formData.apple}
                      onChange={(e) => setFormData({ ...formData, apple: e.target.value })}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      YTM
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Lançamentos"
                      value={formData.ytm}
                      onChange={(e) => setFormData({ ...formData, ytm: e.target.value })}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Check in DSPs
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: OK - Conferido no ar"
                      value={formData.checkInDsps}
                      onChange={(e) => setFormData({ ...formData, checkInDsps: e.target.value })}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Submissões S4A & AM4A e Outros */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    S4A (Spotify for Artists)
                  </label>
                  <input
                    type="text"
                    placeholder="Pitched / Sim"
                    value={formData.s4a}
                    onChange={(e) => setFormData({ ...formData, s4a: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    AM4A (Apple Music Artists)
                  </label>
                  <input
                    type="text"
                    placeholder="Pitched / Sim"
                    value={formData.am4a}
                    onChange={(e) => setFormData({ ...formData, am4a: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Fotos
                  </label>
                  <input
                    type="text"
                    placeholder="Sim / Entregue"
                    value={formData.fotos}
                    onChange={(e) => setFormData({ ...formData, fotos: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    International Potential
                  </label>
                  <select
                    value={formData.internationalPotential}
                    onChange={(e) => setFormData({ ...formData, internationalPotential: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
                  >
                    <option value="Não">Não</option>
                    <option value="Latam">Latam</option>
                    <option value="Global">Global</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>
              </div>

              {/* Release Notes & Comments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Release (Press release / notas)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Informações do press kit, destaques do lançamento..."
                    value={formData.releaseNotes}
                    onChange={(e) => setFormData({ ...formData, releaseNotes: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Comment (Comentários e observações)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Observações estratégicas da equipe de marketing / A&R..."
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#FF5500] hover:bg-[#E04B00] rounded-lg shadow-2xs cursor-pointer"
                >
                  {editingRelease ? 'Salvar Alterações' : 'Cadastrar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
