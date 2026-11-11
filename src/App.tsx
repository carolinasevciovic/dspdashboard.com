/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ImportModal } from './components/ImportModal';
import { PeriodEditModal } from './components/PeriodEditModal';
import {
  ActiveTab,
  ChartRecord,
  CoverItem,
  DSPAction,
  DSPPlatform,
  HighlightRecord,
  ImportedDocument,
  WorkedReleaseRecord,
} from './types';
import {
  clearDatabase,
  initializeData,
  persistState,
  resetAllToSeed,
} from './utils/storage';
import { AcoesView } from './views/AcoesView';
import { BaseAnaliticaView } from './views/BaseAnaliticaView';
import { CapasView } from './views/CapasView';
import { ChartsView } from './views/ChartsView';
import { ComparativoView } from './views/ComparativoView';
import { DestaquesView } from './views/DestaquesView';
import { ExcluirDadosView } from './views/ExcluirDadosView';
import { LancamentosTrabalhadosView } from './views/LancamentosTrabalhadosView';
import { PdfReportView } from './views/PdfReportView';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('charts');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ImportedDocument | null>(null);

  // App Data State
  const [documents, setDocuments] = useState<ImportedDocument[]>([]);
  const [highlights, setHighlights] = useState<HighlightRecord[]>([]);
  const [charts, setCharts] = useState<ChartRecord[]>([]);
  const [covers, setCovers] = useState<CoverItem[]>([]);
  const [actions, setActions] = useState<DSPAction[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [workedReleases, setWorkedReleases] = useState<WorkedReleaseRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    const initial = initializeData();
    setDocuments(initial.documents);
    setHighlights(initial.highlights);
    setCharts(initial.charts);
    setCovers(initial.covers);
    setActions(initial.actions);
    setActionTypes(initial.actionTypes);
    setWorkedReleases(initial.workedReleases || []);
    setIsLoaded(true);
  }, []);

  // Helper to persist whenever data changes
  const saveState = (
    nextDocs: ImportedDocument[],
    nextHighlights: HighlightRecord[],
    nextCharts: ChartRecord[],
    nextCovers: CoverItem[],
    nextActions: DSPAction[],
    nextActionTypes: string[],
    nextWorkedReleases?: WorkedReleaseRecord[]
  ) => {
    const finalWorkedReleases = nextWorkedReleases !== undefined ? nextWorkedReleases : workedReleases;

    setDocuments(nextDocs);
    setHighlights(nextHighlights);
    setCharts(nextCharts);
    setCovers(nextCovers);
    setActions(nextActions);
    setActionTypes(nextActionTypes);
    setWorkedReleases(finalWorkedReleases);

    persistState({
      documents: nextDocs,
      highlights: nextHighlights,
      charts: nextCharts,
      covers: nextCovers,
      actions: nextActions,
      actionTypes: nextActionTypes,
      workedReleases: finalWorkedReleases,
    });
  };

  // 1. Batch Import Complete
  const handleImportComplete = (
    newDocs: ImportedDocument[],
    newHighlights: HighlightRecord[],
    newCharts: ChartRecord[]
  ) => {
    // Preserve existing documents as separate documents
    const updatedDocs = [...newDocs, ...documents];
    const updatedHighlights = [...newHighlights, ...highlights];
    const updatedCharts = [...newCharts, ...charts];

    saveState(updatedDocs, updatedHighlights, updatedCharts, covers, actions, actionTypes);
  };

  // 2. Edit Document Name & Period
  const handleSavePeriod = (docId: string, updatedName: string, newPeriod: string) => {
    const isIdentified = newPeriod !== 'Período Não Identificado' && newPeriod.trim().length > 0;

    const updatedDocs = documents.map((d) => {
      if (d.id === docId) {
        return {
          ...d,
          fileName: updatedName,
          identifiedPeriod: newPeriod,
          isPeriodIdentified: isIdentified,
        };
      }
      return d;
    });

    // Cascade date to associated chart rows so they appear in filters and reports
    const updatedCharts = charts.map((c) => {
      if (c.documentId === docId) {
        return {
          ...c,
          date: newPeriod,
        };
      }
      return c;
    });

    saveState(updatedDocs, highlights, updatedCharts, covers, actions, actionTypes);
  };

  // 3b. Add Manual Highlight
  const handleAddHighlight = (newHighlight: HighlightRecord) => {
    const updated = [newHighlight, ...highlights];
    saveState(documents, updated, charts, covers, actions, actionTypes);
  };

  // 3c. Delete Individual Highlight
  const handleDeleteHighlight = (highlightId: string) => {
    const updated = highlights.filter((h) => h.id !== highlightId);
    saveState(documents, updated, charts, covers, actions, actionTypes);
  };

  // 3d. Delete Individual Chart Record
  const handleDeleteChart = (chartId: string) => {
    const updated = charts.filter((c) => c.id !== chartId);
    saveState(documents, highlights, updated, covers, actions, actionTypes);
  };

  // 3. Delete Document
  const handleDeleteDocument = (docId: string) => {
    const updatedDocs = documents.filter((d) => d.id !== docId);
    const updatedHighlights = highlights.filter((h) => h.documentId !== docId);
    const updatedCharts = charts.filter((c) => c.documentId !== docId);

    saveState(updatedDocs, updatedHighlights, updatedCharts, covers, actions, actionTypes);
  };

  const handleDeleteDocuments = (docIds: string[]) => {
    const docIdsSet = new Set(docIds);
    const updatedDocs = documents.filter((d) => !docIdsSet.has(d.id));
    const updatedHighlights = highlights.filter((h) => !docIdsSet.has(h.documentId));
    const updatedCharts = charts.filter((c) => !docIdsSet.has(c.documentId));

    saveState(updatedDocs, updatedHighlights, updatedCharts, covers, actions, actionTypes);
  };

  // 4. Delete Highlights by Date
  const handleDeleteHighlightsByDate = (dateString: string) => {
    const remainingHighlights = highlights.filter((h) => h.data !== dateString);
    saveState(documents, remainingHighlights, charts, covers, actions, actionTypes);
  };

  const handleDeleteHighlightsByDates = (dateStrings: string[]) => {
    const datesSet = new Set(dateStrings);
    const remainingHighlights = highlights.filter((h) => !datesSet.has(h.data));
    saveState(documents, remainingHighlights, charts, covers, actions, actionTypes);
  };

  // 5. Delete Charts by Platform and Period
  const handleDeleteChartsByPlatformAndPeriod = (platform: DSPPlatform, period: string) => {
    const remainingCharts = charts.filter(
      (c) => !(c.dsp === platform && c.date === period)
    );
    saveState(documents, highlights, remainingCharts, covers, actions, actionTypes);
  };

  const handleDeleteChartsByPlatformAndPeriods = (items: { platform: DSPPlatform; period: string }[]) => {
    const remainingCharts = charts.filter(
      (c) => !items.some((item) => item.platform === c.dsp && item.period === c.date)
    );
    saveState(documents, highlights, remainingCharts, covers, actions, actionTypes);
  };

  const handleDeleteHighlights = (ids: string[]) => {
    const idsSet = new Set(ids);
    const remaining = highlights.filter((h) => !idsSet.has(h.id));
    saveState(documents, remaining, charts, covers, actions, actionTypes);
  };

  const handleDeleteCharts = (ids: string[]) => {
    const idsSet = new Set(ids);
    const remaining = charts.filter((c) => !idsSet.has(c.id));
    saveState(documents, highlights, remaining, covers, actions, actionTypes);
  };

  // 6. Cover Management
  const handleAddCover = (newCover: CoverItem) => {
    const updatedCovers = [newCover, ...covers];
    saveState(documents, highlights, charts, updatedCovers, actions, actionTypes);
  };

  const handleLinkOrAddCoverToHighlight = (
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
  ) => {
    const existingIndex = covers.findIndex((c) => c.upc && c.upc.trim() === coverData.upc.trim());
    let updatedCovers = [...covers];

    const newCoverItem: CoverItem = {
      id: existingIndex >= 0 ? covers[existingIndex].id : `cov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      upc: coverData.upc.trim(),
      artista: coverData.artista,
      titulo: coverData.titulo,
      imageUrl: coverData.imageUrl,
      dataDestaque: coverData.dataDestaque,
      dsp: coverData.dsp,
      fileName: `${coverData.upc}_capa.jpg`,
      bu: coverData.bu,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      updatedCovers[existingIndex] = newCoverItem;
    } else {
      updatedCovers = [newCoverItem, ...updatedCovers];
    }

    // Ensure the highlight itself has the matching UPC so it links immediately
    const updatedHighlights = highlights.map((h) => {
      if (h.id === highlightId) {
        return {
          ...h,
          upc: coverData.upc.trim(),
        };
      }
      return h;
    });

    saveState(documents, updatedHighlights, charts, updatedCovers, actions, actionTypes);
  };

  const handleBatchAddCovers = (newCovers: CoverItem[]) => {
    const updatedCovers = [...newCovers, ...covers];
    saveState(documents, highlights, charts, updatedCovers, actions, actionTypes);
  };

  const handleDeleteCover = (coverId: string) => {
    const updatedCovers = covers.filter((c) => c.id !== coverId);
    saveState(documents, highlights, charts, updatedCovers, actions, actionTypes);
  };

  // 7. Actions Management
  const handleAddAction = (newAction: DSPAction) => {
    const updatedActions = [newAction, ...actions];
    saveState(documents, highlights, charts, covers, updatedActions, actionTypes);
  };

  const handleDeleteAction = (actionId: string) => {
    const updatedActions = actions.filter((a) => a.id !== actionId);
    saveState(documents, highlights, charts, covers, updatedActions, actionTypes);
  };

  const handleAddActionType = (newType: string) => {
    if (!actionTypes.includes(newType)) {
      const updatedTypes = [...actionTypes, newType];
      saveState(documents, highlights, charts, covers, actions, updatedTypes);
    }
  };

  // 8. Worked Releases Management
  const handleAddWorkedRelease = (newRelease: WorkedReleaseRecord) => {
    const updated = [newRelease, ...workedReleases];
    saveState(documents, highlights, charts, covers, actions, actionTypes, updated);
  };

  const handleBatchAddWorkedReleases = (newReleases: WorkedReleaseRecord[]) => {
    const updated = [...newReleases, ...workedReleases];
    saveState(documents, highlights, charts, covers, actions, actionTypes, updated);
  };

  const handleUpdateWorkedRelease = (updatedRelease: WorkedReleaseRecord) => {
    const updated = workedReleases.map((r) => (r.id === updatedRelease.id ? updatedRelease : r));
    saveState(documents, highlights, charts, covers, actions, actionTypes, updated);
  };

  const handleDeleteWorkedRelease = (releaseId: string) => {
    const updated = workedReleases.filter((r) => r.id !== releaseId);
    saveState(documents, highlights, charts, covers, actions, actionTypes, updated);
  };

  // 9. Global Resets
  const handleResetSeed = () => {
    const seed = resetAllToSeed();
    setDocuments(seed.documents);
    setHighlights(seed.highlights);
    setCharts(seed.charts);
    setCovers(seed.covers);
    setActions(seed.actions);
    setActionTypes(seed.actionTypes);
    setWorkedReleases(seed.workedReleases);
  };

  const handleClearAll = () => {
    const empty = clearDatabase();
    setDocuments(empty.documents);
    setHighlights(empty.highlights);
    setCharts(empty.charts);
    setCovers(empty.covers);
    setActions(empty.actions);
    setActionTypes(empty.actionTypes);
    setWorkedReleases(empty.workedReleases);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-xs font-semibold">
        Carregando DSP Highlights...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenImport={() => setIsImportModalOpen(true)}
        documentCount={documents.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'destaques' && (
          <DestaquesView
            highlights={highlights}
            covers={covers}
            onAddCover={() => setActiveTab('capas')}
            onOpenBulkImport={() => setIsImportModalOpen(true)}
            onAddManualHighlight={handleAddHighlight}
            onAddCoverToHighlight={handleLinkOrAddCoverToHighlight}
          />
        )}

        {activeTab === 'charts' && (
          <ChartsView
            documents={documents}
            charts={charts}
            onOpenImport={() => setIsImportModalOpen(true)}
            onEditPeriod={(doc) => setEditingDoc(doc)}
            onDeleteChart={handleDeleteChart}
          />
        )}

        {activeTab === 'comparativo' && <ComparativoView charts={charts} />}

        {activeTab === 'lancamentos' && (
          <LancamentosTrabalhadosView
            workedReleases={workedReleases}
            highlights={highlights}
            onAddWorkedRelease={handleAddWorkedRelease}
            onBatchAddWorkedReleases={handleBatchAddWorkedReleases}
            onUpdateWorkedRelease={handleUpdateWorkedRelease}
            onDeleteWorkedRelease={handleDeleteWorkedRelease}
            onNavigateToDestaques={() => setActiveTab('destaques')}
          />
        )}

        {activeTab === 'acoes' && (
          <AcoesView
            actions={actions}
            actionTypes={actionTypes}
            onAddAction={handleAddAction}
            onDeleteAction={handleDeleteAction}
            onAddActionType={handleAddActionType}
          />
        )}

        {activeTab === 'capas' && (
          <CapasView
            covers={covers}
            highlights={highlights}
            onAddCover={handleAddCover}
            onBatchAddCovers={handleBatchAddCovers}
            onDeleteCover={handleDeleteCover}
          />
        )}

        {activeTab === 'relatorio' && (
          <PdfReportView
            highlights={highlights}
            charts={charts}
            actions={actions}
            covers={covers}
          />
        )}

        {activeTab === 'analitica' && (
          <BaseAnaliticaView
            highlights={highlights}
            charts={charts}
            actions={actions}
            onDeleteHighlight={handleDeleteHighlight}
            onDeleteChart={handleDeleteChart}
            onDeleteAction={handleDeleteAction}
          />
        )}

        {activeTab === 'excluir' && (
          <ExcluirDadosView
            documents={documents}
            highlights={highlights}
            charts={charts}
            onDeleteDocument={handleDeleteDocument}
            onDeleteDocuments={handleDeleteDocuments}
            onDeleteHighlightsByDate={handleDeleteHighlightsByDate}
            onDeleteHighlightsByDates={handleDeleteHighlightsByDates}
            onDeleteChartsByPlatformAndPeriod={handleDeleteChartsByPlatformAndPeriod}
            onDeleteChartsByPlatformAndPeriods={handleDeleteChartsByPlatformAndPeriods}
            onDeleteHighlight={handleDeleteHighlight}
            onDeleteHighlights={handleDeleteHighlights}
            onDeleteChart={handleDeleteChart}
            onDeleteCharts={handleDeleteCharts}
            onEditPeriod={(doc) => setEditingDoc(doc)}
            onResetSeed={handleResetSeed}
            onClearAll={handleClearAll}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-slate-200 bg-white py-4 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#FF5500]">ONErpm</span>
            <span>· DSP Highlights Intelligence</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Spotify · Deezer · Amazon Music · Apple Music · YouTube Music · Shazam Discovery
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
        existingPeriods={Array.from(
          new Set([
            ...documents.map((d) => d.identifiedPeriod),
            ...charts.map((c) => c.date),
            ...highlights.map((h) => h.data),
          ])
        ).filter(Boolean)}
      />

      <PeriodEditModal
        isOpen={editingDoc !== null}
        document={editingDoc}
        onClose={() => setEditingDoc(null)}
        onSave={handleSavePeriod}
      />
    </div>
  );
}
