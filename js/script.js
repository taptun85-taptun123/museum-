// Данные игр из localStorage
let games = [];
let currentPage = 1;
const itemsPerPage = 12;

//Музыка

let tracks = [];
let currentTrackIndex = 0;
let isPlaying = false;
let audio = new Audio();

async function loadTracks() {
    try {
        const response = await fetch('media/music/tracks.json');
        if (!response.ok) throw new Error('Не удалось загрузить список треков');
        tracks = await response.json();
        // После загрузки выбираем случайный трек
        currentTrackIndex = Math.floor(Math.random() * tracks.length);
        loadTrack(currentTrackIndex);
    } catch (error) {
        console.error('Ошибка загрузки треков:', error);
        // Можно вывести сообщение пользователю или оставить плеер неактивным
    }
}
function exportGames() {
    const data = JSON.stringify(games, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'games.json';
    a.click();
    URL.revokeObjectURL(a.href);
}

function importGames(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                games = imported;
                saveGames();
                renderGames();
                alert('Коллекция загружена!');
            } else {
                alert('Неверный формат файла.');
            }
        } catch {
            alert('Ошибка при чтении файла.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function loadGames() {
    const saved = localStorage.getItem('games');
    if (saved) {
        try {
            games = JSON.parse(saved);
        } catch {
            games = [];
        }
    } else {
        games = [
            { id: 1, title: 'Getting Up', platform: 'PS2', year: 2006, cover: 'media/covers/getting-up.jpg', passed: false, platinum: false, steamId: null},
            { id: 2, title: 'Jade Cocoon', platform: 'PS1', year: 2000, cover: 'media/covers/jade-cocoon.jpg', passed: false, platinum: false, steamId: null },
            { id: 3, title: 'Alundra', platform: 'PS1', year: 1998, cover: 'media/covers/alundra.jpg', passed: false, platinum: false, steamId: null }
        ];
        saveGames();
    }
    renderGames();
}

function saveGames() {
    localStorage.setItem('games', JSON.stringify(games));
}

function addGame() {
	const platform = document.getElementById('gamePlatform').value;
    const title = document.getElementById('gameTitle').value.trim();
    const cover = document.getElementById('gameCover').value.trim().replace(/\\/g, '/') || '';
    const backCover = document.getElementById('gameBackCover').value.trim().replace(/\\/g, '/') || '';
	const year = parseInt(document.getElementById('gameYear').value) || 0;
    const manual = document.getElementById('gameManual').value.trim().replace(/\\/g, '/') || '';
    const discs = document.getElementById('gameDiscs').value.split(',').map(s => s.trim().replace(/\\/g, '/')).filter(s => s);
    const screenshots = document.getElementById('gameScreenshots').value.split(',').map(s => s.trim().replace(/\\/g, '/')).filter(s => s);
    const bosses = document.getElementById('gameBosses').value.split(',').map(s => s.trim().replace(/\\/g, '/')).filter(s => s);

    const achievementsRaw = document.getElementById('gameAchievements').value.split(',').map(s => s.trim()).filter(s => s);
    const achievements = achievementsRaw.map(item => {
        const parts = item.split('|').map(s => s.trim());
        return parts.length === 2 ? { name: parts[0], icon: parts[1].replace(/\\/g, '/') } : null;
    }).filter(Boolean);

    if (!title) {
        alert('Введи название игры');
        return;
    }

    const newGame = {
        id: Date.now(),
        title: title,
        platform: platform,
        year: year,
        cover: cover || 'media/covers/default.webp',
        backCover: backCover || 'media/covers/default_back.jpg',
        manual: manual || '',
        discs: discs,
        screenshots: screenshots,
        bosses: bosses,
        achievements: achievements,
        passed: false,
        platinum: false,
        steamId: null
    };

    games.push(newGame);
    saveGames();
    renderGames();

    document.getElementById('gameTitle').value = '';
    document.getElementById('gameCover').value = '';
    document.getElementById('gameBackCover').value = '';
    document.getElementById('gameYear').value = '';
    document.getElementById('gameManual').value = '';
    document.getElementById('gameDiscs').value = '';
    document.getElementById('gameScreenshots').value = '';
    document.getElementById('gameBosses').value = '';
    document.getElementById('gameAchievements').value = '';
}

function toggleStatus(id, field) {
    const game = games.find(g => g.id === id);
    if (game) {
        game[field] = !game[field];
        saveGames();
        renderGames();
    }
}

function deleteGame(id) {
    games = games.filter(g => g.id !== id);
    saveGames();
    renderGames();
}

let filteredGames = [];

function filterGames() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (query === '') {
        filteredGames = [];
        currentPage = 1;
        renderGames();
        return;
    }
    filteredGames = games.filter(game =>
        game.title.toLowerCase().includes(query) ||
        game.platform.toLowerCase().includes(query)
    );
    currentPage = 1;
    renderFilteredGames(filteredGames);
}

