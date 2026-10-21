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
            shuffleTracks();          // <-- ДОБАВИТЬ
            loadNextShuffled();       // <-- вместо loadTrack(currentTrackIndex)
        }
    } catch (e) { 
        console.error('Ошибка загрузки треков:', e); 
    }
}

function loadTrack(index) {
    const track = tracks[index];
    if (!track) return;

    // Сброс заливки при смене трека (один раз, в начале)
    const fill = document.getElementById('trackNameFill');
    if (fill) fill.style.clipPath = 'inset(0 100% 0 0)';

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
    const base = document.getElementById('trackName');
    const fill = document.getElementById('trackNameFill');
    
    const text = tracks.length && tracks[currentTrackIndex] 
        ? ` ${tracks[currentTrackIndex].name}` 
        : ' Нет треков';
        
    base.textContent = text;
    fill.textContent = text;
}

async function toggleMusic() {
    const btn = document.getElementById('playBtn');
    const icon = btn.querySelector('img');
    
    if (isPlaying) {
        audio.pause();
        if (icon) icon.src = 'media/icons/play.png';
        isPlaying = false;
        return;
    }
    
    if (!audio.src && tracks.length) {
        loadNextShuffled();   // <-- вместо рандома
    }
    
    if (!tracks.length) {
        alert('Нет доступных треков');
        return;
    }
    
    try {
        await audio.play();
        if (icon) icon.src = 'media/icons/pause.png';
        isPlaying = true;
    } catch {
        setTimeout(async () => {
            try {
                await audio.play();
                if (icon) icon.src = 'media/icons/pause.png';
                isPlaying = true;
            } catch {}
        }, 500);
    }
}

function nextTrack() {
    clearTimeout(trackLoadTimeout);
    if (isPlaying) audio.pause(); // Чтобы не было наложения
    loadNextShuffled();
    if (isPlaying) audio.play().catch(() => {});
}

// Выбираем случайный, пока не найдём отличный от текущего
let shuffledTracks = [];
let playIndex = 0;
let history = [];

function shuffleTracks() {
    shuffledTracks = [...tracks];
    // Перемешиваем (алгоритм Фишера-Йетса)
    for (let i = shuffledTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
    }
    playIndex = 0;
}

function loadNextShuffled() {
    if (shuffledTracks.length === 0) return;
    
    // Если играет трек и мы переключаем, сохраняем текущий в историю
    if (audio.src && currentTrackIndex !== undefined) {
        history.push(currentTrackIndex);
        if (history.length > 50) history.shift(); // ограничитель
    }
    
    if (playIndex >= shuffledTracks.length) {
        shuffleTracks(); // Круг закончился, перемешиваем заново 
    }
    
    const track = shuffledTracks[playIndex];
    currentTrackIndex = tracks.indexOf(track); // Чтобы знать оригинальный индекс
    playIndex++;
    loadTrack(currentTrackIndex);
}

function prevTrack() {
    clearTimeout(trackLoadTimeout);
    
    // Если истории нет, просто начинаем трек заново
    if (history.length === 0) {
        audio.currentTime = 0;
        return;
    }

    if (isPlaying) audio.pause();

    // Достаем индекс из истории
    const prevIndex = history.pop();
    currentTrackIndex = prevIndex;
    
    // Найдём этот трек в перемешанном списке, чтобы не потерять позицию
    const trackObj = tracks[prevIndex];
    const posInShuffled = shuffledTracks.indexOf(trackObj);
    if (posInShuffled !== -1) {
        playIndex = posInShuffled + 1; // В следующий раз пойдём после него
    }

    // Чтобы плеер не записал этот трек снова в историю, 
    // временно "обнуляем" src перед загрузкой
    audio.src = '';
    
    loadTrack(currentTrackIndex);
    
    if (isPlaying) audio.play().catch(() => {});
}

// Наложи этот код рядом с audio.addEventListener('ended', ...)
audio.addEventListener('timeupdate', function() {
    if (!audio.duration || isNaN(audio.duration) || audio.duration === Infinity) return;
    
    const fill = document.getElementById('trackNameFill');
    const base = document.getElementById('trackName');
    const wrapper = document.querySelector('.track-title-wrapper');
    
    if (!fill || !base || !wrapper) return;

    const progress = (audio.currentTime / audio.duration) * 100;
    
    // 1. Заливка (как было)
    fill.style.clipPath = `inset(0 ${100 - Math.min(progress, 100)}% 0 0)`;
    
    // 2. Сдвиг текста (новая логика)
    const textWidth = base.scrollWidth;
    const visibleWidth = wrapper.clientWidth;
    
    if (textWidth > visibleWidth) {
        const maxShift = textWidth - visibleWidth;
        const currentShift = -((progress / 100) * maxShift);
        
        base.style.transform = `translateX(${currentShift}px)`;
        fill.style.transform = `translateX(${currentShift}px)`;
    } else {
        base.style.transform = 'none';
        fill.style.transform = 'none';
    }

    // Автопереключение (как было)
    if (audio.duration - audio.currentTime < 0.5 && !audio.ended) {
        audio.dispatchEvent(new Event('ended'));
    }
});

