import { create } from "zustand";
import type * as Monaco from "monaco-editor";
import { Document, Folder, UserSettings, DEFAULT_SETTINGS, DEFAULT_DOCUMENT_BODY } from "@/lib/types";
import { DEFAULT_DOCUMENT_TITLE } from "@/lib/document";

interface AppState {
  // Documents
  documents: Document[];
  currentDocument: Document | null;
  folders: Folder[];
  editorInstance: Monaco.editor.IStandaloneCodeEditor | null;

  // Settings
  settings: UserSettings;
  hasHydrated: boolean;

  // UI State
  sidebarOpen: boolean;
  settingsOpen: boolean;
  shortcutsOpen: boolean;
  commandPaletteOpen: boolean;
  previewVisible: boolean;
  toolbarVisible: boolean;
  zenMode: boolean;
  isDirty: boolean;
  editorScrollPercent: number;
  editorTopLine: number;

  // Document Actions
  createDocument: () => void;
  createImportedDocument: (title: string, body: string) => void;
  selectDocument: (id: string) => void;
  deleteDocument: (id: string) => void;
  updateDocumentBody: (body: string) => void;
  updateDocumentTitle: (title: string) => void;
  setEditorInstance: (editor: Monaco.editor.IStandaloneCodeEditor | null) => void;
  insertMarkdownAtCursor: (markdown: string) => void;

  // Folder & Tag Actions
  createFolder: (name: string) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveDocumentToFolder: (documentId: string, folderId: string | null) => void;
  addTagToDocument: (documentId: string, tag: string) => void;
  removeTagFromDocument: (documentId: string, tag: string) => void;

  // Settings Actions
  updateSettings: (settings: Partial<UserSettings>) => void;

  // UI Actions
  toggleSidebar: () => void;
  toggleSettings: () => void;
  toggleShortcuts: () => void;
  toggleCommandPalette: () => void;
  togglePreview: () => void;
  toggleToolbar: () => void;
  setZenMode: (enabled: boolean) => void;
  setEditorScrollPercent: (percent: number) => void;
  setEditorTopLine: (line: number) => void;

  // Persistence
  hydrate: () => void;
  persist: () => void;
}

const createDefaultDocument = (): Document => ({
  id: Date.now().toString(),
  title: DEFAULT_DOCUMENT_TITLE,
  body: DEFAULT_DOCUMENT_BODY,
  createdAt: new Date().toISOString(),
  folderId: null,
  tags: [],
});

// Documents persisted before Phase 16 lack folderId/tags; normalize on load
// so a pre-migration library hydrates without data loss.
const migrateDocument = (doc: Document): Document => ({
  ...doc,
  folderId: doc.folderId ?? null,
  tags: Array.isArray(doc.tags) ? doc.tags : [],
});

