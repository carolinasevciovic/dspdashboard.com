import React, { useMemo, useRef, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Eye,
  FileCheck,
  Filter,
  Image as ImageIcon,
  Link,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  BU_COLORS,
  CoverItem,
  DSP_COLORS,
  DSPPlatform,
  HighlightRecord,
  OFFICIAL_BUS,
} from '../types';

interface CapasViewProps {
  covers: CoverItem[];
  highlights?: HighlightRecord[];
  onAddCover: (cover: CoverItem) => void;
  onBatchAddCovers: (covers: CoverItem[]) => void;
  onDeleteCover: (id: string) => void;
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

export const CapasView: React.FC<CapasViewProps> = ({
  covers,
  highlights = [],
  onAddCover,
  onBatchAddCovers,
  onDeleteCover,
}) => {
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCover, setSelectedCover] = useState<CoverItem | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Manual/Custom input flags
  const [isManualArtist, setIsManualArtist] = useState(false);
  const [isManualTitle, setIsManualTitle] = useState(false);

  // Filters
  const [searchUpcOrArtist, setSearchUpcOrArtist] = useState('');
  const [filterBu, setFilterBu] = useState('all');
  const [filterDsp, setFilterDsp] = useState('all');

  // Single upload form state
  const [formData, setFormData] = useState({
    upc: '',
    artista: '',
    titulo: '',
    imageUrl: '',
    dataDestaque: new Date().toISOString().split('T')[0],
    dsp: 'Spotify',
    bu: 'Sertanejo',
    fileName: '',
  });

