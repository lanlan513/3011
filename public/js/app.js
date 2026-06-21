const API_BASE = '/api';
let currentPage = 'home';
let pageHistory = [];

const genreIcons = {
    '武侠': '⚔️',
    '古装': '🏯',
    '商战': '💼',
    '家庭': '👨‍👩‍👧',
    '时装': '👔',
    '警匪': '🚓',
    '悬疑': '🔍',
    '民国': '🎩',
    '爱情': '❤️',
    '黑帮': '🔫',
    '喜剧': '😂',
    '动作': '🥊',
    '奇幻': '✨',
    '恐怖': '👻',
    '法律': '⚖️',
    '剧情': '🎬',
    '医疗': '🏥',
    '宫斗': '👑'
};

let checkedInLocationIds = [];
let currentSelectedGenres = [];
let currentRoute = null;
let allLocationsCache = [];

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFilters();
    initRoutePage();
    initLocationGenreFilter();
    initCouplesPage();
    loadHomePage();
    loadGenres();
    loadYears();
    loadDistricts();
    loadCheckInStats();
    loadStartLocationOptions();
    loadSavedPreferences();
});

function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            navigateTo(page);
        });
    });

    document.querySelectorAll('.quick-card').forEach(card => {
        card.addEventListener('click', () => {
            const page = card.dataset.page;
            const genre = card.dataset.genre;
            navigateTo(page);
            if (genre) {
                document.getElementById('genre-select').value = genre;
                loadDramas();
            }
        });
    });
}

function initFilters() {
    const searchInput = document.getElementById('search-input');
    const genreSelect = document.getElementById('genre-select');
    const yearSelect = document.getElementById('year-select');
    const sortSelect = document.getElementById('sort-select');
    const resetBtn = document.getElementById('reset-btn');
    const actorSearch = document.getElementById('actor-search');

    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadDramas, 300);
    });

    genreSelect.addEventListener('change', loadDramas);
    yearSelect.addEventListener('change', loadDramas);
    sortSelect.addEventListener('change', loadDramas);

    resetBtn.addEventListener('click', () => {
        searchInput.value = '';
        genreSelect.value = '';
        yearSelect.value = '';
        sortSelect.value = '';
        loadDramas();
    });

    let actorSearchTimeout;
    actorSearch.addEventListener('input', () => {
        clearTimeout(actorSearchTimeout);
        actorSearchTimeout = setTimeout(loadActors, 300);
    });

    const locationSearch = document.getElementById('location-search');
    const districtSelect = document.getElementById('district-select');
    const locationResetBtn = document.getElementById('location-reset-btn');

    let locationSearchTimeout;
    locationSearch.addEventListener('input', () => {
        clearTimeout(locationSearchTimeout);
        locationSearchTimeout = setTimeout(loadLocations, 300);
    });

    districtSelect.addEventListener('change', loadLocations);

    locationResetBtn.addEventListener('click', () => {
        locationSearch.value = '';
        districtSelect.value = '';
        loadLocations();
    });
}

function navigateTo(pageName, addToHistory = true) {
    if (addToHistory && currentPage !== pageName) {
        pageHistory.push(currentPage);
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageName);
    });

    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    currentPage = pageName;

    switch(pageName) {
        case 'home':
            loadHomePage();
            break;
        case 'dramas':
            loadDramas();
            break;
        case 'actors':
            loadActors();
            break;
        case 'quotes':
            loadQuotes();
            break;
        case 'locations':
            loadLocations();
            loadCheckInStats();
            break;
        case 'route':
            loadCheckInStats();
            break;
        case 'checkins':
            loadCheckIns();
            break;
        case 'couples':
            loadCouples();
            break;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
    if (pageHistory.length > 0) {
        const prevPage = pageHistory.pop();
        navigateTo(prevPage, false);
    } else {
        navigateTo('home', false);
    }
}

async function apiCall(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) throw new Error('API请求失败');
        return await response.json();
    } catch (error) {
        console.error('API错误:', error);
        return null;
    }
}

async function loadHomePage() {
    const [stats, randomQuote] = await Promise.all([
        apiCall('/stats'),
        apiCall('/quotes?random=true')
    ]);

    if (stats) {
        animateNumber('stat-dramas', stats.dramaCount);
        animateNumber('stat-actors', stats.actorCount);
        animateNumber('stat-quotes', stats.quoteCount);
        animateNumber('stat-genres', stats.genreCount);
        if (stats.locationCount) {
            animateNumber('stat-locations', stats.locationCount);
        }
        if (stats.coupleCount) {
            animateNumber('stat-couples', stats.coupleCount);
        }
    }

    if (randomQuote) {
        document.getElementById('daily-quote').innerHTML =
            `「${randomQuote.text}」 —— ${randomQuote.character}`;
    }

    loadFeaturedDramas();
}

function animateNumber(elementId, target) {
    const element = document.getElementById(elementId);
    const duration = 1500;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * easeOut);
        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

async function loadFeaturedDramas() {
    const dramas = await apiCall('/dramas?sort=rating');
    const container = document.getElementById('featured-dramas');

    if (!dramas || dramas.length === 0) {
        container.innerHTML = '<p>暂无数据</p>';
        return;
    }

    container.innerHTML = dramas.slice(0, 8).map(drama => createDramaCard(drama)).join('');

    container.querySelectorAll('.drama-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            showDramaDetail(id);
        });
    });
}

function createDramaCard(drama) {
    const mainGenre = drama.genre[0] || '剧情';
    const icon = genreIcons[mainGenre] || '📺';

    return `
        <div class="drama-card" data-id="${drama.id}">
            <div class="drama-rating">⭐ ${drama.rating.toFixed(1)}</div>
            <div class="drama-poster">
                <span class="drama-poster-icon">${icon}</span>
            </div>
            <div class="drama-info">
                <h3 class="drama-title" title="${drama.title}">${drama.title}</h3>
                <div class="drama-meta">
                    <span class="drama-year">${drama.year}</span>
                    <span>·</span>
                    <span>${drama.episodes}集</span>
                </div>
                <div class="drama-genres">
                    ${drama.genre.slice(0, 3).map(g => `<span class="genre-tag">${g}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
}

async function loadGenres() {
    const genres = await apiCall('/genres');
    const select = document.getElementById('genre-select');

    if (genres) {
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            select.appendChild(option);
        });
    }
}