function renderFilteredGames(list) {
    const grid = document.getElementById('gameGrid');
    const paginationTop = document.getElementById('pagination-top');
    const paginationBottom = document.getElementById('pagination-bottom');

    if (list.length === 0) {
        grid.innerHTML = '<p style="color:#4a4a6a;text-align:center;width:100%;">Ничего не найдено</p>';
        paginationTop.innerHTML = '';
        paginationBottom.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(list.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageGames = list.slice(start, end);

    grid.innerHTML = pageGames.map(game => `
        <div class="card">
            <div class="cover" onclick="this.classList.toggle('flipped')">
                <div class="cover-inner">
                    <div class="cover-front">
                        <img src="${game.cover || 'media/covers/default.webp'}" alt="${game.title}" />
                    </div>
                    <div class="cover-back">
                        <img src="${game.backCover || 'media/covers/default_back.jpg'}" alt="Задняя сторона" />
                    </div>
                </div>
            </div>
            <div class="title"><span class="glow-text">${game.title}</span></div>
            <div class="meta">
                <img src="media/icons/${game.platform.toLowerCase().replace(/ /g, '_')}.svg" alt="${game.platform}" class="platform-icon ${game.platform.toLowerCase().replace(/ /g, '_')}" />
                ${game.year || ''}
            </div>
            <div class="status">
                <span class="badge ${game.passed ? 'passed' : ''}" ondblclick="toggleStatus(${game.id}, 'passed')">
                    ${game.passed ? '✅ Пройдена' : '❌ Не пройдена'}
                </span>
                <span class="badge ${game.platinum ? 'platinum' : ''}" ondblclick="toggleStatus(${game.id}, 'platinum')">
                    ${game.platinum ? '🏆 Платина' : '🚫 Без платины'}
                </span>
                <button class="delete-btn" ondblclick="deleteGame(${game.id})">✕</button>
            </div>
            <div class="card-actions">
                <button onclick="openScreenshots(${game.id})">📸</button>
                <button onclick="openManual('${game.manual}')" ${!game.manual ? 'disabled' : ''}>📖</button>
                <button onclick="openDisc(${game.id})">💿</button>
                <button onclick="openBosses(${game.id})">👾</button>
                <button onclick="openAchievements(${game.id})">🏆</button>
            </div>
        </div>
    `).join('');

    let paginationHTML = '';
    const visiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
    let endPage = Math.min(totalPages, startPage + visiblePages - 1);
    if (endPage - startPage < visiblePages - 1) {
        startPage = Math.max(1, endPage - visiblePages + 1);
    }

    function addPageBtnHTML(page) {
        const active = page === currentPage ? ' active' : '';
        paginationHTML += `<button class="page-btn${active}" onclick="goToPage(${page})">${page}</button>`;
    }
    function addEllipsisHTML() {
        paginationHTML += `<span class="page-ellipsis">…</span>`;
    }

    if (startPage > 1) {
        addPageBtnHTML(1);
        if (startPage > 2) addEllipsisHTML();
    }
    for (let i = startPage; i <= endPage; i++) addPageBtnHTML(i);
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) addEllipsisHTML();
        addPageBtnHTML(totalPages);
    }

    paginationTop.innerHTML = paginationHTML;
    paginationBottom.innerHTML = paginationHTML;
}

