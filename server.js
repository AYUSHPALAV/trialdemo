const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { getDb } = require('./src/db');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5173;
const BACKEND_SERVICE_KEY = process.env.BACKEND_SERVICE_KEY || '';

// Initialize DB
const db = getDb();

// RLS-like middleware for backend restricted updates
function requireServiceKey(req, res, next) {
  const providedKey = req.header('x-service-key') || '';
  if (!BACKEND_SERVICE_KEY || providedKey !== BACKEND_SERVICE_KEY) {
    return res.status(403).json({ error: 'Forbidden: invalid service key' });
  }
  next();
}

// API routes
app.get('/api/comments', (req, res) => {
  const { is_analyzed } = req.query;
  let rows;
  if (typeof is_analyzed === 'string') {
    const flag = is_analyzed.toLowerCase() === 'true' ? 1 : 0;
    rows = db.prepare('SELECT * FROM user_comments WHERE is_analyzed = ? ORDER BY created_at DESC').all(flag);
  } else {
    rows = db.prepare('SELECT * FROM user_comments ORDER BY created_at DESC').all();
  }
  res.json(rows);
});

app.post('/api/comments', (req, res) => {
  const { text, author_name, topic_id } = req.body || {};
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Field "text" is required' });
  }
  if (!topic_id || typeof topic_id !== 'string' || topic_id.trim().length === 0) {
    return res.status(400).json({ error: 'Field "topic_id" is required' });
  }
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO user_comments (text, author_name, topic_id, sentiment_result, sentiment_confidence, is_analyzed, created_at)
    VALUES (?, ?, ?, 'pending', 0, 0, ?)
  `);
  const info = stmt.run(text.trim(), author_name?.trim() || null, topic_id.trim(), now);
  const row = db.prepare('SELECT * FROM user_comments WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

app.patch('/api/comments/:id/sentiment', requireServiceKey, (req, res) => {
  const { id } = req.params;
  const { sentiment_result, sentiment_confidence, is_analyzed } = req.body || {};

  const allowedResults = ['positive', 'neutral', 'negative', 'pending'];
  const updates = [];
  const params = [];

  if (typeof sentiment_result !== 'undefined') {
    if (typeof sentiment_result !== 'string' || !allowedResults.includes(sentiment_result)) {
      return res.status(400).json({ error: 'Invalid sentiment_result' });
    }
    updates.push('sentiment_result = ?');
    params.push(sentiment_result);
  }
  if (typeof sentiment_confidence !== 'undefined') {
    const num = Number(sentiment_confidence);
    if (!Number.isFinite(num) || num < 0 || num > 1) {
      return res.status(400).json({ error: 'Invalid sentiment_confidence (0..1)' });
    }
    updates.push('sentiment_confidence = ?');
    params.push(num);
  }
  if (typeof is_analyzed !== 'undefined') {
    const flag = typeof is_analyzed === 'boolean' ? is_analyzed : String(is_analyzed).toLowerCase() === 'true';
    updates.push('is_analyzed = ?');
    params.push(flag ? 1 : 0);
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No allowed fields to update' });
  }

  params.push(id);
  const sql = `UPDATE user_comments SET ${updates.join(', ')} WHERE id = ?`;
  const info = db.prepare(sql).run(...params);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  const row = db.prepare('SELECT * FROM user_comments WHERE id = ?').get(id);
  res.json(row);
});

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Public Feedback Portal listening on http://localhost:${PORT}`);
});



