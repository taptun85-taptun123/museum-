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
        <div class="title">${game.title}</div>
        <div class="meta">
            <span>${game.platform}</span> ${game.year || ''}
        </div>
		<div class="manual-link">
    <button onclick="openManual('${game.manual}')" ${!game.manual ? 'disabled' : ''}>
        📖 Мануал
    </button>
</div>
        <div class="status">
            <span class="badge ${game.passed ? 'passed' : ''}" ondblclick="toggleStatus(${game.id}, 'passed')">
                ${game.passed ? '✅ Пройдена' : '❌ Не пройдена'}
            </span>
            <span class="badge ${game.platinum ? 'platinum' : ''}" ondblclick="toggleStatus(${game.id}, 'platinum')">
                ${game.platinum ? '🏆 Платина' : '🚫 Без платины'}
            </span>
            <span class="badge" ondblclick="deleteGame(${game.id})" style="cursor:pointer;background:#3a1a2a;color:#a06a7a;">✕</span>
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

loadGames();