const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, 'data', 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function readData() {
  const rawData = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(rawData);
}

function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function is90sYear(year) {
  const y = parseInt(year);
  return !isNaN(y) && y >= 1990 && y <= 1999;
}

app.get('/api/dramas', (req, res) => {
  const { genre, year, actor, search, sort } = req.query;
  let data = readData();
  let dramas = data.dramas;

  if (search) {
    const keyword = search.toLowerCase();
    dramas = dramas.filter(d =>
      d.title.toLowerCase().includes(keyword) ||
      d.englishTitle.toLowerCase().includes(keyword) ||
      d.synopsis.toLowerCase().includes(keyword)
    );
  }

  if (genre) {
    dramas = dramas.filter(d => d.genre.includes(genre));
  }

  if (year) {
    dramas = dramas.filter(d => d.year === parseInt(year));
  }

  if (actor) {
    const actorName = actor.toLowerCase();
    dramas = dramas.filter(d => {
      return d.actors.some(a => {
        const actorData = data.actors.find(act => act.id === a.actorId);
        return actorData && actorData.name.toLowerCase().includes(actorName);
      });
    });
  }

  if (sort === 'rating') {
    dramas = [...dramas].sort((a, b) => b.rating - a.rating);
  } else if (sort === 'year') {
    dramas = [...dramas].sort((a, b) => a.year - b.year);
  } else if (sort === 'year-desc') {
    dramas = [...dramas].sort((a, b) => b.year - a.year);
  }

  const result = dramas.map(drama => {
    const actors = drama.actors.map(a => {
      const actorData = data.actors.find(act => act.id === a.actorId);
      return {
        id: a.actorId,
        name: actorData ? actorData.name : '未知',
        role: a.role
      };
    });
    const quotes = drama.quotes.map(qId => {
      const quoteData = data.quotes.find(q => q.id === qId);
      return quoteData || null;
    }).filter(q => q !== null);

    return { ...drama, actors, quotes };
  });

  res.json(result);
});

app.get('/api/dramas/:id', (req, res) => {
  const data = readData();
  const drama = data.dramas.find(d => d.id === parseInt(req.params.id));

  if (!drama) {
    return res.status(404).json({ error: '剧集未找到' });
  }

  const actors = drama.actors.map(a => {
    const actorData = data.actors.find(act => act.id === a.actorId);
    return {
      id: a.actorId,
      name: actorData ? actorData.name : '未知',
      role: a.role,
      description: actorData ? actorData.description : '',
      birthYear: actorData ? actorData.birthYear : null
    };
  });

  const quotes = drama.quotes.map(qId => {
    const quoteData = data.quotes.find(q => q.id === qId);
    return quoteData || null;
  }).filter(q => q !== null);

  res.json({ ...drama, actors, quotes });
});

app.get('/api/actors', (req, res) => {
  const { search } = req.query;
  const data = readData();
  let actors = data.actors;

  if (search) {
    const keyword = search.toLowerCase();
    actors = actors.filter(a =>
      a.name.toLowerCase().includes(keyword) ||
      a.description.toLowerCase().includes(keyword)
    );
  }

  const result = actors.map(actor => {
    const dramas = data.dramas.filter(d =>
      d.actors.some(a => a.actorId === actor.id)
    ).map(d => ({
      id: d.id,
      title: d.title,
      role: d.actors.find(a => a.actorId === actor.id)?.role
    }));

    return { ...actor, dramas };
  });

  res.json(result);
});

app.get('/api/actors/:id', (req, res) => {
  const data = readData();
  const actor = data.actors.find(a => a.id === parseInt(req.params.id));

  if (!actor) {
    return res.status(404).json({ error: '演员未找到' });
  }

  const dramas = data.dramas.filter(d =>
    d.actors.some(a => a.actorId === actor.id)
  ).map(d => ({
    id: d.id,
    title: d.title,
    year: d.year,
    role: d.actors.find(a => a.actorId === actor.id)?.role,
    genre: d.genre
  }));

  res.json({ ...actor, dramas });
});

app.get('/api/quotes', (req, res) => {
  const { dramaId, random } = req.query;
  const data = readData();
  let quotes = data.quotes;

  if (dramaId) {
    quotes = quotes.filter(q => q.dramaId === parseInt(dramaId));
  }

  if (random === 'true') {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return res.json(quotes[randomIndex]);
  }

  const result = quotes.map(q => {
    const drama = data.dramas.find(d => d.id === q.dramaId);
    return {
      ...q,
      dramaTitle: drama ? drama.title : '未知'
    };
  });

  res.json(result);
});

