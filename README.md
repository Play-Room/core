# @play-room/core

PlayRoom is a lightweight game hub. It does not own game logic or data services. Each game is an independent module that PlayRoom can register, list, and launch.

## Install

```bash
npm install @play-room/core
```

## Quick Start

```ts
import { PlayRoom } from "@play-room/core";

const playRoom = new PlayRoom({
  locale: "en",
  theme: "light"
});

console.log(playRoom.listGames());
```

## Core UI Options

```ts
const playRoom = new PlayRoom({
  browserStartMode: "inline", // "inline" | "modal"
  draggableModal: true,
  resizableModal: {
    enabled: true,
    size: {
      width: {
        min: "420px",
        base: "min(920px, 96vw)",
        max: "98vw"
      },
      height: {
        min: "320px",
        base: "80vh",
        max: "96vh"
      }
    }
  },
  locale: "en",
  onLocaleChange: (locale) => {
    console.log("locale", locale);
  },
  showLocaleSwitcher: true,
  theme: "light",
  onThemeChange: (theme) => {
    console.log("theme", theme);
  },
  showThemeSwitcher: true,
  themeColors: {
    primary: "#0f766e",
    secondary: "#475569"
  },
  launcher: {
    mode: "floating",
    position: "bottom-right",
    startOpen: false,
    pulse: true
  }
});
```

## Runtime Locale and Theme API

Use PlayRoom as the source of truth for locale and theme.

```ts
playRoom.setLocale("sr");
playRoom.setTheme("dark");

const offLocale = playRoom.subscribeLocale((locale) => {
  console.log("locale changed", locale);
});

const offTheme = playRoom.subscribeTheme((theme) => {
  console.log("theme changed", theme);
});

offLocale();
offTheme();
```

## Game Authoring Guide

This section describes what a game package needs so it can be added to PlayRoom.

### 1. Required Runtime Contract

A PlayRoom game is a GameDefinition with metadata and a createInstance function.

Required metadata fields:

- id: stable unique id
- name: default display name
- createInstance(context): returns an instance with mount and optional unmount

Optional metadata fields:

- icon: emoji, SVG string, or image URL/path
- description: default description
- tags: used by filters/search
- locales: localized metadata by locale code

Localized metadata shape:

```ts
locales: {
  en: {
    name: "Smart Quizz",
    description: "Quizz game with multiple categories and languages.",
    tags: ["quizz", "knowledge"]
  },
  sr: {
    name: "Pametni Kviz",
    description: "Kviz igra sa više kategorija i jezika.",
    tags: ["kviz", "znanje"]
  }
}
```

When locale changes, PlayRoom automatically uses locales[currentLocale] (with en fallback) for name, description, and tags in the catalog UI.

### 2. Recommended File Layout for a Game Package

```text
my-game/
  src/
    index.ts
    metadata.ts
    game.ts
    types.ts
    locales/
      en.json
      sr.json
  package.json
  tsconfig.json
```

Minimal responsibilities:

- src/metadata.ts: exports a function that returns PlayRoom metadata + createInstance
- src/game.ts: actual game runtime (mount, unmount)
- src/locales/*.json: UI and metadata translations (recommended)
- src/index.ts: exports metadata factory and game factory

### 3. Example Game Metadata Factory

```ts
import { createMyGameApp } from "./game.js";

export function createMyGameDefinition() {
  return {
    id: "my-game",
    name: "My Game",
    description: "Default English description.",
    tags: ["puzzle"],
    locales: {
      en: {
        name: "My Game",
        description: "Default English description.",
        tags: ["puzzle"]
      },
      sr: {
        name: "Moja Igra",
        description: "Opis igre na srpskom.",
        tags: ["slagalica"]
      }
    },
    async createInstance(context: { gameConfig?: Record<string, unknown> }) {
      return createMyGameApp(context.gameConfig ?? {});
    }
  };
}
```

### 4. Game Instance Lifecycle

Game instances should implement:

- mount(container): render UI into the provided container
- unmount(): cleanup listeners, timers, DOM state, storage subscriptions

PlayRoom can launch your game inline or modal. Your game should not assume either mode.

### 5. Register a Game in PlayRoom

```ts
import { PlayRoom } from "@play-room/core";
import { createMyGameDefinition } from "@my-scope/my-game";

const playRoom = new PlayRoom({ locale: "en", theme: "light" });

playRoom.registerGame({
  game: createMyGameDefinition(),
  config: {
    difficulty: "normal"
  }
});
```

### 6. Pass PlayRoom Locale and Theme Into Your Game

If your game supports runtime locale/theme updates, pass current values and subscriptions in game config:

```ts
playRoom.registerGame({
  game: createMyGameDefinition(),
  config: {
    locale: playRoom.getLocale(),
    theme: playRoom.getTheme(),
    subscribeLocale: playRoom.subscribeLocale.bind(playRoom),
    subscribeTheme: playRoom.subscribeTheme.bind(playRoom)
  }
});
```

This allows your game UI to update immediately when PlayRoom locale or theme changes.

## Rendering the Game Picker

```ts
playRoom.renderGamePicker(document.getElementById("app")!);
```

## Using a Custom UI Adapter

```ts
playRoom.renderGamePicker(document.getElementById("app")!, {
  renderGameBrowser({ container, catalog, launch }) {
    const { items } = catalog({ search: "quiz" });

    // Inline
    launch(items[0].id, { mode: "inline", container });

    // Modal
    // launch(items[0].id, { mode: "modal" });
  }
});
```
