// Данные игр из localStorage
let games = [];
let currentPage = 1;
const itemsPerPage = 12;

// Музыка
let tracks = [];
let currentTrackIndex = 0;
let isPlaying = false;
let audio = new Audio();

async function loadTracks() {
    try {
        const response = await fetch('media/music/tracks.json');
        if (!response.ok) throw new Error('Не удалось загрузить список треков');
        tracks = await response.json();
        if (tracks.length > 0) {
            currentTrackIndex = Math.floor(Math.random() * tracks.length);
            loadTrack(currentTrackIndex);
        }
    } catch (error) {
        console.error('Ошибка загрузки треков:', error);
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
    renderGames(filteredGames);
}

function renderGames(list = null) {
    const grid = document.getElementById('gameGrid');
    const paginationTop = document.getElementById('pagination-top');
    const paginationBottom = document.getElementById('pagination-bottom');

    const dataToRender = list || games;

    if (dataToRender.length === 0) {
        grid.innerHTML = '<p style="color:#4a4a6a;text-align:center;width:100%;">Пока нет игр. Добавь первую!</p>';
        paginationTop.innerHTML = '';
        paginationBottom.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(dataToRender.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageGames = dataToRender.slice(start, end);

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
                <button onclick="openManual('${game.manual || ''}')">📖</button>
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
    if (!url || url.trim() === '') {
        showNoManualMessage();
        return;
    }
    document.getElementById('manualFrame').src = url;
    document.getElementById('manualModal').style.display = 'block';
}

function showNoManualMessage() {
    alert('📖 Мануал для этой игры пока не добавлен.');
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

async function toggleMusic() {
    const playBtn = document.getElementById('playBtn');
    if (isPlaying) {
        audio.pause();
        playBtn.textContent = '▶';
        isPlaying = false;
        return;
    }

    if (audio.src === '') {
        currentTrackIndex = Math.floor(Math.random() * tracks.length);
        loadTrack(currentTrackIndex);
    }

    try {
        await audio.play();
        playBtn.textContent = '⏸';
        isPlaying = true;
    } catch (error) {
        console.warn('Не удалось воспроизвести, пробую через 500ms:', error);
        setTimeout(async () => {
            try {
                await audio.play();
                playBtn.textContent = '⏸';
                isPlaying = true;
            } catch (e) {
                console.warn('Повторная попытка не удалась:', e);
            }
        }, 500);
    }
    updateTrackName();
}


function loadTrack(index) {
    const track = tracks[index];
    if (!track) return;
    audio.src = track.file;
    updateTrackName();
}

function nextTrack() {
    if (tracks.length === 0) return;
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    loadTrack(currentTrackIndex);
    if (isPlaying) {
        audio.play().catch(() => {});
    }
    updateTrackName();
}

function updateTrackName() {
    const trackNameEl = document.getElementById('trackName');
    if (tracks.length > 0 && tracks[currentTrackIndex]) {
        trackNameEl.textContent = `🎵 ${tracks[currentTrackIndex].name}`;
    } else {
        trackNameEl.textContent = '🎵 Нет треков';
    }
}

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

// ============================================================
// ДОСТИЖЕНИЯ — ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ФУНКЦИИ
// ============================================================
let currentAchievements = [];
let currentAchievementsCopy = [];
let sortMode = 'dateAsc';

function openAchievements(id) {
    const game = games.find(g => g.id === id);
    if (!game || !game.achievements || game.achievements.length === 0) {
        alert('Достижений нет');
        return;
    }
    currentGameId = id; // <-- запоминаем ID
    currentAchievements = [...game.achievements];
    currentAchievementsCopy = [...game.achievements];
    sortMode = 'dateAsc';
    renderAchievements();
    document.getElementById('achievementModal').style.display = 'block';
}

function closeAchievements() {
    document.getElementById('achievementModal').style.display = 'none';
}

function renderAchievements() {
    const container = document.getElementById('achievementGrid');
    if (!container) return;

    container.innerHTML = currentAchievements.map(a => {
        const parts = a.obtainment_time ? a.obtainment_time.split(' ') : ['—', ''];
        const date = parts[0] || '—';
        const time = parts[1] || '';
        const isLocked = a.status !== "Получен";
        
        return `
            <div class="ach-item ${isLocked ? 'locked' : ''}" data-type="${a.type || 'B'}">
                <div class="ach-tooltip">
                    <span class="tooltip-text">${a.description || ''}</span>
                       <div class="ach-icon-wrapper">
                         <img src="${a.icon}" alt="${a.name}" class="ach-icon" />
                       </div>
                </div>
                <span class="ach-name">${a.name}</span>
                <span class="ach-date">${date}</span>
                <span class="ach-time">${time}</span>
            </div>
        `;
    }).join('');
}

function sortAchievements(mode) {
    sortMode = mode;
    
    // Берём игру по сохранённому ID
    const game = games.find(g => g.id === currentGameId);
    if (!game) return;
    
    const sorted = [...game.achievements];
    // ... остальная логика сортировки
    
    // Жёсткий порядок
    const typeOrder = {
        'P': 0,
        'G': 1,
        'S': 2,
        'B': 3
    };
    
    const typeOrderDesc = {
        'B': 0,
        'S': 1,
        'G': 2,
        'P': 3
    };
    
    switch (mode) {
        case 'dateAsc':
    sorted.sort((a, b) => {
        // Сначала идут полученные (есть дата), потом неполученные (null)
        const aHas = a.obtainment_time ? 0 : 1;
        const bHas = b.obtainment_time ? 0 : 1;
        if (aHas !== bHas) return aHas - bHas;
        // Если оба получены — сортируем по дате
        return (a.obtainment_time || '').localeCompare(b.obtainment_time || '');
    });
    break;
case 'dateDesc':
    sorted.sort((a, b) => {
        // Сначала полученные, потом неполученные
        const aHas = a.obtainment_time ? 0 : 1;
        const bHas = b.obtainment_time ? 0 : 1;
        if (aHas !== bHas) return aHas - bHas;
        // Если оба получены — сортируем по дате (обратный порядок)
        return (b.obtainment_time || '').localeCompare(a.obtainment_time || '');
    });
    break;
        case 'type':
            sorted.sort((a, b) => {
                const va = typeOrder[a.type] !== undefined ? typeOrder[a.type] : 99;
                const vb = typeOrder[b.type] !== undefined ? typeOrder[b.type] : 99;
                return va - vb;
            });
            break;
        case 'typeDesc':
            sorted.sort((a, b) => {
                const va = typeOrderDesc[a.type] !== undefined ? typeOrderDesc[a.type] : 99;
                const vb = typeOrderDesc[b.type] !== undefined ? typeOrderDesc[b.type] : 99;
                return va - vb;
            });
            break;
        default:
            return;
    }
    
    currentAchievements = sorted;
    currentAchievementsCopy = [...sorted];
    renderAchievements();
    
    document.querySelectorAll('.ach-sort button').forEach(btn => btn.classList.remove('active'));
    const buttons = document.querySelectorAll('.ach-sort button');
    const map = { 'dateAsc': 0, 'dateDesc': 3, 'type': 1, 'typeDesc': 2 };
    if (buttons[map[mode]]) buttons[map[mode]].classList.add('active');
}


// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadGames();
    loadTracks();
    
    // Закрытие модалок
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

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (document.getElementById('discModal').style.display === 'block') closeDisc();
            if (document.getElementById('screenshotsModal').style.display === 'block') closeScreenshots();
            if (document.getElementById('bossModal').style.display === 'block') closeBosses();
            if (document.getElementById('achievementModal').style.display === 'block') closeAchievements();
        }
    });
	
	
	document.addEventListener('keydown', function(e) {
    // Если открыто модальное окно скриншотов
    if (document.getElementById('screenshotsModal').style.display === 'block') {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevScreenshot();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextScreenshot();
        }
    }
    // Если открыто модальное окно дисков
    else if (document.getElementById('discModal').style.display === 'block') {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevDisc();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextDisc();
        }
    }
    // Если открыто модальное окно боссов
    else if (document.getElementById('bossModal').style.display === 'block') {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevBoss();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextBoss();
        }
    }
});
});