app.get('/api/genres', (req, res) => {
  const data = readData();
  const genres = new Set();

  data.dramas.forEach(drama => {
    drama.genre.forEach(g => genres.add(g));
  });

  res.json(Array.from(genres).sort());
});

app.get('/api/years', (req, res) => {
  const data = readData();
  const years = [...new Set(data.dramas.map(d => d.year))].sort((a, b) => a - b);
  res.json(years);
});

app.get('/api/locations', (req, res) => {
  const { search, dramaId, district } = req.query;
  const data = readData();
  let locations = data.locations || [];

  if (search) {
    const keyword = search.toLowerCase();
    locations = locations.filter(l =>
      l.name.toLowerCase().includes(keyword) ||
      l.englishName.toLowerCase().includes(keyword) ||
      l.description.toLowerCase().includes(keyword) ||
      l.district.toLowerCase().includes(keyword)
    );
  }

  if (district) {
    locations = locations.filter(l => l.district.includes(district));
  }

  if (dramaId) {
    const id = parseInt(dramaId);
    locations = locations.filter(l => l.scenes.some(s => s.dramaId === id));
  }

  const result = locations.map(location => {
    const dramas = location.scenes.map(scene => {
      const drama = data.dramas.find(d => d.id === scene.dramaId);
      const quote = scene.quoteId ? data.quotes.find(q => q.id === scene.quoteId) : null;
      return {
        dramaId: scene.dramaId,
        dramaTitle: drama ? drama.title : '未知',
        dramaYear: drama ? drama.year : null,
        description: scene.description,
        quote: quote ? {
          id: quote.id,
          text: quote.text,
          character: quote.character
        } : null
      };
    });

    return { ...location, dramas };
  });

  res.json(result);
});

app.get('/api/locations/:id', (req, res) => {
  const data = readData();
  const location = (data.locations || []).find(l => l.id === parseInt(req.params.id));

  if (!location) {
    return res.status(404).json({ error: '地点未找到' });
  }

  const dramas = location.scenes.map(scene => {
    const drama = data.dramas.find(d => d.id === scene.dramaId);
    const quote = scene.quoteId ? data.quotes.find(q => q.id === scene.quoteId) : null;
    return {
      dramaId: scene.dramaId,
      dramaTitle: drama ? drama.title : '未知',
      dramaYear: drama ? drama.year : null,
      description: scene.description,
      quote: quote ? {
        id: quote.id,
        text: quote.text,
        character: quote.character
      } : null
    };
  });

  res.json({ ...location, dramas });
});

app.get('/api/districts', (req, res) => {
  const data = readData();
  const districts = [...new Set((data.locations || []).map(l => l.district))].sort();
  res.json(districts);
});

app.get('/api/stats', (req, res) => {
  const data = readData();
  res.json({
    dramaCount: data.dramas.length,
    actorCount: data.actors.length,
    quoteCount: data.quotes.length,
    genreCount: new Set(data.dramas.flatMap(d => d.genre)).size,
    locationCount: (data.locations || []).length,
    checkInCount: (data.checkIns || []).length,
    coupleCount: (data.couples || []).length,
    cpVoteCount: (data.cpVotes || []).length
  });
});

app.get('/api/checkins', (req, res) => {
  const data = readData();
  res.json(data.checkIns || []);
});

app.post('/api/checkins', (req, res) => {
  const data = readData();
  const { locationId, rating, notes } = req.body;

  if (!locationId) {
    return res.status(400).json({ error: '地点ID不能为空' });
  }

  const location = (data.locations || []).find(l => l.id === parseInt(locationId));
  if (!location) {
    return res.status(404).json({ error: '地点不存在' });
  }

  const existingCheckIn = (data.checkIns || []).find(c => c.locationId === parseInt(locationId));
  if (existingCheckIn) {
    return res.status(400).json({ error: '该地点已打卡' });
  }

  const newCheckIn = {
    id: (data.checkIns || []).length > 0 ? Math.max(...data.checkIns.map(c => c.id)) + 1 : 1,
    locationId: parseInt(locationId),
    locationName: location.name,
    rating: rating || 5,
    notes: notes || '',
    checkedAt: new Date().toISOString()
  };

  if (!data.checkIns) data.checkIns = [];
  data.checkIns.push(newCheckIn);
  writeData(data);
  res.status(201).json(newCheckIn);
});

