import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

function createStorage(): Storage {
  const storage = new Map<string, string>();

  return {
    get length() {
      return storage.size;
    },
    clear() {
      storage.clear();
    },
    getItem(key: string) {
      return storage.has(key) ? storage.get(key)! : null;
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
  };
}

const localStorageMock = createStorage();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageMock,
  });
}

afterEach(() => {
  cleanup();
  globalThis.localStorage.clear();
});

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

// jsdom doesn't implement the native Popover API (showPopover/hidePopover/
// the `:popover-open` pseudo-class) that Astryx's usePopover relies on
// (Phase 14 swizzle spike) — same shim Astryx's own component tests use.
if (typeof HTMLElement !== "undefined") {
  HTMLElement.prototype.showPopover ??= function (this: HTMLElement) {
    this.setAttribute("popover-open", "");
    const event = new Event("toggle", { bubbles: false });
    Object.defineProperty(event, "newState", { value: "open" });
    this.dispatchEvent(event);
  };
  HTMLElement.prototype.hidePopover ??= function (this: HTMLElement) {
    this.removeAttribute("popover-open");
    const event = new Event("toggle", { bubbles: false });
    Object.defineProperty(event, "newState", { value: "closed" });
    this.dispatchEvent(event);
  };
  const originalMatches = HTMLElement.prototype.matches;
  HTMLElement.prototype.matches = function (
    this: HTMLElement,
    selector: string
  ): boolean {
    if (selector === ":popover-open") {
      return this.hasAttribute("popover-open");
    }
    return originalMatches.call(this, selector);
  };
}

// jsdom doesn't implement <dialog>'s showModal/close (Astryx's Dialog
// primitive, Phase 15 migration) — same shim Astryx's own Dialog.test.tsx uses.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal ??= function (
    this: HTMLDialogElement
  ) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}
