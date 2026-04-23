import { PlayRoom, registerDefaultGames } from "../dist/index.js";

const playRoom = new PlayRoom();

registerDefaultGames(playRoom, {
	config: {
		quizz: {
			leaderboardLimit: 50
		}
	}
});

const browserContainer = document.getElementById("playroom-browser");
playRoom.renderGamePicker(browserContainer);