app.delete('/api/checkins/:id', (req, res) => {
  const data = readData();
  if (!data.checkIns) data.checkIns = [];
  const index = data.checkIns.findIndex(c => c.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: '打卡记录未找到' });
  }

  const deleted = data.checkIns.splice(index, 1);
  writeData(data);
  res.json(deleted[0]);
});

app.get('/api/preferences', (req, res) => {
  const data = readData();
  res.json(data.userPreferences || { favoriteGenres: [], avoidedLocations: [] });
});

app.post('/api/preferences', (req, res) => {
  const data = readData();
  const { favoriteGenres, avoidedLocations } = req.body;

  if (!data.userPreferences) {
    data.userPreferences = { favoriteGenres: [], avoidedLocations: [] };
  }

  if (favoriteGenres !== undefined) {
    data.userPreferences.favoriteGenres = Array.isArray(favoriteGenres) ? favoriteGenres : [];
  }
  if (avoidedLocations !== undefined) {
    data.userPreferences.avoidedLocations = Array.isArray(avoidedLocations) ? avoidedLocations : [];
  }

  writeData(data);
  res.json(data.userPreferences);
});

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function estimateWalkingTime(distanceMeters) {
  const walkingSpeed = 80;
  const minutes = distanceMeters / walkingSpeed;
  return Math.ceil(minutes);
}

