import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedScript, ScriptOutput, ScriptError } from '../types';
import { SCRIPT_TEMPLATES } from '../constants/scriptTemplates';
import { scriptEngine } from '../services/scriptEngine';
import type { Candle } from '../types';
import { alertService } from '../services/alerts';

const STORAGE_KEY = '@tradeforge/scripts';

interface ScriptState {
  scripts: SavedScript[];
  activeScriptId: string | null;
  /** Unsaved buffer in the editor */
  draftSource: string;
  draftName: string;
  lastOutput: ScriptOutput | null;
  isRunning: boolean;
  showEditor: boolean;

  hydrate: () => Promise<void>;
  setShowEditor: (v: boolean) => void;
  setDraftSource: (s: string) => void;
  setDraftName: (n: string) => void;
  loadTemplate: (key: keyof typeof SCRIPT_TEMPLATES) => void;
  loadScript: (id: string) => void;
  saveDraft: () => Promise<SavedScript>;
  deleteScript: (id: string) => Promise<void>;
  runDraft: (candles: Candle[], symbol: string, timeframe: string) => ScriptOutput;
  clearOutput: () => void;
}

function uid() {
  return `script_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const useScriptStore = create<ScriptState>((set, get) => ({
  scripts: [],
  activeScriptId: null,
  draftSource: SCRIPT_TEMPLATES.smaCross.source,
  draftName: SCRIPT_TEMPLATES.smaCross.name,
  lastOutput: null,
  isRunning: false,
  showEditor: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const scripts = JSON.parse(raw) as SavedScript[];
        set({ scripts });
        scripts.forEach((s) => alertService.registerScript(s.id, s.source));
      }
    } catch {
      /* ignore */
    }
  },

  setShowEditor: (showEditor) => set({ showEditor }),
  setDraftSource: (draftSource) => set({ draftSource }),
  setDraftName: (draftName) => set({ draftName }),

  loadTemplate: (key) => {
    const t = SCRIPT_TEMPLATES[key];
    set({
      draftSource: t.source,
      draftName: t.name,
      activeScriptId: null,
      lastOutput: null,
    });
  },

  loadScript: (id) => {
    const s = get().scripts.find((x) => x.id === id);
    if (!s) return;
    set({
      activeScriptId: s.id,
      draftSource: s.source,
      draftName: s.name,
      lastOutput: null,
    });
  },

  saveDraft: async () => {
    const { activeScriptId, draftSource, draftName, scripts } = get();
    const now = Date.now();
    let saved: SavedScript;

    if (activeScriptId) {
      const next = scripts.map((s) =>
        s.id === activeScriptId
          ? { ...s, source: draftSource, name: draftName, updatedAt: now }
          : s,
      );
      saved = next.find((s) => s.id === activeScriptId)!;
      set({ scripts: next });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      saved = {
        id: uid(),
        name: draftName || 'Untitled',
        description: '',
        source: draftSource,
        createdAt: now,
        updatedAt: now,
        appliedSymbols: [],
        enabled: true,
      };
      const next = [...scripts, saved];
      set({ scripts: next, activeScriptId: saved.id });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }

    alertService.registerScript(saved.id, saved.source);
    return saved;
  },

  deleteScript: async (id) => {
    const next = get().scripts.filter((s) => s.id !== id);
    set({
      scripts: next,
      activeScriptId: get().activeScriptId === id ? null : get().activeScriptId,
    });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  runDraft: (candles, symbol, timeframe) => {
    set({ isRunning: true });
    const output = scriptEngine.run(get().draftSource, { candles, symbol, timeframe });
    set({ lastOutput: output, isRunning: false });
    return output;
  },

  clearOutput: () => set({ lastOutput: null }),
}));

export type { ScriptError };
