const TYPE_LABEL = { osago: 'ОСЦПВ', kasko: 'КАСКО', medical: 'Медичне', travel: 'Туристичне', property: 'Майно', life: 'Життя' };
const STATUS_LABEL = { new: 'Нова', review: 'На розгляді', approved: 'Підтверджено', issued: 'Видано', rejected: 'Відхилено' };
const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('uk-UA'));
const fmtDate = (s) => new Date(s).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

let token = localStorage.getItem('insAdminToken') || null;
let page = 1;

function api(path, opts = {}) {
  return fetch('/api' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(opts.headers || {}) },
  });
}

// ───────── Auth ─────────
async function login() {
  const errEl = document.getElementById('loginErr');
  errEl.textContent = '';
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  try {
    const res = await api('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Помилка входу'; return; }
    token = data.token;
    localStorage.setItem('insAdminToken', token);
    showDash();
  } catch {
    errEl.textContent = 'Помилка з’єднання';
  }
}

function logout() {
  token = null;
  localStorage.removeItem('insAdminToken');
  document.getElementById('dash').classList.remove('show');
  document.getElementById('loginScreen').style.display = 'grid';
}

function showDash() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dash').classList.add('show');
  loadStats();
  loadTable();
}

// ───────── Stats ─────────
async function loadStats() {
  const res = await api('/admin/stats');
  if (res.status === 401) return logout();
  const s = await res.json();
  const get = (arr, key, field) => (arr.find((x) => x[field] === key)?.c) || 0;
  document.getElementById('stats').innerHTML = `
    <div class="stat accent"><div class="num">${s.total}</div><div class="lbl">Усього заявок</div></div>
    <div class="stat"><div class="num">${get(s.byStatus, 'new', 'status')}</div><div class="lbl">Нові</div></div>
    <div class="stat"><div class="num">${get(s.byStatus, 'review', 'status')}</div><div class="lbl">На розгляді</div></div>
    <div class="stat"><div class="num">${get(s.byStatus, 'issued', 'status')}</div><div class="lbl">Видано полісів</div></div>
    <div class="stat"><div class="num">${fmt(s.pipeline)}</div><div class="lbl">Сума (грн)</div></div>`;
}

// ───────── Table ─────────
async function loadTable() {
  const q = document.getElementById('search').value.trim();
  const status = document.getElementById('filterStatus').value;
  const type = document.getElementById('filterType').value;
  const params = new URLSearchParams({ page, limit: 20 });
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (type) params.set('type', type);

  const res = await api('/admin/applications?' + params);
  if (res.status === 401) return logout();
  const data = await res.json();
  const body = document.getElementById('tableBody');

  if (!data.items.length) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty">Заявок не знайдено</div></td></tr>`;
    document.getElementById('pager').innerHTML = '';
    return;
  }

  body.innerHTML = data.items.map((a) => `
    <tr class="row" data-id="${a.id}">
      <td><b>${a.request_number}</b></td>
      <td>${a.full_name}</td>
      <td class="hide-sm">${TYPE_LABEL[a.insurance_type] || a.insurance_type}</td>
      <td class="hide-sm">${a.phone}</td>
      <td>${fmt(a.final_price || a.estimated_price)} грн</td>
      <td><span class="badge ${a.status}">${STATUS_LABEL[a.status]}</span></td>
      <td class="hide-sm">${fmtDate(a.created_at)}</td>
    </tr>`).join('');
  body.querySelectorAll('.row').forEach((r) => r.addEventListener('click', () => openDrawer(r.dataset.id)));

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  document.getElementById('pager').innerHTML = `
    <button ${page <= 1 ? 'disabled' : ''} id="prevPage">← Назад</button>
    <span style="color:var(--muted);font-size:.9rem">Сторінка ${page} з ${totalPages} · усього ${data.total}</span>
    <button ${page >= totalPages ? 'disabled' : ''} id="nextPage">Далі →</button>`;
  document.getElementById('prevPage')?.addEventListener('click', () => { page--; loadTable(); });
  document.getElementById('nextPage')?.addEventListener('click', () => { page++; loadTable(); });
}