app.post('/api/route/generate', (req, res) => {
  const data = readData();
  const { preferredGenres, startLocationId, maxStops, includeEasterEggs } = req.body;

  const locations = data.locations || [];
  const checkIns = data.checkIns || [];
  const userPrefs = data.userPreferences || { favoriteGenres: [], avoidedLocations: [] };

  const genres = preferredGenres && preferredGenres.length > 0
    ? preferredGenres
    : (userPrefs.favoriteGenres.length > 0 ? userPrefs.favoriteGenres : null);

  const avoided = userPrefs.avoidedLocations || [];
  const checkedInLocationIds = checkIns.map(c => c.locationId);
  const maxLocations = maxStops || 5;

  let availableLocations = locations.filter(l =>
    !avoided.includes(l.id)
  );

  let scoredLocations = availableLocations.map(location => {
    let score = 0;

    if (genres && genres.length > 0 && location.tags) {
      const matchedGenres = location.tags.filter(t => genres.includes(t));
      score += matchedGenres.length * 10;

      const dramaMatches = (location.scenes || []).filter(scene => {
        const drama = data.dramas.find(d => d.id === scene.dramaId);
        if (!drama) return false;
        return drama.genre.some(g => genres.includes(g));
      }).length;
      score += dramaMatches * 5;
    }

    if (!checkedInLocationIds.includes(location.id)) {
      score += 5;
    } else {
      score += 2;
    }

    const dramaRatingSum = (location.scenes || []).reduce((sum, scene) => {
      const drama = data.dramas.find(d => d.id === scene.dramaId);
      return sum + (drama ? drama.rating : 0);
    }, 0);
    score += dramaRatingSum;

    if (includeEasterEggs && location.easterEggs && location.easterEggs.length > 0) {
      score += location.easterEggs.length * 3;
    }

    return { location, score, checked: checkedInLocationIds.includes(location.id) };
  });

  scoredLocations.sort((a, b) => b.score - a.score);

  let selectedLocations = [];
  let startPoint = null;

  if (startLocationId) {
    const start = scoredLocations.find(s => s.location.id === parseInt(startLocationId));
    if (start) {
      startPoint = start.location;
      selectedLocations.push(start);
      scoredLocations = scoredLocations.filter(s => s.location.id !== parseInt(startLocationId));
    }
  }

  if (!startPoint && scoredLocations.length > 0) {
    startPoint = scoredLocations[0].location;
    selectedLocations.push(scoredLocations[0]);
    scoredLocations.shift();
  }

  while (selectedLocations.length < maxLocations && scoredLocations.length > 0 && startPoint) {
    const lastLocation = selectedLocations[selectedLocations.length - 1].location;

    const withDistance = scoredLocations.map(s => ({
      ...s,
      distance: haversineDistance(
        lastLocation.latitude, lastLocation.longitude,
        s.location.latitude, s.location.longitude
      )
    }));

    withDistance.sort((a, b) => {
      const scoreA = a.score - a.distance / 500;
      const scoreB = b.score - b.distance / 500;
      return scoreB - scoreA;
    });

    selectedLocations.push(withDistance[0]);
    const bestId = withDistance[0].location.id;
    scoredLocations = scoredLocations.filter(s => s.location.id !== bestId);
  }

  let totalDistance = 0;
  let totalWalkTime = 0;
  let totalVisitTime = 0;

  const withDramaTitles = (location) => ({
    ...location,
    scenes: (location.scenes || []).map(scene => {
      const drama = data.dramas.find(d => d.id === scene.dramaId);
      return {
        ...scene,
        dramaTitle: drama ? drama.title : (scene.dramaTitle || '经典港剧'),
        dramaRating: drama ? drama.rating : null,
        dramaGenre: drama ? drama.genre : [],
        dramaYear: drama ? drama.year : null
      };
    })
  });

  const enrichedLocations = selectedLocations.map(s => ({
    ...s,
    location: withDramaTitles(s.location)
  }));

  const routeStops = enrichedLocations.map((s, index) => {
    const stop = {
      order: index + 1,
      location: s.location,
      checked: s.checked,
      score: s.score,
      matchedGenres: genres && s.location.tags
        ? s.location.tags.filter(t => genres.includes(t))
        : [],
      walkFromPrevious: null,
      walkTimeFromPrevious: 0
    };

    if (index > 0) {
      const prev = enrichedLocations[index - 1].location;
      const distance = haversineDistance(
        prev.latitude, prev.longitude,
        s.location.latitude, s.location.longitude
      );
      const walkTime = estimateWalkingTime(distance);
      stop.walkFromPrevious = Math.round(distance);
      stop.walkTimeFromPrevious = walkTime;
      totalDistance += distance;
      totalWalkTime += walkTime;
    }

    totalVisitTime += s.location.visitDuration || 60;

    return stop;
  });

  const allEasterEggs = [];
  if (includeEasterEggs !== false) {
    enrichedLocations.forEach(s => {
      if (s.location.easterEggs && s.location.easterEggs.length > 0) {
        s.location.easterEggs.forEach(egg => {
          allEasterEggs.push({
            ...egg,
            locationId: s.location.id,
            locationName: s.location.name
          });
        });
      }
    });
  }

  const route = {
    id: Date.now(),
    name: generateRouteName(genres, enrichedLocations.length),
    description: generateRouteDescription(genres, enrichedLocations, includeEasterEggs),
    stops: routeStops,
    totalDistance: Math.round(totalDistance),
    totalWalkTime: totalWalkTime,
    totalVisitTime: totalVisitTime,
    totalTime: totalWalkTime + totalVisitTime,
    easterEggs: allEasterEggs,
    usedGenres: genres || [],
    createdAt: new Date().toISOString()
  };

  res.json(route);
});

function generateRouteName(genres, stopCount) {
  const prefixes = {
    '警匪': '刑侦追凶',
    '商战': '商界风云',
    '武侠': '江湖豪情',
    '古装': '古韵寻踪',
    '爱情': '浪漫情怀',
    '家庭': '阖家温情',
    '喜剧': '欢乐爆笑',
    '法律': '律政先锋',
    '医疗': '妙手仁心',
    '奇幻': '奇幻驱魔',
    '动作': '热血动作'
  };

  let prefix = '港剧朝圣';
  if (genres && genres.length > 0) {
    const matchedPrefix = genres.find(g => prefixes[g]);
    if (matchedPrefix) {
      prefix = prefixes[matchedPrefix];
    }
  }

  return `${prefix} · ${stopCount}站经典路线`;
}

