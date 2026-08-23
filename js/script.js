// ============================================================
// ДАННЫЕ И ХРАНЕНИЕ
// ============================================================
let games = [];
let currentPage = 1;
const itemsPerPage = 12;
let filteredGames = [];
let currentGameId = null;

// ============================================================
// МУЗЫКА
// ============================================================
let tracks = [];
let currentTrackIndex = 0;
let isPlaying = false;
let trackLoadTimeout = null;
const audio = new Audio();

async function loadTracks() {
    try {
        const res = await fetch('media/music/tracks.json');
        if (!res.ok) throw new Error('Не удалось загрузить треки');
        tracks = await res.json();
        if (tracks.length) {
            currentTrackIndex = Math.floor(Math.random() * tracks.length);
            loadTrack(currentTrackIndex);
        }
    } catch (e) { console.error('Ошибка загрузки треков:', e); }
}

function loadTrack(index) {
    const track = tracks[index];
    if (!track) return;

    audio.src = track.file;
    updateTrackName();

    clearTimeout(trackLoadTimeout);
    trackLoadTimeout = setTimeout(() => {
        if (audio.readyState < 2) {
            console.warn('⚠️ Трек не загрузился, переключаю:', track.name);
            nextTrack();
        }
    }, 5000);
}

function updateTrackName() {
    const el = document.getElementById('trackName');
    el.textContent = tracks.length && tracks[currentTrackIndex] 
        ? `🎵 ${tracks[currentTrackIndex].name}` 
        : '🎵 Нет треков';
}

async function toggleMusic() {
    const btn = document.getElementById('playBtn');
    if (isPlaying) {
        audio.pause();
        btn.textContent = '▶';
        isPlaying = false;
        return;
    }
    if (!audio.src) {
        currentTrackIndex = Math.floor(Math.random() * tracks.length);
        loadTrack(currentTrackIndex);
    }
    try {
        await audio.play();
        btn.textContent = '⏸';
        isPlaying = true;
    } catch {
        setTimeout(async () => {
            try {
                await audio.play();
                btn.textContent = '⏸';
                isPlaying = true;
            } catch {}
        }, 500);
    }
}

function nextTrack() {
	clearTimeout(trackLoadTimeout);
    if (!tracks.length) return;
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    loadTrack(currentTrackIndex);
    if (isPlaying) audio.play().catch(() => {});
}

// Автопереключение треков
audio.addEventListener('ended', function() {
    if (isPlaying) {
        nextTrack();
        audio.play().catch(() => {});
    }
});

