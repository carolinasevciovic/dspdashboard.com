import React, { useState } from 'react';
import { Calendar, Check, FileText, X } from 'lucide-react';
import { ImportedDocument } from '../types';

interface PeriodEditModalProps {
  document: ImportedDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (docId: string, updatedName: string, newPeriod: string) => void;
}

export const PeriodEditModal: React.FC<PeriodEditModalProps> = ({
  document,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !document) return null;

  const [fileName, setFileName] = useState(document.fileName);
  const [periodString, setPeriodString] = useState(
    document.isPeriodIdentified ? document.identifiedPeriod : ''
  );
  const [presetStartDate, setPresetStartDate] = useState('');
  const [presetEndDate, setPresetEndDate] = useState('');

  const handleApplyPresetDates = () => {
    if (presetStartDate && presetEndDate) {
      const [y1, m1, d1] = presetStartDate.split('-');
      const [y2, m2, d2] = presetEndDate.split('-');
      setPeriodString(`${d1}/${m1}/${y1} a ${d2}/${m2}/${y2}`);
    }
  };

  const handleSave = () => {
    const finalPeriod = periodString.trim() || 'Período Não Identificado';
    onSave(document.id, fileName.trim(), finalPeriod);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-[#FF5500]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Corrigir Documento & Período
              </h2>
              <p className="text-xs text-slate-500">
                Atualize o período para que o arquivo apareça corretamente nos gráficos e relatórios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Documento / Arquivo
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full text-xs font-medium pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#FF5500]/30 focus:border-[#FF5500]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Período do Documento (Semana)
            </label>
            <input
              type="text"
              placeholder="Ex: 14/10/2024 a 20/10/2024 ou Semana 42/2024"
              value={periodString}
              onChange={(e) => setPeriodString(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#FF5500]/30 focus:border-[#FF5500]"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Este texto será exibido no seletor de semana de Charts, filtros e relatórios.
            </p>
          </div>

          {/* Quick Date Range Helper */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 block">
              Assistente de Datas (Preencher automático):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">Início:</span>
                <input
                  type="date"
                  value={presetStartDate}
                  onChange={(e) => setPresetStartDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md px-2 py-1 bg-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">Fim:</span>
                <input
                  type="date"
                  value={presetEndDate}
                  onChange={(e) => setPresetEndDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md px-2 py-1 bg-white"
                />
              </div>
            </div>
            {presetStartDate && presetEndDate && (
              <button
                type="button"
                onClick={handleApplyPresetDates}
                className="text-xs text-[#FF5500] hover:text-[#E04B00] font-semibold underline pt-1 block"
              >
                Gerar formato "DD/MM/AAAA a DD/MM/AAAA"
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#FF5500] hover:bg-[#E04B00] rounded-lg transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Salvar Correção
          </button>
        </div>
      </div>
    </div>
  );
};