function renderGames() {
    const grid = document.getElementById('gameGrid');
    const paginationTop = document.getElementById('pagination-top');
    const paginationBottom = document.getElementById('pagination-bottom');

    if (games.length === 0) {
        grid.innerHTML = '<p style="color:#4a4a6a;text-align:center;width:100%;">Пока нет игр. Добавь первую!</p>';
        paginationTop.innerHTML = '';
        paginationBottom.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(games.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageGames = games.slice(start, end);

    grid.innerHTML = pageGames.map(game => `
        <div class="card">
            <div class="cover" onclick="this.classList.toggle('flipped')">
                <div class="cover-inner">
                    <div class="cover-front">
                        <img src="${game.cover || 'media/covers/default.webp'}" alt="${game.title}" />
                    </div>
                    <div class="cover-back">
                        <img src="${game.backCover || 'media/covers/default_back.jpg'}" alt="Задняя сторона" />
                    </div>
                </div>
            </div>
            <div class="title"><span class="glow-text">${game.title}</span></div>
            <div class="meta">
                <img src="media/icons/${game.platform.toLowerCase().replace(/ /g, '_')}.svg" alt="${game.platform}" class="platform-icon ${game.platform.toLowerCase().replace(/ /g, '_')}" />
                ${game.year || ''}
            </div>
            <div class="status">
                <span class="badge ${game.passed ? 'passed' : ''}" ondblclick="toggleStatus(${game.id}, 'passed')">
                    ${game.passed ? '✅ Пройдена' : '❌ Не пройдена'}
                </span>
                <span class="badge ${game.platinum ? 'platinum' : ''}" ondblclick="toggleStatus(${game.id}, 'platinum')">
                    ${game.platinum ? '🏆 Платина' : '🚫 Без платины'}
                </span>
                <button class="delete-btn" ondblclick="deleteGame(${game.id})">✕</button>
            </div>
            <div class="card-actions">
                <button onclick="openScreenshots(${game.id})">📸</button>
                <button onclick="openManual('${game.manual}')" ${!game.manual ? 'disabled' : ''}>📖</button>
                <button onclick="openDisc(${game.id})">💿</button>
                <button onclick="openBosses(${game.id})">👾</button>
                <button onclick="openAchievements(${game.id})">🏆</button>
            </div>
        </div>
    `).join('');

    let paginationHTML = '';
    const visiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
    let endPage = Math.min(totalPages, startPage + visiblePages - 1);
    if (endPage - startPage < visiblePages - 1) {
        startPage = Math.max(1, endPage - visiblePages + 1);
    }

    function addPageBtnHTML(page) {
        const active = page === currentPage ? ' active' : '';
        paginationHTML += `<button class="page-btn${active}" onclick="goToPage(${page})">${page}</button>`;
    }
    function addEllipsisHTML() {
        paginationHTML += `<span class="page-ellipsis">…</span>`;
    }

    if (startPage > 1) {
        addPageBtnHTML(1);
        if (startPage > 2) addEllipsisHTML();
    }
    for (let i = startPage; i <= endPage; i++) addPageBtnHTML(i);
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) addEllipsisHTML();
        addPageBtnHTML(totalPages);
    }

    paginationTop.innerHTML = paginationHTML;
    paginationBottom.innerHTML = paginationHTML;
}

