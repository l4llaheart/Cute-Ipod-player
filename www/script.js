const playerScreen = document.querySelector('.player-screen');
const playerCover = document.querySelector('.player-screen .album-cover');
const playerTitle = document.querySelector('.player-screen .title');
const playerArtist = document.querySelector('.player-screen .Artist');
const progressBar = document.querySelector('.progression');

let currentAudio = new Audio(); 
let isPlaying = false;          
let currentlyPlayingSong = null; 

const leftButton = document.querySelector('.left-button');
const rightButton = document.querySelector('.right-button');
const menuButton = document.querySelector('.menu-button');
const bottomButton = document.querySelector('.bottom-button');
const centerButton = document.querySelector('.center-button');
const ipodWheel = document.querySelector('.ipod-wheel');

const prevHeart = document.querySelector('.previous-music-heart');
const currentHeart = document.querySelector('.current-music-heart');
const nextHeart = document.querySelector('.next-music-heart');
const carouselArtistName = document.querySelector('.all-songs .carousel-artist-name');
const carouselMusicName = document.querySelector('.all-songs .carousel-music-name');

const playlistScreenCarousel = document.querySelector('.ipod-selected-playlist');
const playlistPrevHeart = playlistScreenCarousel.querySelector('.previous-music-heart');
const playlistCurrentHeart = playlistScreenCarousel.querySelector('.current-music-heart');
const playlistNextHeart = playlistScreenCarousel.querySelector('.next-music-heart');
const playlistCarouselMusicName = playlistScreenCarousel.querySelector('.carousel-music-name');
const playlistCarouselArtistName = playlistScreenCarousel.querySelector('.carousel-artist-name');

const welcomeScreen = document.querySelector('.ipod-welcome');
const menuScreen = document.querySelector('.menu-screen');
const allSongsScreen = document.querySelector('.all-songs');
const playlistScreen = document.querySelector('.ipod-playlist');
const playlistNamesList = document.querySelector('.playlist-names-list');

const createPlaylistScreen = document.querySelector('.ipod-create-playlist');
const playlistSongListUI = document.querySelector('.newplaylist-song-list');
const chooseSongScreen = document.querySelector('.ipod-choose-song');
const songsToAddListUI = document.querySelector('.songs-to-add-list');

const settingsScreen = document.querySelector('.ipod-settings'); 
const themeScreen = document.querySelector('.ipod-themes');     
const aboutScreen = document.querySelector('.ipod-about');

const themeColorPicker = document.getElementById('theme-color-picker'); 
const wallpaperPicker = document.getElementById('wallpaper-picker'); 
const casePicker = document.getElementById('case-picker'); 

const nowPlayingMenuItem = document.getElementById('now-playing-menu-item');

const importTrigger = document.getElementById('import-trigger');
const folderPicker = document.getElementById('folder-picker');

let myLibrary = [];
let currentCarouselIndex = 0; 
let lastLeftClickTime = 0;    

let playlists = []; 
let activePlaylistIndex = -1;  
let playlistCarouselIndex = 0; 
let isReadingPlaylist = false; 

let isShuffleMode = false;
let shuffledPlaylistSongs = []; 

// ============================================
// 💾 PERSISTANCE (IndexedDB pour les musiques + localStorage pour playlists/thème)
// ============================================
const DB_NAME = 'ipodPlayerDB';
const DB_VERSION = 1;
let dbInstance = null;