// ============================================================
// ЭКСПОРТ / ИМПОРТ
// ============================================================
function exportGames() {
    const blob = new Blob([JSON.stringify(games, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'games.json';
    a.click();
    URL.revokeObjectURL(a.href);
}

function importGames(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                games = data;
                saveGames();
                renderGames();
                alert('Коллекция загружена!');
            } else alert('Неверный формат файла.');
        } catch { alert('Ошибка при чтении файла.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// ============================================================
// РАБОТА С ДАННЫМИ
// ============================================================
function loadGames() {
    const saved = localStorage.getItem('games');
    if (saved) {
        try { games = JSON.parse(saved); } catch { games = []; }
    } else {
        games = [
            { id: 1, title: 'Getting Up', platform: 'PS2', year: 2006, cover: 'media/covers/getting-up.jpg', passed: false, platinum: false, steamId: null },
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
    const title = document.getElementById('gameTitle').value.trim();
    if (!title) { alert('Введи название игры'); return; }

    const newGame = {
        id: Date.now(),
        title,
        platform: document.getElementById('gamePlatform').value,
        npwrId: "",
        year: parseInt(document.getElementById('gameYear').value) || 0,
        cover: document.getElementById('gameCover').value.trim().replace(/\\/g, '/') || 'media/covers/default.webp',
        backCover: document.getElementById('gameBackCover').value.trim().replace(/\\/g, '/') || 'media/covers/default_back.jpg',
        manual: document.getElementById('gameManual').value.trim().replace(/\\/g, '/') || '',
        discs: document.getElementById('gameDiscs').value.split(',').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean),
        screenshots: document.getElementById('gameScreenshots').value.split(',').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean),
        bosses: document.getElementById('gameBosses').value.split(',').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean),
        achievements: document.getElementById('gameAchievements').value.split(',').map(s => s.trim()).filter(Boolean)
            .map(item => { const p = item.split('|').map(s => s.trim()); return p.length === 2 ? { name: p[0], icon: p[1].replace(/\\/g, '/') } : null; })
            .filter(Boolean),
        trophyBanner: "",
        passed: false,
        platinum: false,
        steamId: null
    };

    games.push(newGame);
    saveGames();
    renderGames();

    ['gameTitle', 'gameCover', 'gameBackCover', 'gameYear', 'gameManual', 'gameDiscs', 'gameScreenshots', 'gameBosses', 'gameAchievements']
        .forEach(id => document.getElementById(id).value = '');
}

function toggleStatus(id, field) {
    const game = games.find(g => g.id === id);
    if (game) { game[field] = !game[field]; saveGames(); renderGames(); }
}

function deleteGame(id) {
    if (confirm('Удалить игру?')) {
        games = games.filter(g => g.id !== id);
        saveGames();
        renderGames();
    }
}

// ============================================================
// ПОИСК
// ============================================================
function filterGames() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    filteredGames = query ? games.filter(g => 
        g.title.toLowerCase().includes(query) || 
        g.platform.toLowerCase().includes(query)
    ) : [];
    currentPage = 1;
    renderGames(query ? filteredGames : null);
}

// ============================================================
// ОТРИСОВКА
// ============================================================
function renderGames(list = null) {
    const grid = document.getElementById('gameGrid');
    const data = list !== null ? list : games;

    if (!data.length) {
        grid.innerHTML = '<p style="color:#4a4a6a;text-align:center;width:100%;">Пока нет игр. Добавь первую!</p>';
        document.getElementById('pagination-top').innerHTML = '';
        document.getElementById('pagination-bottom').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(data.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * itemsPerPage;
    const pageGames = data.slice(start, start + itemsPerPage);

    grid.innerHTML = pageGames.map(game => `
        <div class="card">
            <div class="cover" onclick="this.classList.toggle('flipped')">
                <div class="cover-inner">
                    <div class="cover-front"><img src="${game.cover || 'media/covers/default.webp'}" alt="${game.title}" /></div>
                    <div class="cover-back"><img src="${game.backCover || 'media/covers/default_back.jpg'}" alt="Задняя сторона" /></div>
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

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    let html = '';
    const visible = 5;
    let start = Math.max(1, currentPage - Math.floor(visible / 2));
    let end = Math.min(totalPages, start + visible - 1);
    if (end - start < visible - 1) start = Math.max(1, end - visible + 1);

    const addBtn = p => { html += `<button class="page-btn${p === currentPage ? ' active' : ''}" onclick="goToPage(${p})">${p}</button>`; };
    const addEll = () => { html += `<span class="page-ellipsis">…</span>`; };

    if (start > 1) { addBtn(1); if (start > 2) addEll(); }
    for (let i = start; i <= end; i++) addBtn(i);
    if (end < totalPages) { if (end < totalPages - 1) addEll(); addBtn(totalPages); }

    document.getElementById('pagination-top').innerHTML = html;
    document.getElementById('pagination-bottom').innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    const query = document.getElementById('searchInput').value.trim();
    renderGames(query ? filteredGames : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// ФОРМА ДОБАВЛЕНИЯ
// ============================================================
function toggleAddForm() {
    const container = document.getElementById('addFormContainer');
    const btn = document.querySelector('.add-btn');
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        if (btn) btn.textContent = '✖ Свернуть форму';
    } else {
        container.style.display = 'none';
        if (btn) btn.textContent = '➕';
    }
}

// ============================================================
// ТЕМА
// ============================================================
function toggleTheme() {
    const body = document.body;
    const btn = document.querySelector('.theme-toggle');
    body.classList.toggle('dark');
    body.classList.toggle('light');
    btn.textContent = body.classList.contains('dark') ? '🌙' : '☀';
}

// ============================================================
// ГИМН
// ============================================================
function toggleHymn() {
    document.getElementById('hymnContent').classList.toggle('open');
}

// ============================================================
// УТИЛИТЫ ДЛЯ КНОПОК (затухание)
// ============================================================
let timerTheme, timerHymn;

function brighten(btn, timer) {
    btn.style.opacity = '1';
    clearTimeout(timer);
    timer = setTimeout(() => btn.style.opacity = '0.3', 5000);
}

['.theme-toggle', '.hymn-toggle'].forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    ['click', 'mouseenter', 'touchstart'].forEach(ev => {
        el.addEventListener(ev, () => brighten(el, ev.includes('theme') ? timerTheme : timerHymn));
    });
    setTimeout(() => el.style.opacity = '0.3', 5000);
});

// ============================================================
// МОДАЛЬНЫЕ ОКНА (общие)
// ============================================================
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function openModal(id) {
    document.getElementById(id).style.display = 'block';
}

// ============================================================
// МАНУАЛ
// ============================================================
function openManual(url) {
    if (!url?.trim()) { alert('📖 Мануал для этой игры пока не добавлен.'); return; }
    document.getElementById('manualFrame').src = url;
    openModal('manualModal');
}

function closeManual() {
    closeModal('manualModal');
    document.getElementById('manualFrame').src = '';
}

// ============================================================
// ДИСКИ
// ============================================================
let currentDiscs = [];
let currentDiscIndex = 0;

function openDisc(id) {
    const game = games.find(g => g.id === id);
    if (!game) return;
    currentDiscs = game.discs || [];
    if (!currentDiscs.length) { alert('Фото дисков нет'); return; }
    currentDiscIndex = 0;
    showDisc();
    openModal('discModal');
}

function showDisc() {
    document.getElementById('discImage').src = currentDiscs[currentDiscIndex];
    document.getElementById('discCounter').textContent = `${currentDiscIndex + 1} / ${currentDiscs.length}`;
}

function nextDisc() { if (currentDiscIndex < currentDiscs.length - 1) { currentDiscIndex++; showDisc(); } }
function prevDisc() { if (currentDiscIndex > 0) { currentDiscIndex--; showDisc(); } }
function closeDisc() { closeModal('discModal'); document.getElementById('discImage').src = ''; }

// ============================================================
// СКРИНШОТЫ
// ============================================================
let currentScreenshots = [];
let currentScreenshotIndex = 0;

function openScreenshots(id) {
    const game = games.find(g => g.id === id);
    if (!game?.screenshots?.length) { alert('Скриншотов нет'); return; }
    currentScreenshots = game.screenshots;
    currentScreenshotIndex = 0;
    showScreenshot();
    openModal('screenshotsModal');
}

function showScreenshot() {
    document.getElementById('screenshotsImage').src = currentScreenshots[currentScreenshotIndex];
    document.getElementById('screenshotsCounter').textContent = `${currentScreenshotIndex + 1} / ${currentScreenshots.length}`;
}

function nextScreenshot() { if (currentScreenshotIndex < currentScreenshots.length - 1) { currentScreenshotIndex++; showScreenshot(); } }
function prevScreenshot() { if (currentScreenshotIndex > 0) { currentScreenshotIndex--; showScreenshot(); } }
function closeScreenshots() { closeModal('screenshotsModal'); document.getElementById('screenshotsImage').src = ''; }

// ============================================================
// БОССЫ
// ============================================================
let currentBosses = [];
let currentBossIndex = 0;

function openBosses(id) {
    const game = games.find(g => g.id === id);
    if (!game?.bosses?.length) { alert('Боссов нет'); return; }
    currentBosses = game.bosses;
    currentBossIndex = 0;
    showBoss();
    openModal('bossModal');
}

function showBoss() {
    document.getElementById('bossImage').src = currentBosses[currentBossIndex];
    document.getElementById('bossCounter').textContent = `${currentBossIndex + 1} / ${currentBosses.length}`;
}

function nextBoss() { if (currentBossIndex < currentBosses.length - 1) { currentBossIndex++; showBoss(); } }
function prevBoss() { if (currentBossIndex > 0) { currentBossIndex--; showBoss(); } }
function closeBosses() { closeModal('bossModal'); document.getElementById('bossImage').src = ''; }

// ============================================================
// ДОСТИЖЕНИЯ
// ============================================================
let currentAchievements = [];
let sortMode = 'dateAsc';

function openAchievements(id) {
    const game = games.find(g => g.id === id);
    if (!game?.achievements?.length) { alert('Достижений нет'); return; }
    currentGameId = id;
    currentAchievements = [...game.achievements];
    sortMode = 'dateAsc';
    renderAchievements();
    openModal('achievementModal');
}

function closeAchievements() { closeModal('achievementModal'); }

function renderAchievements() {
    const container = document.getElementById('achievementGrid');
    if (!container) return;

    const game = games.find(g => g.id === currentGameId);

    // Управление баннером
    const img = document.getElementById('trophyBannerImg');
    const banner = document.getElementById('trophyBanner');
    if (game && game.trophyBanner) {
        img.src = game.trophyBanner;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }

    // Рендер трофеев
    let achievementsHTML = currentAchievements.map(a => {
        const parts = a.obtainment_time ? a.obtainment_time.split(' ') : ['—', ''];
        const isLocked = a.status !== "Получен";
        return `
            <div class="ach-item ${isLocked ? 'locked' : ''}" data-type="${a.type || 'B'}">
                <div class="ach-tooltip">
                    <span class="tooltip-text">${a.description || ''}</span>
                    <img src="${a.icon}" alt="${a.name}" class="ach-icon" />
                </div>
                <span class="ach-name">${a.name}</span>
                <span class="ach-date">${parts[0]}</span>
                <span class="ach-time">${parts[1] || ''}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = achievementsHTML;
}
	
	    // Баннер после списка
  /*  let bannerHTML = '';
    if (game && game.trophyBanner) {
        bannerHTML = `
            <div class="trophy-banner">
                <img src="${game.trophyBanner}" alt="Баннер достижений" />
            </div>
        `;
    }

    container.innerHTML = achievementsHTML + bannerHTML;
}
*/

function sortAchievements(mode) {
    sortMode = mode;
    const game = games.find(g => g.id === currentGameId);
    if (!game) return;
    const sorted = [...game.achievements];
    
    const typeOrder = { 'P': 0, 'G': 1, 'S': 2, 'B': 3 };
    const typeOrderDesc = { 'B': 0, 'S': 1, 'G': 2, 'P': 3 };

    switch (mode) {
        case 'dateAsc':
            sorted.sort((a, b) => {
                const aHas = a.obtainment_time ? 0 : 1;
                const bHas = b.obtainment_time ? 0 : 1;
                return aHas - bHas || (a.obtainment_time || '').localeCompare(b.obtainment_time || '');
            });
            break;
        case 'dateDesc':
            sorted.sort((a, b) => {
                const aHas = a.obtainment_time ? 0 : 1;
                const bHas = b.obtainment_time ? 0 : 1;
                return aHas - bHas || (b.obtainment_time || '').localeCompare(a.obtainment_time || '');
            });
            break;
        case 'type':
            sorted.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99));
            break;
        case 'typeDesc':
            sorted.sort((a, b) => (typeOrderDesc[a.type] ?? 99) - (typeOrderDesc[b.type] ?? 99));
            break;
        default: return;
    }

    currentAchievements = sorted;
    renderAchievements();

    const map = { 'dateAsc': 0, 'dateDesc': 3, 'type': 1, 'typeDesc': 2 };
    document.querySelectorAll('.ach-sort button').forEach((btn, i) => {
        btn.classList.toggle('active', i === map[mode]);
    });
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    loadGames();
    loadTracks();

    // Закрытие модалок по клику на фон
    ['discModal', 'screenshotsModal', 'bossModal', 'achievementModal'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.addEventListener('click', e => {
                if (e.target === modal) {
                    const closeMap = { discModal: closeDisc, screenshotsModal: closeScreenshots, bossModal: closeBosses, achievementModal: closeAchievements };
                    closeMap[id]?.();
                }
            });
        }
    });

    // Закрытие по Escape + стрелки
    document.addEventListener('keydown', function(e) {
        const modals = [
            { id: 'discModal', close: closeDisc, prev: prevDisc, next: nextDisc },
            { id: 'screenshotsModal', close: closeScreenshots, prev: prevScreenshot, next: nextScreenshot },
            { id: 'bossModal', close: closeBosses, prev: prevBoss, next: nextBoss }
        ];

        if (e.key === 'Escape') {
            modals.forEach(({ id, close }) => {
                if (document.getElementById(id).style.display === 'block') close();
            });
            if (document.getElementById('achievementModal').style.display === 'block') closeAchievements();
        }

        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            modals.forEach(({ id, prev, next }) => {
                if (document.getElementById(id).style.display === 'block') {
                    e.preventDefault();
                    e.key === 'ArrowLeft' ? prev() : next();
                }
            });
        }
    });
});
