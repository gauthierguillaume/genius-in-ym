// BOUTON ZOOM HOVER
if (!document.getElementById("genius-lyrics-btn-style")) {
	const style = document.createElement("style");
	style.id = "genius-lyrics-btn-style";
	style.textContent = `
    #genius-show-yt-lyrics-button:hover,
    #genius-show-genius-lyrics-button:hover {
    transform: translateX(-50%) scale(1.08) !important;
    box-shadow: 0 4px 16px 0 rgba(0,0,0,0.08);
    transition: transform 0.15s cubic-bezier(.34,2,.6,1), box-shadow 0.15s;
    z-index:10;
    }
    #genius-show-yt-lyrics-button,
    #genius-show-genius-lyrics-button {
    transition: transform 0.15s cubic-bezier(.34,2,.6,1), box-shadow 0.15s;
    }
    `;
	document.head.appendChild(style);
}

/* Variables */

let currentSongTitleInFrame;
let songTitleWithoutGeniusLyrics;
let userIsOnLyricsTab = false;
let lyricsTabIsDisabled = false;

const ytmusicTabRendererEl = document.querySelector("#tab-renderer");
let tabsContentEl = document.querySelector("#tabsContent");
let lyricsTabNavEl;
let songTitleEl = document.querySelector(".title.ytmusic-player-bar");

/* YT-Music Events */

const songSwitched = () => {
	checkLyricsTabAvailablity();
	songTitleWithoutGeniusLyrics = null;
	removeGeniusElements();
	if (userIsOnLyricsTab) {
		YTLyricsSection.setVisibility(true);
		userClickedOnLyricsTab();
	}
};

const userClickedOnNonLyricsTab = () => {
	userIsOnLyricsTab = false;
	if (!lyricsTabIsDisabled) {
		geniusFrame.setVisibility(false);
		geniusStatusMessage.setVisibility(false);
		geniusLyricsButton.remove();
		YTLyricsSection.setVisibility(true);
	}
};

const userClickedOnLyricsTab = async () => {
	if (!lyricsTabIsDisabled) userIsOnLyricsTab = true;

	let { songArtist, songTitle } = getSongInfo();

	if (!songArtist || !songTitle) {
		geniusStatusMessage.create("🤔Titre de la chanson non trouvé.");
		return;
	}

	if (songTitle === songTitleWithoutGeniusLyrics) return;

	if (
		document.querySelector("#genius-lyrics-frame-wrapper") &&
		songTitle === currentSongTitleInFrame
	) {
		/* Laisser les paroles YT visibles et proposer le bouton */
		YTLyricsSection.setVisibility(true);
		geniusFrame.setVisibility(false);
		geniusLyricsButton.create();
		return;
	}

	removeGeniusElements();

	geniusStatusMessage.create("🔎 Recherche sur GENIUS...");

	let lyricsURL = await getLyricsURL(songArtist, songTitle);

	if (!lyricsURL) {
		songTitleWithoutGeniusLyrics = songTitle;
		geniusStatusMessage.setMessage("😔Chanson non trouvé sur GENIUS.");
		return;
	}

	currentSongTitleInFrame = songTitle;
	geniusStatusMessage.setMessage("⌛Chargement de GENIUS...");

	geniusFrame.create(lyricsURL);
};

// Functions

const getSongInfo = () => {
	let songArtistEl =
		document.querySelector(
			"ytmusic-player-bar .middle-controls .content-info-wrapper .byline-wrapper .subtitle .byline .yt-simple-endpoint"
		) || document.querySelector(".ytmusic-player-bar .byline");
	let songTitleEl = document.querySelector(".title.ytmusic-player-bar");

	if (!songArtistEl || !songTitleEl) {
		return {
			songArtist: null,
			songTitle: null,
		};
	}

	let featureFilterRegex = /(?<=.)[\(\[\{][^\)\]\}]*[\)\]\}]$/;

	return {
		songArtist: songArtistEl.innerText,
		songTitle: songTitleEl.innerText.replace(featureFilterRegex, ""),
	};
};