function generateSongId() {
    return 'song_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains('songs')) {
                database.createObjectStore('songs', { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

function saveSongToDB(song) {
    if (!dbInstance) return;
    const tx = dbInstance.transaction('songs', 'readwrite');
    tx.objectStore('songs').put(song);
}

function deleteSongFromDB(id) {
    if (!dbInstance) return;
    const tx = dbInstance.transaction('songs', 'readwrite');
    tx.objectStore('songs').delete(id);
}

function loadSongsFromDB() {
    return new Promise((resolve, reject) => {
        if (!dbInstance) return resolve([]);
        const tx = dbInstance.transaction('songs', 'readonly');
        const request = tx.objectStore('songs').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
    });
}

function savePlaylistsToStorage() {
    const serializable = playlists.map(pl => ({
        name: pl.name,
        songIds: pl.songs.map(s => s.id)
    }));
    localStorage.setItem('ipod_playlists', JSON.stringify(serializable));
}

function loadPlaylistsFromStorage() {
    const raw = localStorage.getItem('ipod_playlists');
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return parsed.map(pl => ({
            name: pl.name,
            songs: pl.songIds.map(id => myLibrary.find(s => s.id === id)).filter(Boolean)
        }));
    } catch (e) {
        return [];
    }
}

function saveThemeToStorage(themeName) {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const themeData = {
        name: themeName,
        color: style.getPropertyValue('--theme-color').trim(),
        textLight: style.getPropertyValue('--theme-text-light').trim(),
        textColor: style.getPropertyValue('--theme-text-color').trim(),
        bgImage: root.style.getPropertyValue('--bg-image') || style.getPropertyValue('--bg-image').trim(),
        caseImage: root.style.getPropertyValue('--case-image') || style.getPropertyValue('--case-image').trim()
    };
    localStorage.setItem('ipod_theme', JSON.stringify(themeData));
}

function loadThemeFromStorage() {
    const raw = localStorage.getItem('ipod_theme');
    if (!raw) return;
    try {
        const t = JSON.parse(raw);
        const root = document.documentElement;
        if (t.color) root.style.setProperty('--theme-color', t.color);
        if (t.textLight) root.style.setProperty('--theme-text-light', t.textLight);
        if (t.textColor) root.style.setProperty('--theme-text-color', t.textColor);
        if (t.bgImage) root.style.setProperty('--bg-image', t.bgImage);
        if (t.caseImage) root.style.setProperty('--case-image', t.caseImage);

        if (t.name) {
            document.querySelectorAll('.themes-list .menu-item').forEach(item => {
                item.classList.toggle('active', item.dataset.theme === t.name);
            });
        }
    } catch (e) {
        console.error('Erreur de chargement du thème sauvegardé :', e);
    }
}

async function initApp() {
    try {
        dbInstance = await openDatabase();
        const savedSongs = await loadSongsFromDB();
        if (savedSongs.length > 0) {
            myLibrary = savedSongs;
            welcomeScreen.classList.add('hidden');
            menuScreen.classList.remove('hidden');
        }
        playlists = loadPlaylistsFromStorage();
        loadThemeFromStorage();
    } catch (err) {
        console.error('Erreur au chargement des données sauvegardées :', err);
    }
}

// ============================================
// 📱 MODE NATIF (Capacitor) - lecture en arrière-plan sur Android
// ============================================
async function setupNativeBackgroundMode() {
    // Si on est dans un simple navigateur (pas l'app native), on ne fait rien
    if (!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) {
        return;
    }
    try {
        const { BackgroundMode } = window.Capacitor.Plugins;
        if (!BackgroundMode) return;

        await BackgroundMode.requestForegroundPermission();
        await BackgroundMode.enable();
        await BackgroundMode.disableWebViewOptimizations();
        await BackgroundMode.disableBatteryOptimizations();
        console.log("Mode arrière-plan activé 🎧");
    } catch (err) {
        console.error("Erreur d'activation du mode arrière-plan :", err);
    }
}

function truncateText(text, maxLength = 25) {
    if (text.length > maxLength) {
        return text.substring(0, maxLength - 3) + "...";
    }
    return text;
}

function shuffleArray(array) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function changeScreen(screenToDisplay) {
    const allScreens = document.querySelectorAll('.screen-content');
    allScreens.forEach(screen => {
        screen.classList.add('hidden');
    });
    screenToDisplay.classList.remove('hidden');
}

function scrollActiveItemIntoView() {
    const activeScreen = document.querySelector('.screen-content:not(.hidden)');
    if (!activeScreen) return;

    const activeItem = activeScreen.querySelector('.menu-item.active');
    const scrollContainer = activeScreen.querySelector('.menu-list, .newplaylist-song-list, .playlist-names-list, .songs-to-add-list');

    if (activeItem && scrollContainer) {
        if (activeItem === scrollContainer.firstElementChild) {
            scrollContainer.scrollTop = 0;
            return;
        }
        if (activeItem === scrollContainer.lastElementChild) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
            return;
        }

        const containerTop = scrollContainer.scrollTop;
        const containerBottom = containerTop + scrollContainer.clientHeight;
        const elemTop = activeItem.offsetTop;
        const elemBottom = elemTop + activeItem.clientHeight;

        if (elemTop < containerTop) {
            scrollContainer.scrollTop = elemTop;
        } else if (elemBottom > containerBottom) {
            scrollContainer.scrollTop = elemBottom - scrollContainer.clientHeight;
        }
    }
}

if (importTrigger) {
    importTrigger.addEventListener('click', () => {
        folderPicker.click();
    });
}

folderPicker.addEventListener('change', (event) => {
    const files = event.target.files; 
    let filesProcessed = 0;
    let addedCount = 0;
    
    const mp3Files = Array.from(files).filter(file => file.name.endsWith('.mp3'));

    if (mp3Files.length === 0) {
        alert("Aucun fichier MP3 trouvé dans ce dossier ! 😭");
        return;
    }

    mp3Files.forEach((file, index) => {
        window.jsmediatags.read(file, {
            onSuccess: (tag) => {
                const tags = tag.tags;
                const songTitle = tags.title ? tags.title : file.name.replace('.mp3', '');
                const songArtist = tags.artist ? tags.artist : "Unknown Artist";
                
                const isAlreadyImported = myLibrary.some(
                    song => song.title.toLowerCase() === songTitle.toLowerCase() && 
                            song.artist.toLowerCase() === songArtist.toLowerCase()
                );

                if (!isAlreadyImported) {
                    let songCover = "https://picsum.photos/100/100?random=" + (myLibrary.length + index);
                    
                    if (tags.picture) {
                        const data = tags.picture.data;
                        const type = tags.picture.type;
                        const base64String = data.reduce((acc, byte) => acc + String.fromCharCode(byte), "");
                        songCover = `data:${type};base64,${btoa(base64String)}`;
                    }

                    const newSong = {
                        id: generateSongId(),
                        file: file,
                        title: songTitle,
                        artist: songArtist,
                        cover: songCover
                    };
                    myLibrary.push(newSong);
                    saveSongToDB(newSong);
                    addedCount++;
                }

                filesProcessed++;
                checkImportProgress(filesProcessed, mp3Files.length, addedCount);
            },
            onError: (error) => {
                const songTitle = file.name.replace('.mp3', '');
                const songArtist = "Unknown Artist";

                const isAlreadyImported = myLibrary.some(
                    song => song.title.toLowerCase() === songTitle.toLowerCase() && 
                            song.artist.toLowerCase() === songArtist.toLowerCase()
                );

                if (!isAlreadyImported) {
                    const newSong = {
                        id: generateSongId(),
                        file: file,
                        title: songTitle,
                        artist: songArtist,
                        cover: "https://picsum.photos/100/100?random=" + (myLibrary.length + index)
                    };
                    myLibrary.push(newSong);
                    saveSongToDB(newSong);
                    addedCount++;
                }

                filesProcessed++;
                checkImportProgress(filesProcessed, mp3Files.length, addedCount);
            }
        });
    });
});

function checkImportProgress(processed, total, added) {
    if (processed === total) {
        if (added === 0) {
            alert("Toutes ces musiques sont déjà dans ta bibliothèque ! 😊");
        } else {
            alert(`${added} nouvelles musiques ajoutées à ta bibliothèque ! 💖`);
        }
        changeScreen(menuScreen);
    }
}

centerButton.addEventListener('click', () => {
    if (!welcomeScreen.classList.contains('hidden')) {
        folderPicker.click();
    }
    else if (!menuScreen.classList.contains('hidden')) {
        const activeItem = menuScreen.querySelector('.menu-item.active');
        if (!activeItem) return;
        const text = activeItem.textContent.trim();

        if (text === "All Songs") {
            isReadingPlaylist = false;
            changeScreen(allSongsScreen);
            updateCarousel(); 
        } 
        else if (text === "Playlists") {
            changeScreen(playlistScreen);
            renderPlaylistMenu(); 
        }
        else if (text === "Settings") {
            changeScreen(settingsScreen);
        }
        else if (activeItem.id === "now-playing-menu-item") {
            changeScreen(playerScreen);
        }
    }
    else if (!settingsScreen.classList.contains('hidden')) {
        const activeItem = settingsScreen.querySelector('.menu-item.active');
        if (!activeItem) return;
        const text = activeItem.textContent.trim();

        if (text === "Themes") {
            changeScreen(themeScreen);
        } 
        else if (text === "Import Music") {
            folderPicker.click();
        }
        else if (text === "About") {
            changeScreen(aboutScreen);
        }
    }
    else if (!themeScreen.classList.contains('hidden')) {
        const activeItem = themeScreen.querySelector('.menu-item.active');
        if (!activeItem) return;
        const theme = activeItem.dataset.theme;

        applyTheme(theme);
    }
    else if (!aboutScreen.classList.contains('hidden')) {
        changeScreen(settingsScreen);
    }
    else if (!allSongsScreen.classList.contains('hidden')) {
        if (myLibrary.length === 0) return;
        const selectedSong = myLibrary[currentCarouselIndex];
        isReadingPlaylist = false;
        changeScreen(playerScreen);
        playSong(selectedSong);
    }
    else if (!playlistScreen.classList.contains('hidden')) {
        const activeItem = playlistScreen.querySelector('.menu-item.active');
        if (!activeItem) return;

        if (activeItem.classList.contains('playlist-maker')) {
            const playlistName = prompt("Donne un nom mignon à ta playlist ! 💕");
            if (playlistName && playlistName.trim() !== "") {
                playlists.push({ name: playlistName.trim(), songs: [] });
                savePlaylistsToStorage();
                renderPlaylistMenu();
            }
        } else {
            const index = parseInt(activeItem.dataset.playlistIndex);
            activePlaylistIndex = index;
            changeScreen(createPlaylistScreen);
            renderSongsInPlaylist();
        }
    }
    else if (!createPlaylistScreen.classList.contains('hidden')) {
        const activeItem = createPlaylistScreen.querySelector('.menu-item.active');
        if (!activeItem) return;

        const currentPlaylist = playlists[activePlaylistIndex];

        if (activeItem.classList.contains('playlist-play-all')) {
            if (currentPlaylist.songs.length === 0) {
                alert("Ajoute des chansons d'abord ! 🥺");
                return;
            }
            isShuffleMode = false;
            playlistCarouselIndex = 0;
            isReadingPlaylist = true;
            changeScreen(playlistScreenCarousel);
            updatePlaylistCarousel();
        } 
        else if (activeItem.classList.contains('playlist-shuffle')) {
            if (currentPlaylist.songs.length === 0) {
                alert("Ajoute des chansons d'abord ! 🥺");
                return;
            }
            isShuffleMode = true;
            shuffledPlaylistSongs = shuffleArray(currentPlaylist.songs);
            playlistCarouselIndex = 0;
            isReadingPlaylist = true;
            changeScreen(playlistScreenCarousel);
            updatePlaylistCarousel();
        }
        else if (activeItem.classList.contains('pnew-song-to-add')) {
            changeScreen(chooseSongScreen);
            renderSongsToChoose();
        } 
        else if (activeItem.classList.contains('added-song')) {
            const songIndex = parseInt(activeItem.dataset.songIndex);
            isShuffleMode = false;
            playlistCarouselIndex = songIndex;
            isReadingPlaylist = true;
            changeScreen(playlistScreenCarousel);
            updatePlaylistCarousel();
        }
    }
    else if (!chooseSongScreen.classList.contains('hidden')) {
        const activeItem = chooseSongScreen.querySelector('.menu-item.active');
        if (!activeItem) return;

        const songLibraryIndex = parseInt(activeItem.dataset.libraryIndex);
        const songToAdd = myLibrary[songLibraryIndex];

        playlists[activePlaylistIndex].songs.push(songToAdd);
        savePlaylistsToStorage();

        changeScreen(createPlaylistScreen);
        renderSongsInPlaylist();
    }
    else if (!playlistScreenCarousel.classList.contains('hidden')) {
        const currentPlaylist = playlists[activePlaylistIndex];
        const playlistSongs = isShuffleMode ? shuffledPlaylistSongs : currentPlaylist.songs;
        if (playlistSongs.length === 0) return;

        const selectedSong = playlistSongs[playlistCarouselIndex];
        isReadingPlaylist = true;
        changeScreen(playerScreen);
        playSong(selectedSong);
    }
});

function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === 'pink-cyber') {
        root.style.setProperty('--theme-color', '#fd63bc');
        root.style.setProperty('--theme-text-light', '#ffc0e5');
        root.style.setProperty('--theme-text-color', '#fd63bc');
        root.style.setProperty('--bg-image', "url('https://files.catbox.moe/kfm4l5.gif')"); 
        root.style.setProperty('--case-image', "url('https://files.catbox.moe/dscgu0.gif')"); 
        saveThemeToStorage(theme);
    } 
    else if (theme === 'blue-cyber') {
        root.style.setProperty('--theme-color', '#5ad1f6');
        root.style.setProperty('--theme-text-light', '#a1e9ff');
        root.style.setProperty('--theme-text-color', '#5ad1f6');
        root.style.setProperty('--bg-image', "url('https://files.catbox.moe/2p9iqb.gif')"); 
        root.style.setProperty('--case-image', "url('https://files.catbox.moe/jowyq8.gif')"); 
        saveThemeToStorage(theme);
    } 
    else if (theme === 'black-cyber') {
        root.style.setProperty('--theme-color', '#1a1a1a'); 
        root.style.setProperty('--theme-text-light', '#333333'); 
        root.style.setProperty('--theme-text-color', '#ffffff'); 
        root.style.setProperty('--bg-image', "url('https://files.catbox.moe/8vgaqu.gif')"); 
        root.style.setProperty('--case-image', "url('https://files.catbox.moe/138ouk.gif')"); 
        saveThemeToStorage(theme);
    } 
    else if (theme === 'my-theme') {
        alert("Étape 1/3 : choisis la couleur de ton thème 🎨");
        themeColorPicker.click();
    }
}

