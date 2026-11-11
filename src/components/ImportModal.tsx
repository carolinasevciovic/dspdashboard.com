import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ChartRecord, DSPPlatform, HighlightRecord, ImportedDocument } from '../types';
import { extractPeriodFromFileName, parseCsvContent } from '../utils/csvParser';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (
    docs: ImportedDocument[],
    highlights: HighlightRecord[],
    charts: ChartRecord[]
  ) => void;
  existingPeriods?: string[];
}

interface StagedFile {
  id: string;
  file: File;
  text: string;
  fileName: string;
  type: 'destaques' | 'chart';
  dsp: DSPPlatform;
  period: string;
  isPeriodIdentified: boolean;
  recordCount: number;
  error?: string;
}

const DSP_OPTIONS: DSPPlatform[] = [
  'Spotify',
  'Deezer',
  'Amazon Music',
  'Apple Music',
  'YouTube Music',
  'Claro Música',
  'Shazam Discovery',
  'Brisa Music',
  'Nomo Music',
  'Audiomack',
  'Qobuz',
  'TIDAL',
  'Beatport',
];

const PRESET_WEEKLY_PERIODS = [
  '14/10/2024 a 20/10/2024',
  '07/10/2024 a 13/10/2024',
  '21/10/2024 a 27/10/2024',
  '28/10/2024 a 03/11/2024',
  '30/09/2024 a 06/10/2024',
  'Semana 42/2024',
  'Semana 41/2024',
  'Semana 40/2024',
];

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  existingPeriods = [],
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Track rows where user selected "+ Digitar outro período..."
  const [customPeriodIds, setCustomPeriodIds] = useState<Set<string>>(new Set());

  // Master list of periods available for selection
  const allAvailablePeriods = useMemo(() => {
    const set = new Set<string>();
    existingPeriods.forEach((p) => p && set.add(p));
    PRESET_WEEKLY_PERIODS.forEach((p) => set.add(p));
    stagedFiles.forEach((f) => {
      if (f.period && f.period !== 'Período Não Identificado') {
        set.add(f.period);
      }
    });
    return Array.from(set).sort().reverse();
  }, [existingPeriods, stagedFiles]);

  if (!isOpen) return null;

  const handleResetAndClose = () => {
    setStagedFiles([]);
    setCustomPeriodIds(new Set());
    setImportSuccessMessage(null);
    onClose();
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsReadingFiles(true);
    setImportSuccessMessage(null);

    const newStaged: StagedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();

        // 1. Initial quick parse to detect file type, default DSP and default period
        const initialResult = parseCsvContent(file.name, text);
        const extractedPeriod = extractPeriodFromFileName(file.name);

        const detectedPeriod = extractedPeriod.isIdentified
          ? extractedPeriod.periodString
          : initialResult.document.identifiedPeriod || '';

        newStaged.push({
          id: `stage_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          file,
          text,
          fileName: file.name,
          type: initialResult.document.type,
          dsp: initialResult.document.dsp || 'Spotify',
          period: detectedPeriod,
          isPeriodIdentified: Boolean(detectedPeriod && detectedPeriod !== 'Período Não Identificado'),
          recordCount: initialResult.document.recordCount,
        });
      } catch (err: any) {
        newStaged.push({
          id: `stage_${Date.now()}_${i}`,
          file,
          text: '',
          fileName: file.name,
          type: 'chart',
          dsp: 'Spotify',
          period: '',
          isPeriodIdentified: false,
          recordCount: 0,
          error: err.message || 'Erro ao ler arquivo',
        });
      }
    }

    setStagedFiles((prev) => [...prev, ...newStaged]);
    setIsReadingFiles(false);
  };

  const updateStagedFileDsp = (id: string, newDsp: DSPPlatform) => {
    setStagedFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, dsp: newDsp } : item))
    );
  };

  const updateStagedFilePeriod = (id: string, newPeriod: string) => {
    setStagedFiles((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              period: newPeriod,
              isPeriodIdentified: newPeriod.trim().length > 0 && newPeriod !== 'Período Não Identificado',
            }
          : item
      )
    );
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((item) => item.id !== id));
    setCustomPeriodIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleExecuteImport = () => {
    if (stagedFiles.length === 0) return;

    setIsCommitting(true);

    const finalDocs: ImportedDocument[] = [];
    const finalHighlights: HighlightRecord[] = [];
    const finalCharts: ChartRecord[] = [];

    stagedFiles.forEach((staged) => {
      if (staged.error) return;

      const customPeriod = staged.period.trim() || undefined;
      const customDsp = staged.type === 'destaques' ? undefined : staged.dsp;

      const result = parseCsvContent(
        staged.fileName,
        staged.text,
        customDsp,
        customPeriod
      );

      finalDocs.push(result.document);
      finalHighlights.push(...result.highlights);
      finalCharts.push(...result.charts);
    });

    if (finalDocs.length > 0) {
      onImportComplete(finalDocs, finalHighlights, finalCharts);
      setImportSuccessMessage(
        `${finalDocs.length} ${
          finalDocs.length === 1 ? 'arquivo importado' : 'arquivos importados'
        } com sucesso para o Dashboard!`
      );
    }

    setIsCommitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-[#FF5500]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Importar Arquivos CSV
              </h2>
              <p className="text-xs text-slate-500">
                Selecione ou solte arquivos CSV. Selecione o período e a plataforma diretamente em cada linha abaixo.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Success Banner if committed */}
          {importSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{importSuccessMessage}</span>
              </div>
              <button
                onClick={handleResetAndClose}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
              >
                Concluir & Ir ao Dashboard
              </button>
            </div>
          )}

          {/* Drag & Drop Area (Clean, no top overrides) */}
          {stagedFiles.length === 0 ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#FF5500] bg-slate-50 hover:bg-orange-50/20 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv,text/csv"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-slate-200 group-hover:border-[#FF5500] flex items-center justify-center text-slate-500 group-hover:text-[#FF5500] transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Clique para selecionar ou arraste arquivos CSV aqui
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Suporta múltiplos arquivos simultaneamente (+100 CSVs de Charts e Destaques)
                </p>
              </div>
              <div className="text-[11px] text-slate-400 max-w-md">
                Nos arquivos de Destaques, as plataformas são lidas linha a linha do próprio CSV. Para Charts, você pode escolher a DSP por arquivo.
              </div>
            </div>
          ) : (
            /* Toolbar when files are staged */
            <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Arquivos na Fila ({stagedFiles.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Selecione o período e a plataforma diretamente em cada item:
                </span>
              </div>

              <div>
                <input
                  ref={addMoreInputRef}
                  type="file"
                  multiple
                  accept=".csv,text/csv"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                />
                <button
                  onClick={() => addMoreInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#FF5500] bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Mais CSVs</span>
                </button>
              </div>
            </div>
          )}

          {/* Reading Files Spinner */}
          {isReadingFiles && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-[#FF5500]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Lendo e analisando arquivos CSV...</span>
            </div>
          )}

          {/* STAGED FILES LIST */}
          {stagedFiles.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-2.5 px-3">Arquivo</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Plataforma (DSP)</th>
                      <th className="py-2.5 px-3 min-w-[240px]">Período (Seleção)</th>
                      <th className="py-2.5 px-3 text-right">Registros</th>
                      <th className="py-2.5 px-3 text-center">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stagedFiles.map((staged) => {
                      const isCustomPeriod = customPeriodIds.has(staged.id);

                      // Build the period options for this row
                      const rowPeriodOptions = Array.from(
                        new Set([
                          ...(staged.period && staged.period !== 'Período Não Identificado' ? [staged.period] : []),
                          ...allAvailablePeriods,
                        ])
                      );

                      return (
                        <tr key={staged.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* File Name */}
                          <td className="py-2 px-3 font-semibold text-slate-800 max-w-[200px] truncate" title={staged.fileName}>
                            <div className="flex items-center gap-1.5">
                              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{staged.fileName}</span>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                                staged.type === 'destaques'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {staged.type === 'destaques' ? 'Destaques' : 'Chart'}
                            </span>
                          </td>

                          {/* Platform (DSP): Destaques uses CSV columns; Chart allows selecting DSP */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            {staged.type === 'destaques' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-orange-50 text-[#FF5500] border border-orange-200">
                                Múltiplas (Do CSV)
                              </span>
                            ) : (
                              <select
                                value={staged.dsp}
                                onChange={(e) => updateStagedFileDsp(staged.id, e.target.value as DSPPlatform)}
                                className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500] cursor-pointer"
                              >
                                {DSP_OPTIONS.map((dsp) => (
                                  <option key={dsp} value={dsp}>
                                    {dsp}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>

                          {/* Period: SELEÇÃO (Dropdown) instead of free-text typing */}
                          <td className="py-2 px-3">
                            {isCustomPeriod ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={staged.period}
                                  onChange={(e) => updateStagedFilePeriod(staged.id, e.target.value)}
                                  placeholder="Ex: 14/10/2024 a 20/10/2024"
                                  className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCustomPeriodIds((prev) => {
                                      const next = new Set(prev);
                                      next.delete(staged.id);
                                      return next;
                                    })
                                  }
                                  className="text-[10px] text-[#FF5500] hover:underline font-bold whitespace-nowrap px-1"
                                  title="Voltar para lista de seleção"
                                >
                                  Lista
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <select
                                  value={staged.period}
                                  onChange={(e) => {
                                    if (e.target.value === '__custom__') {
                                      setCustomPeriodIds((prev) => new Set(prev).add(staged.id));
                                    } else {
                                      updateStagedFilePeriod(staged.id, e.target.value);
                                    }
                                  }}
                                  className={`w-full text-xs font-semibold border rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500] cursor-pointer ${
                                    !staged.isPeriodIdentified
                                      ? 'border-amber-300 bg-amber-50/40 text-amber-900'
                                      : 'border-slate-300 text-slate-800'
                                  }`}
                                >
                                  <option value="">Selecione o período semanal...</option>
                                  {rowPeriodOptions.map((period) => (
                                    <option key={period} value={period}>
                                      {period}
                                    </option>
                                  ))}
                                  <option value="__custom__">+ Digitar outro período...</option>
                                </select>
                                {!staged.isPeriodIdentified && (
                                  <span
                                    className="absolute right-8 top-2 text-amber-500 pointer-events-none"
                                    title="Período não identificado automaticamente. Selecione um período da lista."
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Record Count */}
                          <td className="py-2 px-3 text-right font-mono-numbers font-bold text-slate-900 whitespace-nowrap">
                            {staged.recordCount} linhas
                          </td>

                          {/* Remove button */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => removeStagedFile(staged.id)}
                              className="p-1 rounded-sm text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remover arquivo da fila"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Instructions Box */}
          <div className="p-3 bg-slate-50 rounded-lg text-slate-600 text-xs space-y-1 border border-slate-200">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <HelpCircle className="w-3.5 h-3.5 text-[#FF5500]" />
              Instruções de Importação:
            </div>
            <p className="text-[11px]">
              • <strong>Destaques:</strong> O arquivo já contém a coluna de cada plataforma (DSP), então os dados são lidos linha a linha diretamente do CSV.
            </p>
            <p className="text-[11px]">
              • <strong>Charts:</strong> Se a plataforma não for detectada pelo nome do arquivo, selecione-a no dropdown da linha correspondente.
            </p>
            <p className="text-[11px]">
              • <strong>Período:</strong> Basta selecionar a semana no menu dropdown de cada arquivo.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleResetAndClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            {stagedFiles.length > 0 && importSuccessMessage ? 'Fechar' : 'Cancelar'}
          </button>

          {stagedFiles.length > 0 && !importSuccessMessage && (
            <button
              disabled={isCommitting || isReadingFiles}
              onClick={handleExecuteImport}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#FF5500] hover:bg-[#E04B00] rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isCommitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar {stagedFiles.length} Arquivos</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