// ───────── Drawer (деталі / редагування) ─────────
async function openDrawer(id) {
  const res = await api('/admin/applications/' + id);
  if (res.status === 401) return logout();
  const a = await res.json();
  const details = a.details || {};
  const detailRows = Object.entries(details).map(([k, v]) =>
    `<div class="kv"><span>${k}</span><b>${v === true ? 'Так' : v === false ? 'Ні' : v}</b></div>`).join('') || '<div class="kv"><span>Без додаткових даних</span><b></b></div>';

  document.getElementById('drawerContent').innerHTML = `
    <span class="badge ${a.status}">${STATUS_LABEL[a.status]}</span>
    <h2 style="margin:10px 0 2px">${a.request_number}</h2>
    <div style="color:var(--muted);font-size:.9rem;margin-bottom:18px">${fmtDate(a.created_at)}</div>

    <div class="kv"><span>Клієнт</span><b>${a.full_name}</b></div>
    <div class="kv"><span>Телефон</span><b><a href="tel:${a.phone}">${a.phone}</a></b></div>
    <div class="kv"><span>Email</span><b>${a.email || '—'}</b></div>
    <div class="kv"><span>Місто</span><b>${a.city || '—'}</b></div>
    <div class="kv"><span>Дата народж.</span><b>${a.birth_date ? new Date(a.birth_date).toLocaleDateString('uk-UA') : '—'}</b></div>
    <div class="kv"><span>Вид</span><b>${TYPE_LABEL[a.insurance_type] || a.insurance_type}</b></div>
    <div class="kv"><span>Орієнтовна ціна</span><b>${fmt(a.estimated_price)} грн</b></div>

    <div class="section-title">Параметри поліса</div>
    ${detailRows}

    <div class="section-title">Обробка</div>
    <label>Статус</label>
    <select id="dStatus">
      ${Object.entries(STATUS_LABEL).map(([k, v]) => `<option value="${k}" ${a.status === k ? 'selected' : ''}>${v}</option>`).join('')}
    </select>
    <label>Фінальна вартість, грн</label>
    <input id="dPrice" type="number" value="${a.final_price ?? ''}" placeholder="${a.estimated_price ?? ''}" />
    <label>Нотатки менеджера</label>
    <textarea id="dNotes" placeholder="Внутрішні нотатки…">${a.admin_notes || ''}</textarea>

    <div class="actions">
      <button class="btn save" id="dSave" data-id="${a.id}">Зберегти зміни</button>
      <button class="btn del" id="dDelete" data-id="${a.id}">Видалити</button>
    </div>`;

  document.getElementById('dSave').addEventListener('click', () => saveApp(a.id));
  document.getElementById('dDelete').addEventListener('click', () => deleteApp(a.id));
  toggleDrawer(true);
}

async function saveApp(id) {
  const body = {
    status: document.getElementById('dStatus').value,
    admin_notes: document.getElementById('dNotes').value,
    final_price: document.getElementById('dPrice').value || null,
  };
  const btn = document.getElementById('dSave');
  btn.disabled = true; btn.textContent = 'Збереження…';
  const res = await api('/admin/applications/' + id, { method: 'PATCH', body: JSON.stringify(body) });
  if (res.ok) { toggleDrawer(false); loadStats(); loadTable(); }
  else { alert('Не вдалося зберегти'); btn.disabled = false; btn.textContent = 'Зберегти зміни'; }
}

async function deleteApp(id) {
  if (!confirm('Видалити заявку без можливості відновлення?')) return;
  const res = await api('/admin/applications/' + id, { method: 'DELETE' });
  if (res.ok) { toggleDrawer(false); loadStats(); loadTable(); }
  else alert('Не вдалося видалити');
}

function toggleDrawer(show) {
  document.getElementById('drawer').classList.toggle('show', show);
  document.getElementById('overlay').classList.toggle('show', show);
}

// ───────── Init ─────────
let searchTimer;
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('loginPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('drawerClose').addEventListener('click', () => toggleDrawer(false));
  document.getElementById('overlay').addEventListener('click', () => toggleDrawer(false));

  document.getElementById('search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { page = 1; loadTable(); }, 350); });
  document.getElementById('filterStatus').addEventListener('change', () => { page = 1; loadTable(); });
  document.getElementById('filterType').addEventListener('change', () => { page = 1; loadTable(); });

  if (token) showDash();
});