themeColorPicker.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--theme-color', e.target.value);
    document.documentElement.style.setProperty('--theme-text-color', e.target.value);
});

themeColorPicker.addEventListener('change', () => {
    alert("Étape 2/3 : choisis l'image de fond de l'écran 🖼️");
    wallpaperPicker.click();
});

wallpaperPicker.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            document.documentElement.style.setProperty('--bg-image', `url('${event.target.result}')`);
            alert("Étape 3/3 : choisis l'image du boîtier (le fond de l'iPod) 📱");
            casePicker.click();
        };
        reader.readAsDataURL(file);
    }
});

casePicker.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            document.documentElement.style.setProperty('--case-image', `url('${event.target.result}')`);
            saveThemeToStorage('my-theme');
            alert("Ton thème personnalisé est maintenant complet ! 🎨✨");
        };
        reader.readAsDataURL(file);
    }
});

function renderPlaylistMenu() {
    playlistNamesList.innerHTML = '<li class="menu-item active playlist-maker">+ Create a Playlist</li>';
    
    playlists.forEach((pl, index) => {
        const li = document.createElement('li');
        li.className = 'menu-item';
        li.textContent = `📂 ${truncateText(pl.name, 18)} (${pl.songs.length} tounes)`;
        li.dataset.playlistIndex = index;
        playlistNamesList.appendChild(li);
    });

    playlistNamesList.scrollTop = 0;
}

