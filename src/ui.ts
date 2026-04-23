import {
  GameCatalogResult,
  GameSession,
  HubUiAdapter,
  PlayRoomFloatingLauncherConfig,
  PlayRoomFloatingPosition,
  PlayRoomLauncherMode,
  PlayRoomLocale,
  PlayRoomLocaleMessages,
  PlayRoomLocaleOption,
  PlayRoomTheme,
  PlayRoomThemeColors,
  PlayRoomUiPersistenceConfig,
  RegisteredGameMeta,
  ResizableModalConfig
} from "./types.js";

interface BasicListUiAdapterOptions {
  defaultStartMode?: "inline" | "modal";
  draggableModal?: boolean;
  resizableModal?: ResizableModalConfig;
  launcher?: PlayRoomFloatingLauncherConfig;
  persistence?: PlayRoomUiPersistenceConfig;
  locale?: PlayRoomLocale;
  localeOptions?: PlayRoomLocaleOption[];
  localeMessages?: PlayRoomLocaleMessages;
  subscribeLocale?: (listener: (locale: PlayRoomLocale) => void) => void | (() => void);
  onLocaleChange?: (locale: PlayRoomLocale) => void;
  showLocaleSwitcher?: boolean;
  theme?: PlayRoomTheme;
  subscribeTheme?: (listener: (theme: PlayRoomTheme) => void) => void | (() => void);
  onThemeChange?: (theme: PlayRoomTheme) => void;
  showThemeSwitcher?: boolean;
  themeColors?: PlayRoomThemeColors;
}

interface ActiveGameRuntime {
  meta: RegisteredGameMeta;
  session: GameSession | null;
  host: HTMLElement;
  mode: "inline" | "modal";
  minimized: boolean;
  modalOverlay: HTMLElement | null;
  modalPanel: HTMLElement | null;
  modalContent: HTMLElement | null;
  applyModalTheme: (() => void) | null;
}

interface PersistedUiState {
  activeGameId?: string;
  mode?: "inline" | "modal";
  minimized?: boolean;
  modal?: {
    width?: string;
    height?: string;
    left?: string;
    top?: string;
    fullscreen?: boolean;
  };
  floatingOpen?: boolean;
}

const CORE_TRANSLATIONS: PlayRoomLocaleMessages = {
  en: {
    title: "PlayRoom",
    subtitle: "Take five, reset your mind, and jump back in when you are ready.",
    createdBy: "Created by ZPMLabs",
    searchPlaceholder: "Search games",
    activeLabel: "Active:",
    restoreGame: "Restore active game",
    openModal: "Open Modal",
    openInline: "Open Inline",
    fullscreen: "Fullscreen",
    minimize: "Minimize",
    close: "Close",
    noGames: "No games match current filters.",
    tapToLaunch: "Tap to launch",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    english: "English",
    serbian: "Српски"
  },
  sr: {
    title: "PlayRoom",
    subtitle: "Predahni kratko, osveži fokus i vrati se kada si spreman.",
    createdBy: "Napravio ZPMLabs",
    searchPlaceholder: "Pretraži igre",
    activeLabel: "Aktivno:",
    restoreGame: "Vrati aktivnu igru",
    openModal: "Otvori modal",
    openInline: "Otvori inline",
    fullscreen: "Ceo ekran",
    minimize: "Umanji",
    close: "Zatvori",
    noGames: "Nema igara za trenutno izabrane filtere.",
    tapToLaunch: "Pokreni igru",
    language: "Jezik",
    theme: "Tema",
    light: "Svetla",
    dark: "Tamna",
    english: "English",
    serbian: "Српски"
  }
};