function goToPage(page) {
    currentPage = page;
    renderGames();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleHymn() {
    const content = document.getElementById('hymnContent');
    content.classList.toggle('open');
}

let isDark = true;

function toggleTheme() {
    const body = document.body;
    const themeBtn = document.querySelector('.theme-toggle');
    if (body.classList.contains('dark')) {
        body.classList.remove('dark');
        body.classList.add('light');
        themeBtn.textContent = '🌙';
    } else {
        body.classList.remove('light');
        body.classList.add('dark');
        themeBtn.textContent = '☀';
    }
}

let timerTheme, timerHymn;
const themeBtn = document.querySelector('.theme-toggle');
const hymnBtn = document.querySelector('.hymn-toggle');

function dimButton(btn) {
    btn.style.opacity = '0.3';
}

function brightenButton(btn, timer) {
    btn.style.opacity = '1';
    clearTimeout(timer);
    timer = setTimeout(() => dimButton(btn), 5000);
}

themeBtn.addEventListener('click', () => brightenButton(themeBtn, timerTheme));
themeBtn.addEventListener('mouseenter', () => brightenButton(themeBtn, timerTheme));
themeBtn.addEventListener('touchstart', () => brightenButton(themeBtn, timerTheme));
hymnBtn.addEventListener('click', () => brightenButton(hymnBtn, timerHymn));
hymnBtn.addEventListener('mouseenter', () => brightenButton(hymnBtn, timerHymn));
hymnBtn.addEventListener('touchstart', () => brightenButton(hymnBtn, timerHymn));

setTimeout(() => {
    themeBtn.style.opacity = '0.3';
    hymnBtn.style.opacity = '0.3';
}, 5000);

function openManual(url) {
    if (!url) return;
    document.getElementById('manualFrame').src = url;
    document.getElementById('manualModal').style.display = 'block';
}

function closeManual() {
    document.getElementById('manualModal').style.display = 'none';
    document.getElementById('manualFrame').src = '';
}

let currentDiscIndex = 0;
let currentDiscs = [];

function openDisc(id) {
    const game = games.find(g => g.id === id);
    if (!game) {
        alert('Игра не найдена');
        return;
    }
    let discsArray = game.discs;
    if (!discsArray || discsArray.length === 0) {
        if (game.disc && game.disc.length > 0) {
            discsArray = Array.isArray(game.disc) ? game.disc : [game.disc];
        } else {
            alert('Фото дисков нет');
            return;
        }
    }
    currentDiscs = discsArray;
    currentDiscIndex = 0;
    showDisc();
    document.getElementById('discModal').style.display = 'block';
}

function showDisc() {
    const img = document.getElementById('discImage');
    img.src = currentDiscs[currentDiscIndex];
    document.getElementById('discCounter').textContent = 
        `${currentDiscIndex + 1} / ${currentDiscs.length}`;
}

function nextDisc() {
    if (currentDiscIndex < currentDiscs.length - 1) {
        currentDiscIndex++;
        showDisc();
    }
}

function prevDisc() {
    if (currentDiscIndex > 0) {
        currentDiscIndex--;
        showDisc();
    }
}

function closeDisc() {
    document.getElementById('discModal').style.display = 'none';
    document.getElementById('discImage').src = '';
}

let currentScreenshotIndex = 0;
let currentScreenshots = [];

function openScreenshots(id) {
    const game = games.find(g => g.id === id);
    if (!game || !game.screenshots || game.screenshots.length === 0) {
        alert('Скриншотов нет');
        return;
    }
    currentScreenshots = game.screenshots;
    currentScreenshotIndex = 0;
    showScreenshot();
    document.getElementById('screenshotsModal').style.display = 'block';
}

function closeScreenshots() {
    document.getElementById('screenshotsModal').style.display = 'none';
    document.getElementById('screenshotsImage').src = '';
}

function showScreenshot() {
    const img = document.getElementById('screenshotsImage');
    img.src = currentScreenshots[currentScreenshotIndex];
    document.getElementById('screenshotsCounter').textContent =
        `${currentScreenshotIndex + 1} / ${currentScreenshots.length}`;
}

function nextScreenshot() {
    if (currentScreenshotIndex < currentScreenshots.length - 1) {
        currentScreenshotIndex++;
        showScreenshot();
    }
}

function prevScreenshot() {
    if (currentScreenshotIndex > 0) {
        currentScreenshotIndex--;
        showScreenshot();
    }
}

// Закрытие модалок
document.addEventListener('DOMContentLoaded', function() {
    const discModal = document.getElementById('discModal');
    const screenshotsModal = document.getElementById('screenshotsModal');
    const bossModal = document.getElementById('bossModal');
    const achievementModal = document.getElementById('achievementModal');

    if (discModal) {
        discModal.addEventListener('click', function(e) {
            if (e.target === this) closeDisc();
        });
    }
    if (screenshotsModal) {
        screenshotsModal.addEventListener('click', function(e) {
            if (e.target === this) closeScreenshots();
        });
    }
    if (bossModal) {
        bossModal.addEventListener('click', function(e) {
            if (e.target === this) closeBosses();
        });
    }
    if (achievementModal) {
        achievementModal.addEventListener('click', function(e) {
            if (e.target === this) closeAchievements();
        });
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (document.getElementById('discModal').style.display === 'block') closeDisc();
        if (document.getElementById('screenshotsModal').style.display === 'block') closeScreenshots();
        if (document.getElementById('bossModal').style.display === 'block') closeBosses();
        if (document.getElementById('achievementModal').style.display === 'block') closeAchievements();
    }
});

function toggleMusic() {
    const playBtn = document.getElementById('playBtn');
    if (isPlaying) {
        audio.pause();
        playBtn.textContent = '▶';
        isPlaying = false;
    } else {
        if (audio.src === '') {
            currentTrackIndex = Math.floor(Math.random() * tracks.length);
            loadTrack(currentTrackIndex);
        }
        audio.play();
        playBtn.textContent = '⏸';
        isPlaying = true;
    }
    updateTrackName();
}

function loadTrack(index) {
    const track = tracks[index];
    if (!track) return;

    // Пытаемся загрузить основной файл
    audio.src = track.file;
    audio.load();

    // Пытаемся воспроизвести, при ошибке переключаемся на резерв
    audio.play().catch((error) => {
        console.warn('Ошибка загрузки основного трека, пробуем резерв:', error);
        audio.src = track.backup;
        audio.load();
        audio.play().catch((backupError) => {
            console.error('Резервный трек тоже не загрузился:', backupError);
        });
    });
    updateTrackName();
}

function nextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    loadTrack(currentTrackIndex);
    if (isPlaying) {
        audio.play();
    }
    updateTrackName();
}

