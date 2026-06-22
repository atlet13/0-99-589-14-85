require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-render-env';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';

app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ───────────────────────── Довідники ─────────────────────────
const INSURANCE_TYPES = {
  osago:    { label: 'ОСЦПВ (авто)',     base: 1200 },
  kasko:    { label: 'КАСКО',            base: 9000 },
  medical:  { label: 'Медичне',          base: 4500 },
  travel:   { label: 'Туристичне',       base: 600  },
  property: { label: 'Майно / нерухомість', base: 2800 },
  life:     { label: 'Життя',            base: 3500 },
};

const STATUSES = ['new', 'review', 'approved', 'rejected', 'issued'];

function estimatePrice(type, details = {}) {
  const cfg = INSURANCE_TYPES[type];
  if (!cfg) return null;
  let price = cfg.base;

  switch (type) {
    case 'osago': {
      const power = Number(details.enginePower) || 1;
      price *= [1, 1, 1.2, 1.4, 1.8][power] || 1;
      if (details.usage === 'taxi') price *= 1.6;
      break;
    }
    case 'kasko': {
      const value = Number(details.carValue) || 300000;
      price = Math.max(cfg.base, value * 0.04);
      const year = Number(details.carYear);
      if (year && year < 2015) price *= 1.25;
      break;
    }
    case 'medical': {
      const sum = Number(details.coverageSum) || 200000;
      price = cfg.base + sum * 0.012;
      if (details.includeDental) price *= 1.15;
      break;
    }
    case 'travel': {
      const days = Number(details.days) || 7;
      const persons = Number(details.persons) || 1;
      price = cfg.base / 7 * days * persons;
      if (details.region === 'worldwide') price *= 1.4;
      if (details.activeRest) price *= 1.3;
      break;
    }
    case 'property': {
      const sum = Number(details.propertySum) || 500000;
      price = sum * 0.006;
      if (details.propertyType === 'house') price *= 1.2;
      break;
    }
    case 'life': {
      const sum = Number(details.coverageSum) || 300000;
      const age = Number(details.age) || 30;
      price = sum * 0.012 * (1 + Math.max(0, age - 30) * 0.02);
      break;
    }
  }
  return Math.round(price / 10) * 10;
}

function genRequestNumber() {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INS-${year}-${rand}`;
}

// ───────────────────────── Публічні маршрути ─────────────────────────

app.get('/api/config', (req, res) => {
  const types = Object.entries(INSURANCE_TYPES).map(([key, v]) => ({ key, label: v.label }));
  res.json({ types });
});

app.post('/api/quote', (req, res) => {
  const { insuranceType, details } = req.body || {};
  const price = estimatePrice(insuranceType, details);
  if (price === null) return res.status(400).json({ error: 'Невідомий тип страхування' });
  res.json({ price });
});

app.post('/api/applications', async (req, res) => {
  try {
    const { insuranceType, fullName, phone, email, birthDate, city, details } = req.body || {};

    if (!INSURANCE_TYPES[insuranceType]) return res.status(400).json({ error: 'Оберіть коректний тип страхування' });
    if (!fullName || String(fullName).trim().length < 3) return res.status(400).json({ error: 'Вкажіть ПІБ' });
    if (!phone || !/^[+0-9\s\-()]{7,20}$/.test(String(phone))) return res.status(400).json({ error: 'Вкажіть коректний номер телефону' });

    const price = estimatePrice(insuranceType, details || {});
    const requestNumber = genRequestNumber();

    const { rows } = await pool.query(
      `INSERT INTO applications
        (request_number, insurance_type, full_name, phone, email, birth_date, city, details, estimated_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, request_number, estimated_price`,
      [
        requestNumber,
        insuranceType,
        String(fullName).trim(),
        String(phone).trim(),
        email ? String(email).trim() : null,
        birthDate || null,
        city ? String(city).trim() : null,
        JSON.stringify(details || {}),
        price,
      ]
    );

    res.status(201).json({
      requestNumber: rows[0].request_number,
      estimatedPrice: rows[0].estimated_price,
    });
  } catch (err) {
    console.error('[applications] помилка:', err.message);
    res.status(500).json({ error: 'Не вдалося зберегти заявку. Спробуйте пізніше.' });
  }
});

app.get('/api/applications/status/:number', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT request_number, insurance_type, status, estimated_price, final_price, created_at
       FROM applications WHERE request_number = $1`,
      [req.params.number.trim().toUpperCase()]
    );
    if (!rows.length) return res.status(404).json({ error: 'Заявку не знайдено' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Ендпоінт для завантаження готового документа (Поліса) клієнтом
app.get('/api/applications/download/:number', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM applications WHERE request_number = $1`,
      [req.params.number.trim().toUpperCase()]
    );
    if (!rows.length) return res.status(404).send('Заявку не знайдено');
    
    const appData = rows[0];
    if (appData.status !== 'issued') {
      return res.status(403).send('Документ ще не сформовано. Статус заявки має бути "Видано".');
    }

    // Текстова генерація бланку поліса (емуляція PDF / текстового файлу)
    const fileContent = `
==================================================
              ЕЛЕКТРОННИЙ СТРАХОВИЙ ПОЛІС
==================================================
Номер договору:   ${appData.request_number}
Вид страхування:  ${INSURANCE_TYPES[appData.insurance_type]?.label || appData.insurance_type}
Дата оформлення:  ${new Date(appData.created_at).toLocaleDateString('uk-UA')}
Статус договору:  АКТИВНИЙ (ПОЛІС ВИДАНО)

---------------- СТРАХУВАЛЬНИК -------------------
ПІБ:              ${appData.full_name}
Телефон:          ${appData.phone}
Email:            ${appData.email || '—'}
Місто:            ${appData.city || '—'}

----------------- ФІНАНСОВІ ДАНІ -----------------
Сплачена сума:    ${appData.final_price || appData.estimated_price} UAH
Статус оплати:    ОПЛАЧЕНО ОНЛАЙН

==================================================
   Дякуємо, що обрали сервіс "Поліс"!
   Цей документ є оригіналом підтвердженого поліса.
==================================================
`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=Policy-${appData.request_number}.txt`);
    res.send(fileContent);
  } catch (err) {
    res.status(500).send('Помилка генерації документа');
  }
});