async function loadYears() {
    const years = await apiCall('/years');
    const select = document.getElementById('year-select');

    if (years) {
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}年`;
            select.appendChild(option);
        });
    }
}

async function loadDramas() {
    const search = document.getElementById('search-input').value;
    const genre = document.getElementById('genre-select').value;
    const year = document.getElementById('year-select').value;
    const sort = document.getElementById('sort-select').value;

    const container = document.getElementById('dramas-list');
    const loading = document.getElementById('dramas-loading');
    const empty = document.getElementById('dramas-empty');

    loading.style.display = 'block';
    container.innerHTML = '';
    empty.style.display = 'none';

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (genre) params.append('genre', genre);
    if (year) params.append('year', year);
    if (sort) params.append('sort', sort);

    const dramas = await apiCall(`/dramas?${params.toString()}`);

    loading.style.display = 'none';

    if (!dramas || dramas.length === 0) {
        empty.style.display = 'block';
        return;
    }

    container.innerHTML = dramas.map(drama => createDramaCard(drama)).join('');

    container.querySelectorAll('.drama-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            showDramaDetail(id);
        });
    });
}

async function showDramaDetail(id) {
    const drama = await apiCall(`/dramas/${id}`);
    const container = document.getElementById('drama-detail');

    if (!drama) {
        container.innerHTML = '<p>加载失败</p>';
        return;
    }

    const mainGenre = drama.genre[0] || '剧情';
    const icon = genreIcons[mainGenre] || '📺';

    container.innerHTML = `
        <div class="drama-detail-header">
            <div class="drama-detail-poster">
                <span>${icon}</span>
            </div>
            <div class="drama-detail-info">
                <h2>${drama.title}</h2>
                <p class="drama-detail-english">${drama.englishTitle}</p>
                <div class="drama-detail-meta">
                    <span>📅 ${drama.year}年</span>
                    <span>📺 ${drama.episodes}集</span>
                    <span>⭐ ${drama.rating}分</span>
                    <span>🎬 ${drama.productionCompany}</span>
                </div>
                <div class="drama-genres">
                    ${drama.genre.map(g => `<span class="genre-tag">${g}</span>`).join('')}
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>📖 剧情简介</h3>
            <p class="drama-detail-synopsis">${drama.synopsis}</p>
        </div>

        <div class="detail-section">
            <h3>🎭 主要演员</h3>
            <div class="actors-list">
                ${drama.actors.map(actor => `
                    <div class="actor-item" data-actor-id="${actor.id}">
                        <div class="actor-item-avatar">${actor.name.charAt(0)}</div>
                        <div class="actor-item-info">
                            <div class="actor-item-name">${actor.name}</div>
                            <div class="actor-item-role">饰 ${actor.role}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="detail-section">
            <h3>💬 经典台词</h3>
            <div class="quotes-list">
                ${drama.quotes.map(quote => `
                    <div class="quote-card">
                        <p class="quote-text">${quote.text}</p>
                        <div class="quote-meta">
                            <span class="quote-character">—— ${quote.character}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.querySelectorAll('.actor-item').forEach(item => {
        item.addEventListener('click', () => {
            const actorId = parseInt(item.dataset.actorId);
            showActorDetail(actorId);
        });
    });

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('drama-detail-page').classList.add('active');
    pageHistory.push(currentPage);
    currentPage = 'drama-detail';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadActors() {
    const search = document.getElementById('actor-search').value;
    const container = document.getElementById('actors-list');
    const loading = document.getElementById('actors-loading');

    loading.style.display = 'block';
    container.innerHTML = '';

    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const actors = await apiCall(`/actors?${params.toString()}`);

    loading.style.display = 'none';

    if (!actors || actors.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#7a7a7a;padding:40px;">未找到相关演员</p>';
        return;
    }

    const uniqueActors = [];
    const seen = new Set();
    actors.forEach(actor => {
        if (!seen.has(actor.name)) {
            seen.add(actor.name);
            uniqueActors.push(actor);
        }
    });

    container.innerHTML = uniqueActors.map(actor => `
        <div class="actor-card" data-id="${actor.id}">
            <div class="actor-avatar">${actor.name.charAt(0)}</div>
            <h3 class="actor-name">${actor.name}</h3>
            <p class="actor-birth">${actor.birthYear ? actor.birthYear + '年出生' : ''}</p>
            <p class="actor-desc">${actor.description}</p>
        </div>
    `).join('');

    container.querySelectorAll('.actor-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            showActorDetail(id);
        });
    });
}

async function showActorDetail(id) {
    const actor = await apiCall(`/actors/${id}`);
    const container = document.getElementById('actor-detail');

    if (!actor) {
        container.innerHTML = '<p>加载失败</p>';
        return;
    }

    container.innerHTML = `
        <div class="actor-detail-header">
            <div class="actor-detail-avatar">${actor.name.charAt(0)}</div>
            <h2 class="actor-detail-name">${actor.name}</h2>
            <p class="actor-detail-birth">${actor.birthYear ? actor.birthYear + '年出生' : ''}</p>
            <p class="actor-detail-desc">${actor.description}</p>
        </div>

        <div class="detail-section">
            <h3>📺 参演剧集（${actor.dramas.length}部）</h3>
            <div class="dramas-list-horizontal">
                ${actor.dramas.map(drama => `
                    <div class="drama-item-card" data-drama-id="${drama.id}">
                        <div class="drama-item-title">${drama.title}</div>
                        <div class="drama-item-role">饰 ${drama.role}</div>
                        <div class="drama-item-year">${drama.year}年 · ${drama.genre.join(' / ')}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.querySelectorAll('.drama-item-card').forEach(card => {
        card.addEventListener('click', () => {
            const dramaId = parseInt(card.dataset.dramaId);
            showDramaDetail(dramaId);
        });
    });

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('actor-detail-page').classList.add('active');
    pageHistory.push(currentPage);
    currentPage = 'actor-detail';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadQuotes() {
    const container = document.getElementById('quotes-list');
    const loading = document.getElementById('quotes-loading');

    loading.style.display = 'block';
    container.innerHTML = '';

    const quotes = await apiCall('/quotes');

    loading.style.display = 'none';

    if (!quotes || quotes.length === 0) {
        container.innerHTML = '<p>暂无台词</p>';
        return;
    }

    container.innerHTML = quotes.map(quote => `
        <div class="quote-card">
            <p class="quote-text">${quote.text}</p>
            <div class="quote-meta">
                <span class="quote-character">—— ${quote.character}</span>
                <p class="quote-drama">《${quote.dramaTitle}》</p>
            </div>
        </div>
    `).join('');
}

async function loadDistricts() {
    const districts = await apiCall('/districts');
    const select = document.getElementById('district-select');

    if (districts) {
        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            select.appendChild(option);
        });
    }
}