function renderSongsInPlaylist() {
    const currentPlaylist = playlists[activePlaylistIndex];
    document.querySelector('.playlist-title-empty').textContent = truncateText(currentPlaylist.name, 15);

    playlistSongListUI.innerHTML = `
        <li class="menu-item active playlist-play-all" style="font-weight: bold;">▶ Play Playlist</li>
        <li class="menu-item playlist-shuffle" style="font-weight: bold;">🔀 Shuffle Playlist</li>
        <li class="menu-item pnew-song-to-add" style="font-weight: bold;">+ Add a song</li>
    `;

    currentPlaylist.songs.forEach((song, index) => {
        const li = document.createElement('li');
        li.className = 'menu-item added-song';
        li.textContent = `🎵 ${truncateText(song.title, 22)}`;
        li.dataset.songIndex = index;
        playlistSongListUI.appendChild(li);
    });

    playlistSongListUI.scrollTop = 0;
}

function renderSongsToChoose() {
    songsToAddListUI.innerHTML = '';
    
    if (myLibrary.length === 0) {
        songsToAddListUI.innerHTML = '<li class="menu-item active">Aucune musique importée...</li>';
        return;
    }

    myLibrary.forEach((song, index) => {
        const li = document.createElement('li');
        li.className = index === 0 ? 'menu-item active' : 'menu-item';
        li.textContent = `➕ ${truncateText(song.title, 22)}`;
        li.dataset.libraryIndex = index;
        songsToAddListUI.appendChild(li);
    });

    songsToAddListUI.scrollTop = 0;
}

