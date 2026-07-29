// Данные игр из localStorage
let games = [];
let currentPage = 1;
const itemsPerPage = 12;

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

    // Очищаем поле, чтобы можно было загрузить тот же файл повторно
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
        // Начальные игры, если ничего нет
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
    const title = document.getElementById('gameTitle').value.trim();
    const cover = document.getElementById('gameCover').value.trim() || '';
	const backCover = document.getElementById('gameBackCover').value.trim() || '';
    const platform = document.getElementById('gamePlatform').value;
    const year = parseInt(document.getElementById('gameYear').value) || 0;
	const manual = document.getElementById('gameManual').value.trim() || '';
	

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
        passed: false,
        platinum: false,
	    steamId: null
    };

    games.push(newGame);
    saveGames();
    renderGames();

    // Очистить поля
    document.getElementById('gameTitle').value = '';
    document.getElementById('gameCover').value = '';
    document.getElementById('gameYear').value = '';
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
        renderGames();
        return;
    }
    filteredGames = games.filter(game =>
        game.title.toLowerCase().includes(query) ||
        game.platform.toLowerCase().includes(query)
    );
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

    // Используем ту же пагинацию, что и в renderGames, но с переданным списком
    const totalPages = Math.ceil(list.length / itemsPerPage);
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
                <span>${game.platform}</span> ${game.year || ''}
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
                <button onclick="openScreenshots(${game.id})">📸 Память</button>
                <button onclick="openManual('${game.manual}')" ${!game.manual ? 'disabled' : ''}>📖 Мануал</button>
                <button onclick="openDisc(${game.id})">💿</button>
            </div>
        </div>
    `).join('');

    // Пагинация для отфильтрованного списка
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
        paginationTop.innerHTML = '' ;
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
            <span>${game.platform}</span> ${game.year || ''}
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
    <button onclick="openScreenshots(${game.id})">📸 Память</button>
    <button onclick="openManual('${game.manual}')" ${!game.manual ? 'disabled' : ''}>📖 Мануал</button>
	<button onclick="openDisc(${game.id})">💿</button>
</div>
    </div>
`).join('');

      // Пагинация с многоточием
    let paginationHTML = '';
    const visiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
    let endPage = Math.min(totalPages, startPage + visiblePages - 1);

    if (endPage - startPage < visiblePages - 1) {
        startPage = Math.max(1, endPage - visiblePages + 1);
    }

    // Функция для добавления кнопки в строку
    function addPageBtnHTML(page) {
        const active = page === currentPage ? ' active' : '';
        paginationHTML += `<button class="page-btn${active}" onclick="goToPage(${page})">${page}</button>`;
    }

    // Функция для добавления многоточия в строку
    function addEllipsisHTML() {
        paginationHTML += `<span class="page-ellipsis">…</span>`;
    }

    // Первая страница
    if (startPage > 1) {
        addPageBtnHTML(1);
        if (startPage > 2) {
            addEllipsisHTML();
        }
    }

    // Видимые страницы
    for (let i = startPage; i <= endPage; i++) {
        addPageBtnHTML(i);
    }

    // Последняя страница
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            addEllipsisHTML();
        }
        addPageBtnHTML(totalPages);
    }

    // Вставляем в оба блока
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

// Затухание кнопок через 5 секунд бездействия
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

// Для кнопки темы
themeBtn.addEventListener('click', () => brightenButton(themeBtn, timerTheme));
themeBtn.addEventListener('mouseenter', () => brightenButton(themeBtn, timerTheme));
themeBtn.addEventListener('touchstart', () => brightenButton(themeBtn, timerTheme));

// Для кнопки гимна
hymnBtn.addEventListener('click', () => brightenButton(hymnBtn, timerHymn));
hymnBtn.addEventListener('mouseenter', () => brightenButton(hymnBtn, timerHymn));
hymnBtn.addEventListener('touchstart', () => brightenButton(hymnBtn, timerHymn));

// Устанавливаем начальную прозрачность
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
    if (!game || !game.disc || game.disc.length === 0) {
        alert('Фото дисков нет');
        return;
    }
    // Если disc — строка, превращаем в массив
    currentDiscs = Array.isArray(game.disc) ? game.disc : [game.disc];
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

// Закрытие модалок по клику вне окна и по Escape
document.addEventListener('DOMContentLoaded', function() {
    const discModal = document.getElementById('discModal');
    const screenshotsModal = document.getElementById('screenshotsModal');

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
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (document.getElementById('discModal').style.display === 'block') closeDisc();
        if (document.getElementById('screenshotsModal').style.display === 'block') closeScreenshots();
    }
});

function closeDisc() {
    document.getElementById('discModal').style.display = 'none';
    document.getElementById('discImage').src = '';
}

// Музыкальный плеер
let currentTrackIndex = 0;
let isPlaying = false;
let audio = new Audio();

const tracks = [
    { name: 'Томб Райдер', file: 'https://lambda.vgmtreasurechest.com/soundtracks/classical-games-in-concert-2019/qcvfwrsorq/07%20-%20Tomb%20Raider%20%28Live%20from%20Paris%29.mp3' },
    { name: 'Getting Up', file: 'https://lambda.vgmtreasurechest.com/soundtracks/marc-eckos-getting-up-contents-under-pressure-ipod-menu-tracks-ps2-windows-xbox-gamerip-2006/yakgkxqnpj/02.%20Welcome%20to%20New%20Radius.mp3' },
    { name: 'Соната', file: 'https://lambda.vgmtreasurechest.com/soundtracks/eternal-sonata-ps3/dpnwtepn/01_Eternal%20Sonata%20%5BTrusty%20Bell%20-%20Chopin%27s%20Dream%5D%20%28Think%20of%20Me%29.mp3' },
    { name: 'Диабло', file: 'https://lambda.vgmtreasurechest.com/soundtracks/diablo-1998-psx-gamerip/hvfodbuw/06.mp3' },
    { name: 'Алундра', file: 'https://nu.vgmtreasurechest.com/soundtracks/alundra-ps1-gamerip-1997/cqwjgfix/1-06.%20Requiem.mp3' }
];

function toggleMusic() {
    const playBtn = document.getElementById('playBtn');
    if (isPlaying) {
        audio.pause();
        playBtn.textContent = '▶';
        isPlaying = false;
    } else {
        if (audio.src === '') {
            // Первый запуск — выбираем случайный трек
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
    audio.src = tracks[index].file;
    audio.load();
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

// При загрузке страницы — выбираем случайный трек, но не играем
document.addEventListener('DOMContentLoaded', function() {
    currentTrackIndex = Math.floor(Math.random() * tracks.length);
    loadTrack(currentTrackIndex);
});

loadGames();
