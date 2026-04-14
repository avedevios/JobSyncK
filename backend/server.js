const express = require('express');
const cors = require('cors');
const { getDb, save } = require('./database');

const app = express();
const PORT = 3333;

app.use(cors());
app.use(express.json());

// GET /vacancies — получить все вакансии
app.get('/vacancies', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM vacancies ORDER BY created_at DESC');
  if (!result.length) return res.json([]);
  const { columns, values } = result[0];
  const rows = values.map(row =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
  res.json(rows);
});

// GET /vacancies/:id
app.get('/vacancies/:id', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM vacancies WHERE id = ?', [req.params.id]);
  if (!result.length) return res.status(404).json({ error: 'Not found' });
  const { columns, values } = result[0];
  res.json(Object.fromEntries(columns.map((col, i) => [col, values[0][i]])));
});

// POST /vacancies — добавить вакансию
app.post('/vacancies', async (req, res) => {
  const { role, company, applied_at, applied = 0, status = 'saved', url = '', notes = '', job_type = '', apply_url = '', description = '', posted_at = '', location = '' } = req.body;

  if (!role || !company || !applied_at) {
    return res.status(400).json({ error: 'role, company и applied_at обязательны' });
  }

  const db = await getDb();
  db.run(
    'INSERT INTO vacancies (role, company, applied_at, applied, status, url, notes, job_type, apply_url, description, posted_at, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [role, company, applied_at, applied ? 1 : 0, status, url, notes, job_type, apply_url, description, posted_at, location]
  );
  save();

  const result = db.exec('SELECT * FROM vacancies ORDER BY id DESC LIMIT 1');
  const { columns, values } = result[0];
  res.status(201).json(Object.fromEntries(columns.map((col, i) => [col, values[0][i]])));
});

// PATCH /vacancies/:id — обновить вакансию
app.patch('/vacancies/:id', async (req, res) => {
  const db = await getDb();
  const existing = db.exec('SELECT * FROM vacancies WHERE id = ?', [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });

  const { columns, values } = existing[0];
  const vacancy = Object.fromEntries(columns.map((col, i) => [col, values[0][i]]));

  const { role, company, applied_at, applied, status, url, notes, job_type, apply_url, description, posted_at, location } = req.body;
  const updated = {
    role: role ?? vacancy.role,
    company: company ?? vacancy.company,
    applied_at: applied_at ?? vacancy.applied_at,
    applied: applied !== undefined ? (applied ? 1 : 0) : vacancy.applied,
    status: status ?? vacancy.status,
    url: url ?? vacancy.url,
    notes: notes ?? vacancy.notes,
    job_type: job_type ?? vacancy.job_type,
    apply_url: apply_url ?? vacancy.apply_url,
    description: description ?? vacancy.description,
    posted_at: posted_at ?? vacancy.posted_at,
    location: location ?? vacancy.location,
  };

  db.run(
    'UPDATE vacancies SET role=?, company=?, applied_at=?, applied=?, status=?, url=?, notes=?, job_type=?, apply_url=?, description=?, posted_at=?, location=? WHERE id=?',
    [updated.role, updated.company, updated.applied_at, updated.applied, updated.status, updated.url, updated.notes, updated.job_type, updated.apply_url, updated.description, updated.posted_at, updated.location, req.params.id]
  );
  save();

  const result = db.exec('SELECT * FROM vacancies WHERE id = ?', [req.params.id]);
  const r = result[0];
  res.json(Object.fromEntries(r.columns.map((col, i) => [col, r.values[0][i]])));
});

// DELETE /vacancies/:id
app.delete('/vacancies/:id', async (req, res) => {
  const db = await getDb();
  const existing = db.exec('SELECT id FROM vacancies WHERE id = ?', [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  db.run('DELETE FROM vacancies WHERE id = ?', [req.params.id]);
  save();
  res.json({ success: true });
});

app.listen(PORT, async () => {
  await getDb(); // инициализируем БД при старте
  console.log(`✅ Jobs backend запущен на http://localhost:${PORT}`);
});