const getLyricsURL = async (songArtist, songTitle) => {
	try {
		let req = await fetch(
			"https://genius.com/api/search/multi?q=" +
				encodeURIComponent(songArtist + " " + songTitle) +
				"&source=yt-music"
		);
		let res = await req.json();

		let topHits = res.response?.sections[0]?.hits;
		if (!topHits) return;

		let topHit = topHits.find((hit) => hit.type === "song");
		if (!topHit) return;

		return topHit.result.url + "?source=yt-music";
	} catch (e) {
		return;
	}
};

const checkLyricsTabAvailablity = () => {
	if (!lyricsTabNavEl) return;
	if (lyricsTabNavEl.hasAttribute("disabled")) {
		lyricsTabIsDisabled = true;
		return;
	}
	lyricsTabIsDisabled = false;
	return;
};

const removeGeniusElements = () => {
	geniusFrame.remove();
	geniusStatusMessage.remove();
	geniusLyricsButton.remove();
};

/* Elements */

const geniusFrame = {
	create: (lyricsURL) => {
		geniusFrame.remove();

		let wrapperEl = document.createElement("div");
		wrapperEl.id = "genius-lyrics-frame-wrapper";
		wrapperEl.style = `
            display: none;
            position: relative;
            width: 100%;
            height: calc(100% - 44px);
            min-height: 150px;
            margin: 14px 0;
            background: rgb(255, 255, 100);
            border-radius: 16px;
        `;

		let iFrameEl = document.createElement("iframe");
		iFrameEl.id = "genius-lyrics-frame";
		iFrameEl.src = lyricsURL;
		iFrameEl.innerText = "⌛Chargement...";
		iFrameEl.style = `
            width: calc(100% - 12px);
            height: calc(100% - 12px);
            margin-top: 6px;
            margin-left: 6px;
            border-radius: 10px;
            box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.16);
        `;

		let showYTLyricsButtonEl = YTLyricsButton.create();

		wrapperEl.appendChild(showYTLyricsButtonEl);
		wrapperEl.appendChild(iFrameEl);

		ytmusicTabRendererEl.prepend(wrapperEl);

		iFrameEl.onload = geniusFrame.onLoad = () => {
			/* Retire le message de chargement */
			geniusStatusMessage.remove();

			/* Nouveau comportement : on démarre caché */
			geniusFrame.setVisibility(false); // cache Genius
			YTLyricsSection.setVisibility(true); // montre les paroles YT

			/* Affiche le bouton manuel */
			geniusLyricsButton.create(); // ← ①
		}; // ← ②
	}, // ← ③
	setVisibility: (isVisible) => {
		let geniusLyricsFrameEl = document.querySelector(
			"#genius-lyrics-frame-wrapper"
		);
		if (!geniusLyricsFrameEl) return;
		geniusLyricsFrameEl.style.display = isVisible ? "flex" : "none";
	},
	remove: () => {
		document
			.querySelectorAll("#genius-lyrics-frame-wrapper")
			.forEach((el) => el.remove());
	},
};

const geniusStatusMessage = {
	create: (text) => {
		geniusStatusMessage.remove();

		let geniusStatusMessageEl = document.createElement("span");
		geniusStatusMessageEl.id = "genius-status-message";
		geniusStatusMessageEl.innerText = text;
		geniusStatusMessageEl.style = `
            display: inline-block;
            margin-top: 15px;
            margin-left: 50%;
            transform: translateX(-50%);
            color: rgb(255, 255, 100);
            background: rgb(255, 255, 100, 0.1);
            border-radius: 16px;
            padding: 12px 18px;
            font-weight: 700;
            font-size: 20px;
            font-family: YouTube Sans;
            line-height: 1.2;
            white-space: nowrap;
        `;

		ytmusicTabRendererEl.prepend(geniusStatusMessageEl);

		return geniusStatusMessageEl;
	},
	setMessage: (text) => {
		let statusMessageEl = document.querySelector("#genius-status-message");
		if (!statusMessageEl) {
			geniusStatusMessage.create(text);
			return;
		}
		statusMessageEl.innerText = text;
	},
	setVisibility: (isVisible) => {
		let statusMessageEl = document.querySelector("#genius-status-message");
		if (!statusMessageEl) return;
		statusMessageEl.style.display = isVisible ? "flex" : "none";
	},
	remove: () => {
		document
			.querySelectorAll("#genius-status-message")
			.forEach((el) => el.remove());
	},
};