function generateRouteDescription(genres, selectedLocations, includeEasterEggs) {
  const locationNames = selectedLocations.map(s => s.location.name).join('、');

  let genreDesc = '';
  if (genres && genres.length > 0) {
    genreDesc = `精选${genres.join('、')}题材`;
  } else {
    genreDesc = '综合经典题材';
  }

  const checkedCount = selectedLocations.filter(s => s.checked).length;
  let statusDesc = '';
  if (checkedCount === 0) {
    statusDesc = '全部为新晋打卡点';
  } else if (checkedCount === selectedLocations.length) {
    statusDesc = '重温经典打卡路线';
  } else {
    statusDesc = `含${checkedCount}个已打卡重温点`;
  }

  const dramaList = new Set();
  selectedLocations.forEach(s => {
    (s.location.scenes || []).forEach(scene => {
      dramaList.add(`《${scene.dramaTitle || '经典港剧'}》`);
    });
  });
  const dramasStr = Array.from(dramaList).slice(0, 4).join('、');

  const eggDesc = includeEasterEggs !== false ? '，附隐藏彩蛋点攻略' : '';
  return `${genreDesc}的专属路线，串联${locationNames}。${statusDesc}，沿途覆盖${dramasStr}等经典剧集场景${eggDesc}。`;
}

app.post('/api/dramas', (req, res) => {
  const data = readData();

  if (req.body.year && !is90sYear(req.body.year)) {
    return res.status(400).json({ error: '剧集年份必须在1990-1999之间（90年代）' });
  }

  const newDrama = {
    id: data.dramas.length > 0 ? Math.max(...data.dramas.map(d => d.id)) + 1 : 1,
    ...req.body,
    actors: req.body.actors || [],
    quotes: req.body.quotes || []
  };

  data.dramas.push(newDrama);
  writeData(data);
  res.status(201).json(newDrama);
});

app.put('/api/dramas/:id', (req, res) => {
  const data = readData();
  const index = data.dramas.findIndex(d => d.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: '剧集未找到' });
  }

  if (req.body.year && !is90sYear(req.body.year)) {
    return res.status(400).json({ error: '剧集年份必须在1990-1999之间（90年代）' });
  }

  data.dramas[index] = { ...data.dramas[index], ...req.body };
  writeData(data);
  res.json(data.dramas[index]);
});

app.delete('/api/dramas/:id', (req, res) => {
  const data = readData();
  const index = data.dramas.findIndex(d => d.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: '剧集未找到' });
  }

  const deleted = data.dramas.splice(index, 1);
  writeData(data);
  res.json(deleted[0]);
});

app.post('/api/actors', (req, res) => {
  const data = readData();
  const newActor = {
    id: data.actors.length > 0 ? Math.max(...data.actors.map(a => a.id)) + 1 : 1,
    name: req.body.name || '',
    birthYear: req.body.birthYear || null,
    description: req.body.description || ''
  };

  if (!newActor.name) {
    return res.status(400).json({ error: '演员姓名不能为空' });
  }

  data.actors.push(newActor);
  writeData(data);
  res.status(201).json(newActor);
});

app.put('/api/actors/:id', (req, res) => {
  const data = readData();
  const index = data.actors.findIndex(a => a.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: '演员未找到' });
  }

  data.actors[index] = { ...data.actors[index], ...req.body };
  writeData(data);
  res.json(data.actors[index]);
});

app.delete('/api/actors/:id', (req, res) => {
  const data = readData();
  const index = data.actors.findIndex(a => a.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: '演员未找到' });
  }

  const actorId = parseInt(req.params.id);
  data.dramas.forEach(drama => {
    drama.actors = drama.actors.filter(a => a.actorId !== actorId);
  });

  const deleted = data.actors.splice(index, 1);
  writeData(data);
  res.json(deleted[0]);
});

app.get('/api/couples', (req, res) => {
  const { search, dramaId, sort } = req.query;
  const data = readData();
  let couples = data.couples || [];

  if (search) {
    const keyword = search.toLowerCase();
    couples = couples.filter(c =>
      c.name.toLowerCase().includes(keyword) ||
      c.characters.some(ch => ch.toLowerCase().includes(keyword)) ||
      c.actors.some(a => a.toLowerCase().includes(keyword)) ||
      c.dramas.some(d => d.title.toLowerCase().includes(keyword))
    );
  }

  if (dramaId) {
    const id = parseInt(dramaId);
    couples = couples.filter(c => c.dramas.some(d => d.dramaId === id));
  }

  if (sort === 'votes') {
    couples = [...couples].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  } else if (sort === 'rating') {
    couples = [...couples].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sort === 'year') {
    couples = [...couples].sort((a, b) => {
      const aYear = a.dramas.length > 0 ? Math.min(...a.dramas.map(d => d.year || 9999)) : 9999;
      const bYear = b.dramas.length > 0 ? Math.min(...b.dramas.map(d => d.year || 9999)) : 9999;
      return aYear - bYear;
    });
  }

  const result = couples.map(cp => {
    const totalVotes = cp.votes || 0;
    const userVotes = (data.cpVotes || []).filter(v => v.coupleId === cp.id).length;
    return {
      ...cp,
      totalVotes: totalVotes + userVotes,
      dramaCount: cp.dramas.length,
      sceneCount: cp.classicScenes.length
    };
  });

  res.json(result);
});