async function loadLocations() {
    const search = document.getElementById('location-search').value;
    const district = document.getElementById('district-select').value;

    const container = document.getElementById('locations-list');
    const loading = document.getElementById('locations-loading');
    const empty = document.getElementById('locations-empty');

    loading.style.display = 'block';
    container.innerHTML = '';
    empty.style.display = 'none';

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (district) params.append('district', district);

    const locations = await apiCall(`/locations?${params.toString()}`);

    loading.style.display = 'none';

    if (!locations || locations.length === 0) {
        empty.style.display = 'block';
        renderMapMarkers([]);
        return;
    }

    container.innerHTML = locations.map(location => createLocationCard(location)).join('');

    container.querySelectorAll('.location-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            showLocationDetail(id);
        });
    });

    renderMapMarkers(locations);
}

function createLocationCard(location) {
    const dramaCount = location.dramas ? location.dramas.length : 0;
    const imageUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(location.image)}&image_size=landscape_16_9`;
    const isCheckedIn = checkedInLocationIds.includes(location.id);
    const eggCount = location.easterEggs ? location.easterEggs.length : 0;

    return `
        <div class="location-card" data-id="${location.id}">
            <div class="location-image">
                <img src="${imageUrl}" alt="${location.name}" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=location-icon>📍</span>';">
                <div class="location-district-badge">${location.district}</div>
                ${isCheckedIn ? '<div class="checked-badge">✅ 已打卡</div>' : ''}
                ${eggCount > 0 ? `<div class="egg-badge">🥚 ${eggCount}彩蛋</div>` : ''}
            </div>
            <div class="location-info">
                <h3 class="location-name">${location.name}</h3>
                <p class="location-english">${location.englishName}</p>
                <div class="location-tags">
                    ${(location.tags || []).map(t => `<span class="location-tag-mini">${genreIcons[t] || '📺'} ${t}</span>`).join('')}
                </div>
                <p class="location-desc">${location.description}</p>
                <div class="location-footer">
                    <span class="location-drama-count">🎬 ${dramaCount}部剧集</span>
                    <span class="location-coords">⏱️ ${location.visitDuration || 60}分钟</span>
                </div>
            </div>
        </div>
    `;
}

function renderMapMarkers(locations, mapId = 'hk-map', routeStops = null) {
    const mapContainer = document.getElementById(mapId);
    if (!mapContainer) return;
    const existingMarkers = mapContainer.querySelectorAll('.map-marker, .route-marker, .route-line');
    existingMarkers.forEach(m => m.remove());

    const latMin = 22.15;
    const latMax = 22.40;
    const lngMin = 113.85;
    const lngMax = 114.40;

    if (routeStops && routeStops.length > 1) {
        const points = routeStops.map(s => ({
            x: ((s.location.longitude - lngMin) / (lngMax - lngMin)) * 100,
            y: ((latMax - s.location.latitude) / (latMax - latMin)) * 100
        }));

        for (let i = 0; i < points.length - 1; i++) {
            const line = document.createElement('div');
            line.className = 'route-line';

            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;

            line.style.left = `${points[i].x}%`;
            line.style.top = `${points[i].y}%`;
            line.style.width = `${length}%`;
            line.style.transform = `rotate(${angle}deg)`;

            mapContainer.appendChild(line);
        }
    }

    locations.forEach(location => {
        const x = ((location.longitude - lngMin) / (lngMax - lngMin)) * 100;
        const y = ((latMax - location.latitude) / (latMax - latMin)) * 100;

        const marker = document.createElement('div');
        const isRoute = routeStops && routeStops.some(s => s.location.id === location.id);
        const routeOrder = routeStops ? routeStops.findIndex(s => s.location.id === location.id) : -1;
        const isCheckedIn = checkedInLocationIds.includes(location.id);

        marker.className = `map-marker ${isRoute ? 'route-marker' : ''} ${isCheckedIn ? 'checked-marker' : ''}`;
        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        marker.dataset.id = location.id;

        const markerContent = isRoute && routeOrder >= 0
            ? `<span class="route-marker-num">${routeOrder + 1}</span>`
            : `<span>${isCheckedIn ? '✅' : '📍'}</span>`;

        marker.innerHTML = `${markerContent}<div class="map-marker-tooltip">${location.name}</div>`;

        marker.addEventListener('click', () => {
            showLocationDetail(location.id);
        });

        mapContainer.appendChild(marker);
    });
}

async function showLocationDetail(id) {
    const location = await apiCall(`/locations/${id}`);
    const container = document.getElementById('location-detail');

    if (!location) {
        container.innerHTML = '<p>加载失败</p>';
        return;
    }

    const imageUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(location.image)}&image_size=landscape_16_9`;
    const isCheckedIn = checkedInLocationIds.includes(location.id);
    const eggCount = location.easterEggs ? location.easterEggs.length : 0;

    container.innerHTML = `
        <div class="location-detail-header">
            <div class="location-detail-image">
                <img src="${imageUrl}" alt="${location.name}" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=location-detail-icon>📍</span>';">
                ${isCheckedIn ? '<div class="detail-checked-overlay">✅ 已完成打卡</div>' : ''}
            </div>
            <div class="location-detail-info">
                <h2>${location.name}</h2>
                <p class="location-detail-english">${location.englishName}</p>
                <div class="location-detail-meta">
                    <span>🗺️ ${location.district}</span>
                    <span>📐 ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}</span>
                    <span>⏱️ 建议停留 ${location.visitDuration || 60} 分钟</span>
                </div>
                <div class="location-tags">
                    ${(location.tags || []).map(t => `<span class="genre-tag">${genreIcons[t] || '📺'} ${t}</span>`).join('')}
                </div>
                <div class="detail-action-buttons">
                    <button class="checkin-btn ${isCheckedIn ? 'checked' : ''}" id="detail-checkin-btn" data-location-id="${location.id}">
                        <span>${isCheckedIn ? '✅ 取消打卡' : '📸 立即打卡'}</span>
                    </button>
                    <button class="route-attach-btn" onclick="navigateTo('route')">
                        <span>🗺️ 加入朝圣路线</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>📖 地点介绍</h3>
            <p class="location-detail-desc">${location.description}</p>
        </div>

        <div class="detail-section">
            <h3>🎬 相关剧集与经典场景</h3>
            <div class="location-scenes">
                ${location.dramas.map(scene => `
                    <div class="scene-card" data-drama-id="${scene.dramaId}">
                        <div class="scene-drama-title">《${scene.dramaTitle}》<span class="scene-drama-year">(${scene.dramaYear}年)</span></div>
                        <div class="scene-description">${scene.description}</div>
                        ${scene.quote ? `
                        <div class="scene-quote">
                            <p class="scene-quote-text">「${scene.quote.text}」</p>
                            <span class="scene-quote-character">—— ${scene.quote.character}</span>
                        </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        ${eggCount > 0 ? `
        <div class="detail-section easter-egg-section">
            <h3>🥚 隐藏彩蛋点 (${eggCount})</h3>
            <p class="egg-hint-text">💡 按照以下提示探索，发现剧中的小秘密！</p>
            <div class="easter-eggs-list">
                ${location.easterEggs.map(egg => `
                    <div class="egg-item">
                        <div class="egg-icon">🥚</div>
                        <div class="egg-content">
                            <div class="egg-name">${egg.name}</div>
                            <div class="egg-desc">${egg.description}</div>
                            <div class="egg-hint">💡 ${egg.hint}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    `;

    container.querySelectorAll('.scene-card').forEach(card => {
        card.addEventListener('click', () => {
            const dramaId = parseInt(card.dataset.dramaId);
            showDramaDetail(dramaId);
        });
    });

    const checkinBtn = document.getElementById('detail-checkin-btn');
    if (checkinBtn) {
        checkinBtn.addEventListener('click', () => {
            toggleCheckIn(location.id, checkinBtn);
        });
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('location-detail-page').classList.add('active');
    pageHistory.push(currentPage);
    currentPage = 'location-detail';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadCheckInStats() {
    const checkIns = await apiCall('/checkins');
    const locations = await apiCall('/locations');

    if (checkIns) {
        checkedInLocationIds = checkIns.map(c => c.locationId);
    }

    const locationTotal = locations ? locations.length : 0;
    const checkInCount = checkedInLocationIds.length;
    const progress = locationTotal > 0 ? Math.round((checkInCount / locationTotal) * 100) : 0;

    const checkInCountEl = document.getElementById('checkin-count');
    const locationTotalEl = document.getElementById('location-total');
    const checkInProgressEl = document.getElementById('checkin-progress');

    if (checkInCountEl) checkInCountEl.textContent = checkInCount;
    if (locationTotalEl) locationTotalEl.textContent = locationTotal;
    if (checkInProgressEl) checkInProgressEl.textContent = `${progress}%`;

    if (currentPage === 'locations') {
        loadLocations();
    }
}

async function initLocationGenreFilter() {
    const genres = await apiCall('/genres');
    const select = document.getElementById('location-genre-select');
    if (!select) return;

    if (genres) {
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = `${genreIcons[genre] || '📺'} ${genre}`;
            select.appendChild(option);
        });
    }

    select.addEventListener('change', loadLocations);
}

const originalLoadLocations = loadLocations;
loadLocations = async function() {
    const search = document.getElementById('location-search').value;
    const district = document.getElementById('district-select').value;
    const genre = document.getElementById('location-genre-select').value;

    const container = document.getElementById('locations-list');
    const loading = document.getElementById('locations-loading');
    const empty = document.getElementById('locations-empty');

    loading.style.display = 'block';
    container.innerHTML = '';
    empty.style.display = 'none';

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (district) params.append('district', district);

    const locations = await apiCall(`/locations?${params.toString()}`);

    loading.style.display = 'none';

    if (!locations || locations.length === 0) {
        empty.style.display = 'block';
        renderMapMarkers([]);
        return;
    }

    let filtered = locations;
    if (genre) {
        filtered = locations.filter(l => l.tags && l.tags.includes(genre));
    }

    if (filtered.length === 0) {
        empty.style.display = 'block';
        renderMapMarkers([]);
        return;
    }

    allLocationsCache = filtered;

    container.innerHTML = filtered.map(location => createLocationCard(location)).join('');

    container.querySelectorAll('.location-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            showLocationDetail(id);
        });
    });

    renderMapMarkers(filtered);
};