const geniusLyricsButton = {
	create: () => {
		geniusLyricsButton.remove();

		let geniusLyricsButtonEl = document.createElement("span");
		geniusLyricsButtonEl.id = "genius-show-genius-lyrics-button";
		geniusLyricsButtonEl.innerHTML = `<svg viewBox="0 0 100 15" width="80" height="14" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.7 2.9s0-.1 0 0c-.8-.8-1.7-1.2-2.8-1.2-1.1 0-2.1.4-2.8 1.1-.2.2-.3.4-.5.6v.1c0 .1.1.1.1.1.4-.2.9-.3 1.4-.3 1.1 0 2.2.5 2.9 1.2h1.6c.1 0 .1-.1.1-.1V2.9c.1 0 0 0 0 0zm-.1 4.6h-1.5c-.8 0-1.4-.6-1.5-1.4.1 0 0-.1 0-.1-.3 0-.6.2-.8.4v.2c-.6 1.8.1 2.4.9 2.4h1.1c.1 0 .1.1.1.1v.4c0 .1.1.1.1.1.6-.1 1.2-.4 1.7-.8V7.6c.1 0 0-.1-.1-.1z"></path>
        <path d="M11.6 11.9s-.1 0 0 0c-.1 0-.1 0 0 0-.1 0-.1 0 0 0-.8.3-1.6.5-2.5.5-3.7 0-6.8-3-6.8-6.8 0-.9.2-1.7.5-2.5 0-.1-.1-.1-.2-.1h-.1C1.4 4.2.8 5.7.8 7.5c0 3.6 2.9 6.4 6.4 6.4 1.7 0 3.3-.7 4.4-1.8V12c.1 0 0-.1 0-.1zm13.7-3.1h3.5c.8 0 1.4-.5 1.4-1.3v-.2c0-.1-.1-.1-.1-.1h-4.8c-.1 0-.1.1-.1.1v1.4c-.1 0 0 .1.1.1zm5.1-6.7h-5.2c-.1 0-.1.1-.1.1v1.4c0 .1.1.1.1.1H29c.8 0 1.4-.5 1.4-1.3v-.2c.1-.1.1-.1 0-.1z"></path>
        <path d="M30.4 12.3h-6.1c-1 0-1.6-.6-1.6-1.6V1c0-.1-.1-.1-.1-.1-1.1 0-1.8.7-1.8 1.8V12c0 1.1.7 1.8 1.8 1.8H29c.8 0 1.4-.6 1.4-1.3v-.1c.1 0 .1-.1 0-.1zm12 0c-.6-.1-.9-.6-.9-1.3V1.1s0-.1-.1-.1H41c-.9 0-1.5.6-1.5 1.5v9.9c0 .9.6 1.5 1.5 1.5.8 0 1.4-.6 1.5-1.5 0-.1 0-.1-.1-.1zm8.2 0h-.2c-.9 0-1.4-.4-1.8-1.1l-4.5-7.4-.1-.1c-.1 0-.1.1-.1.1V8l2.8 4.7c.4.6.9 1.2 2 1.2 1 0 1.7-.5 2-1.4 0-.2-.1-.2-.1-.2zm-.9-3.8c.1 0 .1-.1.1-.1V1.1c0-.1 0-.1-.1-.1h-.4c-.9 0-1.5.6-1.5 1.5v3.1l1.7 2.8c.1 0 .1.1.2.1zm13 3.8c-.6-.1-.9-.6-.9-1.2v-10c0-.1 0-.1-.1-.1h-.3c-.9 0-1.5.6-1.5 1.5v9.9c0 .9.6 1.5 1.5 1.5.8 0 1.4-.6 1.5-1.5l-.2-.1zm18.4-.5H81c-.7.3-1.5.5-2.5.5-1.6 0-2.9-.5-3.7-1.4-.9-1-1.4-2.4-1.4-4.2V1c0-.1 0-.1-.1-.1H73c-.9 0-1.5.6-1.5 1.5V8c0 3.7 2 5.9 5.4 5.9 1.9 0 3.4-.7 4.3-1.9v-.1c0-.1 0-.1-.1-.1z"></path>
        <path d="M81.2.9h-.3c-.9 0-1.5.6-1.5 1.5v5.7c0 .7-.1 1.3-.3 1.8 0 .1.1.1.1.1 1.4-.3 2.1-1.4 2.1-3.3V1c0-.1-.1-.1-.1-.1zm12.7 7.6l1.4.3c1.5.3 1.6.8 1.6 1.2 0 .1.1.1.1.1 1.1-.1 1.8-.7 1.8-1.5s-.6-1.2-1.9-1.5l-1.4-.3c-3.2-.6-3.8-2.3-3.8-3.6 0-.7.2-1.3.6-1.9v-.2c0-.1-.1-.1-.1-.1-1.5.7-2.3 1.9-2.3 3.4-.1 2.3 1.3 3.7 4 4.1zm5.2 3.2c-.1.1-.1.1 0 0-.9.4-1.8.6-2.8.6-1.6 0-3-.5-4.3-1.4-.3-.3-.5-.6-.5-1 0-.1 0-.1-.1-.1s-.3-.1-.4-.1c-.4 0-.8.2-1.1.6-.2.3-.4.7-.3 1.1.1.4.3.7.6 1 1.4 1 2.8 1.5 4.5 1.5 2 0 3.7-.7 4.5-1.9v-.1c0-.1 0-.2-.1-.2z"></path>
        <path d="M94.1 3.2c0 .1.1.1.1.1h.2c1.1 0 1.7.3 2.4.8.3.2.6.3 1 .3s.8-.2 1.1-.6c.2-.3.3-.6.3-.9 0-.1 0-.1-.1-.1-.2 0-.3-.1-.5-.2-.8-.6-1.4-.9-2.6-.9-1.2 0-2 .6-2 1.4.1 0 .1 0 .1.1z"></path>
        </svg>
        `;
		geniusLyricsButtonEl.style = `
            display: inline-block;
            margin-top: 15px;
            margin-left: 50%;
            transform: translateX(-50%);
            margin-bottom: 4px;
            color: black;
            background: rgb(255, 255, 100);
            border-radius: 16px;
            padding: 6px 10px;
            font-weight: 600;
            font-size: 20px;
            font-family: YouTube Sans;
            line-height: 1.2;
            white-space: nowrap;
            cursor: pointer;
        `;

		ytmusicTabRendererEl.prepend(geniusLyricsButtonEl);

		geniusLyricsButtonEl.addEventListener(
			"click",
			geniusLyricsButton.onClick
		);
	},
	remove: () => {
		document
			.querySelectorAll("#genius-show-genius-lyrics-button")
			.forEach((el) => el.remove());
	},
	onClick: () => {
		YTLyricsSection.setVisibility(false);
		geniusFrame.setVisibility(true);

		geniusLyricsButton.remove();
	},
};