  // Extract unique artists from highlights for the dropdown
  const highlightedArtists = useMemo(() => {
    const map = new Map<string, string>(); // lowercase -> display
    highlights.forEach((h) => {
      const trimmed = h.artista?.trim();
      if (trimmed && !map.has(trimmed.toLowerCase())) {
        map.set(trimmed.toLowerCase(), trimmed);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [highlights]);

  // Extract tracks for the selected artist
  const artistTracks = useMemo(() => {
    if (!formData.artista || isManualArtist) return [];
    const artLower = formData.artista.toLowerCase().trim();
    return highlights.filter((h) => h.artista?.toLowerCase().trim() === artLower);
  }, [highlights, formData.artista, isManualArtist]);

  const availableTitles = useMemo(() => {
    const map = new Map<string, string>();
    artistTracks.forEach((h) => {
      const trimmed = h.titulo?.trim();
      if (trimmed && !map.has(trimmed.toLowerCase())) {
        map.set(trimmed.toLowerCase(), trimmed);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [artistTracks]);

  // Handle JPEG file selection in manual modal
  const handleJpegFileChange = (file: File | null) => {
    setFileError(null);
    if (!file) return;

    // Enforce JPEG format (.jpg, .jpeg, image/jpeg)
    const isJpeg = file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name);
    if (!isJpeg) {
      setFileError('Atenção: Apenas arquivos JPEG (.jpg ou .jpeg) são aceitos para a capa.');
      return;
    }

    // Try to extract UPC from filename if available
    const upcMatch = file.name.match(/\b\d{12,14}\b/);
    const extractedUpc = upcMatch ? upcMatch[0] : '';

    // Convert file to base64 for persistent preview and storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        imageUrl: result,
        fileName: file.name,
        upc: extractedUpc || prev.upc,
      }));
    };
    reader.readAsDataURL(file);
  };

  // When an artist is chosen from the dropdown
  const handleArtistSelectChange = (value: string) => {
    if (value === '__CUSTOM__') {
      setIsManualArtist(true);
      setIsManualTitle(true);
      setFormData((prev) => ({ ...prev, artista: '', titulo: '' }));
      return;
    }

    setIsManualArtist(false);
    setIsManualTitle(false);
    setFormData((prev) => ({
      ...prev,
      artista: value,
      titulo: '', // reset title so user chooses from tracks of this artist
    }));
  };

  // When a title is chosen from the dropdown
  const handleTitleSelectChange = (value: string) => {
    if (value === '__CUSTOM__') {
      setIsManualTitle(true);
      setFormData((prev) => ({ ...prev, titulo: '' }));
      return;
    }

    setIsManualTitle(false);

    // Auto-populate UPC, BU, DSP, and Date from the highlighted record!
    const matched = artistTracks.find(
      (h) => h.titulo?.toLowerCase().trim() === value.toLowerCase().trim()
    );

    setFormData((prev) => ({
      ...prev,
      titulo: value,
      upc: matched?.upc || prev.upc,
      bu: matched?.bu || prev.bu,
      dsp: matched?.dsp || prev.dsp,
      dataDestaque: matched?.data || prev.dataDestaque,
    }));
  };

  // Batch Image File Drop/Upload
  const handleBatchImageUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newCovers: CoverItem[] = [];

    Array.from(files).forEach((file) => {
      // Validate JPEG or image
      const isJpeg = file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name);
      if (!isJpeg) return; // Ignore non-jpegs in strict mode

      const upcMatch = file.name.match(/\b\d{12,14}\b/);
      const extractedUpc = upcMatch ? upcMatch[0] : '';

      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const parts = nameWithoutExt.split(/[-_]/).map((p) => p.trim());
      let artist = 'Artista';
      let title = nameWithoutExt;

      if (parts.length >= 2) {
        if (parts[0] === extractedUpc && parts[1]) {
          artist = parts[1].replace(/_/g, ' ');
          if (parts[2]) title = parts[2].replace(/_/g, ' ');
        } else {
          artist = parts[0].replace(/_/g, ' ');
          title = parts[1].replace(/_/g, ' ');
        }
      }

      // If UPC matched a highlight record, inherit BU, DSP and date
      const matchedH = extractedUpc
        ? highlights.find((h) => h.upc === extractedUpc)
        : null;

      const objectUrl = URL.createObjectURL(file);

      newCovers.push({
        id: `cov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        upc: extractedUpc,
        artista: matchedH ? matchedH.artista : artist,
        titulo: matchedH ? matchedH.titulo : title,
        imageUrl: objectUrl,
        dataDestaque: matchedH ? matchedH.data : new Date().toISOString().split('T')[0],
        dsp: matchedH ? matchedH.dsp : 'Spotify',
        bu: matchedH ? matchedH.bu : 'Sertanejo',
        fileName: file.name,
        createdAt: new Date().toISOString(),
      });
    });

    if (newCovers.length > 0) {
      onBatchAddCovers(newCovers);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl.trim()) {
      setFileError('Por favor adicione uma imagem JPEG para a capa.');
      return;
    }

    const newCover: CoverItem = {
      id: `cov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      upc: formData.upc.trim() || 'SEM-UPC',
      artista: formData.artista.trim() || 'Artista',
      titulo: formData.titulo.trim() || 'Lançamento',
      imageUrl: formData.imageUrl.trim(),
      dataDestaque: formData.dataDestaque,
      dsp: formData.dsp,
      bu: formData.bu,
      fileName: formData.fileName || `${formData.upc.trim() || 'capa'}.jpg`,
      createdAt: new Date().toISOString(),
    };

    onAddCover(newCover);
    setModalOpen(false);
    setFileError(null);
    setIsManualArtist(false);
    setIsManualTitle(false);

    // Reset form
    setFormData({
      upc: '',
      artista: '',
      titulo: '',
      imageUrl: '',
      dataDestaque: new Date().toISOString().split('T')[0],
      dsp: 'Spotify',
      bu: 'Sertanejo',
      fileName: '',
    });
  };

  const filteredCovers = covers.filter((c) => {
    if (filterBu !== 'all' && c.bu !== filterBu) return false;
    if (filterDsp !== 'all' && c.dsp !== filterDsp) return false;
    if (searchUpcOrArtist.trim()) {
      const q = searchUpcOrArtist.toLowerCase();
      const matchUpc = c.upc.toLowerCase().includes(q);
      const matchArt = c.artista.toLowerCase().includes(q);
      const matchTit = c.titulo.toLowerCase().includes(q);
      if (!matchUpc && !matchArt && !matchTit) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Galeria de Capas Oficiais (JPEG)</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-[#FF5500]">
              {covers.length} cadastradas
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload de arquivos JPEG e vinculação automática com artistas e lançamentos dos destaques
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Hidden File Input for Batch Images */}
          <input
            ref={batchFileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,image/jpeg"
            onChange={(e) => handleBatchImageUpload(e.target.files)}
            className="hidden"
          />

          <button
            onClick={() => batchFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Importar JPEG em Lote</span>
          </button>

          <button
            onClick={() => {
              setFileError(null);
              setIsManualArtist(false);
              setIsManualTitle(false);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#FF5500] hover:bg-[#E04B00] rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Capa Manual</span>
          </button>
        </div>
      </div>

      {/* Batch Drag & Drop Banner */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleBatchImageUpload(e.dataTransfer.files);
        }}
        className="border-2 border-dashed border-slate-200 hover:border-[#FF5500] bg-white rounded-xl p-6 text-center transition-colors flex flex-col items-center justify-center gap-2"
      >
        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-[#FF5500]">
          <ImageIcon className="w-5 h-5" />
        </div>
        <div className="text-xs font-bold text-slate-800">
          Arraste e solte arquivos JPEG (.jpg / .jpeg) aqui para importação rápida em lote
        </div>
        <p className="text-[11px] text-slate-500 max-w-lg">
          O sistema extrai o código UPC do nome do arquivo (ex: <code>7891234567890_Artista.jpg</code>) e vincula automaticamente aos destaques correspondentes.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Filtrar Capas Cadastradas</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono-numbers">
            {filteredCovers.length} de {covers.length} capas exibidas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search UPC / Artist */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por UPC, artista ou título..."
              value={searchUpcOrArtist}
              onChange={(e) => setSearchUpcOrArtist(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* BU */}
          <div>
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

          {/* DSP */}
          <div>
            <select
              value={filterDsp}
              onChange={(e) => setFilterDsp(e.target.value)}
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
        </div>
      </div>

      {/* Covers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredCovers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
            Nenhuma capa cadastrada com os filtros atuais.
          </div>
        ) : (
          filteredCovers.map((cover) => {
            const dspColor = cover.dsp ? DSP_COLORS[cover.dsp] : '#64748B';

            return (
              <div
                key={cover.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden group hover:shadow-md transition-all flex flex-col"
              >
                {/* Image Frame */}
                <div
                  onClick={() => setSelectedCover(cover)}
                  className="aspect-square w-full relative bg-slate-100 cursor-pointer overflow-hidden"
                >
                  <img
                    src={cover.imageUrl}
                    alt={cover.titulo}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                    <Eye className="w-5 h-5" />
                  </div>
                  {/* Platform Indicator */}
                  {cover.dsp && (
                    <span
                      className="absolute top-2 right-2 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-xs shadow-xs"
                      style={{ backgroundColor: dspColor }}
                    >
                      {cover.dsp}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 truncate" title={cover.titulo}>
                      {cover.titulo}
                    </h4>
                    <p className="text-[11px] text-slate-600 truncate" title={cover.artista}>
                      {cover.artista}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span
                      className="font-mono-numbers text-slate-500 font-medium truncate"
                      title={`UPC: ${cover.upc}`}
                    >
                      UPC: {cover.upc}
                    </span>
                    <button
                      onClick={() => onDeleteCover(cover.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                      title="Excluir capa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Fullscreen Cover Preview */}
      {selectedCover && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
          onClick={() => setSelectedCover(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedCover.artista} - {selectedCover.titulo}
                </h3>
                <span className="text-xs text-slate-400 font-mono-numbers">
                  UPC: {selectedCover.upc}
                </span>
              </div>
              <button
                onClick={() => setSelectedCover(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-100 shadow-xs">
              <img
                src={selectedCover.imageUrl}
                alt={selectedCover.titulo}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block">Data do Destaque:</span>
                <span className="font-semibold">{selectedCover.dataDestaque}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Plataforma:</span>
                <span className="font-semibold">{selectedCover.dsp || 'Todas'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Unidade de Negócio:</span>
                <span className="font-semibold">{selectedCover.bu || 'Geral'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Arquivo:</span>
                <span className="font-mono-numbers truncate block">{selectedCover.fileName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manual Add Cover */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-[#FF5500]">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Adicionar Capa Manual (JPEG)</h3>
                  <p className="text-xs text-slate-500">
                    Selecione o artista e título destacados ou faça upload do arquivo JPEG
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              {/* File upload JPEG requirement */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Arquivo de Capa (Formato JPEG obrigatório) *
                </label>

                {/* Hidden single file input */}
                <input
                  ref={singleFileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,image/jpeg"
                  onChange={(e) => handleJpegFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                />

                <div
                  onClick={() => singleFileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) {
                      handleJpegFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    formData.imageUrl
                      ? 'border-emerald-400 bg-emerald-50/40'
                      : 'border-slate-300 hover:border-[#FF5500] bg-slate-50'
                  }`}
                >
                  {formData.imageUrl ? (
                    <div className="flex items-center justify-center gap-3">
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded-md shadow-2xs border border-emerald-300"
                      />
                      <div className="text-left text-xs">
                        <div className="flex items-center gap-1 text-emerald-700 font-bold">
                          <FileCheck className="w-4 h-4" />
                          <span>Arquivo JPEG carregado com sucesso</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono-numbers">
                          {formData.fileName || 'capa.jpg'}
                        </div>
                        <span className="text-[10px] text-[#FF5500] hover:underline">
                          Clique para alterar a imagem
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 mx-auto text-slate-400" />
                      <div className="text-xs font-semibold text-slate-700">
                        Clique ou arraste o arquivo JPEG aqui (.jpg / .jpeg)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Recomendado: 3000x3000px, RGB, JPEG oficial
                      </div>
                    </div>
                  )}
                </div>

                {fileError && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                    <span>⚠️</span> {fileError}
                  </p>
                )}
              </div>

              {/* Artista: Dropdown dos artistas destacados nos destaques */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">
                    Artista (Destaques) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualArtist(!isManualArtist);
                      if (!isManualArtist) {
                        setIsManualTitle(true);
                      }
                    }}
                    className="text-[10px] font-bold text-[#FF5500] hover:underline cursor-pointer"
                  >
                    {isManualArtist ? '← Selecionar da lista de destaques' : '+ Digitar artista manual'}
                  </button>
                </div>

                {isManualArtist ? (
                  <input
                    type="text"
                    required
                    placeholder="Nome do artista"
                    value={formData.artista}
                    onChange={(e) => setFormData({ ...formData, artista: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                ) : (
                  <select
                    value={formData.artista}
                    onChange={(e) => handleArtistSelectChange(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
                  >
                    <option value="">Selecione o artista do destaque ({highlightedArtists.length} disponíveis)...</option>
                    {highlightedArtists.map((art) => (
                      <option key={art} value={art}>
                        {art}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Outro artista não listado...</option>
                  </select>
                )}
              </div>

              {/* Título do Lançamento: Dropdown das faixas do artista selecionado */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">
                    Título do Lançamento *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsManualTitle(!isManualTitle)}
                    className="text-[10px] font-bold text-[#FF5500] hover:underline cursor-pointer"
                  >
                    {isManualTitle ? '← Selecionar dos lançamentos' : '+ Digitar título manual'}
                  </button>
                </div>

                {isManualTitle || !formData.artista ? (
                  <input
                    type="text"
                    required
                    placeholder={
                      !formData.artista
                        ? 'Selecione o artista acima ou digite o título'
                        : 'Título da faixa / álbum'
                    }
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                ) : (
                  <select
                    value={formData.titulo}
                    onChange={(e) => handleTitleSelectChange(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
                  >
                    <option value="">
                      {availableTitles.length > 0
                        ? `Selecione a faixa de ${formData.artista} (${availableTitles.length} lançamentos)...`
                        : `Nenhum lançamento encontrado para ${formData.artista}`}
                    </option>
                    {availableTitles.map((tit) => (
                      <option key={tit} value={tit}>
                        {tit}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Outro título manual...</option>
                  </select>
                )}

                {formData.artista && availableTitles.length > 0 && !isManualTitle && (
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    ✨ Ao escolher a faixa, o UPC, BU, DSP e Data serão preenchidos automaticamente.
                  </span>
                )}
              </div>

              {/* Código UPC & BU */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Código UPC
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
                    BU Oficial
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
              </div>

              {/* Data & DSP */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Data do Destaque
                  </label>
                  <input
                    type="date"
                    value={formData.dataDestaque}
                    onChange={(e) => setFormData({ ...formData, dataDestaque: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    DSP
                  </label>
                  <select
                    value={formData.dsp}
                    onChange={(e) => setFormData({ ...formData, dsp: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
                  >
                    {ALL_DSPS.map((dsp) => (
                      <option key={dsp} value={dsp}>
                        {dsp}
                      </option>
                    ))}
                  </select>
                </div>
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
