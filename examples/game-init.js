import { createQuizzMetadataDefinition } from "@play-room/quizz";

export function registerExampleGames(
  playRoom,
  { locale = "en", theme = "light", subscribeLocale, subscribeTheme, config = {} } = {}
) {
  playRoom.registerGame({
    game: createQuizzMetadataDefinition(),
    config: {
        // Questions are category/language-specific, answers are global for all categories
        questionsUrlPattern: "https://raw.githubusercontent.com/Play-Room/data/refs/heads/main/quizz/{category}/{language}.json",
        answersUrl: "https://raw.githubusercontent.com/Play-Room/data/refs/heads/main/quizz/answers.json",
        
        // Categories and languages as label maps (key is value used by service)
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
        defaultCategory: "technology",  // Used as default if categories.length > 1
        
        languages: {
          sr: "Српски",
          en: "English",
          fr: "Français",
          es: "Español",
          ja: "日本語",
          ru: "Русский",
          zh: "中文"
        },
        defaultLanguage: "en",  // Used as default if languages.length > 1
        
        // Game settings
        limit: 5,
        randomizeQuestions: true,
        persistPlayerByClient: true,
        leaderboardLimit: 20,

        // Initial values — pushed changes come via subscribeLocale/subscribeTheme
        locale,
        theme,
        subscribeLocale,
        subscribeTheme,
        showLocaleSwitcher: false,
        showThemeSwitcher: false
    }
  });
}