function moveSelection(direction) {
    const activeScreen = document.querySelector('.screen-content:not(.hidden)');
    if (!activeScreen) return;

    const items = activeScreen.querySelectorAll('.menu-item');
    if (items.length === 0) return;

    let activeIndex = -1;
    items.forEach((item, index) => {
        if (item.classList.contains('active')) {
            activeIndex = index;
        }
    });

    if (activeIndex === -1) {
        items[0].classList.add('active');
        scrollActiveItemIntoView();
        return;
    }

    items[activeIndex].classList.remove('active'); 

    if (direction === 'down') {
        activeIndex = (activeIndex + 1) % items.length;
    } else if (direction === 'up') {
        activeIndex = (activeIndex - 1 + items.length) % items.length;
    }

    items[activeIndex].classList.add('active');
    scrollActiveItemIntoView();
}

menuButton.addEventListener('click', (e) => {
    e.stopPropagation(); 
    
    if (!playerScreen.classList.contains('hidden')) {
        if (isReadingPlaylist) {
            changeScreen(playlistScreenCarousel);
            updatePlaylistCarousel();
        } else {
            changeScreen(allSongsScreen);
            updateCarousel();
        }
    } 
    else if (!playlistScreenCarousel.classList.contains('hidden')) {
        changeScreen(createPlaylistScreen);
        renderSongsInPlaylist();
    }
    else if (!chooseSongScreen.classList.contains('hidden')) {
        changeScreen(createPlaylistScreen);
        renderSongsInPlaylist();
    }
    else if (!createPlaylistScreen.classList.contains('hidden')) {
        changeScreen(playlistScreen);
        renderPlaylistMenu();
    }
    else if (!themeScreen.classList.contains('hidden')) {
        changeScreen(settingsScreen);
    }
    else if (!aboutScreen.classList.contains('hidden')) {
        changeScreen(settingsScreen);
    }
    else if (!settingsScreen.classList.contains('hidden')) {
        changeScreen(menuScreen);
    }
    else if (!allSongsScreen.classList.contains('hidden') || !playlistScreen.classList.contains('hidden')) {
        changeScreen(menuScreen);
    } 
    else {
        moveSelection('up');
    }
});