const YTLyricsButton = {
	create: () => {
		let YTLyricsButtonEl = document.createElement("span");
		YTLyricsButtonEl.id = "genius-show-yt-lyrics-button";
		YTLyricsButtonEl.innerHTML = `<svg viewBox="0 0 100 15" width="80" height="14" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.7 2.9s0-.1 0 0c-.8-.8-1.7-1.2-2.8-1.2-1.1 0-2.1.4-2.8 1.1-.2.2-.3.4-.5.6v.1c0 .1.1.1.1.1.4-.2.9-.3 1.4-.3 1.1 0 2.2.5 2.9 1.2h1.6c.1 0 .1-.1.1-.1V2.9c.1 0 0 0 0 0zm-.1 4.6h-1.5c-.8 0-1.4-.6-1.5-1.4.1 0 0-.1 0-.1-.3 0-.6.2-.8.4v.2c-.6 1.8.1 2.4.9 2.4h1.1c.1 0 .1.1.1.1v.4c0 .1.1.1.1.1.6-.1 1.2-.4 1.7-.8V7.6c.1 0 0-.1-.1-.1z"></path>
        <path d="M11.6 11.9s-.1 0 0 0c-.1 0-.1 0 0 0-.1 0-.1 0 0 0-.8.3-1.6.5-2.5.5-3.7 0-6.8-3-6.8-6.8 0-.9.2-1.7.5-2.5 0-.1-.1-.1-.2-.1h-.1C1.4 4.2.8 5.7.8 7.5c0 3.6 2.9 6.4 6.4 6.4 1.7 0 3.3-.7 4.4-1.8V12c.1 0 0-.1 0-.1zm13.7-3.1h3.5c.8 0 1.4-.5 1.4-1.3v-.2c0-.1-.1-.1-.1-.1h-4.8c-.1 0-.1.1-.1.1v1.4c-.1 0 0 .1.1.1zm5.1-6.7h-5.2c-.1 0-.1.1-.1.1v1.4c0 .1.1.1.1.1H29c.8 0 1.4-.5 1.4-1.3v-.2c.1-.1.1-.1 0-.1z"></path>
        <path d="M30.4 12.3h-6.1c-1 0-1.6-.6-1.6-1.6V1c0-.1-.1-.1-.1-.1-1.1 0-1.8.7-1.8 1.8V12c0 1.1.7 1.8 1.8 1.8H29c.8 0 1.4-.6 1.4-1.3v-.1c.1 0 .1-.1 0-.1zm12 0c-.6-.1-.9-.6-.9-1.3V1.1s0-.1-.1-.1H41c-.9 0-1.5.6-1.5 1.5v9.9c0 .9.6 1.5 1.5 1.5.8 0 1.4-.6 1.5-1.5 0-.1 0-.1-.1-.1zm8.2 0h-.2c-.9 0-1.4-.4-1.8-1.1l-4.5-7.4-.1-.1c-.1 0-.1.1-.1.1V8l2.8 4.7c.4.6.9 1.2 2 1.2 1 0 1.7-.5 2-1.4 0-.2-.1-.2-.1-.2zm-.9-3.8c.1 0 .1-.1.1-.1V1.1c0-.1 0-.1-.1-.1h-.4c-.9 0-1.5.6-1.5 1.5v3.1l1.7 2.8c.1 0 .1.1.2.1zm13 3.8c-.6-.1-.9-.6-.9-1.2v-10c0-.1 0-.1-.1-.1h-.3c-.9 0-1.5.6-1.5 1.5v9.9c0 .9.6 1.5 1.5 1.5.8 0 1.4-.6 1.5-1.5l-.2-.1zm18.4-.5H81c-.7.3-1.5.5-2.5.5-1.6 0-2.9-.5-3.7-1.4-.9-1-1.4-2.4-1.4-4.2V1c0-.1 0-.1-.1-.1H73c-.9 0-1.5.6-1.5 1.5V8c0 3.7 2 5.9 5.4 5.9 1.9 0 3.4-.7 4.3-1.9v-.1c0-.1 0-.1-.1-.1z"></path>
        <path d="M81.2.9h-.3c-.9 0-1.5.6-1.5 1.5v5.7c0 .7-.1 1.3-.3 1.8 0 .1.1.1.1.1 1.4-.3 2.1-1.4 2.1-3.3V1c0-.1-.1-.1-.1-.1zm12.7 7.6l1.4.3c1.5.3 1.6.8 1.6 1.2 0 .1.1.1.1.1 1.1-.1 1.8-.7 1.8-1.5s-.6-1.2-1.9-1.5l-1.4-.3c-3.2-.6-3.8-2.3-3.8-3.6 0-.7.2-1.3.6-1.9v-.2c0-.1-.1-.1-.1-.1-1.5.7-2.3 1.9-2.3 3.4-.1 2.3 1.3 3.7 4 4.1zm5.2 3.2c-.1.1-.1.1 0 0-.9.4-1.8.6-2.8.6-1.6 0-3-.5-4.3-1.4-.3-.3-.5-.6-.5-1 0-.1 0-.1-.1-.1s-.3-.1-.4-.1c-.4 0-.8.2-1.1.6-.2.3-.4.7-.3 1.1.1.4.3.7.6 1 1.4 1 2.8 1.5 4.5 1.5 2 0 3.7-.7 4.5-1.9v-.1c0-.1 0-.2-.1-.2z"></path>
        <path d="M94.1 3.2c0 .1.1.1.1.1h.2c1.1 0 1.7.3 2.4.8.3.2.6.3 1 .3s.8-.2 1.1-.6c.2-.3.3-.6.3-.9 0-.1 0-.1-.1-.1-.2 0-.3-.1-.5-.2-.8-.6-1.4-.9-2.6-.9-1.2 0-2 .6-2 1.4.1 0 .1 0 .1.1z"></path>
        </svg>
        `;
		YTLyricsButtonEl.style = `
            position: absolute;
            top: 6px;
            left: 50%;
            transform: translateX(-50%);
            color: black;
            backdrop-filter: blur(2px);
            background: rgb(255, 255, 100);
            border-radius: 16px;
            padding: 6px 10px;
            font-weight: 600;
            font-size: 20px;
            font-family: YouTube Sans;
            line-height: 1.2;
            white-space: nowrap;
            cursor: pointer;
        `;

		YTLyricsButtonEl.addEventListener("click", YTLyricsButton.onClick);

		return YTLyricsButtonEl;
	},
	onClick: () => {
		YTLyricsSection.setVisibility(true);
		geniusFrame.setVisibility(false);

		geniusLyricsButton.create();
	},
};

