# Поліс — оформлення страхування онлайн

Веб-застосунок для прийому заявок на страховий поліс + окрема адмін-панель.

- **Публічна сторінка** (`/`) — вибір виду страхування, покрокова заявка, живий розрахунок премії, перевірка статусу за номером.
- **Адмін-панель** (`/admin`) — вхід за логіном/паролем, статистика, таблиця заявок із пошуком і фільтрами, зміна статусу, фінальна ціна, нотатки, видалення.

**Види полісів:** ОСЦПВ, КАСКО, медичне, туристичне, майно, життя.

## Стек
Node.js + Express · PostgreSQL (Neon) · ванільний JS/HTML/CSS · JWT-автентифікація.

## Структура
```
server.js        — Express + API
db.js            — підключення до Postgres + автостворення таблиці
public/          — фронтенд (index.html, app.js, styles.css, admin.*)
render.yaml      — blueprint для Render
.env.example     — приклад змінних оточення
```

## Локальний запуск
```bash
npm install
cp .env.example .env   # заповни DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD
npm start
```
Відкрий http://localhost:3000 та http://localhost:3000/admin

## Деплой на Render

1. Створи базу в **Neon**, скопіюй connection string (з `?sslmode=require`).
2. Залий код у GitHub.
3. Render → **New → Web Service** → під’єднай репозиторій.
   - Build Command: `npm install`
   - Start Command: `npm start`
4. У **Environment** додай змінні:
   - `DATABASE_URL` — рядок з Neon
   - `JWT_SECRET` — довгий випадковий рядок
   - `ADMIN_USER` — наприклад `admin`
   - `ADMIN_PASSWORD` — надійний пароль
5. Deploy. Таблиця `applications` створиться автоматично при старті.

> Альтернатива: завантаж `render.yaml` як Blueprint — більшість змінних підхопиться, лишиться вписати `DATABASE_URL` і `ADMIN_PASSWORD`.

## Безпека (для бойового використання)
- Заміни дефолтний пароль; краще використовуй `ADMIN_PASSWORD_HASH` (bcrypt).
- Згенеруй хеш: `node -e "console.log(require('bcryptjs').hashSync('твій-пароль',10))"`
- Додай rate-limit на `/api/applications` та `/api/admin/login` (напр. `express-rate-limit`).
- Це демо-розрахунок премії — заміни формули в `estimatePrice()` на реальні тарифи.

## API (коротко)
| Метод | Шлях | Опис |
|---|---|---|
| GET | `/api/config` | список видів |
| POST | `/api/quote` | попередній розрахунок |
| POST | `/api/applications` | подати заявку |
| GET | `/api/applications/status/:number` | статус за номером |
| POST | `/api/admin/login` | вхід → JWT |
| GET | `/api/admin/stats` | статистика |
| GET | `/api/admin/applications` | список (фільтри: status, type, q, page) |
| GET | `/api/admin/applications/:id` | деталі |
| PATCH | `/api/admin/applications/:id` | оновити статус/ціну/нотатки |
| DELETE | `/api/admin/applications/:id` | видалити |
