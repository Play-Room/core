import { PlayRoom } from "../dist/index.js";
import { registerExampleGames } from "./game-init.js";

const playRoom = new PlayRoom({
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
		{ value: "sr", label: "Српски" },
		{ value: "fr", label: "Français" }
	],
	localeMessages: {
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
			dark: "Dark"
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
			dark: "Tamna"
		}
	},
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