bottomButton.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (!playerScreen.classList.contains('hidden')) {
        if (isPlaying) {
            currentAudio.pause();
            isPlaying = false;
        } else {
            currentAudio.play();
            isPlaying = true;
        }
    } else {
        moveSelection('down');
    }
});

function updateCarousel() {
    if (myLibrary.length === 0) return;

    const currentSong = myLibrary[currentCarouselIndex];
    const prevIndex = (currentCarouselIndex - 1 + myLibrary.length) % myLibrary.length;
    const prevSong = myLibrary[prevIndex];
    const nextIndex = (currentCarouselIndex + 1) % myLibrary.length;
    const nextSong = myLibrary[nextIndex];

    currentHeart.src = currentSong.cover;
    prevHeart.src = prevSong.cover;
    nextHeart.src = nextSong.cover;

    carouselMusicName.textContent = truncateText(currentSong.title, 18);
    carouselArtistName.textContent = truncateText(currentSong.artist, 18);
}

function updatePlaylistCarousel() {
    const currentPlaylist = playlists[activePlaylistIndex];
    if (!currentPlaylist) return;
    
    const playlistSongs = isShuffleMode ? shuffledPlaylistSongs : currentPlaylist.songs;
    if (playlistSongs.length === 0) return;

    playlistScreenCarousel.querySelector('.playlist-title').textContent = truncateText(currentPlaylist.name, 15);

    const songsCount = playlistSongs.length;
    const currentSong = playlistSongs[playlistCarouselIndex];
    
    const prevIndex = (playlistCarouselIndex - 1 + songsCount) % songsCount;
    const prevSong = playlistSongs[prevIndex];
    
    const nextIndex = (playlistCarouselIndex + 1) % songsCount;
    const nextSong = playlistSongs[nextIndex];

    playlistCurrentHeart.src = currentSong.cover;
    playlistPrevHeart.src = prevSong.cover;
    playlistNextHeart.src = nextSong.cover;

    playlistCarouselMusicName.textContent = truncateText(currentSong.title, 18);
    playlistCarouselArtistName.textContent = truncateText(currentSong.artist, 18);
}