async function toggleCheckIn(locationId, buttonEl) {
    const existingIndex = checkedInLocationIds.indexOf(locationId);

    if (existingIndex >= 0) {
        const checkIns = await apiCall('/checkins');
        const checkIn = checkIns.find(c => c.locationId === locationId);
        if (checkIn) {
            await fetch(`${API_BASE}/checkins/${checkIn.id}`, { method: 'DELETE' });
            checkedInLocationIds.splice(existingIndex, 1);
        }
    } else {
        const response = await fetch(`${API_BASE}/checkins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locationId })
        });
        if (response.ok) {
            checkedInLocationIds.push(locationId);
            showCheckInSuccess();
        }
    }

    loadCheckInStats();
    if (buttonEl) {
        const isChecked = checkedInLocationIds.includes(locationId);
        buttonEl.classList.toggle('checked', isChecked);
        buttonEl.querySelector('span').textContent = isChecked ? '✅ 取消打卡' : '📸 立即打卡';
        const overlay = document.querySelector('.detail-checked-overlay');
        if (overlay) {
            overlay.style.display = isChecked ? 'flex' : 'none';
        }
    }
}

function showCheckInSuccess() {
    const toast = document.createElement('div');
    toast.className = 'toast-success';
    toast.innerHTML = '🎉 打卡成功！';
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

async function loadStartLocationOptions() {
    const locations = await apiCall('/locations');
    const select = document.getElementById('start-location-select');
    if (!select || !locations) return;

    locations.forEach(loc => {
        const option = document.createElement('option');
        option.value = loc.id;
        option.textContent = `📍 ${loc.name} (${loc.district})`;
        select.appendChild(option);
    });
}

async function loadSavedPreferences() {
    const prefs = await apiCall('/preferences');
    if (!prefs) return;

    if (prefs.favoriteGenres && prefs.favoriteGenres.length > 0) {
        currentSelectedGenres = [...prefs.favoriteGenres];
        updatePreferenceGenreUI();
    }
}

function updatePreferenceGenreUI() {
    document.querySelectorAll('.genre-tag-preference').forEach(tag => {
        const genre = tag.dataset.genre;
        tag.classList.toggle('active', currentSelectedGenres.includes(genre));
    });
}

function initRoutePage() {
    document.querySelectorAll('.genre-tag-preference').forEach(tag => {
        tag.addEventListener('click', () => {
            const genre = tag.dataset.genre;
            const index = currentSelectedGenres.indexOf(genre);
            if (index >= 0) {
                currentSelectedGenres.splice(index, 1);
            } else {
                currentSelectedGenres.push(genre);
            }
            updatePreferenceGenreUI();
        });
    });

    const generateBtn = document.getElementById('generate-route-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateRoute);
    }

    const regenerateBtn = document.getElementById('regenerate-route-btn');
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', generateRoute);
    }

    const savePrefsBtn = document.getElementById('save-preferences-btn');
    if (savePrefsBtn) {
        savePrefsBtn.addEventListener('click', savePreferences);
    }
}

async function generateRoute() {
    const loading = document.getElementById('route-loading');
    const resultContainer = document.getElementById('route-result-container');

    if (loading) loading.style.display = 'block';
    if (resultContainer) resultContainer.style.display = 'none';

    const startLocationId = document.getElementById('start-location-select').value;
    const maxStops = parseInt(document.getElementById('max-stops-select').value);
    const includeEasterEggs = document.getElementById('include-easter-eggs').checked;

    await new Promise(r => setTimeout(r, 1500));

    try {
        const response = await fetch(`${API_BASE}/route/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                preferredGenres: currentSelectedGenres,
                startLocationId: startLocationId ? parseInt(startLocationId) : null,
                maxStops,
                includeEasterEggs
            })
        });

        if (!response.ok) throw new Error('路线生成失败');
        const route = await response.json();
        currentRoute = route;
        renderRouteResult(route);
    } catch (error) {
        console.error('路线生成失败:', error);
        alert('路线生成失败，请重试');
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

function renderRouteResult(route) {
    const resultContainer = document.getElementById('route-result-container');
    if (!resultContainer) return;

    resultContainer.style.display = 'block';

    document.getElementById('generated-route-name').textContent = route.name;
    document.getElementById('generated-route-desc').textContent = route.description;
    document.getElementById('route-stop-count').textContent = route.stops.length;
    document.getElementById('route-walk-time').textContent = formatMinutes(route.totalWalkTime);
    document.getElementById('route-distance').textContent = (route.totalDistance / 1000).toFixed(1);
    document.getElementById('route-total-time').textContent = formatMinutes(route.totalTime);
    document.getElementById('route-egg-count').textContent = route.easterEggs.length;

    const routeLocations = route.stops.map(s => s.location);
    renderMapMarkers(routeLocations, 'route-map', route.stops);

    renderRouteTimeline(route.stops);

    const eggSection = document.getElementById('easter-eggs-section');
    const eggGrid = document.getElementById('easter-eggs-grid');
    if (route.easterEggs.length > 0) {
        eggSection.style.display = 'block';
        eggGrid.innerHTML = route.easterEggs.map(egg => `
            <div class="easter-egg-card">
                <div class="egg-card-header">
                    <span class="egg-card-icon">🥚</span>
                    <div class="egg-card-location">📍 ${egg.locationName}</div>
                </div>
                <h4 class="egg-card-name">${egg.name}</h4>
                <p class="egg-card-desc">${egg.description}</p>
                <div class="egg-card-hint">💡 ${egg.hint}</div>
            </div>
        `).join('');
    } else {
        eggSection.style.display = 'none';
    }

    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderRouteTimeline(stops) {
    const timeline = document.getElementById('route-timeline');
    if (!timeline) return;

    timeline.innerHTML = stops.map((stop, index) => {
        const location = stop.location;
        const isChecked = stop.checked;
        const genresHtml = (stop.matchedGenres && stop.matchedGenres.length > 0)
            ? stop.matchedGenres.map(g => `<span class="route-genre-tag">${genreIcons[g] || '📺'} ${g}</span>`).join('')
            : (location.tags || []).slice(0, 3).map(t => `<span class="route-genre-tag muted">${genreIcons[t] || '📺'} ${t}</span>`).join('');

        const dramasHtml = (location.scenes || []).slice(0, 2).map(scene => {
            const dramaTitle = scene.dramaTitle || '经典港剧';
            return `<div class="route-drama-item">🎬 《${dramaTitle}》</div>`;
        }).join('');

        const walkInfoHtml = index > 0 ? `
            <div class="route-walk-info">
                <span class="walk-arrow">↓</span>
                <span class="walk-text">🚶 步行 ${stop.walkTimeFromPrevious} 分钟</span>
                <span class="walk-dist">约 ${(stop.walkFromPrevious / 1000).toFixed(2)} 公里</span>
            </div>
        ` : '';

        const eggCount = location.easterEggs ? location.easterEggs.length : 0;

        return `
            ${walkInfoHtml}
            <div class="route-stop-card" data-location-id="${location.id}">
                <div class="route-stop-order">${stop.order}</div>
                <div class="route-stop-content">
                    <div class="route-stop-header">
                        <h4 class="route-stop-name">${location.name}</h4>
                        ${isChecked ? '<span class="route-stop-checked">✅ 已打卡</span>' : '<span class="route-stop-new">🆕 新晋打卡</span>'}
                    </div>
                    <div class="route-stop-meta">
                        <span class="route-stop-district">🗺️ ${location.district}</span>
                        <span class="route-stop-duration">⏱️ 建议停留 ${location.visitDuration || 60} 分钟</span>
                        ${eggCount > 0 ? `<span class="route-stop-eggs">🥚 ${eggCount}个彩蛋</span>` : ''}
                    </div>
                    <div class="route-stop-genres">${genresHtml}</div>
                    <div class="route-stop-dramas">${dramasHtml}</div>
                </div>
            </div>
        `;
    }).join('');

    timeline.querySelectorAll('.route-stop-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.locationId);
            showLocationDetail(id);
        });
    });
}