const YTLyricsSection = {
	setVisibility: (isVisible) => {
		let oldLyricsSectionEl = document.querySelector(
			"ytmusic-section-list-renderer[page-type] #contents ytmusic-description-shelf-renderer"
		);
		let noLyricsMessageEl = document.querySelector(
			"#tab-renderer ytmusic-message-renderer"
		);

		if (oldLyricsSectionEl)
			oldLyricsSectionEl.style.display = isVisible ? "block" : "none";
		if (noLyricsMessageEl)
			noLyricsMessageEl.style.display = isVisible ? "flex" : "none";
	},
};

let lyricsTabNavElFunctionsInitiated = false;

const initiateLyricsTabNavElFunctions = () => {
	if (lyricsTabNavElFunctionsInitiated) return;
	lyricsTabNavElFunctionsInitiated = true;

	lyricsTabNavEl = tabsContentEl.children[2];

	checkLyricsTabAvailablity();
	lyricsTabNavElObserver.observe(lyricsTabNavEl, { attributes: true });

	lyricsTabNavEl.addEventListener("click", () => {
		userClickedOnLyricsTab();
	});
};

/* Observers */

const lyricsTabNavElObserver = new MutationObserver(
	() => checkLyricsTabAvailablity
);

const tabsNavigationObserver = new MutationObserver((mutations) => {
	mutations.forEach((mutation) => {
		if (mutation.attributeName !== "page-type") return;
		if (
			mutation.target.getAttribute("page-type") !==
			"MUSIC_PAGE_TYPE_TRACK_LYRICS"
		) {
			userClickedOnNonLyricsTab();
			return;
		}
		userClickedOnLyricsTab();
	});
});

tabsNavigationObserver.observe(ytmusicTabRendererEl, { attributes: true });

const waitingForLyricsTabObserver = new MutationObserver((mutations) => {
	mutations.forEach((mutation) => {
		if (mutation.type !== "childList" && !mutation.addedNodes.length)
			return;
		if (!tabsContentEl.children[2]) return;

		waitingForLyricsTabObserver.disconnect();

		initiateLyricsTabNavElFunctions();
	});
});

waitingForLyricsTabObserver.observe(tabsContentEl, {
	characterData: false,
	attributes: false,
	childList: true,
	subtree: false,
});

const songSwitchObserver = new MutationObserver((mutations) => {
	mutations.forEach((mutation) => {
		if (mutation.type !== "childList" && !mutation.addedNodes.length)
			return;
		songSwitched();
	});
});

songSwitchObserver.observe(songTitleEl, {
	characterData: false,
	attributes: false,
	childList: true,
	subtree: false,
});

/* Start */

if (
	ytmusicTabRendererEl.getAttribute("page-type") ===
	"MUSIC_PAGE_TYPE_TRACK_LYRICS"
) {
	userClickedOnLyricsTab();
}
