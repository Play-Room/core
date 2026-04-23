import { PlayRoomRegistrationApi } from "./types.js";
import { createDefaultQuizzRegistration } from "./default-games/quizz.js";

export type DefaultGameOverridesMap = Record<string, Record<string, unknown>>;

export interface DefaultGameRegistrarContext {
  locale: string;
  theme: "light" | "dark";
  subscribeLocale: (listener: (locale: string) => void) => () => void;
  subscribeTheme: (listener: (theme: "light" | "dark") => void) => () => void;
}

export interface DefaultGameRegistrarInput {
  gameId: string;
  overrides: Record<string, unknown>;
  context: DefaultGameRegistrarContext;
}

export interface DefaultGameRegistration {
  game: import("./types.js").GameDefinition<Record<string, unknown>>;
  config?: Record<string, unknown>;
}

export type DefaultGameRegistrar = (input: DefaultGameRegistrarInput) => DefaultGameRegistration;

export interface RegisterDefaultGamesOptions {
  config?: DefaultGameOverridesMap;
  include?: string[];
  registrars?: Record<string, DefaultGameRegistrar>;
}

export interface GameMetadataOverrides {
  name?: string;
  description?: string;
  tags?: string[];
  icon?: string;
  locales?: Record<string, { name?: string; description?: string; tags?: string[] }>;
}

export interface SplitGameOverridesResult {
  metadata: GameMetadataOverrides;
  config: Record<string, unknown>;
}

export function splitGameOverrides(
  overrides: Record<string, unknown>,
  metadataKeys: string[] = ["name", "description", "tags", "icon", "locales"]
): SplitGameOverridesResult {
  const metadataKeySet = new Set(metadataKeys);
  const metadata: GameMetadataOverrides = {};
  const config: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(overrides)) {
    if (metadataKeySet.has(key)) {
      (metadata as Record<string, unknown>)[key] = value;
      continue;
    }

    config[key] = value;
  }

  return { metadata, config };
}

export { createDefaultQuizzRegistration } from "./default-games/quizz.js";

export const DEFAULT_GAME_REGISTRARS: Record<string, DefaultGameRegistrar> = {
  quizz: createDefaultQuizzRegistration
};

export function registerDefaultGames(
  playRoom: PlayRoomRegistrationApi,
  options: RegisterDefaultGamesOptions = {}
): void {
  const registrars = options.registrars ?? DEFAULT_GAME_REGISTRARS;
  const include = options.include ?? Object.keys(registrars);
  const context: DefaultGameRegistrarContext = {
    locale: playRoom.getLocale(),
    theme: playRoom.getTheme(),
    subscribeLocale: (listener) => playRoom.subscribeLocale(listener),
    subscribeTheme: (listener) => playRoom.subscribeTheme(listener)
  };

  for (const gameId of include) {
    const registrar = registrars[gameId];
    if (!registrar) {
      continue;
    }

    const registration = registrar({
      gameId,
      context,
      overrides: options.config?.[gameId] ?? {}
    });

    playRoom.registerGame<Record<string, unknown>>({
      game: registration.game,
      config: registration.config
    });
  }
}