export const useStore = create<AppState>((set, get) => ({
  // Initial State
  documents: [],
  currentDocument: null,
  folders: [],
  editorInstance: null,
  settings: DEFAULT_SETTINGS,
  hasHydrated: false,
  sidebarOpen: false,
  settingsOpen: false,
  shortcutsOpen: false,
  commandPaletteOpen: false,
  previewVisible: true,
  toolbarVisible: true,
  zenMode: false,
  isDirty: false,
  editorScrollPercent: 0,
  editorTopLine: 1,

  // Document Actions
  createDocument: () => {
    const newDoc = createDefaultDocument();
    set((state) => ({
      documents: [...state.documents, newDoc],
      currentDocument: newDoc,
    }));
    get().persist();
  },

  createImportedDocument: (title: string, body: string) => {
    const newDoc = {
      ...createDefaultDocument(),
      title,
      body,
    };

    set((state) => ({
      documents: [...state.documents, newDoc],
      currentDocument: newDoc,
    }));
    get().persist();
  },

  selectDocument: (id: string) => {
    const doc = get().documents.find((d) => d.id === id);
    if (doc) {
      set({ currentDocument: doc });
      get().persist();
    }
  },

  deleteDocument: (id: string) => {
    const { documents, currentDocument } = get();
    const filtered = documents.filter((d) => d.id !== id);

    let newCurrent = currentDocument;
    if (currentDocument?.id === id) {
      newCurrent = filtered[0] || null;
    }

    set({ documents: filtered, currentDocument: newCurrent });
    get().persist();
  },

  updateDocumentBody: (body: string) => {
    const { currentDocument, documents } = get();
    if (!currentDocument) return;

    const updated = { ...currentDocument, body };
    const updatedDocs = documents.map((d) =>
      d.id === currentDocument.id ? updated : d
    );

    set({ currentDocument: updated, documents: updatedDocs, isDirty: true });
  },

  updateDocumentTitle: (title: string) => {
    const { currentDocument, documents } = get();
    if (!currentDocument) return;

    const updated = { ...currentDocument, title };
    const updatedDocs = documents.map((d) =>
      d.id === currentDocument.id ? updated : d
    );

    set({ currentDocument: updated, documents: updatedDocs });
    get().persist();
  },

  setEditorInstance: (editor) => set({ editorInstance: editor }),

  insertMarkdownAtCursor: (markdown: string) => {
    const { editorInstance, currentDocument, documents } = get();

    if (editorInstance) {
      const selection = editorInstance.getSelection();
      if (selection) {
        editorInstance.executeEdits("dillinger-inline-insert", [
          {
            range: selection,
            text: markdown,
            forceMoveMarkers: true,
          },
        ]);
        editorInstance.focus();
        return;
      }
    }

    if (!currentDocument) return;

    const updated = { ...currentDocument, body: `${currentDocument.body}${markdown}` };
    const updatedDocs = documents.map((doc) =>
      doc.id === currentDocument.id ? updated : doc
    );

    set({ currentDocument: updated, documents: updatedDocs });
    get().persist();
  },

  // Folder & Tag Actions
  createFolder: (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const folder: Folder = {
      id: `folder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ folders: [...state.folders, folder] }));
    get().persist();
  },

  renameFolder: (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? { ...f, name: trimmed } : f)),
    }));
    get().persist();
  },

  deleteFolder: (id: string) => {
    const { folders, documents, currentDocument } = get();

    // Documents in the deleted folder become unfiled — never deleted.
    const updatedDocs = documents.map((d) =>
      d.folderId === id ? { ...d, folderId: null } : d
    );
    const updatedCurrent =
      currentDocument?.folderId === id
        ? { ...currentDocument, folderId: null }
        : currentDocument;

    set({
      folders: folders.filter((f) => f.id !== id),
      documents: updatedDocs,
      currentDocument: updatedCurrent,
    });
    get().persist();
  },

  moveDocumentToFolder: (documentId: string, folderId: string | null) => {
    const { documents, currentDocument, folders } = get();
    if (folderId !== null && !folders.some((f) => f.id === folderId)) return;

    const updatedDocs = documents.map((d) =>
      d.id === documentId ? { ...d, folderId } : d
    );
    const updatedCurrent =
      currentDocument?.id === documentId
        ? { ...currentDocument, folderId }
        : currentDocument;

    set({ documents: updatedDocs, currentDocument: updatedCurrent });
    get().persist();
  },

  addTagToDocument: (documentId: string, tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;

    const { documents, currentDocument } = get();
    const updatedDocs = documents.map((d) =>
      d.id === documentId && !d.tags.includes(trimmed)
        ? { ...d, tags: [...d.tags, trimmed] }
        : d
    );
    const updatedCurrent =
      currentDocument?.id === documentId && !currentDocument.tags.includes(trimmed)
        ? { ...currentDocument, tags: [...currentDocument.tags, trimmed] }
        : currentDocument;

    set({ documents: updatedDocs, currentDocument: updatedCurrent });
    get().persist();
  },

  removeTagFromDocument: (documentId: string, tag: string) => {
    const { documents, currentDocument } = get();
    const updatedDocs = documents.map((d) =>
      d.id === documentId ? { ...d, tags: d.tags.filter((t) => t !== tag) } : d
    );
    const updatedCurrent =
      currentDocument?.id === documentId
        ? { ...currentDocument, tags: currentDocument.tags.filter((t) => t !== tag) }
        : currentDocument;

    set({ documents: updatedDocs, currentDocument: updatedCurrent });
    get().persist();
  },

  // Settings Actions
  updateSettings: (newSettings: Partial<UserSettings>) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
    get().persist();
  },

  // UI Actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),
  toggleShortcuts: () => set((state) => ({ shortcutsOpen: !state.shortcutsOpen })),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  togglePreview: () => set((state) => ({ previewVisible: !state.previewVisible })),
  toggleToolbar: () => set((state) => ({ toolbarVisible: !state.toolbarVisible })),
  setZenMode: (enabled) => set({ zenMode: enabled }),
  setEditorScrollPercent: (percent) => set({ editorScrollPercent: percent }),
  setEditorTopLine: (line) => set({ editorTopLine: line }),

  // Persistence
  hydrate: () => {
    if (typeof window === "undefined") return;

    try {
      const filesJson = localStorage.getItem("files");
      const currentJson = localStorage.getItem("currentDocument");
      const foldersJson = localStorage.getItem("folders");
      const settingsJson = localStorage.getItem("profileV3");

      const isFirstVisit = !filesJson;
      let documents: Document[] = filesJson
        ? (JSON.parse(filesJson) as Document[]).map(migrateDocument)
        : [];
      let currentDocument: Document | null = currentJson ? JSON.parse(currentJson) : null;
      const folders: Folder[] = foldersJson ? JSON.parse(foldersJson) : [];
      const settings: UserSettings = settingsJson
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) }
        : DEFAULT_SETTINGS;

      // Ensure at least one document exists
      if (documents.length === 0) {
        const defaultDoc = createDefaultDocument();
        documents = [defaultDoc];
        currentDocument = defaultDoc;
      }

      // Ensure currentDocument is valid; re-point at the migrated copy in
      // documents so a pre-Phase-16 stored currentDocument also gets
      // folderId/tags defaults.
      currentDocument =
        documents.find((d) => d.id === currentDocument?.id) ?? documents[0];

      set({
        documents,
        currentDocument,
        folders,
        settings,
        hasHydrated: true,
        isDirty: false,
        sidebarOpen: isFirstVisit,
      });
    } catch (e) {
      console.error("Failed to hydrate state:", e);
      set({ hasHydrated: true });
    }
  },

  persist: () => {
    if (typeof window === "undefined") return;

    const { documents, currentDocument, folders, settings } = get();

    try {
      localStorage.setItem("files", JSON.stringify(documents));
      localStorage.setItem("currentDocument", JSON.stringify(currentDocument));
      localStorage.setItem("folders", JSON.stringify(folders));
      localStorage.setItem("profileV3", JSON.stringify(settings));
      set({ isDirty: false });
    } catch (e) {
      console.error("Failed to persist state:", e);
    }
  },
}));