// Автопереключение треков
audio.addEventListener('ended', function() {
    if (isPlaying) {
        audio.currentTime = 0;
        nextTrack();
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
            } else {
                alert('Неверный формат файла.');
            }
        } catch { 
            alert('Ошибка при чтении файла.'); 
        }
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
        try { 
            games = JSON.parse(saved); 
        } catch { 
            games = []; 
        }
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
    if (!title) { 
        alert('Введи название игры'); 
        return; 
    }

    const newGame = {
        id: Date.now(),
        title,
        platform: document.getElementById('gamePlatform').value,
        npwrId: "",
        year: parseInt(document.getElementById('gameYear').value) || 0,
        cover: document.getElementById('gameCover').value.trim().replace(/\\/g, '/') || 'media/covers/default.webp',
        backCover: document.getElementById('gameBackCover').value.trim().replace(/\\/g, '/') || 'media/covers/default_back.webp',
        manual: document.getElementById('gameManual').value.trim().replace(/\\/g, '/') || '',
        discs: document.getElementById('gameDiscs').value.split(',').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean),
        screenshots: document.getElementById('gameScreenshots').value.split(',').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean),
        bosses: document.getElementById('gameBosses').value.split(',').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean),
        achievements: document.getElementById('gameAchievements').value.split(',').map(s => s.trim()).filter(Boolean)
            .map(item => { 
                const p = item.split('|').map(s => s.trim()); 
                return p.length === 2 ? { name: p[0], icon: p[1].replace(/\\/g, '/') } : null; 
            })
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
    if (game) { 
        game[field] = !game[field]; 
        saveGames(); 
        renderGames(); 
    }
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

    grid.innerHTML = pageGames.map(game => {
        const platformClass = game.platform.toLowerCase().replace(/ /g, '_');
        return `
        <div class="card">
            <div class="cover" onclick="this.classList.toggle('flipped')">
                <div class="cover-inner">
                    <div class="cover-front"><img src="${game.cover || 'media/covers/default.webp'}" alt="${game.title}" /></div>
                    <div class="cover-back"><img src="${game.backCover || 'media/covers/default_back.webp'}" alt="Задняя сторона" /></div>
                </div>
            </div>
            <div class="title"><span class="glow-text">${game.title}</span></div>
            <div class="meta">
                <img src="media/icons/${platformClass}.svg" alt="${game.platform}" class="platform-icon ${platformClass}" />
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
        `;
    }).join('');

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    let html = '';
    const visible = 5;
    let start = Math.max(1, currentPage - Math.floor(visible / 2));
    let end = Math.min(totalPages, start + visible - 1);
    
    if (end - start < visible - 1) {
        start = Math.max(1, end - visible + 1);
    }

    const addBtn = p => { 
        html += `<button class="page-btn${p === currentPage ? ' active' : ''}" onclick="goToPage(${p})">${p}</button>`; 
    };
    const addEll = () => { 
        html += `<span class="page-ellipsis">…</span>`; 
    };

    if (start > 1) { 
        addBtn(1); 
        if (start > 2) addEll(); 
    }
    
    for (let i = start; i <= end; i++) {
        addBtn(i);
    }
    
    if (end < totalPages) { 
        if (end < totalPages - 1) addEll(); 
        addBtn(totalPages); 
    }

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
let timerTheme = null;
let timerHymn = null;

function brighten(btn, isTheme) {
    btn.style.opacity = '1';
    if (isTheme) {
        clearTimeout(timerTheme);
        timerTheme = setTimeout(() => { btn.style.opacity = '0.3'; }, 5000);
    } else {
        clearTimeout(timerHymn);
        timerHymn = setTimeout(() => { btn.style.opacity = '0.3'; }, 5000);
    }
}

['.theme-toggle', '.hymn-toggle'].forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    
    const isTheme = sel === '.theme-toggle';
    
    ['click', 'mouseenter', 'touchstart'].forEach(ev => {
        el.addEventListener(ev, () => brighten(el, isTheme));
    });
    
    setTimeout(() => { el.style.opacity = '0.3'; }, 5000);
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
    if (!url?.trim()) { 
        alert('📖 Мануал для этой игры пока не добавлен.'); 
        return; 
    }
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
    if (!currentDiscs.length) { 
        alert('Фото дисков нет'); 
        return; 
    }
    
    currentDiscIndex = 0;
    showDisc();
    openModal('discModal');
}

