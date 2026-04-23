import {
  GameCatalogQuery,
  GameCatalogResult,
  GameDefinition,
  GameRegistration,
  GameSession,
  HubUiAdapter,
  LaunchGameOptions,
  PlayRoomApi,
  PlayRoomOptions,
  RegisteredGameMeta
} from "./types.js";
import { BasicListUiAdapter } from "./ui.js";

interface RegisteredGameInternal {
  game: GameDefinition<any>;
  config: Record<string, unknown>;
}

const DEFAULT_PLAYROOM_OPTIONS: PlayRoomOptions = {
  browserStartMode: "modal",
  launcher: {
    mode: "floating",
    position: "bottom-right",
    panelWidth: "min(520px, calc(100vw - 2rem))",
    panelHeight: "min(78vh, 760px)",
    startOpen: false
  },
  persistence: {
    enabled: true,
    storageKey: "playroom:floating-demo"
  },
  resizableModal: {
    enabled: true,
    size: {
      width: {
        min: "420px",
        base: "min(940px, 96vw)",
        max: "98vw"
      },
      height: {
        min: "320px",
        base: "80vh",
        max: "96vh"
      }
    }
  },
  localeOptions: [
    { value: "en", label: "English" },
    { value: "sr", label: "Српски" }
  ],
  locale: "en",
  theme: "light",
  showLocaleSwitcher: true,
  showThemeSwitcher: true,
  themeColors: {
    primary: "#0f766e",
    secondary: "#475569"
  }
};

function mergePlayRoomOptions(options: PlayRoomOptions = {}): PlayRoomOptions {
  const defaultResizableSize = DEFAULT_PLAYROOM_OPTIONS.resizableModal?.size;
  const customResizableSize = options.resizableModal?.size;

  return {
    ...DEFAULT_PLAYROOM_OPTIONS,
    ...options,
    launcher: {
      ...DEFAULT_PLAYROOM_OPTIONS.launcher,
      ...options.launcher
    },
    persistence: {
      ...DEFAULT_PLAYROOM_OPTIONS.persistence,
      ...options.persistence
    },
    resizableModal: {
      ...DEFAULT_PLAYROOM_OPTIONS.resizableModal,
      ...options.resizableModal,
      size: {
        ...defaultResizableSize,
        ...customResizableSize,
        width: {
          ...defaultResizableSize?.width,
          ...customResizableSize?.width
        },
        height: {
          ...defaultResizableSize?.height,
          ...customResizableSize?.height
        }
      }
    },
    localeOptions: options.localeOptions ?? DEFAULT_PLAYROOM_OPTIONS.localeOptions,
    themeColors: {
      ...DEFAULT_PLAYROOM_OPTIONS.themeColors,
      ...options.themeColors
    }
  };
}