async function savePreferences() {
    try {
        const response = await fetch(`${API_BASE}/preferences`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                favoriteGenres: currentSelectedGenres
            })
        });

        if (response.ok) {
            const toast = document.createElement('div');
            toast.className = 'toast-success';
            toast.innerHTML = '💾 偏好设置已保存！';
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        }
    } catch (error) {
        console.error('保存偏好失败:', error);
    }
}

function formatMinutes(totalMinutes) {
    if (totalMinutes < 60) return `${totalMinutes}分钟`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
}

async function loadCheckIns() {
    const container = document.getElementById('checkins-list');
    const empty = document.getElementById('checkins-empty');
    if (!container) return;

    const checkIns = await apiCall('/checkins');
    const locations = await apiCall('/locations');

    if (!checkIns || checkIns.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    container.innerHTML = `
        <div class="checkins-stats-summary">
            <div class="checkins-summary-item">
                <span class="summary-icon">📊</span>
                <div>
                    <div class="summary-number">${checkIns.length}</div>
                    <div class="summary-label">累计打卡次数</div>
                </div>
            </div>
            <div class="checkins-summary-item">
                <span class="summary-icon">⭐</span>
                <div>
                    <div class="summary-number">${checkIns.reduce((sum, c) => sum + (c.rating || 5), 0) / checkIns.length}</div>
                    <div class="summary-label">平均评分</div>
                </div>
            </div>
        </div>
        <div class="checkins-grid">
            ${checkIns.map(checkin => {
                const location = locations ? locations.find(l => l.id === checkin.locationId) : null;
                const checkDate = new Date(checkin.checkedAt);
                const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,'0')}-${String(checkDate.getDate()).padStart(2,'0')}`;
                return `
                    <div class="checkin-card" data-location-id="${checkin.locationId}">
                        ${location ? `
                            <div class="checkin-card-image">
                                <span class="checkin-icon">📍</span>
                            </div>
                        ` : ''}
                        <div class="checkin-card-info">
                            <div class="checkin-card-header">
                                <h4 class="checkin-card-name">${checkin.locationName}</h4>
                                <span class="checkin-card-date">📅 ${dateStr}</span>
                            </div>
                            <div class="checkin-card-rating">
                                ${'⭐'.repeat(checkin.rating || 5)}
                            </div>
                            ${checkin.notes ? `<p class="checkin-card-notes">${checkin.notes}</p>` : ''}
                            <button class="checkin-delete-btn" data-checkin-id="${checkin.id}">
                                ❌ 删除记录
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.querySelectorAll('.checkin-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.checkin-delete-btn')) {
                const id = parseInt(card.dataset.locationId);
                showLocationDetail(id);
            }
        });
    });

    container.querySelectorAll('.checkin-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.checkinId);
            if (confirm('确定要删除这条打卡记录吗？')) {
                await fetch(`${API_BASE}/checkins/${id}`, { method: 'DELETE' });
                loadCheckInStats();
                loadCheckIns();
            }
        });
    });
}

function initCouplesPage() {
    document.querySelectorAll('.cp-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            document.querySelectorAll('.cp-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.cp-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`cp-${targetTab}-tab`).classList.add('active');

            if (targetTab === 'ranking') {
                loadCpRanking();
            }
        });
    });

    const cpSearch = document.getElementById('cp-search');
    const cpStatus = document.getElementById('cp-status-select');
    const cpSort = document.getElementById('cp-sort-select');
    const cpReset = document.getElementById('cp-reset-btn');

    let searchTimeout;
    cpSearch.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadCouples, 300);
    });

    cpStatus.addEventListener('change', loadCouples);
    cpSort.addEventListener('change', loadCouples);

    cpReset.addEventListener('click', () => {
        cpSearch.value = '';
        cpStatus.value = '';
        cpSort.value = 'votes';
        loadCouples();
    });
}

async function loadCouples() {
    const search = document.getElementById('cp-search').value;
    const statusFilter = document.getElementById('cp-status-select').value;
    const sort = document.getElementById('cp-sort-select').value;

    const container = document.getElementById('couples-list');
    const loading = document.getElementById('couples-loading');
    const empty = document.getElementById('couples-empty');

    loading.style.display = 'block';
    container.innerHTML = '';
    empty.style.display = 'none';

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (sort) params.append('sort', sort);

    let couples = await apiCall(`/couples?${params.toString()}`);

    loading.style.display = 'none';

    if (!couples || couples.length === 0) {
        empty.style.display = 'block';
        return;
    }

    if (statusFilter) {
        couples = couples.filter(c => c.relationshipStatus.includes(statusFilter));
    }

    if (couples.length === 0) {
        empty.style.display = 'block';
        return;
    }

    container.innerHTML = couples.map(cp => createCpCard(cp)).join('');

    container.querySelectorAll('.cp-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            showCpDetail(id);
        });
    });

    container.querySelectorAll('.cp-vote-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            openVoteModal(id);
        });
    });
}

function createCpCard(cp) {
    const statusColor = cp.statusColor || '#d4a84b';
    const mainTag = cp.tags ? cp.tags[0] : '';
    const minYear = cp.dramas.length > 0 ? Math.min(...cp.dramas.map(d => d.year || 0)) : 0;

    return `
        <div class="cp-card" data-id="${cp.id}">
            <div class="cp-card-poster">
                <div class="cp-characters-display">
                    <div class="cp-char-avatar left">${cp.characters[0].charAt(0)}</div>
                    <div class="cp-heart-icon">💕</div>
                    <div class="cp-char-avatar right">${cp.characters[1] ? cp.characters[1].charAt(0) : '?'}</div>
                </div>
                <div class="cp-rating-badge">⭐ ${cp.rating ? cp.rating.toFixed(1) : '--'}</div>
                <div class="cp-status-badge" style="background:${statusColor}">${cp.relationshipStatus || '--'}</div>
            </div>
            <div class="cp-card-info">
                <h3 class="cp-name">${cp.name}</h3>
                <div class="cp-characters-row">
                    ${cp.characters.map(ch => `<span class="cp-character-tag">${ch}</span>`).join('<span class="cp-heart-mini">❤</span>')}
                </div>
                <div class="cp-actors-row">
                    ${cp.actors.map(a => `<span class="cp-actor-name">${a}</span>`).join(' × ')}
                </div>
                <div class="cp-tags-row">
                    ${(cp.tags || []).slice(0, 3).map(t => `<span class="cp-tag-mini">${t}</span>`).join('')}
                </div>
                <div class="cp-card-footer">
                    <div class="cp-drama-info">🎬 ${cp.dramaCount || cp.dramas.length}部剧集 · ${minYear || '--'}年</div>
                    <button class="cp-vote-btn" data-id="${cp.id}">
                        <span>🗳️</span>
                        <span>${cp.totalVotes || cp.votes || 0}票</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function showCpDetail(id) {
    const cp = await apiCall(`/couples/${id}`);
    const container = document.getElementById('cp-detail');

    if (!cp) {
        container.innerHTML = '<p>加载失败</p>';
        return;
    }

    const statusColor = cp.statusColor || '#d4a84b';

    container.innerHTML = `
        <div class="cp-detail-header">
            <div class="cp-detail-poster-section">
                <div class="cp-detail-hero">
                    <div class="cp-detail-avatar-wrap">
                        <div class="cp-detail-avatar left">${cp.characters[0].charAt(0)}</div>
                        <div class="cp-detail-heart">💕</div>
                        <div class="cp-detail-avatar right">${cp.characters[1] ? cp.characters[1].charAt(0) : '?'}</div>
                    </div>
                    <h1 class="cp-detail-name">${cp.name}</h1>
                    <div class="cp-detail-status" style="background:${statusColor}">${cp.relationshipStatus || '--'}</div>
                    <div class="cp-detail-char-row">
                        ${cp.characters.map((ch, i) => `
                            <div class="cp-char-info-block">
                                <div class="cp-char-name">${ch}</div>
                                <div class="cp-char-actor">饰演：${cp.actors[i] || '--'}</div>
                            </div>
                        `).join('<div class="cp-vs-divider">❤</div>')}
                    </div>
                </div>
            </div>
            <div class="cp-detail-stats">
                <div class="cp-stat-box">
                    <span class="cp-stat-icon">⭐</span>
                    <span class="cp-stat-value">${cp.rating ? cp.rating.toFixed(1) : '--'}</span>
                    <span class="cp-stat-label">CP评分</span>
                </div>
                <div class="cp-stat-box gold">
                    <span class="cp-stat-icon">🗳️</span>
                    <span class="cp-stat-value" id="cp-vote-count-${cp.id}">${cp.totalVotes || cp.votes || 0}</span>
                    <span class="cp-stat-label">人气票数</span>
                </div>
                <div class="cp-stat-box">
                    <span class="cp-stat-icon">🎬</span>
                    <span class="cp-stat-value">${cp.dramas.length}</span>
                    <span class="cp-stat-label">部剧集</span>
                </div>
                <div class="cp-stat-box">
                    <span class="cp-stat-icon">🎞️</span>
                    <span class="cp-stat-value">${cp.classicScenes.length}</span>
                    <span class="cp-stat-label">经典片段</span>
                </div>
                <button class="cp-detail-vote-btn" onclick="openVoteModal(${cp.id})">
                    <span>💖</span> 为这对CP投一票
                </button>
            </div>
        </div>

        <div class="cp-tags-container">
            ${(cp.tags || []).map(t => `<span class="cp-detail-tag">${t}</span>`).join('')}
        </div>

        <div class="detail-section">
            <h3>💕 关于这对CP</h3>
            <p class="cp-description">${cp.description}</p>
        </div>

        <div class="detail-section">
            <h3>📈 关系演变历程</h3>
            <div class="relationship-evolution-container">
                ${cp.relationshipEvolution.map((stage, index) => `
                    <div class="evolution-node">
                        <div class="evolution-icon">${stage.icon}</div>
                        <div class="evolution-content">
                            <div class="evolution-stage">${stage.stage}</div>
                            <div class="evolution-desc">${stage.description}</div>
                        </div>
                        ${index < cp.relationshipEvolution.length - 1 ? '<div class="evolution-arrow">→</div>' : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="detail-section">
            <h3>📅 感情时间线</h3>
            <div class="cp-timeline-container">
                ${cp.timeline.map((event, index) => {
                    const typeColors = {
                        '相遇': '#2b5c8b',
                        '心动': '#d4a84b',
                        '关键节点': '#3d8b3d',
                        '考验': '#c41e3a',
                        '圆满': '#3d8b3d',
                        '虐心': '#c41e3a',
                        '复杂结局': '#d4a84b'
                    };
                    const color = typeColors[event.type] || '#4a4a4a';
                    const icon = {
                        '相遇': '👋',
                        '心动': '💓',
                        '关键节点': '⭐',
                        '考验': '⚡',
                        '圆满': '🎉',
                        '虐心': '😢',
                        '复杂结局': '♾️'
                    }[event.type] || '📌';

                    return `
                        <div class="timeline-item">
                            <div class="timeline-marker" style="background:${color}">${icon}</div>
                            <div class="timeline-content-card">
                                <div class="timeline-header">
                                    <span class="timeline-event-name">${event.event}</span>
                                    <span class="timeline-date">${event.date}</span>
                                </div>
                                <div class="timeline-type-tag" style="background:${color}22;color:${color};border:1px solid ${color}44">
                                    ${event.type}
                                </div>
                                <p class="timeline-desc">${event.description}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <div class="detail-section">
            <h3>🎞️ 代表剧集</h3>
            <div class="cp-dramas-grid">
                ${cp.dramas.map(drama => `
                    <div class="cp-drama-card" data-drama-id="${drama.dramaId}">
                        <div class="cp-drama-header">
                            <h4 class="cp-drama-title">《${drama.title}》</h4>
                            <span class="cp-drama-year">${drama.year}年</span>
                        </div>
                        <div class="cp-drama-role">📌 ${drama.roleInStory}</div>
                        <div class="cp-drama-moments">
                            <div class="cp-drama-key-title">✨ 关键剧情：</div>
                            <ul>
                                ${(drama.keyMoments || []).map(m => `<li>${m}</li>`).join('')}
                            </ul>
                        </div>
                        ${drama.rating ? `<div class="cp-drama-rating">⭐ 评分：${drama.rating}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="detail-section">
            <h3>🎬 经典片段回忆</h3>
            <div class="classic-scenes-grid">
                ${cp.classicScenes.map(scene => `
                    <div class="classic-scene-card">
                        <div class="classic-scene-icon">${scene.icon || '🎞️'}</div>
                        <div class="classic-scene-info">
                            <h4 class="classic-scene-title">${scene.title}</h4>
                            <div class="classic-scene-episode">📺 ${scene.episode}</div>
                            <p class="classic-scene-desc">${scene.description}</p>
                            ${scene.quote ? `
                            <div class="classic-scene-quote">
                                <p class="quote-text">「${scene.quote.text}」</p>
                                <span class="quote-character">—— ${scene.quote.character}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="detail-section">
            <h3>🗳️ 为他们投票打Call</h3>
            <div class="vote-section-box">
                <p class="vote-section-desc">喜欢这对CP吗？为他们投上宝贵的一票，让更多人看到他们的故事！</p>
                <button class="cp-detail-vote-btn large" onclick="openVoteModal(${cp.id})">
                    <span>💖</span> 我要投票支持这对CP
                </button>
            </div>
        </div>
    `;

    container.querySelectorAll('.cp-drama-card').forEach(card => {
        card.addEventListener('click', () => {
            const dramaId = parseInt(card.dataset.dramaId);
            showDramaDetail(dramaId);
        });
    });

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('cp-detail-page').classList.add('active');
    pageHistory.push(currentPage);
    currentPage = 'cp-detail';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openVoteModal(coupleId) {
    const existingModal = document.getElementById('vote-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'vote-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content vote-modal">
            <div class="modal-close-btn" onclick="closeVoteModal()">×</div>
            <div class="vote-modal-header">
                <div class="vote-modal-icon">💖</div>
                <h3 class="vote-modal-title">为这对CP投上一票</h3>
                <p class="vote-modal-subtitle">每一票都是对他们爱情的支持！</p>
            </div>
            <div class="vote-form">
                <div class="vote-input-group">
                    <label class="vote-input-label">你的昵称</label>
                    <input type="text" id="vote-nickname" class="vote-input" placeholder="请输入昵称（选填）" maxlength="20">
                </div>
                <div class="vote-input-group">
                    <label class="vote-input-label">留言支持（选填）</label>
                    <textarea id="vote-comment" class="vote-textarea" placeholder="写下你对这对CP的祝福或感想..." maxlength="200"></textarea>
                </div>
                <div class="vote-quick-tags">
                    <span class="quick-tag" onclick="addVoteTag('YYDS！永远的神')">YYDS！永远的神</span>
                    <span class="quick-tag" onclick="addVoteTag('意难平😭')">意难平😭</span>
                    <span class="quick-tag" onclick="addVoteTag('太好嗑了！')">太好嗑了！</span>
                    <span class="quick-tag" onclick="addVoteTag('童年回忆')">童年回忆</span>
                    <span class="quick-tag" onclick="addVoteTag('经典永流传')">经典永流传</span>
                </div>
                <button class="vote-submit-btn" onclick="submitVote(${coupleId})">
                    <span>💖</span> 确认投票
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

function addVoteTag(tag) {
    const textarea = document.getElementById('vote-comment');
    if (textarea) {
        textarea.value = textarea.value ? textarea.value + ' ' + tag : tag;
    }
}

function closeVoteModal() {
    const modal = document.getElementById('vote-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

async function submitVote(coupleId) {
    const nickname = document.getElementById('vote-nickname').value;
    const comment = document.getElementById('vote-comment').value;

    try {
        const response = await fetch(`${API_BASE}/couples/${coupleId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, comment })
        });

        if (!response.ok) throw new Error('投票失败');

        const result = await response.json();

        const voteCountEl = document.getElementById(`cp-vote-count-${coupleId}`);
        if (voteCountEl) {
            voteCountEl.textContent = result.totalVotes;
        }

        showVoteSuccess();
        closeVoteModal();

        if (currentPage === 'couples') {
            loadCouples();
        }

    } catch (error) {
        console.error('投票失败:', error);
        alert('投票失败，请稍后重试');
    }
}

function showVoteSuccess() {
    const toast = document.createElement('div');
    toast.className = 'toast-success';
    toast.innerHTML = '💖 投票成功！感谢你的支持';
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

async function loadCpRanking() {
    const loading = document.getElementById('ranking-loading');
    const podium = document.getElementById('ranking-podium');
    const list = document.getElementById('ranking-list');
    const updateEl = document.getElementById('ranking-update');

    loading.style.display = 'block';
    podium.innerHTML = '';
    list.innerHTML = '';

    const result = await apiCall('/couples/ranking');

    loading.style.display = 'none';

    if (!result || !result.ranking || result.ranking.length === 0) {
        list.innerHTML = '<p style="text-align:center;padding:40px;color:#7a7a7a;">暂无排行榜数据</p>';
        return;
    }

    if (result.updatedAt) {
        const date = new Date(result.updatedAt);
        updateEl.textContent = `更新于 ${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    }

    const top3 = result.ranking.slice(0, 3);
    const rest = result.ranking.slice(3);

    const podiumData = [null, null, null];
    top3.forEach(cp => {
        if (cp.rank === 1) podiumData[0] = cp;
        else if (cp.rank === 2) podiumData[1] = cp;
        else if (cp.rank === 3) podiumData[2] = cp;
    });

    const podiumColors = ['#d4a84b', '#c0c0c0', '#cd7f32'];
    const podiumHeights = ['300px', '250px', '200px'];
    const podiumIcons = ['🥇', '🥈', '🥉'];
    const podiumNames = ['金', '银', '铜'];

    const orderMap = [1, 0, 2];
    podium.innerHTML = orderMap.map(idx => {
        const cp = podiumData[idx];
        if (!cp) return '';
        const color = podiumColors[idx];
        const height = podiumHeights[idx];
        const icon = podiumIcons[idx];
        const medalName = podiumNames[idx];

        return `
            <div class="podium-item rank-${idx + 1}" data-id="${cp.id}">
                <div class="podium-medal-badge" style="background:${color};color:#1a1a2a;">${medalName}</div>
                ${cp.isNew ? '<div class="podium-new-tag">🔥HOT</div>' : ''}
                <div class="podium-avatar-wrap">
                    <div class="podium-avatar left">${cp.characters[0].charAt(0)}</div>
                    <div class="podium-heart">💕</div>
                    <div class="podium-avatar right">${cp.characters[1] ? cp.characters[1].charAt(0) : '?'}</div>
                </div>
                <div class="podium-name">${cp.name}</div>
                <div class="podium-chars">${cp.characters.join(' ❤ ')}</div>
                <div class="podium-actors">${cp.actors.join(' × ')}</div>
                <div class="podium-stats">
                    <span>⭐ ${cp.rating ? cp.rating.toFixed(1) : '--'}</span>
                    <span>🗳️ ${cp.totalVotes}票</span>
                </div>
                <div class="podium-base" style="height:${height};background:linear-gradient(180deg, ${color}55, ${color}22);border:2px solid ${color};">
                    <div class="podium-rank-icon">${icon}</div>
                    <div class="podium-rank-num">第${idx + 1}名</div>
                </div>
            </div>
        `;
    }).join('');

    list.innerHTML = rest.map(cp => {
        const trendIcon = cp.trend === 'up' ? '📈' : (cp.trend === 'down' ? '📉' : '➡️');
        const trendText = cp.trend === 'up' ? '上升' : (cp.trend === 'down' ? '下降' : '持平');
        const rankColors = ['#4a90d9', '#5a8ac9', '#6a84b9', '#7a7ea9', '#8a7899'];
        const rankColor = rankColors[Math.min(cp.rank - 4, rankColors.length - 1)];
        
        return `
            <div class="ranking-list-item" data-id="${cp.id}">
                <div class="ranking-rank-num" style="background:linear-gradient(145deg, ${rankColor}, ${rankColor}88);color:#fff;">
                    ${cp.rank}
                </div>
                <div class="ranking-item-info">
                    <div class="ranking-item-header">
                        <span class="ranking-item-name">${cp.name}</span>
                        ${cp.isNew ? '<span class="ranking-new">✨上新</span>' : ''}
                        <span class="ranking-trend" title="${trendText}">${trendIcon} ${trendText}</span>
                    </div>
                    <div class="ranking-item-chars">
                        <span class="chars-label">角色：</span>${cp.characters.join(' ❤ ')}
                    </div>
                    <div class="ranking-item-chars actors">
                        <span class="chars-label">演员：</span>${cp.actors.join(' × ')}
                    </div>
                    <div class="ranking-item-tags">
                        <span class="ranking-status" style="color:${cp.statusColor || '#d4a84b'}">${cp.relationshipStatus || ''}</span>
                        ${(cp.tags || []).slice(0, 2).map(t => `<span class="ranking-tag">#${t}</span>`).join('')}
                    </div>
                </div>
                <div class="ranking-item-score">
                    <div class="ranking-hot-score">🔥 ${cp.hotScore ? cp.hotScore.toFixed(0) : '--'}</div>
                    <div class="ranking-score-label">热度值</div>
                    <div class="ranking-score-row">
                        <span>🗳️ ${cp.totalVotes}</span>
                        <span>⭐ ${cp.rating ? cp.rating.toFixed(1) : '--'}</span>
                    </div>
                </div>
                <button class="ranking-vote-btn" data-id="${cp.id}">
                    <span>💖</span> 投票
                </button>
            </div>
        `;
    }).join('');

    podium.querySelectorAll('.podium-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.id);
            showCpDetail(id);
        });
    });

    list.querySelectorAll('.ranking-list-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.ranking-vote-btn')) {
                const id = parseInt(item.dataset.id);
                showCpDetail(id);
            }
        });
    });

    list.querySelectorAll('.ranking-vote-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            openVoteModal(id);
        });
    });
}
