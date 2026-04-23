export type MaybePromise<T> = T | Promise<T>;

export type PlayRoomLocale = string;

export interface PlayRoomLocaleOption {
  value: PlayRoomLocale;
  label: string;
}

export type PlayRoomLocaleMessages = Record<PlayRoomLocale, Record<string, string>>;

export type PlayRoomTheme = "light" | "dark";

export type CssMeasurement = string | number;

export interface ModalSizeAxisConfig {
  min?: CssMeasurement;
  base?: CssMeasurement;
  max?: CssMeasurement;
}

export interface ResizableModalSizeConfig {
  width?: ModalSizeAxisConfig;
  height?: ModalSizeAxisConfig;
}

export interface ResizableModalConfig {
  enabled?: boolean;
  size?: ResizableModalSizeConfig;
}

export interface PlayRoomThemeColors {
  primary?: string;
  secondary?: string;
}

export type PlayRoomLauncherMode = "inline" | "floating";

export type PlayRoomFloatingPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface PlayRoomFloatingLauncherConfig {
  mode?: PlayRoomLauncherMode;
  position?: PlayRoomFloatingPosition;
  panelWidth?: CssMeasurement;
  panelHeight?: CssMeasurement;
  startOpen?: boolean;
  pulse?: boolean;
}

export interface PlayRoomUiPersistenceConfig {
  enabled?: boolean;
  storageKey?: string;
}

export interface GameInstance {
  mount?(container: HTMLElement): MaybePromise<void>;
  unmount?(): MaybePromise<void>;
}

export interface GameCreationContext<GameConfig = unknown> {
  gameConfig: GameConfig;
  hub: PlayRoomApi;
  gameId: string;
}

export interface LocalizedGameMetadata {
  name?: string;
  description?: string;
  tags?: string[];
}

export interface GameDefinition<GameConfig = unknown> {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  tags?: string[];
  locales?: Partial<Record<PlayRoomLocale, LocalizedGameMetadata>>;
  createInstance(context: GameCreationContext<GameConfig>): MaybePromise<GameInstance>;
}

export interface RegisteredGameMeta {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  tags?: string[];
}

export interface GameCatalogQuery {
  search?: string;
  tags?: string[];
}

export interface GameCatalogResult {
  items: RegisteredGameMeta[];
  total: number;
}

export interface GameRegistration<GameConfig = unknown> {
  game: GameDefinition<GameConfig>;
  config?: Partial<GameConfig>;
}

export interface LaunchGameOptions<GameConfig = unknown> {
  container?: HTMLElement;
  config?: Partial<GameConfig>;
  mode?: "inline" | "modal";
  modalRoot?: HTMLElement;
  modalTitle?: string;
}

export interface HubUiAdapter {
  renderGameBrowser(input: {
    container: HTMLElement;
    catalog: (query?: GameCatalogQuery) => GameCatalogResult;
    launch: (gameId: string, options?: LaunchGameOptions) => Promise<GameSession>;
  }): void;
}

export interface PlayRoomOptions {
  uiAdapter?: HubUiAdapter;
  browserStartMode?: "inline" | "modal";
  draggableModal?: boolean;
  resizableModal?: ResizableModalConfig;
  launcher?: PlayRoomFloatingLauncherConfig;
  persistence?: PlayRoomUiPersistenceConfig;
  locale?: PlayRoomLocale;
  localeOptions?: PlayRoomLocaleOption[];
  localeMessages?: PlayRoomLocaleMessages;
  onLocaleChange?: (locale: PlayRoomLocale) => void;
  showLocaleSwitcher?: boolean;
  theme?: PlayRoomTheme;
  onThemeChange?: (theme: PlayRoomTheme) => void;
  showThemeSwitcher?: boolean;
  themeColors?: PlayRoomThemeColors;
}

export interface GameSession {
  gameId: string;
  instance: GameInstance;
  destroy(): Promise<void>;
}

export interface PlayRoomApi {
  listGames(): RegisteredGameMeta[];
  queryGames(query?: GameCatalogQuery): GameCatalogResult;
  getLocale(): PlayRoomLocale;
  setLocale(locale: PlayRoomLocale): void;
  subscribeLocale(listener: (locale: PlayRoomLocale) => void): () => void;
  getTheme(): PlayRoomTheme;
  setTheme(theme: PlayRoomTheme): void;
  subscribeTheme(listener: (theme: PlayRoomTheme) => void): () => void;
}

export interface PlayRoomRegistrationApi extends PlayRoomApi {
  registerGame<GameConfig = Record<string, unknown>>(registration: GameRegistration<GameConfig>): unknown;
}