function toCssMeasurement(value: string | number | undefined, fallback: string): string {
  if (typeof value === "number") {
    return `${value}px`;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return fallback;
}

function normalizeLocale(value: string | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized.length > 0 ? normalized : "en";
}

function normalizeTheme(value: string | undefined): "light" | "dark" {
  return value === "dark" ? "dark" : "light";
}

export class PlayRoom implements PlayRoomApi {
  private readonly games = new Map<string, RegisteredGameInternal>();

  private readonly uiAdapter?: HubUiAdapter;

  private readonly options: PlayRoomOptions;

  private currentLocale: string;

  private currentTheme: "light" | "dark";

  private readonly localeListeners = new Set<(locale: string) => void>();

  private readonly themeListeners = new Set<(theme: "light" | "dark") => void>();

  constructor(options: PlayRoomOptions = {}) {
    this.options = mergePlayRoomOptions(options);
    this.uiAdapter = this.options.uiAdapter;
    this.currentLocale = normalizeLocale(this.options.locale);
    this.currentTheme = normalizeTheme(this.options.theme);
  }

  getLocale(): string {
    return this.currentLocale;
  }

  setLocale(locale: string): void {
    const normalized = normalizeLocale(locale);
    if (normalized === this.currentLocale) {
      return;
    }

    this.currentLocale = normalized;
    this.options.onLocaleChange?.(normalized);
    for (const listener of this.localeListeners) {
      listener(normalized);
    }
  }

  subscribeLocale(listener: (locale: string) => void): () => void {
    this.localeListeners.add(listener);
    listener(this.currentLocale);
    return () => {
      this.localeListeners.delete(listener);
    };
  }

  getTheme(): "light" | "dark" {
    return this.currentTheme;
  }

  setTheme(theme: "light" | "dark"): void {
    const normalized = normalizeTheme(theme);
    if (normalized === this.currentTheme) {
      return;
    }

    this.currentTheme = normalized;
    this.options.onThemeChange?.(normalized);
    for (const listener of this.themeListeners) {
      listener(normalized);
    }
  }

  subscribeTheme(listener: (theme: "light" | "dark") => void): () => void {
    this.themeListeners.add(listener);
    listener(this.currentTheme);
    return () => {
      this.themeListeners.delete(listener);
    };
  }

  registerGame<GameConfig = Record<string, unknown>>(registration: GameRegistration<GameConfig>): this {
    const { game, config } = registration;
    this.games.set(game.id, {
      game,
      config: { ...(config as Record<string, unknown> | undefined) }
    });
    return this;
  }

  registerGames(registrations: Array<GameRegistration<any>>): this {
    for (const registration of registrations) {
      this.registerGame(registration);
    }

    return this;
  }

  listGames(): RegisteredGameMeta[] {
    return [...this.games.values()].map(({ game }) => ({
      id: game.id,
      name: game.locales?.[this.currentLocale]?.name ?? game.locales?.en?.name ?? game.name,
      icon: game.icon,
      description:
        game.locales?.[this.currentLocale]?.description ?? game.locales?.en?.description ?? game.description,
      tags: game.locales?.[this.currentLocale]?.tags ?? game.locales?.en?.tags ?? game.tags
    }));
  }

  queryGames(query: GameCatalogQuery = {}): GameCatalogResult {
    const normalizedSearch = (query.search ?? "").trim().toLowerCase();
    const normalizedTags = (query.tags ?? []).map((tag) => tag.toLowerCase());

    const items = this.listGames().filter((game) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        game.id.toLowerCase().includes(normalizedSearch) ||
        game.name.toLowerCase().includes(normalizedSearch) ||
        (game.description ?? "").toLowerCase().includes(normalizedSearch);

      const gameTags = (game.tags ?? []).map((tag) => tag.toLowerCase());
      const matchesTags = normalizedTags.every((tag) => gameTags.includes(tag));

      return matchesSearch && matchesTags;
    });

    return {
      items,
      total: items.length
    };
  }

  renderGamePicker(container: HTMLElement, uiAdapter?: HubUiAdapter): void {
    const adapter =
      uiAdapter ??
      this.uiAdapter ??
      new BasicListUiAdapter({
        defaultStartMode: this.options.browserStartMode,
        draggableModal: this.options.draggableModal,
        resizableModal: this.options.resizableModal,
        launcher: this.options.launcher,
        persistence: this.options.persistence,
        locale: this.getLocale(),
        localeOptions: this.options.localeOptions,
        localeMessages: this.options.localeMessages,
        subscribeLocale: (listener) => this.subscribeLocale(listener),
        onLocaleChange: (locale) => this.setLocale(locale),
        showLocaleSwitcher: this.options.showLocaleSwitcher,
        theme: this.getTheme(),
        subscribeTheme: (listener) => this.subscribeTheme(listener),
        onThemeChange: (theme) => this.setTheme(theme),
        showThemeSwitcher: this.options.showThemeSwitcher,
        themeColors: this.options.themeColors
      });
    adapter.renderGameBrowser({
      container,
      catalog: (query) => this.queryGames(query),
      launch: (gameId, options = {}) => this.launchGame(gameId, options)
    });
  }

  async launchGame<GameConfig = Record<string, unknown>>(
    gameId: string,
    options: LaunchGameOptions<GameConfig> = {}
  ): Promise<GameSession> {
    const registered = this.games.get(gameId);
    if (!registered) {
      throw new Error(`Game ${gameId} is not registered in PlayRoom`);
    }

    const mergedConfig = {
      ...registered.config,
      ...((options.config as Record<string, unknown> | undefined) ?? {})
    } as GameConfig;

    const instance = await registered.game.createInstance({
      gameConfig: mergedConfig,
      hub: this,
      gameId: registered.game.id
    });

    let mountedContainer: HTMLElement | null = null;
    let modalOverlay: HTMLElement | null = null;

    if (options.mode === "modal") {
      if (typeof document === "undefined") {
        throw new Error("Modal launch requires a browser document");
      }

      const root = options.modalRoot ?? document.body;
      modalOverlay = document.createElement("div");
      modalOverlay.style.position = "fixed";
      modalOverlay.style.inset = "0";
      modalOverlay.style.background = "rgba(15, 23, 42, 0.62)";
      modalOverlay.style.display = "grid";
      modalOverlay.style.placeItems = "center";
      modalOverlay.style.padding = "1rem";
      modalOverlay.style.zIndex = "9999";

      const modalPanel = document.createElement("section");
      const modalWidth = this.options.resizableModal?.size?.width;
      const modalHeight = this.options.resizableModal?.size?.height;
      modalPanel.style.background = "#ffffff";
      modalPanel.style.width = toCssMeasurement(modalWidth?.base, "min(900px, 100%)");
      modalPanel.style.maxWidth = toCssMeasurement(modalWidth?.max, "100%");
      modalPanel.style.minWidth = toCssMeasurement(modalWidth?.min, "320px");
      modalPanel.style.height = toCssMeasurement(modalHeight?.base, "auto");
      modalPanel.style.maxHeight = toCssMeasurement(modalHeight?.max, "90vh");
      modalPanel.style.minHeight = toCssMeasurement(modalHeight?.min, "240px");
      modalPanel.style.resize = this.options.resizableModal?.enabled ? "both" : "none";
      modalPanel.style.overflow = "auto";
      modalPanel.style.borderRadius = "14px";
      modalPanel.style.padding = "1rem";

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";
      header.style.marginBottom = "1rem";

      const title = document.createElement("h3");
      title.textContent = options.modalTitle ?? registered.game.name;
      title.style.margin = "0";

      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.textContent = "Close";
      closeButton.addEventListener("click", () => {
        void session.destroy();
      });

      const gameMount = document.createElement("div");

      header.appendChild(title);
      header.appendChild(closeButton);
      modalPanel.appendChild(header);
      modalPanel.appendChild(gameMount);
      modalOverlay.appendChild(modalPanel);
      root.appendChild(modalOverlay);

      mountedContainer = gameMount;
    } else if (options.container) {
      mountedContainer = options.container;
    }

    if (mountedContainer && instance.mount) {
      await instance.mount(mountedContainer);
    }

    const session: GameSession = {
      gameId,
      instance,
      destroy: async () => {
        if (instance.unmount) {
          await instance.unmount();
        }

        if (modalOverlay && modalOverlay.parentNode) {
          modalOverlay.parentNode.removeChild(modalOverlay);
        }
      }
    };

    return session;
  }
}
