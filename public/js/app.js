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

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFilters();
    loadHomePage();
    loadGenres();
    loadYears();
    loadDistricts();
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

    return `
        <div class="location-card" data-id="${location.id}">
            <div class="location-image">
                <img src="${imageUrl}" alt="${location.name}" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=location-icon>📍</span>';">
                <div class="location-district-badge">${location.district}</div>
            </div>
            <div class="location-info">
                <h3 class="location-name">${location.name}</h3>
                <p class="location-english">${location.englishName}</p>
                <p class="location-desc">${location.description}</p>
                <div class="location-footer">
                    <span class="location-drama-count">🎬 ${dramaCount}部剧集</span>
                    <span class="location-coords">📐 ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}</span>
                </div>
            </div>
        </div>
    `;
}

function renderMapMarkers(locations) {
    const mapContainer = document.getElementById('hk-map');
    const existingMarkers = mapContainer.querySelectorAll('.map-marker');
    existingMarkers.forEach(m => m.remove());

    const latMin = 22.15;
    const latMax = 22.40;
    const lngMin = 113.85;
    const lngMax = 114.40;

    locations.forEach(location => {
        const x = ((location.longitude - lngMin) / (lngMax - lngMin)) * 100;
        const y = ((latMax - location.latitude) / (latMax - latMin)) * 100;

        const marker = document.createElement('div');
        marker.className = 'map-marker';
        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        marker.dataset.id = location.id;
        marker.innerHTML = `<span>📍</span><div class="map-marker-tooltip">${location.name}</div>`;

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

    container.innerHTML = `
        <div class="location-detail-header">
            <div class="location-detail-image">
                <img src="${imageUrl}" alt="${location.name}" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=location-detail-icon>📍</span>';">
            </div>
            <div class="location-detail-info">
                <h2>${location.name}</h2>
                <p class="location-detail-english">${location.englishName}</p>
                <div class="location-detail-meta">
                    <span>🗺️ ${location.district}</span>
                    <span>📐 纬度: ${location.latitude.toFixed(4)}</span>
                    <span>📐 经度: ${location.longitude.toFixed(4)}</span>
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
    `;

    container.querySelectorAll('.scene-card').forEach(card => {
        card.addEventListener('click', () => {
            const dramaId = parseInt(card.dataset.dramaId);
            showDramaDetail(dramaId);
        });
    });

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('location-detail-page').classList.add('active');
    pageHistory.push(currentPage);
    currentPage = 'location-detail';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
