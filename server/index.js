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

app.get('/api/stats', (req, res) => {
  const data = readData();
  res.json({
    dramaCount: data.dramas.length,
    actorCount: data.actors.length,
    quoteCount: data.quotes.length,
    genreCount: new Set(data.dramas.flatMap(d => d.genre)).size
  });
});

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '港剧时光档案馆API运行正常' });
});

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  港剧时光档案馆 API 服务器已启动`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`========================================`);
});
