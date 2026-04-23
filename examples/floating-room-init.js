import { PlayRoom } from "../dist/index.js";
import { registerExampleGames } from "./game-init.js";

const playRoom = new PlayRoom({
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
});

registerExampleGames(playRoom, {
  locale: playRoom.getLocale(),
  theme: playRoom.getTheme(),
  subscribeLocale: playRoom.subscribeLocale.bind(playRoom),
  subscribeTheme: playRoom.subscribeTheme.bind(playRoom)
});

const browserContainer = document.getElementById("playroom-browser");
playRoom.renderGamePicker(browserContainer);