function showDisc() {
    document.getElementById('discImage').src = currentDiscs[currentDiscIndex];
    document.getElementById('discCounter').textContent = `${currentDiscIndex + 1} / ${currentDiscs.length}`;
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
    closeModal('discModal'); 
    document.getElementById('discImage').src = ''; 
}

// ============================================================
// СКРИНШОТЫ
// ============================================================
let currentScreenshots = [];
let currentScreenshotIndex = 0;

function openScreenshots(id) {
    const game = games.find(g => g.id === id);
    if (!game?.screenshots?.length) { 
        alert('Скриншотов нет'); 
        return; 
    }
    
    currentScreenshots = game.screenshots;
    currentScreenshotIndex = 0;
    showScreenshot();
    openModal('screenshotsModal');
}

function showScreenshot() {
    document.getElementById('screenshotsImage').src = currentScreenshots[currentScreenshotIndex];
    document.getElementById('screenshotsCounter').textContent = `${currentScreenshotIndex + 1} / ${currentScreenshots.length}`;
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

function closeScreenshots() { 
    closeModal('screenshotsModal'); 
    document.getElementById('screenshotsImage').src = ''; 
}

// ============================================================
// БОССЫ
// ============================================================
let currentBosses = [];
let currentBossIndex = 0;

function openBosses(id) {
    const game = games.find(g => g.id === id);
    if (!game?.bosses?.length) { 
        alert('Боссов нет'); 
        return; 
    }
    
    currentBosses = game.bosses;
    currentBossIndex = 0;
    showBoss();
    openModal('bossModal');
}

function showBoss() {
    document.getElementById('bossImage').src = currentBosses[currentBossIndex];
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

function closeBosses() { 
    closeModal('bossModal'); 
    document.getElementById('bossImage').src = ''; 
}

// ============================================================
// ДОСТИЖЕНИЯ
// ============================================================
let currentAchievements = [];
let sortMode = 'dateAsc';

function openAchievements(id) {
    const game = games.find(g => g.id === id);
    if (!game?.achievements?.length) { 
        alert('Достижений нет'); 
        return; 
    }
    
    currentGameId = id;
    currentAchievements = [...game.achievements];
    sortMode = 'dateAsc';
    renderAchievements();
    
    // Сброс активных кнопок сортировки
    document.querySelectorAll('.ach-sort button').forEach(btn => btn.classList.remove('active'));
    const firstBtn = document.querySelector('.ach-sort button');
    if (firstBtn) firstBtn.classList.add('active');
    
    openModal('achievementModal');
}

function closeAchievements() {
    closeModal('achievementModal');
    currentAchievements = [];
}

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
    const achievementsHTML = currentAchievements.map(a => {
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
        default: 
            return;
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
                    const closeMap = { 
                        discModal: closeDisc, 
                        screenshotsModal: closeScreenshots, 
                        bossModal: closeBosses, 
                        achievementModal: closeAchievements 
                    };
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
            if (document.getElementById('achievementModal').style.display === 'block') {
                closeAchievements();
            }
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

// ============================================================
// ВИДЕО ДИНОЗАВРА
// ============================================================
window.addEventListener('load', () => {
    const video = document.querySelector('.dino-video');
    const poster = document.querySelector('.dino-poster');
    if (!video || !poster) return;

    // Выбираем файл: мобильный или обычный
    const isMobile = window.innerWidth < 768;
    video.src = isMobile ? 'media/dino_mobile.webm' : 'media/dino_no_bg.webm';
    video.load();

    // Затемнение
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0); pointer-events:none; z-index:1; transition:background 0.4s;';
    document.body.appendChild(overlay);

    let darkOnce = false;

    // Скрываем постер только когда видео РЕАЛЬНО показывает кадр
    video.addEventListener('playing', function onPlaying() {
        // Проверяем, что кадр действительно отрисован
        if (video.currentTime > 0 && video.videoWidth > 0) {
            poster.style.display = 'none';
        } else {
            // Если ещё нет — ждём следующего кадра
            requestAnimationFrame(() => {
                if (video.currentTime > 0 && video.videoWidth > 0) {
                    poster.style.display = 'none';
                }
            });
        }

        // Затемнение — один раз, на пике рыка
        if (!darkOnce) {
            darkOnce = true;
            setTimeout(() => overlay.style.background = 'rgba(0,0,0,0.85)', 2650);
            setTimeout(() => overlay.style.background = 'rgba(0,0,0,0)', 3500);
        }

        video.removeEventListener('playing', onPlaying);
    });

    // Запускаем воспроизведение
    video.play().catch(() => {});
});