app.get('/api/couples/ranking', (req, res) => {
  const data = readData();
  const couples = data.couples || [];

  const withVotes = couples.map(cp => {
    const baseVotes = cp.votes || 0;
    const userVotes = (data.cpVotes || []).filter(v => v.coupleId === cp.id).length;
    const recentVotes = (data.cpVotes || []).filter(v => {
      if (v.coupleId !== cp.id) return false;
      const voteDate = new Date(v.votedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return voteDate >= weekAgo;
    }).length;

    return {
      id: cp.id,
      name: cp.name,
      characters: cp.characters,
      actors: cp.actors,
      poster: cp.poster,
      relationshipStatus: cp.relationshipStatus,
      rating: cp.rating,
      baseVotes,
      userVotes,
      recentVotes,
      totalVotes: baseVotes + userVotes,
      hotScore: (baseVotes + userVotes) * 1 + recentVotes * 5 + (cp.rating || 0) * 100
    };
  });

  withVotes.sort((a, b) => b.hotScore - a.hotScore);

  const top10 = withVotes.slice(0, 10).map((cp, index) => ({
    ...cp,
    rank: index + 1,
    isNew: index < 3 && cp.recentVotes > 0,
    trend: index === 0 ? 'up' : (withVotes[index].totalVotes > (withVotes[index + 1]?.totalVotes || 0) ? 'stable' : 'down')
  }));

  res.json({
    updatedAt: new Date().toISOString(),
    ranking: top10
  });
});

app.post('/api/couples/:id/vote', (req, res) => {
  const data = readData();
  const cpId = parseInt(req.params.id);
  const { nickname, comment } = req.body;

  const cp = (data.couples || []).find(c => c.id === cpId);
  if (!cp) {
    return res.status(404).json({ error: 'CP组合未找到' });
  }

  if (!data.cpVotes) data.cpVotes = [];

  const newVote = {
    id: data.cpVotes.length > 0 ? Math.max(...data.cpVotes.map(v => v.id)) + 1 : 1,
    coupleId: cpId,
    nickname: nickname || '匿名粉丝',
    comment: comment || '',
    votedAt: new Date().toISOString()
  };

  data.cpVotes.push(newVote);
  writeData(data);

  const totalVotes = cp.votes || 0;
  const userVotes = data.cpVotes.filter(v => v.coupleId === cpId).length;

  res.status(201).json({
    vote: newVote,
    totalVotes: totalVotes + userVotes
  });
});

app.get('/api/couples/:id', (req, res) => {
  const data = readData();
  const cp = (data.couples || []).find(c => c.id === parseInt(req.params.id));

  if (!cp) {
    return res.status(404).json({ error: 'CP组合未找到' });
  }

  const dramas = cp.dramas.map(d => {
    const dramaData = data.dramas.find(drama => drama.id === d.dramaId);
    return {
      ...d,
      englishTitle: dramaData ? dramaData.englishTitle : '',
      rating: dramaData ? dramaData.rating : null,
      synopsis: dramaData ? dramaData.synopsis : ''
    };
  });

  const classicScenes = cp.classicScenes.map(scene => {
    const quote = scene.quoteId ? data.quotes.find(q => q.id === scene.quoteId) : null;
    return {
      ...scene,
      quote: quote ? { text: quote.text, character: quote.character } : null
    };
  });

  const totalVotes = cp.votes || 0;
  const userVotes = (data.cpVotes || []).filter(v => v.coupleId === cp.id).length;

  res.json({
    ...cp,
    dramas,
    classicScenes,
    totalVotes: totalVotes + userVotes
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '港剧时光档案馆API运行正常' });
});

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  港剧时光档案馆 API 服务器已启动`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`========================================`);
});