function toCssMeasurement(value: string | number | undefined, fallback: string): string {
  if (typeof value === "number") {
    return `${value}px`;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return fallback;
}

function normalizeLocale(value: string | undefined): PlayRoomLocale {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized.length > 0 ? normalized : "en";
}

function normalizeTheme(value: string | undefined): PlayRoomTheme {
  return value === "dark" ? "dark" : "light";
}

function normalizeFloatingPosition(value: string | undefined): PlayRoomFloatingPosition {
  const allowed: PlayRoomFloatingPosition[] = [
    "top-left",
    "top-center",
    "top-right",
    "middle-left",
    "middle-right",
    "bottom-left",
    "bottom-center",
    "bottom-right"
  ];
  return allowed.includes(value as PlayRoomFloatingPosition)
    ? (value as PlayRoomFloatingPosition)
    : "bottom-right";
}

export class BasicListUiAdapter implements HubUiAdapter {
  private readonly defaultStartMode: "inline" | "modal";

  private readonly draggableModal: boolean;

  private readonly resizableModal: ResizableModalConfig;

  private readonly launcher: PlayRoomFloatingLauncherConfig;

  private readonly persistence: PlayRoomUiPersistenceConfig;

  private readonly baseLocale: PlayRoomLocale;

  private readonly localeOptions: PlayRoomLocaleOption[];

  private readonly localeMessages: PlayRoomLocaleMessages;

  private readonly subscribeLocale?: (listener: (locale: PlayRoomLocale) => void) => void | (() => void);

  private readonly onLocaleChange?: (locale: PlayRoomLocale) => void;

  private readonly showLocaleSwitcher: boolean;

  private readonly baseTheme: PlayRoomTheme;

  private readonly subscribeTheme?: (listener: (theme: PlayRoomTheme) => void) => void | (() => void);

  private readonly onThemeChange?: (theme: PlayRoomTheme) => void;

  private readonly showThemeSwitcher: boolean;

  private readonly themeColors: PlayRoomThemeColors;

  constructor(options: BasicListUiAdapterOptions = {}) {
    this.defaultStartMode = options.defaultStartMode ?? "inline";
    this.draggableModal = options.draggableModal ?? true;
    this.resizableModal = options.resizableModal ?? {};
    this.launcher = options.launcher ?? {};
    this.persistence = options.persistence ?? { enabled: true, storageKey: "playroom:ui-state" };
    this.baseLocale = options.locale ?? "en";
    this.localeOptions = options.localeOptions ?? [];
    this.localeMessages = {
      ...CORE_TRANSLATIONS,
      ...(options.localeMessages ?? {})
    };
    this.subscribeLocale = options.subscribeLocale;
    this.onLocaleChange = options.onLocaleChange;
    this.showLocaleSwitcher = options.showLocaleSwitcher ?? true;
    this.baseTheme = options.theme ?? "light";
    this.subscribeTheme = options.subscribeTheme;
    this.onThemeChange = options.onThemeChange;
    this.showThemeSwitcher = options.showThemeSwitcher ?? true;
    this.themeColors = options.themeColors ?? {};
  }

  renderGameBrowser(input: {
    container: HTMLElement;
    catalog: (query?: { search?: string; tags?: string[] }) => GameCatalogResult;
    launch: (gameId: string, options?: { mode?: "inline" | "modal"; container?: HTMLElement }) => Promise<GameSession>;
  }): void {
    const { container, catalog, launch } = input;

    let currentLocale = normalizeLocale(this.baseLocale);
    let currentTheme = normalizeTheme(this.baseTheme);
    const launcherMode: PlayRoomLauncherMode = this.launcher.mode === "floating" ? "floating" : "inline";
    const floatingPosition = normalizeFloatingPosition(this.launcher.position);
    const persistenceEnabled = this.persistence.enabled !== false;
    const persistenceKey = this.persistence.storageKey ?? "playroom:ui-state";
    let floatingOpen = this.launcher.startOpen ?? true;
    let floatingPanel: HTMLElement | null = null;
    let floatingButton: HTMLButtonElement | null = null;

    const resolvedLocaleOptions = (() => {
      const configured = this.localeOptions.length > 0
        ? this.localeOptions.map((option) => ({
            value: normalizeLocale(option.value),
            label: option.label
          }))
        : Object.keys(this.localeMessages).map((localeKey) => ({
            value: normalizeLocale(localeKey),
            label: localeKey.toUpperCase()
          }));

      const deduped = new Map<string, PlayRoomLocaleOption>();
      for (const option of configured) {
        deduped.set(option.value, option);
      }

      if (!deduped.has(currentLocale)) {
        deduped.set(currentLocale, {
          value: currentLocale,
          label: currentLocale.toUpperCase()
        });
      }

      return Array.from(deduped.values());
    })();

    const t = (key: string): string => {
      const localeText = this.localeMessages[currentLocale]?.[key];
      if (localeText) {
        return localeText;
      }

      const englishText = this.localeMessages.en?.[key];
      if (englishText) {
        return englishText;
      }

      return key;
    };

    const readPersistedState = (): PersistedUiState => {
      if (!persistenceEnabled || typeof localStorage === "undefined") {
        return {};
      }

      try {
        const raw = localStorage.getItem(persistenceKey);
        if (!raw) {
          return {};
        }
        const parsed = JSON.parse(raw) as PersistedUiState;
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    };

    const writePersistedState = (state: PersistedUiState): void => {
      if (!persistenceEnabled || typeof localStorage === "undefined") {
        return;
      }

      try {
        localStorage.setItem(persistenceKey, JSON.stringify(state));
      } catch {
        // Ignore storage errors.
      }
    };

    const applyFloatingPlacement = (button: HTMLButtonElement, panel: HTMLElement): void => {
      const gap = 16;
      const offset = 80;

      button.style.top = "";
      button.style.bottom = "";
      button.style.left = "";
      button.style.right = "";
      button.style.transform = "";

      panel.style.top = "";
      panel.style.bottom = "";
      panel.style.left = "";
      panel.style.right = "";
      panel.style.transform = "";

      if (floatingPosition === "top-left") {
        button.style.top = `${gap}px`;
        button.style.left = `${gap}px`;
        panel.style.top = `${offset}px`;
        panel.style.left = `${gap}px`;
      } else if (floatingPosition === "top-center") {
        button.style.top = `${gap}px`;
        button.style.left = "50%";
        button.style.transform = "translateX(-50%)";
        panel.style.top = `${offset}px`;
        panel.style.left = "50%";
        panel.style.transform = "translateX(-50%)";
      } else if (floatingPosition === "top-right") {
        button.style.top = `${gap}px`;
        button.style.right = `${gap}px`;
        panel.style.top = `${offset}px`;
        panel.style.right = `${gap}px`;
      } else if (floatingPosition === "middle-left") {
        button.style.top = "50%";
        button.style.left = `${gap}px`;
        button.style.transform = "translateY(-50%)";
        panel.style.top = "50%";
        panel.style.left = `${offset}px`;
        panel.style.transform = "translateY(-50%)";
      } else if (floatingPosition === "middle-right") {
        button.style.top = "50%";
        button.style.right = `${gap}px`;
        button.style.transform = "translateY(-50%)";
        panel.style.top = "50%";
        panel.style.right = `${offset}px`;
        panel.style.transform = "translateY(-50%)";
      } else if (floatingPosition === "bottom-left") {
        button.style.bottom = `${gap}px`;
        button.style.left = `${gap}px`;
        panel.style.bottom = `${offset}px`;
        panel.style.left = `${gap}px`;
      } else if (floatingPosition === "bottom-center") {
        button.style.bottom = `${gap}px`;
        button.style.left = "50%";
        button.style.transform = "translateX(-50%)";
        panel.style.bottom = `${offset}px`;
        panel.style.left = "50%";
        panel.style.transform = "translateX(-50%)";
      } else {
        button.style.bottom = `${gap}px`;
        button.style.right = `${gap}px`;
        panel.style.bottom = `${offset}px`;
        panel.style.right = `${gap}px`;
      }
    };

    const persistedState = readPersistedState();
    if (typeof persistedState.floatingOpen === "boolean") {
      floatingOpen = persistedState.floatingOpen;
    }

    container.innerHTML = "";
    container.style.position = "relative";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.display = "grid";
    container.style.gridTemplateRows = "auto auto auto auto 1fr";
    container.style.gap = "0.85rem";
    container.style.overflow = "hidden";
    container.style.minHeight = "0";
    container.style.padding = "0.65rem";
    container.style.boxSizing = "border-box";
    container.style.setProperty("--pr-primary", this.themeColors.primary ?? "#1d4ed8");
    container.style.setProperty("--pr-secondary", this.themeColors.secondary ?? "#64748b");

    let activeGame: ActiveGameRuntime | null = null;
    const selectedTags = new Set<string>();
    let isInlineFullscreen = false;
    let isModalFullscreen = false;

    const persistCurrentState = (): void => {
      const next: PersistedUiState = {
        floatingOpen
      };

      if (activeGame) {
        next.activeGameId = activeGame.meta.id;
        next.mode = activeGame.mode;
        next.minimized = activeGame.minimized;

        if (activeGame.mode === "modal" && activeGame.modalPanel) {
          next.modal = {
            width: activeGame.modalPanel.style.width || undefined,
            height: activeGame.modalPanel.style.height || undefined,
            left: activeGame.modalPanel.style.left || undefined,
            top: activeGame.modalPanel.style.top || undefined,
            fullscreen: isModalFullscreen
          };
        }
      }

      writePersistedState(next);
    };

    const heading = document.createElement("div");
    heading.style.display = "flex";
    heading.style.alignItems = "flex-start";
    heading.style.justifyContent = "space-between";
    heading.style.gap = "0.75rem";

    const headingTitle = document.createElement("h2");
    headingTitle.textContent = t("title");
    headingTitle.style.margin = "0";
    headingTitle.style.fontSize = "1.55rem";
    headingTitle.style.lineHeight = "1.05";
    headingTitle.style.color = "var(--pr-title)";

    const headingSubtitle = document.createElement("p");
    headingSubtitle.textContent = t("subtitle");
    headingSubtitle.style.margin = "0.1rem 0 0";
    headingSubtitle.style.fontSize = "0.86rem";
    headingSubtitle.style.fontStyle = "italic";
    headingSubtitle.style.color = "var(--pr-muted)";

    const headingLeft = document.createElement("div");
    headingLeft.style.display = "grid";
    headingLeft.style.gap = "0.15rem";
    headingLeft.appendChild(headingTitle);
    headingLeft.appendChild(headingSubtitle);

    const headingRightWrap = document.createElement("div");
    headingRightWrap.style.display = "grid";
    headingRightWrap.style.justifyItems = "end";
    headingRightWrap.style.gap = "0.35rem";

    const headingRight = document.createElement("a");
    headingRight.textContent = t("createdBy");
    headingRight.href = "https://zpmlabs.com";
    headingRight.target = "_blank";
    headingRight.rel = "noopener noreferrer";
    headingRight.style.textDecoration = "none";
    headingRight.style.fontSize = "0.78rem";
    headingRight.style.color = "var(--pr-muted)";
    headingRight.style.fontWeight = "600";
    headingRight.style.paddingTop = "0.25rem";

    const controlsRow = document.createElement("div");
    controlsRow.style.display = "flex";
    controlsRow.style.alignItems = "center";
    controlsRow.style.gap = "0.4rem";
    controlsRow.style.flexWrap = "wrap";
    controlsRow.style.justifyContent = "flex-end";
    controlsRow.style.marginLeft = "auto";

    const localeSelect = document.createElement("select");
    localeSelect.style.border = "1px solid var(--pr-border)";
    localeSelect.style.background = "var(--pr-surface-muted)";
    localeSelect.style.color = "var(--pr-text)";
    localeSelect.style.borderRadius = "999px";
    localeSelect.style.padding = "0.24rem 0.66rem";
    localeSelect.style.fontSize = "0.75rem";
    localeSelect.style.cursor = "pointer";

    const themeButton = document.createElement("button");
    themeButton.type = "button";
    themeButton.style.border = "1px solid var(--pr-border)";
    themeButton.style.background = "var(--pr-surface-muted)";
    themeButton.style.color = "var(--pr-text)";
    themeButton.style.borderRadius = "999px";
    themeButton.style.padding = "0.24rem 0.66rem";
    themeButton.style.fontSize = "0.75rem";
    themeButton.style.cursor = "pointer";

    const tagFilters = document.createElement("div");
    tagFilters.style.display = "flex";
    tagFilters.style.flexWrap = "wrap";
    tagFilters.style.gap = "0.35rem";
    tagFilters.style.minHeight = "2rem";

    headingRightWrap.appendChild(headingRight);
    if (this.showLocaleSwitcher) {
      controlsRow.appendChild(localeSelect);
    }
    if (this.showThemeSwitcher) {
      controlsRow.appendChild(themeButton);
    }
    if (controlsRow.childElementCount > 0) {
      headingRightWrap.appendChild(controlsRow);
    }

    heading.appendChild(headingLeft);
    heading.appendChild(headingRightWrap);

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = t("searchPlaceholder");
    search.style.width = "100%";
    search.style.padding = "0.65rem 0.75rem";
    search.style.border = "1px solid var(--pr-border)";
    search.style.borderRadius = "8px";
    search.style.background = "var(--pr-surface)";
    search.style.color = "var(--pr-text)";

    const activeDock = document.createElement("div");
    activeDock.style.display = "none";
    activeDock.style.alignItems = "center";
    activeDock.style.gap = "0.5rem";

    const activeDockLabel = document.createElement("strong");
    activeDockLabel.textContent = t("activeLabel");
    activeDockLabel.style.fontSize = "0.85rem";
    activeDockLabel.style.color = "var(--pr-text)";

    const activeDockButton = document.createElement("button");
    activeDockButton.type = "button";
    activeDockButton.style.display = "inline-flex";
    activeDockButton.style.alignItems = "center";
    activeDockButton.style.gap = "0.45rem";
    activeDockButton.style.border = "1px solid var(--pr-border-strong)";
    activeDockButton.style.background = "var(--pr-surface-muted)";
    activeDockButton.style.color = "var(--pr-primary)";
    activeDockButton.style.borderRadius = "999px";
    activeDockButton.style.padding = "0.25rem 0.6rem";
    activeDockButton.style.cursor = "pointer";

    const activeDockIcon = document.createElement("span");
    activeDockIcon.style.width = "1.15rem";
    activeDockIcon.style.height = "1.15rem";
    activeDockIcon.style.display = "inline-grid";
    activeDockIcon.style.placeItems = "center";
    activeDockIcon.style.overflow = "hidden";

    const activeDockText = document.createElement("span");

    activeDockButton.appendChild(activeDockIcon);
    activeDockButton.appendChild(activeDockText);

    activeDock.appendChild(activeDockLabel);
    activeDock.appendChild(activeDockButton);

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "1fr";
    grid.style.gap = "0.6rem";
    grid.style.alignContent = "start";
    grid.style.overflow = "hidden";
    grid.style.minHeight = "0";
    grid.style.overflowX = "hidden";

    const inlineOverlay = document.createElement("section");
    inlineOverlay.style.display = "none";
    inlineOverlay.style.position = "absolute";
    inlineOverlay.style.inset = "0";
    inlineOverlay.style.boxSizing = "border-box";
    inlineOverlay.style.background = "var(--pr-surface)";
    inlineOverlay.style.border = "1px solid var(--pr-border-strong)";
    inlineOverlay.style.borderRadius = "12px";
    inlineOverlay.style.padding = "1rem";
    inlineOverlay.style.zIndex = "30";
    inlineOverlay.style.boxShadow = "0 12px 34px rgba(15, 23, 42, 0.18)";
    inlineOverlay.style.gridTemplateRows = "auto 1fr";
    inlineOverlay.style.overflow = "hidden";

    const inlineHeader = document.createElement("div");
    inlineHeader.style.display = "flex";
    inlineHeader.style.justifyContent = "space-between";
    inlineHeader.style.alignItems = "center";
    inlineHeader.style.gap = "0.5rem";
    inlineHeader.style.padding = "0.25rem 0 0.65rem";
    inlineHeader.style.borderBottom = "1px solid var(--pr-border)";

    const inlineTitle = document.createElement("strong");
    inlineTitle.textContent = "";
    inlineTitle.style.color = "var(--pr-text)";

    const inlineActions = document.createElement("div");
    inlineActions.style.display = "flex";
    inlineActions.style.gap = "0.45rem";

    const toggleInlineFullscreen = (): void => {
      isInlineFullscreen = !isInlineFullscreen;

      if (isInlineFullscreen) {
        inlineOverlay.style.position = "fixed";
        inlineOverlay.style.inset = "0";
        inlineOverlay.style.borderRadius = "0";
        inlineOverlay.style.border = "0";
        inlineOverlay.style.zIndex = "10050";
        inlineOverlay.style.boxShadow = "none";
        return;
      }

      inlineOverlay.style.position = "absolute";
      inlineOverlay.style.inset = "0";
      inlineOverlay.style.borderRadius = "12px";
      inlineOverlay.style.border = "1px solid var(--pr-border-strong)";
      inlineOverlay.style.zIndex = "30";
      inlineOverlay.style.boxShadow = "0 12px 34px rgba(15, 23, 42, 0.18)";
    };

    const toggleModalFullscreen = (): void => {
      if (!activeGame?.modalOverlay || !activeGame.modalPanel) {
        return;
      }

      const overlay = activeGame.modalOverlay;
      const panel = activeGame.modalPanel;
      isModalFullscreen = !isModalFullscreen;

      if (isModalFullscreen) {
        overlay.style.padding = "0";
        overlay.style.placeItems = "stretch";

        panel.style.position = "fixed";
        panel.style.inset = "0";
        panel.style.left = "0";
        panel.style.top = "0";
        panel.style.transform = "none";
        panel.style.margin = "0";
        panel.style.width = "100dvw";
        panel.style.maxWidth = "100dvw";
        panel.style.minWidth = "100dvw";
        panel.style.height = "100dvh";
        panel.style.maxHeight = "100dvh";
        panel.style.minHeight = "100dvh";
        panel.style.borderRadius = "0";
        persistCurrentState();
        return;
      }

      overlay.style.padding = "1rem";
      overlay.style.placeItems = "center";

      panel.style.position = "relative";
      panel.style.inset = "";
      panel.style.left = "";
      panel.style.top = "";
      panel.style.transform = "none";
      panel.style.margin = "0";
      panel.style.width = toCssMeasurement(this.resizableModal.size?.width?.base, "min(920px, 96vw)");
      panel.style.maxWidth = toCssMeasurement(this.resizableModal.size?.width?.max, "96vw");
      panel.style.minWidth = toCssMeasurement(this.resizableModal.size?.width?.min, "320px");
      panel.style.height = toCssMeasurement(this.resizableModal.size?.height?.base, "auto");
      panel.style.maxHeight = toCssMeasurement(this.resizableModal.size?.height?.max, "90vh");
      panel.style.minHeight = toCssMeasurement(this.resizableModal.size?.height?.min, "240px");
      panel.style.borderRadius = "14px";
      persistCurrentState();
    };

    const createIconActionButton = (
      icon: string,
      title: string,
      onClick: () => void,
      tone: "default" | "danger" = "default"
    ): HTMLButtonElement => {
      const button = document.createElement("button");
      button.type = "button";
      button.title = title;
      button.setAttribute("aria-label", title);
      button.textContent = icon;
      button.style.width = "2rem";
      button.style.height = "2rem";
      button.style.display = "inline-grid";
      button.style.placeItems = "center";
      button.style.borderRadius = "999px";
      button.style.border = tone === "danger" ? "1px solid var(--pr-danger-border)" : "1px solid var(--pr-border)";
      button.style.background = tone === "danger" ? "var(--pr-danger-bg)" : "var(--pr-surface-muted)";
      button.style.color = tone === "danger" ? "var(--pr-danger-text)" : "var(--pr-text)";
      button.style.cursor = "pointer";
      button.style.fontWeight = "700";
      button.style.transition = "transform 140ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease";

      const activate = (): void => {
        button.style.transform = "translateY(-1px)";
        button.style.boxShadow = "0 6px 14px rgba(15,23,42,0.14)";
      };

      const reset = (): void => {
        button.style.transform = "translateY(0)";
        button.style.boxShadow = "none";
      };

      button.addEventListener("mouseenter", activate);
      button.addEventListener("mouseleave", reset);
      button.addEventListener("focus", activate);
      button.addEventListener("blur", reset);
      button.addEventListener("click", onClick);
      return button;
    };

    const openModalButton = createIconActionButton("⤢", t("openModal"), () => {
      void switchMode("modal");
    });
    const fullscreenInlineButton = createIconActionButton("⛶", t("fullscreen"), () => {
      toggleInlineFullscreen();
    });
    const minimizeInlineButton = createIconActionButton("−", t("minimize"), () => {
      minimizeActive();
    });
    const closeInlineButton = createIconActionButton("✕", t("close"), () => {
      void closeActive();
    }, "danger");

    const setActionLabel = (button: HTMLButtonElement, key: string): void => {
      const label = t(key);
      button.title = label;
      button.setAttribute("aria-label", label);
    };

    const applyFloatingButtonTheme = (): void => {
      if (!floatingButton) {
        return;
      }

      const primary = this.themeColors.primary ?? "#1d4ed8";
      const secondary = this.themeColors.secondary ?? "#64748b";
      const bgColor = currentTheme === "dark" ? "#111b2f" : "#ffffff";

      floatingButton.style.background = bgColor;

      const svg = floatingButton.querySelector("svg");
      if (!svg) {
        return;
      }

      for (const id of ["pr-fb-body", "pr-fb-lbump", "pr-fb-rbump"]) {
        const el = svg.querySelector(`#${id}`) as SVGElement | null;
        if (el) {
          el.setAttribute("fill", primary);
        }
      }

      for (const id of ["pr-fb-lstick", "pr-fb-rstick"]) {
        const el = svg.querySelector(`#${id}`) as SVGElement | null;
        if (el) {
          el.setAttribute("fill", primary);
          el.setAttribute("stroke", secondary);
        }
      }
    };

    const applyThemeTokens = (): void => {
      if (currentTheme === "dark") {
        container.style.setProperty("--pr-bg", "#0b1220");
        container.style.setProperty("--pr-surface", "#111b2f");
        container.style.setProperty("--pr-surface-muted", "#17233b");
        container.style.setProperty("--pr-border", "#2a3a57");
        container.style.setProperty("--pr-border-strong", "#3b82f6");
        container.style.setProperty("--pr-text", "#e2e8f0");
        container.style.setProperty("--pr-muted", "#9fb0c8");
        container.style.setProperty("--pr-title", "#f8fafc");
        container.style.setProperty("--pr-danger-bg", "#3a1d24");
        container.style.setProperty("--pr-danger-border", "#7f1d1d");
        container.style.setProperty("--pr-danger-text", "#fecaca");

        if (activeGame?.modalOverlay) {
          activeGame.modalOverlay.style.background = "transparent";
        }
        activeGame?.applyModalTheme?.();
      } else {
        container.style.setProperty("--pr-bg", "#f8fafc");
        container.style.setProperty("--pr-surface", "#ffffff");
        container.style.setProperty("--pr-surface-muted", "#f1f5f9");
        container.style.setProperty("--pr-border", "#cbd5e1");
        container.style.setProperty("--pr-border-strong", "#93c5fd");
        container.style.setProperty("--pr-text", "#0f172a");
        container.style.setProperty("--pr-muted", "#64748b");
        container.style.setProperty("--pr-title", "#0f172a");
        container.style.setProperty("--pr-danger-bg", "#fef2f2");
        container.style.setProperty("--pr-danger-border", "#fecaca");
        container.style.setProperty("--pr-danger-text", "#b91c1c");

        if (activeGame?.modalOverlay) {
          activeGame.modalOverlay.style.background = "transparent";
        }
        activeGame?.applyModalTheme?.();
      }

      container.style.background = "var(--pr-bg)";
      grid.style.background = "transparent";

      applyFloatingButtonTheme();
    };

    const refreshUiLabels = (): void => {
      headingTitle.textContent = t("title");
      headingSubtitle.textContent = t("subtitle");
      headingRight.textContent = t("createdBy");
      search.placeholder = t("searchPlaceholder");
      activeDockLabel.textContent = t("activeLabel");

      if (this.showLocaleSwitcher) {
        localeSelect.title = t("language");
        localeSelect.setAttribute("aria-label", t("language"));

        localeSelect.innerHTML = "";
        for (const option of resolvedLocaleOptions) {
          const optionElement = document.createElement("option");
          optionElement.value = option.value;
          optionElement.textContent = option.label;
          localeSelect.appendChild(optionElement);
        }
        localeSelect.value = currentLocale;
      }

      if (this.showThemeSwitcher) {
        const themeName = currentTheme === "dark" ? t("dark") : t("light");
        themeButton.textContent = `${t("theme")}: ${themeName}`;
      }

      setActionLabel(openModalButton, "openModal");
      setActionLabel(fullscreenInlineButton, "fullscreen");
      setActionLabel(minimizeInlineButton, "minimize");
      setActionLabel(closeInlineButton, "close");
      activeDockButton.title = t("restoreGame");
    };

    const updateLocale = (locale: PlayRoomLocale, notifyChange: boolean): void => {
      const normalized = normalizeLocale(locale);
      if (normalized === currentLocale && !notifyChange) {
        return;
      }

      currentLocale = normalized;
      if (notifyChange) {
        this.onLocaleChange?.(currentLocale);
      }
      refreshUiLabels();
      renderTagFilters();
      renderList();
      showActiveDock();
    };

    const updateTheme = (theme: PlayRoomTheme, notifyChange: boolean): void => {
      const normalized = normalizeTheme(theme);
      if (normalized === currentTheme) {
        return;
      }

      currentTheme = normalized;
      applyThemeTokens();
      refreshUiLabels();
      renderTagFilters();
      renderList();
      if (notifyChange) {
        this.onThemeChange?.(currentTheme);
      }
    };

    inlineActions.appendChild(openModalButton);
    inlineActions.appendChild(fullscreenInlineButton);
    inlineActions.appendChild(minimizeInlineButton);
    inlineActions.appendChild(closeInlineButton);
    inlineHeader.appendChild(inlineTitle);
    inlineHeader.appendChild(inlineActions);

    const inlineContent = document.createElement("div");
    inlineContent.style.height = "100%";
    inlineContent.style.minHeight = "0";
    inlineContent.style.overflow = "hidden";
    inlineContent.style.paddingTop = "0.85rem";

    inlineOverlay.appendChild(inlineHeader);
    inlineOverlay.appendChild(inlineContent);

    const ensureModal = (runtime: ActiveGameRuntime): void => {
      if (runtime.modalOverlay) {
        return;
      }

      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.display = "none";
      overlay.style.placeItems = "center";
      overlay.style.padding = "1rem";
      overlay.style.background = "transparent";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "9999";

      const panel = document.createElement("section");
      const widthConfig = this.resizableModal.size?.width;
      const heightConfig = this.resizableModal.size?.height;
      panel.style.width = toCssMeasurement(widthConfig?.base, "min(920px, 96vw)");
      panel.style.maxWidth = toCssMeasurement(widthConfig?.max, "96vw");
      panel.style.minWidth = toCssMeasurement(widthConfig?.min, "320px");
      panel.style.height = toCssMeasurement(heightConfig?.base, "auto");
      panel.style.maxHeight = toCssMeasurement(heightConfig?.max, "90vh");
      panel.style.minHeight = toCssMeasurement(heightConfig?.min, "240px");
      panel.style.resize = this.resizableModal.enabled ? "both" : "none";
      const applyPanelTokens = (): void => {
        const isDark = currentTheme === "dark";
        panel.style.setProperty("--pr-surface", isDark ? "#111b2f" : "#ffffff");
        panel.style.setProperty("--pr-surface-muted", isDark ? "#17233b" : "#f1f5f9");
        panel.style.setProperty("--pr-border", isDark ? "#2a3a57" : "#cbd5e1");
        panel.style.setProperty("--pr-border-strong", isDark ? "#3b82f6" : "#93c5fd");
        panel.style.setProperty("--pr-text", isDark ? "#e2e8f0" : "#0f172a");
        panel.style.setProperty("--pr-muted", isDark ? "#9fb0c8" : "#64748b");
        panel.style.setProperty("--pr-title", isDark ? "#f8fafc" : "#0f172a");
        panel.style.setProperty("--pr-primary", this.themeColors.primary ?? "#1d4ed8");
        panel.style.setProperty("--pr-secondary", this.themeColors.secondary ?? "#64748b");
        panel.style.setProperty("--pr-danger-bg", isDark ? "#3a1d24" : "#fef2f2");
        panel.style.setProperty("--pr-danger-border", isDark ? "#7f1d1d" : "#fecaca");
        panel.style.setProperty("--pr-danger-text", isDark ? "#fecaca" : "#b91c1c");
        panel.style.background = "var(--pr-surface)";
        panel.style.borderColor = "var(--pr-border)";
      };
      applyPanelTokens();
      panel.style.borderRadius = "14px";
      panel.style.border = "1px solid var(--pr-border)";
      panel.style.boxShadow = "0 22px 48px rgba(15, 23, 42, 0.28)";
      panel.style.display = "grid";
      panel.style.gridTemplateRows = "auto 1fr";
      panel.style.overflow = "hidden";
      panel.style.pointerEvents = "auto";

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.justifyContent = "space-between";
      header.style.gap = "0.5rem";
      header.style.padding = "0.9rem 1rem";
      header.style.borderBottom = "1px solid var(--pr-border)";
      header.style.background = "var(--pr-surface-muted)";
      if (this.draggableModal) {
        header.style.cursor = "move";
      }

      const title = document.createElement("strong");
      title.textContent = runtime.meta.name;
      title.style.color = "var(--pr-text)";

      const modalActions = document.createElement("div");
      modalActions.style.display = "flex";
      modalActions.style.gap = "0.45rem";

      const inlineButton = createIconActionButton("⤡", t("openInline"), () => {
        void switchMode("inline");
      });

      const minimizeButton = createIconActionButton("−", t("minimize"), () => {
        minimizeActive();
      });

      const fullscreenButton = createIconActionButton("⛶", t("fullscreen"), () => {
        toggleModalFullscreen();
      });

      const closeButton = createIconActionButton("✕", t("close"), () => {
        void closeActive();
      }, "danger");

      modalActions.appendChild(inlineButton);
      modalActions.appendChild(fullscreenButton);
      modalActions.appendChild(minimizeButton);
      modalActions.appendChild(closeButton);
      header.appendChild(title);
      header.appendChild(modalActions);

      const content = document.createElement("div");
      content.style.overflow = "auto";
      content.style.padding = "1rem";
      content.style.height = "100%";
      content.style.minHeight = "0";
      content.style.boxSizing = "border-box";

      panel.appendChild(header);
      panel.appendChild(content);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      if (this.draggableModal) {
        let dragging = false;
        let startX = 0;
        let startY = 0;
        let baseLeft = 0;
        let baseTop = 0;

        header.addEventListener("mousedown", (event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button")) {
            return;
          }

          dragging = true;
          startX = event.clientX;
          startY = event.clientY;
          const rect = panel.getBoundingClientRect();
          baseLeft = rect.left;
          baseTop = rect.top;
          panel.style.position = "fixed";
          panel.style.margin = "0";
          panel.style.left = `${baseLeft}px`;
          panel.style.top = `${baseTop}px`;
          panel.style.transform = "none";
          overlay.style.placeItems = "start";
          event.preventDefault();
        });

        window.addEventListener("mousemove", (event) => {
          if (!dragging) {
            return;
          }

          const left = Math.max(8, baseLeft + event.clientX - startX);
          const top = Math.max(8, baseTop + event.clientY - startY);
          panel.style.left = `${left}px`;
          panel.style.top = `${top}px`;
        });

        window.addEventListener("mouseup", () => {
          if (dragging) {
            persistCurrentState();
          }
          dragging = false;
        });
      }

      if (typeof ResizeObserver !== "undefined") {
        const modalResizeObserver = new ResizeObserver(() => {
          persistCurrentState();
        });
        modalResizeObserver.observe(panel);
      }

      runtime.modalOverlay = overlay;
      runtime.modalPanel = panel;
      runtime.modalContent = content;
      runtime.applyModalTheme = applyPanelTokens;
    };

    const showActiveDock = (): void => {
      if (!activeGame) {
        activeDock.style.display = "none";
        return;
      }

      activeDock.style.display = "flex";
      renderIcon(activeDockIcon, activeGame.meta.icon, 16);
      activeDockText.textContent = activeGame.meta.name;
      activeDockButton.title = t("restoreGame");
    };

    const renderIcon = (target: HTMLElement, iconValue: string | undefined, size: number): void => {
      const normalized = (iconValue ?? "").trim();
      target.innerHTML = "";

      const looksLikeImageUrl =
        /^https?:\/\//i.test(normalized) ||
        normalized.startsWith("/") ||
        normalized.startsWith("./") ||
        normalized.startsWith("../") ||
        normalized.startsWith("data:image/") ||
        /\.(svg|png|jpe?g|gif|webp)(\?.*)?$/i.test(normalized);

      if (looksLikeImageUrl) {
        const img = document.createElement("img");
        img.src = normalized;
        img.alt = "";
        img.width = size;
        img.height = size;
        img.style.width = `${size}px`;
        img.style.height = `${size}px`;
        img.style.display = "block";
        img.style.objectFit = "contain";
        target.appendChild(img);
        return;
      }

      if (normalized.startsWith("<svg")) {
        target.innerHTML = normalized;
        const svg = target.querySelector("svg");
        if (svg) {
          svg.setAttribute("width", String(size));
          svg.setAttribute("height", String(size));
          svg.style.width = `${size}px`;
          svg.style.height = `${size}px`;
          svg.style.display = "block";
        }
        return;
      }

      target.textContent = normalized || "🎮";
      target.style.fontSize = `${Math.max(12, Math.round(size * 0.72))}px`;
      target.style.lineHeight = "1";
    };

    const renderInInline = (runtime: ActiveGameRuntime): void => {
      runtime.mode = "inline";
      runtime.minimized = false;
      inlineTitle.textContent = runtime.meta.name;
      isModalFullscreen = false;
      inlineContent.appendChild(runtime.host);
      inlineOverlay.style.display = "grid";

      if (runtime.modalOverlay) {
        runtime.modalOverlay.style.display = "none";
      }

      showActiveDock();
      persistCurrentState();
    };

    const renderInModal = (runtime: ActiveGameRuntime): void => {
      runtime.mode = "modal";
      runtime.minimized = false;
      ensureModal(runtime);
      isInlineFullscreen = false;
      inlineOverlay.style.position = "absolute";
      inlineOverlay.style.inset = "0";
      inlineOverlay.style.borderRadius = "12px";
      inlineOverlay.style.border = "1px solid var(--pr-border-strong)";
      inlineOverlay.style.zIndex = "30";
      inlineOverlay.style.boxShadow = "0 12px 34px rgba(15, 23, 42, 0.18)";

      if (runtime.modalContent) {
        runtime.modalContent.appendChild(runtime.host);
      }

      if (runtime.modalOverlay) {
        runtime.modalOverlay.style.display = "grid";
      }

      inlineOverlay.style.display = "none";
      showActiveDock();
      persistCurrentState();
    };

    const minimizeActive = (): void => {
      if (!activeGame) {
        return;
      }

      activeGame.minimized = true;
      inlineOverlay.style.display = "none";
      if (activeGame.modalOverlay) {
        activeGame.modalOverlay.style.display = "none";
      }
      showActiveDock();
      persistCurrentState();
    };

    const reopenActive = (): void => {
      if (!activeGame) {
        return;
      }

      if (activeGame.mode === "modal") {
        renderInModal(activeGame);
        return;
      }

      renderInInline(activeGame);
    };

    const switchMode = async (mode: "inline" | "modal"): Promise<void> => {
      if (!activeGame) {
        return;
      }

      if (mode === "modal") {
        renderInModal(activeGame);
      } else {
        renderInInline(activeGame);
      }
    };

    const closeActive = async (): Promise<void> => {
      if (!activeGame) {
        return;
      }

      const current = activeGame;
      activeGame = null;
      isInlineFullscreen = false;
      isModalFullscreen = false;

      inlineOverlay.style.display = "none";
      if (current.modalOverlay && current.modalOverlay.parentNode) {
        current.modalOverlay.parentNode.removeChild(current.modalOverlay);
      }

      if (current.session) {
        await current.session.destroy();
      }
      showActiveDock();
      renderList();
      persistCurrentState();
    };

    const launchGame = async (
      meta: RegisteredGameMeta,
      preferredMode: "inline" | "modal" = "inline"
    ): Promise<void> => {
      if (activeGame?.meta.id === meta.id) {
        reopenActive();
        return;
      }

      await closeActive();

      const host = document.createElement("div");
      host.style.height = "100%";
      host.style.minHeight = "0";
      host.style.boxSizing = "border-box";
      host.style.overflowX = "hidden";
      host.style.overflowY = "auto";

      const runtime: ActiveGameRuntime = {
        meta,
        host,
        session: null,
        mode: preferredMode,
        minimized: false,
        modalOverlay: null,
        modalPanel: null,
        modalContent: null,
        applyModalTheme: null
      };

      activeGame = runtime;

      if (preferredMode === "modal") {
        renderInModal(runtime);
      } else {
        renderInInline(runtime);
      }

      try {
        runtime.session = await launch(meta.id, { mode: "inline", container: host });
      } catch (error) {
        await closeActive();
        throw error;
      }

      showActiveDock();
      persistCurrentState();
    };

    const applyPersistedModalGeometry = (runtime: ActiveGameRuntime, state: PersistedUiState): void => {
      if (!runtime.modalOverlay || !runtime.modalPanel || !state.modal) {
        return;
      }

      const panel = runtime.modalPanel;
      const overlay = runtime.modalOverlay;
      const modalState = state.modal;

      if (modalState.fullscreen) {
        if (!isModalFullscreen) {
          toggleModalFullscreen();
        }
        return;
      }

      if (modalState.width) {
        panel.style.width = modalState.width;
      }
      if (modalState.height) {
        panel.style.height = modalState.height;
      }
      if (modalState.left || modalState.top) {
        panel.style.position = "fixed";
        panel.style.margin = "0";
        panel.style.left = modalState.left ?? panel.style.left;
        panel.style.top = modalState.top ?? panel.style.top;
        panel.style.transform = "none";
        overlay.style.placeItems = "start";
      }
    };

    const restorePersistedGame = async (): Promise<void> => {
      if (!persistedState.activeGameId) {
        return;
      }

      const restoreMeta = catalog().items.find((item) => item.id === persistedState.activeGameId);
      if (!restoreMeta) {
        writePersistedState({ floatingOpen });
        return;
      }

      const restoreMode: "inline" | "modal" = persistedState.mode === "modal" ? "modal" : "inline";
      await launchGame(restoreMeta, restoreMode);

      if (!activeGame) {
        return;
      }

      if (persistedState.mode === "modal") {
        renderInModal(activeGame);
        applyPersistedModalGeometry(activeGame, persistedState);
      } else {
        renderInInline(activeGame);
      }

      if (persistedState.minimized) {
        minimizeActive();
      }
    };

    const applyGridColumns = (): void => {
      const width = container.clientWidth;

      if (width >= 1200) {
        grid.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
      } else if (width >= 900) {
        grid.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
      } else if (width >= 600) {
        grid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
      } else {
        grid.style.gridTemplateColumns = "1fr";
      }
    };

    const renderList = (): void => {
      grid.innerHTML = "";
      const selectedTagList = Array.from(selectedTags);
      const result = catalog({
        search: search.value,
        tags: selectedTagList.length > 0 ? selectedTagList : undefined
      });

      if (result.items.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = t("noGames");
        empty.style.padding = "0.8rem";
        empty.style.border = "1px dashed var(--pr-border)";
        empty.style.borderRadius = "12px";
        empty.style.color = "var(--pr-muted)";
        empty.style.fontSize = "0.9rem";
        grid.appendChild(empty);
        return;
      }

      for (const game of result.items) {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.style.appearance = "none";
        tile.style.width = "100%";
        tile.style.border = "1px solid var(--pr-border)";
        tile.style.borderBottom = "1px solid var(--pr-border)";
        tile.style.borderRadius = "14px";
        tile.style.padding = "0.75rem";
        tile.style.background = "var(--pr-surface)";
        tile.style.display = "grid";
        tile.style.gridTemplateColumns = "70px 1fr";
        tile.style.gap = "0.7rem";
        tile.style.alignItems = "center";
        tile.style.textAlign = "left";
        tile.style.cursor = "pointer";
        tile.style.transition = "box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease, filter 180ms ease";
        tile.style.boxShadow = "0 2px 8px rgba(15,23,42,0.08)";
        tile.style.willChange = "box-shadow, border-color, background-color, filter";

        const setTileResting = (): void => {
          tile.style.boxShadow = "0 2px 8px rgba(15,23,42,0.08)";
          tile.style.borderColor = "var(--pr-border)";
          tile.style.background = "var(--pr-surface)";
          tile.style.filter = "none";
        };

        const setTileActive = (): void => {
          tile.style.boxShadow = "0 8px 18px rgba(15,23,42,0.14)";
          tile.style.borderColor = "var(--pr-border-strong)";
          tile.style.background = "var(--pr-surface-muted)";
          tile.style.filter = "saturate(1.03)";
        };

        tile.addEventListener("mouseenter", setTileActive);
        tile.addEventListener("mouseleave", setTileResting);
        tile.addEventListener("focus", setTileActive);
        tile.addEventListener("blur", setTileResting);
        tile.addEventListener("click", () => {
          void launchGame(game);
        });

        const icon = document.createElement("div");
        icon.style.height = "64px";
        icon.style.width = "64px";
        icon.style.display = "grid";
        icon.style.placeItems = "center";
        icon.style.flexShrink = "0";
        icon.style.overflow = "hidden";
        renderIcon(icon, game.icon, 64);

        const body = document.createElement("div");
        body.style.display = "grid";
        body.style.gap = "0.22rem";

        const title = document.createElement("strong");
        title.textContent = game.name;
        title.style.fontSize = "1rem";
        title.style.color = "var(--pr-text)";

        const description = document.createElement("div");
        description.textContent = game.description ?? "";
        description.style.fontSize = "0.84rem";
        description.style.color = "var(--pr-muted)";
        description.style.lineHeight = "1.25";

        const hint = document.createElement("div");
        hint.textContent = t("tapToLaunch");
        hint.style.fontSize = "0.72rem";
        hint.style.color = "var(--pr-primary)";
        hint.style.fontWeight = "600";

        body.appendChild(title);
        body.appendChild(description);
        body.appendChild(hint);

        tile.appendChild(icon);
        tile.appendChild(body);
        grid.appendChild(tile);
      }
    };

    const renderTagFilters = (): void => {
      tagFilters.innerHTML = "";
      const allTags = Array.from(
        new Set(catalog().items.flatMap((game) => game.tags ?? []))
      ).sort((a, b) => a.localeCompare(b));

      if (allTags.length === 0) {
        return;
      }

      for (const tag of allTags) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.style.display = "inline-flex";
        chip.style.alignItems = "center";
        chip.style.gap = "0.35rem";
        chip.style.padding = "0.24rem 0.62rem";
        chip.style.borderRadius = "999px";
        chip.style.border = selectedTags.has(tag) ? "1px solid var(--pr-border-strong)" : "1px solid var(--pr-border)";
        chip.style.background = selectedTags.has(tag) ? "var(--pr-surface-muted)" : "var(--pr-surface)";
        chip.style.color = selectedTags.has(tag) ? "var(--pr-primary)" : "var(--pr-text)";
        chip.style.fontSize = "0.76rem";
        chip.style.fontWeight = selectedTags.has(tag) ? "700" : "500";
        chip.style.cursor = "pointer";
        chip.style.transition = "transform 120ms ease, background-color 150ms ease, border-color 150ms ease";
        chip.addEventListener("mouseenter", () => {
          chip.style.transform = "translateY(-1px)";
        });
        chip.addEventListener("mouseleave", () => {
          chip.style.transform = "translateY(0)";
        });

        chip.addEventListener("click", () => {
          if (selectedTags.has(tag)) {
            selectedTags.delete(tag);
          } else {
            selectedTags.add(tag);
          }
          renderTagFilters();
          renderList();
        });

        const dot = document.createElement("span");
        dot.textContent = selectedTags.has(tag) ? "✓" : "•";
        dot.style.fontSize = "0.72rem";

        const text = document.createElement("span");
        text.textContent = tag;

        chip.appendChild(dot);
        chip.appendChild(text);
        tagFilters.appendChild(chip);
      }
    };

    const setupFloatingLauncher = (): void => {
      if (launcherMode !== "floating" || typeof document === "undefined") {
        return;
      }

      const panel = document.createElement("section");
      panel.style.position = "fixed";
      panel.style.zIndex = "9988";
      panel.style.width = toCssMeasurement(this.launcher.panelWidth, "min(520px, calc(100vw - 2rem))");
      panel.style.height = toCssMeasurement(this.launcher.panelHeight, "min(78vh, 760px)");
      panel.style.maxWidth = "calc(100vw - 2rem)";
      panel.style.maxHeight = "calc(100vh - 5rem)";
      panel.style.minWidth = "320px";
      panel.style.minHeight = "300px";
      panel.style.border = "1px solid var(--pr-border)";
      panel.style.borderRadius = "14px";
      panel.style.background = "var(--pr-surface)";
      panel.style.boxShadow = "0 16px 38px rgba(15, 23, 42, 0.2)";
      panel.style.overflow = "hidden";
      panel.style.display = floatingOpen ? "block" : "none";

      const button = document.createElement("button");
      button.type = "button";
      button.title = t("title");
      button.setAttribute("aria-label", t("title"));
      button.style.position = "fixed";
      button.style.zIndex = "9989";
      button.style.border = "none";
      button.style.background = "#ffffff";
      button.style.borderRadius = "50%";
      button.style.width = "52px";
      button.style.height = "52px";
      button.style.padding = "0";
      button.style.display = "flex";
      button.style.alignItems = "center";
      button.style.justifyContent = "center";
      button.style.cursor = "pointer";
      button.style.boxShadow = "0 8px 20px rgba(15, 23, 42, 0.28)";
      button.style.overflow = "hidden";
      button.style.lineHeight = "1";

      const primary = this.themeColors.primary ?? "#1d4ed8";
      const secondary = this.themeColors.secondary ?? "#64748b";
      button.innerHTML = `<svg width="39" height="39" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style="pointer-events:none;display:block;flex-shrink:0;transform:rotate(-45deg)">
  <path id="pr-fb-body" d="M138 145C111 145 88 156 73 180C56 207 44 253 42 319C40 378 58 424 92 432C121 439 146 406 180 341C186 331 194 326 204 326H308C318 326 326 331 332 341C366 406 391 439 420 432C454 424 472 378 470 319C468 253 456 207 439 180C424 156 401 145 374 145H138Z" fill="${primary}"/>
  <path id="pr-fb-lbump" d="M122 145C126 132 138 124 154 124H186C202 124 212 132 216 145H122Z" fill="${primary}"/>
  <path id="pr-fb-rbump" d="M296 145C300 132 310 124 326 124H358C374 124 386 132 390 145H296Z" fill="${primary}"/>
  <rect x="95" y="202" width="96" height="36" rx="10" fill="#F3F4F6"/>
  <rect x="125" y="172" width="36" height="96" rx="10" fill="#F3F4F6"/>
  <circle cx="382" cy="187" r="20" fill="#49D7A1"/>
  <circle cx="424" cy="227" r="20" fill="#FF5757"/>
  <circle cx="382" cy="269" r="20" fill="#F6C12A"/>
  <circle cx="340" cy="227" r="20" fill="#2F73F2"/>
  <circle id="pr-fb-lstick" cx="196" cy="310" r="30" fill="${primary}" stroke="${secondary}" stroke-width="14"/>
  <circle id="pr-fb-rstick" cx="316" cy="310" r="30" fill="${primary}" stroke="${secondary}" stroke-width="14"/>
</svg>`;

      if (this.launcher.pulse !== false) {
        const styleId = "pr-floating-pulse-style";
        if (typeof document !== "undefined" && !document.getElementById(styleId)) {
          const styleEl = document.createElement("style");
          styleEl.id = styleId;
          styleEl.textContent = [
            "@keyframes pr-pulse { 0%, 100% { transform: scale(1); box-shadow: 0 8px 20px rgba(15,23,42,0.28); } 50% { transform: scale(1.22); box-shadow: 0 14px 36px rgba(15,23,42,0.45); } }",
            ".pr-floating-pulse { animation: pr-pulse 2.2s ease-in-out infinite; }",
            ".pr-floating-pulse:hover { animation-play-state: paused; }"
          ].join("\n");
          document.head.appendChild(styleEl);
        }

        button.classList.add("pr-floating-pulse");
      }

      button.addEventListener("click", () => {
        floatingOpen = !floatingOpen;
        panel.style.display = floatingOpen ? "block" : "none";
        persistCurrentState();
      });

      applyFloatingPlacement(button, panel);

      container.style.height = "100%";
      container.style.minHeight = "0";
      container.style.padding = "0.65rem";
      panel.appendChild(container);
      document.body.appendChild(panel);
      document.body.appendChild(button);

      floatingPanel = panel;
      floatingButton = button;
    };

    activeDockButton.addEventListener("click", () => {
      reopenActive();
    });

    localeSelect.addEventListener("change", () => {
      updateLocale(localeSelect.value, true);
    });

    themeButton.addEventListener("click", () => {
      const nextTheme: PlayRoomTheme = currentTheme === "light" ? "dark" : "light";
      updateTheme(nextTheme, true);
    });

    search.addEventListener("input", () => {
      renderList();
    });

    applyThemeTokens();
    refreshUiLabels();

    applyGridColumns();
    renderTagFilters();
    renderList();
    showActiveDock();

    this.subscribeLocale?.((locale) => {
      updateLocale(locale, false);
    });
    this.subscribeTheme?.((theme) => {
      updateTheme(theme, false);
    });

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(() => {
        applyGridColumns();
      });
      resizeObserver.observe(container);
    } else {
      window.addEventListener("resize", () => {
        applyGridColumns();
      });
    }

    container.appendChild(heading);
    container.appendChild(search);
    container.appendChild(tagFilters);
    container.appendChild(activeDock);
    container.appendChild(grid);
    container.appendChild(inlineOverlay);

    setupFloatingLauncher();
    void restorePersistedGame();
  }
}
