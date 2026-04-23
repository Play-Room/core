import { createQuizzMetadataDefinition } from "@play-room/quizz";
import { GameDefinition } from "../types.js";
import { DefaultGameRegistrarInput, DefaultGameRegistration, splitGameOverrides } from "../default-games.js";

const QUIZZ_DEFAULT_CONFIG: Record<string, unknown> = {
  questionsUrlPattern:
    "https://raw.githubusercontent.com/Play-Room/data/refs/heads/main/quizz/{category}/{language}.json",
  answersUrl: "https://raw.githubusercontent.com/Play-Room/data/refs/heads/main/quizz/answers.json",
  categories: {
    animals: "Animals",
    animes: "Animes",
    biology: "Biology",
    books: "Books",
    business: "Business",
    fashion: "Fashion",
    games: "Games",
    movies: "Movies",
    music: "Music",
    science: "Science",
    sports: "Sports",
    technology: "Technology",
    tv_shows: "TV Shows"
  },
  defaultCategory: "technology",
  languages: {
    sr: "Српски",
    en: "English",
    fr: "Français",
    es: "Español",
    ja: "日本語",
    ru: "Русский",
    zh: "中文"
  },
  defaultLanguage: "en",
  limit: 5,
  randomizeQuestions: true,
  persistPlayerByClient: true,
  leaderboardLimit: 20,
  showLocaleSwitcher: false,
  showThemeSwitcher: false
};

export function createDefaultQuizzRegistration(input: DefaultGameRegistrarInput): DefaultGameRegistration {
  const quizzOverrides = splitGameOverrides(input.overrides);
  const game = createQuizzMetadataDefinition({
    id: input.gameId,
    ...quizzOverrides.metadata
  }) as GameDefinition<Record<string, unknown>>;

  return {
    game,
    config: {
      ...QUIZZ_DEFAULT_CONFIG,
      locale: input.context.locale,
      theme: input.context.theme,
      subscribeLocale: input.context.subscribeLocale,
      subscribeTheme: input.context.subscribeTheme,
      ...quizzOverrides.config
    }
  };
}