rightButton.addEventListener('click', (e) => {
    e.stopPropagation(); 
    
    if (!allSongsScreen.classList.contains('hidden')) {
        if (myLibrary.length === 0) return;
        currentCarouselIndex = (currentCarouselIndex + 1) % myLibrary.length;
        updateCarousel();
    } 
    else if (!playlistScreenCarousel.classList.contains('hidden')) {
        const currentPlaylist = playlists[activePlaylistIndex];
        const playlistSongs = isShuffleMode ? shuffledPlaylistSongs : currentPlaylist.songs;
        if (playlistSongs.length === 0) return;
        
        playlistCarouselIndex = (playlistCarouselIndex + 1) % playlistSongs.length;
        updatePlaylistCarousel();
    }
    else if (!playerScreen.classList.contains('hidden')) {
        if (isReadingPlaylist) {
            const currentPlaylist = playlists[activePlaylistIndex];
            const playlistSongs = isShuffleMode ? shuffledPlaylistSongs : currentPlaylist.songs;
            if (playlistSongs.length === 0) return;
            
            playlistCarouselIndex = (playlistCarouselIndex + 1) % playlistSongs.length;
            playSong(playlistSongs[playlistCarouselIndex]);
        } else {
            if (myLibrary.length === 0) return;
            currentCarouselIndex = (currentCarouselIndex + 1) % myLibrary.length;
            playSong(myLibrary[currentCarouselIndex]);
        }
    }
});

leftButton.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (!allSongsScreen.classList.contains('hidden')) {
        if (myLibrary.length === 0) return;
        currentCarouselIndex = (currentCarouselIndex - 1 + myLibrary.length) % myLibrary.length;
        updateCarousel();
    } 
    else if (!playlistScreenCarousel.classList.contains('hidden')) {
        const currentPlaylist = playlists[activePlaylistIndex];
        const playlistSongs = isShuffleMode ? shuffledPlaylistSongs : currentPlaylist.songs;
        if (playlistSongs.length === 0) return;
        
        playlistCarouselIndex = (playlistCarouselIndex - 1 + playlistSongs.length) % playlistSongs.length;
        updatePlaylistCarousel();
    }
    else if (!playerScreen.classList.contains('hidden')) {
        const now = Date.now();
        const timeSinceLastClick = now - lastLeftClickTime;

        if (timeSinceLastClick < 500) {
            if (isReadingPlaylist) {
                const currentPlaylist = playlists[activePlaylistIndex];
                const playlistSongs = isShuffleMode ? shuffledPlaylistSongs : currentPlaylist.songs;
                if (playlistSongs.length === 0) return;
                
                playlistCarouselIndex = (playlistCarouselIndex - 1 + playlistSongs.length) % playlistSongs.length;
                playSong(playlistSongs[playlistCarouselIndex]);
            } else {
                if (myLibrary.length === 0) return;
                currentCarouselIndex = (currentCarouselIndex - 1 + myLibrary.length) % myLibrary.length;
                playSong(myLibrary[currentCarouselIndex]);
            }
        } else {
            currentAudio.currentTime = 0;
        }
        lastLeftClickTime = now;
    }
});

// ============================================
// 🌀 GESTE DE ROTATION SUR LA MOLETTE (façon vrai iPod)
// ============================================
let wheelLastAngle = null;
let wheelAccumulatedAngle = 0;
const WHEEL_ROTATION_STEP = 18; // degrés à parcourir avant de déclencher un "clic"

function getAngleFromCenter(clientX, clientY) {
    const rect = ipodWheel.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
}