// ───────────────────────── Адмін: автентифікація (Залишено для зовнішнього доступу) ─────────────────────────
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USER) return res.status(401).json({ error: 'Невірний логін або пароль' });
  let ok = false;
  if (process.env.ADMIN_PASSWORD_HASH) {
    ok = await bcrypt.compare(String(password || ''), process.env.ADMIN_PASSWORD_HASH);
  } else {
    ok = String(password || '') === ADMIN_PASSWORD;
  }
  if (!ok) return res.status(401).json({ error: 'Невірний логін або пароль' });

  const token = jwt.sign({ role: 'admin', user: username }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Потрібна авторизація' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Сесія недійсна. Увійдіть знову.' });
  }
}

// ───────────────────────── Адмін: дані (Для вашого майбутнього сайту) ─────────────────────────
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*)::int AS c FROM applications');
    const byStatus = await pool.query('SELECT status, COUNT(*)::int AS c FROM applications GROUP BY status');
    const byType = await pool.query('SELECT insurance_type, COUNT(*)::int AS c FROM applications GROUP BY insurance_type');
    const revenue = await pool.query(`SELECT COALESCE(SUM(COALESCE(final_price, estimated_price)),0)::numeric AS sum FROM applications WHERE status IN ('approved','issued')`);
    res.json({ total: total.rows[0].c, byStatus: byStatus.rows, byType: byType.rows, pipeline: Number(revenue.rows[0].sum) });
  } catch (err) { res.status(500).json({ error: 'Помилка сервера' }); }
});

app.get('/api/admin/applications', requireAdmin, async (req, res) => {
  try {
    const { status, type, q, page = 1, limit = 20 } = req.query;
    const where = []; const params = [];
    if (status && STATUSES.includes(status)) { params.push(status); where.push(`status = $${params.length}`); }
    if (type && INSURANCE_TYPES[type]) { params.push(type); where.push(`insurance_type = $${params.length}`); }
    if (q) { params.push(`%${q}%`); where.push(`(full_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR request_number ILIKE $${params.length} OR email ILIKE $${params.length})`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const lim = Math.min(Number(limit) || 20, 100);
    const off = (Math.max(Number(page) || 1, 1) - 1) * lim;

    const countRes = await pool.query(`SELECT COUNT(*)::int AS c FROM applications ${whereSql}`, params);
    const dataRes = await pool.query(`SELECT id, request_number, insurance_type, full_name, phone, email, city, estimated_price, final_price, status, created_at FROM applications ${whereSql} ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`, params);
    res.json({ total: countRes.rows[0].c, page: Number(page), limit: lim, items: dataRes.rows });
  } catch (err) { res.status(500).json({ error: 'Помилка сервера' }); }
});

app.get('/api/admin/applications/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM applications WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Не знайдено' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Помилка сервера' }); }
});

app.patch('/api/admin/applications/:id', requireAdmin, async (req, res) => {
  try {
    const { status, admin_notes, final_price } = req.body || {};
    const sets = []; const params = [];
    if (status !== undefined) { if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Невідомий статус' }); params.push(status); sets.push(`status = $${params.length}`); }
    if (admin_notes !== undefined) { params.push(admin_notes); sets.push(`admin_notes = $./** params.length}`); }
    if (final_price !== undefined) { params.push(final_price === null || final_price === '' ? null : Number(final_price)); sets.push(`final_price = $${params.length}`); }
    if (!sets.length) return res.status(400).json({ error: 'Немає змін' });
    sets.push(`updated_at = now()`); params.push(req.params.id);

    const { rows } = await pool.query(`UPDATE applications SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (!rows.length) return res.status(404).json({ error: 'Не знайдено' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Помилка сервера' }); }
});

app.delete('/api/admin/applications/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM applications WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Помилка сервера' }); }
});

app.get('/health', (req, res) => res.json({ ok: true }));

// Глобальні фолбеки для JSON відповідей
app.use((req, res) => res.status(404).json({ error: 'Маршрут не знайдено' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Внутрішня помилка сервера' });
});

initDb()
  .then(() => { app.listen(PORT, () => console.log(`[server] Запущено на порту ${PORT}`)); })
  .catch((err) => { app.listen(PORT, () => console.log(`[server] Запущено на порту ${PORT} (БД недоступна)`)); });