function updateTrackName() {
    document.getElementById('trackName').textContent = `🎵 ${tracks[currentTrackIndex].name}`;
}

document.addEventListener('DOMContentLoaded', function() {
    loadTracks();
});

function toggleAddForm() {
    const container = document.getElementById('addFormContainer');
    const btn = document.querySelector('.add-btn');
    if (!container) return;
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        if (btn) btn.textContent = '✖ Свернуть форму';
    } else {
        container.style.display = 'none';
        if (btn) btn.textContent = '➕';
    }
}

let currentBossIndex = 0;
let currentBosses = [];

function openBosses(id) {
    const game = games.find(g => g.id === id);
    if (!game || !game.bosses || game.bosses.length === 0) {
        alert('Боссов нет');
        return;
    }
    currentBosses = game.bosses;
    currentBossIndex = 0;
    showBoss();
    document.getElementById('bossModal').style.display = 'block';
}

function closeBosses() {
    document.getElementById('bossModal').style.display = 'none';
    document.getElementById('bossImage').src = '';
}

function showBoss() {
    const img = document.getElementById('bossImage');
    img.src = currentBosses[currentBossIndex];
    document.getElementById('bossCounter').textContent = `${currentBossIndex + 1} / ${currentBosses.length}`;
}

function nextBoss() {
    if (currentBossIndex < currentBosses.length - 1) {
        currentBossIndex++;
        showBoss();
    }
}

function prevBoss() {
    if (currentBossIndex > 0) {
        currentBossIndex--;
        showBoss();
    }
}

let currentAchievements = [];

function openAchievements(id) {
    const game = games.find(g => g.id === id);
    if (!game || !game.achievements || game.achievements.length === 0) {
        alert('Достижений нет');
        return;
    }
    currentAchievements = game.achievements;
    renderAchievements();
    document.getElementById('achievementModal').style.display = 'block';
}

function closeAchievements() {
    document.getElementById('achievementModal').style.display = 'none';
}

function renderAchievements() {
    const container = document.getElementById('achievementGrid');
    if (!container) return;
    container.innerHTML = currentAchievements.map(a => `
        <div class="ach-item">
            <img src="${a.icon}" alt="${a.name}" class="ach-icon" />
            <span class="ach-name">${a.name}</span>
        </div>
    `).join('');
}

loadGames();