function wheelGestureStart(clientX, clientY, target) {
    // Ignore le geste si on appuie directement sur un des boutons (clic normal)
    if (target.closest('.center-button, .menu-button, .left-button, .right-button, .bottom-button')) {
        return;
    }
    wheelLastAngle = getAngleFromCenter(clientX, clientY);
    wheelAccumulatedAngle = 0;
}

function wheelGestureMove(clientX, clientY) {
    if (wheelLastAngle === null) return;

    const currentAngle = getAngleFromCenter(clientX, clientY);
    let delta = currentAngle - wheelLastAngle;

    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    wheelAccumulatedAngle += delta;
    wheelLastAngle = currentAngle;

    if (wheelAccumulatedAngle >= WHEEL_ROTATION_STEP) {
        rightButton.click(); // sens horaire = suivant
        wheelAccumulatedAngle = 0;
    } else if (wheelAccumulatedAngle <= -WHEEL_ROTATION_STEP) {
        leftButton.click(); // sens antihoraire = précédent
        wheelAccumulatedAngle = 0;
    }
}

function wheelGestureEnd() {
    wheelLastAngle = null;
    wheelAccumulatedAngle = 0;
}

// Souris (pratique pour tester sur ordinateur)
ipodWheel.addEventListener('mousedown', (e) => {
    wheelGestureStart(e.clientX, e.clientY, e.target);
});
document.addEventListener('mousemove', (e) => {
    if (wheelLastAngle !== null) wheelGestureMove(e.clientX, e.clientY);
});
document.addEventListener('mouseup', wheelGestureEnd);

// Tactile (mobile)
ipodWheel.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    wheelGestureStart(touch.clientX, touch.clientY, e.target);
}, { passive: true });

ipodWheel.addEventListener('touchmove', (e) => {
    if (wheelLastAngle !== null) {
        e.preventDefault(); // évite que la page défile pendant le geste
        const touch = e.touches[0];
        wheelGestureMove(touch.clientX, touch.clientY);
    }
}, { passive: false });

ipodWheel.addEventListener('touchend', wheelGestureEnd);
ipodWheel.addEventListener('touchcancel', wheelGestureEnd);

function playSong(songObject) {
    currentAudio.pause();

    currentAudio.src = URL.createObjectURL(songObject.file);
    currentAudio.play();
    isPlaying = true;
    currentlyPlayingSong = songObject; 

    if (nowPlayingMenuItem) {
        nowPlayingMenuItem.style.display = 'block';
    }

    playerTitle.textContent = truncateText(songObject.title, 18);
    playerArtist.textContent = truncateText(songObject.artist, 18);
    
    playerCover.style.backgroundImage = `url('${songObject.cover}')`;
    playerCover.style.backgroundSize = 'cover';
    playerCover.style.backgroundPosition = 'center';

    // Affiche les infos + contrôles sur l'écran verrouillé / notifications (Android + certains navigateurs)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: songObject.title,
            artist: songObject.artist,
            artwork: [{ src: songObject.cover, sizes: '512x512', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', () => { currentAudio.play(); isPlaying = true; });
        navigator.mediaSession.setActionHandler('pause', () => { currentAudio.pause(); isPlaying = false; });
        navigator.mediaSession.setActionHandler('nexttrack', () => rightButton.click());
        navigator.mediaSession.setActionHandler('previoustrack', () => leftButton.click());
    }

    currentAudio.addEventListener('timeupdate', () => {
        if (currentAudio.duration) {
            const percentage = (currentAudio.currentTime / currentAudio.duration) * 100;
            progressBar.style.width = percentage + '%';
        }
    });

    currentAudio.onended = () => {
        if (isReadingPlaylist) {
            const currentPlaylist = playlists[activePlaylistIndex];
            const playlistSongs = isShuffleMode ? shuffledPlaylistSongs : currentPlaylist.songs;
            playlistCarouselIndex = (playlistCarouselIndex + 1) % playlistSongs.length;
            playSong(playlistSongs[playlistCarouselIndex]);
        } else {
            currentCarouselIndex = (currentCarouselIndex + 1) % myLibrary.length;
            playSong(myLibrary[currentCarouselIndex]);
        }
    };
}

// 🚀 Démarrage : recharge musiques / playlists / thème sauvegardés
initApp();
setupNativeBackgroundMode();