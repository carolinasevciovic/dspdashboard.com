import { ChartRecord, CoverItem, DSPAction, DSPPlatform, HighlightRecord, ImportedDocument, WorkedReleaseRecord } from '../types';
import {
  INITIAL_ACTION_TYPES,
  INITIAL_ACTIONS,
  INITIAL_CHARTS,
  INITIAL_COVERS,
  INITIAL_DOCUMENTS,
  INITIAL_HIGHLIGHTS,
  INITIAL_WORKED_RELEASES,
} from './seedData';

const STORAGE_KEYS = {
  DOCUMENTS: 'dsph_documents_v1',
  HIGHLIGHTS: 'dsph_highlights_v1',
  CHARTS: 'dsph_charts_v1',
  COVERS: 'dsph_covers_v1',
  ACTIONS: 'dsph_actions_v1',
  ACTION_TYPES: 'dsph_action_types_v1',
  WORKED_RELEASES: 'dsph_worked_releases_v1',
  INITIALIZED: 'dsph_initialized_v1',
};

// Safe JSON loader
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (err) {
    console.error(`Error loading from localStorage for key ${key}:`, err);
    return fallback;
  }
}

// Safe JSON saver
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`localStorage quota exceeded or failed for key ${key}:`, err);
  }
}

export interface AppDataState {
  documents: ImportedDocument[];
  highlights: HighlightRecord[];
  charts: ChartRecord[];
  covers: CoverItem[];
  actions: DSPAction[];
  actionTypes: string[];
  workedReleases: WorkedReleaseRecord[];
}

export function initializeData(): AppDataState {
  const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!isInit) {
    saveToStorage(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
    saveToStorage(STORAGE_KEYS.HIGHLIGHTS, INITIAL_HIGHLIGHTS);
    saveToStorage(STORAGE_KEYS.CHARTS, INITIAL_CHARTS);
    saveToStorage(STORAGE_KEYS.COVERS, INITIAL_COVERS);
    saveToStorage(STORAGE_KEYS.ACTIONS, INITIAL_ACTIONS);
    saveToStorage(STORAGE_KEYS.ACTION_TYPES, INITIAL_ACTION_TYPES);
    saveToStorage(STORAGE_KEYS.WORKED_RELEASES, INITIAL_WORKED_RELEASES);
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');

    return {
      documents: INITIAL_DOCUMENTS,
      highlights: INITIAL_HIGHLIGHTS,
      charts: INITIAL_CHARTS,
      covers: INITIAL_COVERS,
      actions: INITIAL_ACTIONS,
      actionTypes: INITIAL_ACTION_TYPES,
      workedReleases: INITIAL_WORKED_RELEASES,
    };
  }

  const loadedHighlights = loadFromStorage<HighlightRecord[]>(STORAGE_KEYS.HIGHLIGHTS, INITIAL_HIGHLIGHTS);
  const existingHlIds = new Set(loadedHighlights.map((h) => h.id));
  const missingSeeds = INITIAL_HIGHLIGHTS.filter((h) => !existingHlIds.has(h.id));
  const finalHighlights = missingSeeds.length > 0 ? [...loadedHighlights, ...missingSeeds] : loadedHighlights;
  if (missingSeeds.length > 0) {
    saveToStorage(STORAGE_KEYS.HIGHLIGHTS, finalHighlights);
  }

  return {
    documents: loadFromStorage<ImportedDocument[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS),
    highlights: finalHighlights,
    charts: loadFromStorage<ChartRecord[]>(STORAGE_KEYS.CHARTS, INITIAL_CHARTS),
    covers: loadFromStorage<CoverItem[]>(STORAGE_KEYS.COVERS, INITIAL_COVERS),
    actions: loadFromStorage<DSPAction[]>(STORAGE_KEYS.ACTIONS, INITIAL_ACTIONS),
    actionTypes: loadFromStorage<string[]>(STORAGE_KEYS.ACTION_TYPES, INITIAL_ACTION_TYPES),
    workedReleases: loadFromStorage<WorkedReleaseRecord[]>(STORAGE_KEYS.WORKED_RELEASES, INITIAL_WORKED_RELEASES),
  };
}

export function persistState(state: AppDataState): void {
  saveToStorage(STORAGE_KEYS.DOCUMENTS, state.documents);
  saveToStorage(STORAGE_KEYS.HIGHLIGHTS, state.highlights);
  saveToStorage(STORAGE_KEYS.CHARTS, state.charts);
  saveToStorage(STORAGE_KEYS.COVERS, state.covers);
  saveToStorage(STORAGE_KEYS.ACTIONS, state.actions);
  saveToStorage(STORAGE_KEYS.ACTION_TYPES, state.actionTypes);
  saveToStorage(STORAGE_KEYS.WORKED_RELEASES, state.workedReleases);
}

export function resetAllToSeed(): AppDataState {
  saveToStorage(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
  saveToStorage(STORAGE_KEYS.HIGHLIGHTS, INITIAL_HIGHLIGHTS);
  saveToStorage(STORAGE_KEYS.CHARTS, INITIAL_CHARTS);
  saveToStorage(STORAGE_KEYS.COVERS, INITIAL_COVERS);
  saveToStorage(STORAGE_KEYS.ACTIONS, INITIAL_ACTIONS);
  saveToStorage(STORAGE_KEYS.ACTION_TYPES, INITIAL_ACTION_TYPES);
  saveToStorage(STORAGE_KEYS.WORKED_RELEASES, INITIAL_WORKED_RELEASES);
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');

  return {
    documents: INITIAL_DOCUMENTS,
    highlights: INITIAL_HIGHLIGHTS,
    charts: INITIAL_CHARTS,
    covers: INITIAL_COVERS,
    actions: INITIAL_ACTIONS,
    actionTypes: INITIAL_ACTION_TYPES,
    workedReleases: INITIAL_WORKED_RELEASES,
  };
}

export function clearDatabase(): AppDataState {
  const empty: AppDataState = {
    documents: [],
    highlights: [],
    charts: [],
    covers: [],
    actions: [],
    actionTypes: INITIAL_ACTION_TYPES,
    workedReleases: [],
  };
  persistState(empty);
  return empty;
}

