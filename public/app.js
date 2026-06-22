// ───────── Конфіг типів та полів ─────────
const TYPE_META = {
  osago:    { label: 'ОСЦПВ (авто)',     from: 1200, desc: 'Обов’язкове авто­страхування цивільної відповідальності.', icon: 'car' },
  kasko:    { label: 'КАСКО',            from: 9000, desc: 'Повний захист автомобіля від ДТП, угону та пошкоджень.', icon: 'car' },
  medical:  { label: 'Медичне',          from: 4500, desc: 'Покриття лікування, аналізів та невідкладної допомоги.', icon: 'health' },
  travel:   { label: 'Туристичне',       from: 600,  desc: 'Захист під час подорожей за кордоном.', icon: 'plane' },
  property: { label: 'Майно',            from: 2800, desc: 'Страхування квартири чи будинку від ризиків.', icon: 'home' },
  life:     { label: 'Життя',            from: 3500, desc: 'Фінансовий захист вас і вашої родини.', icon: 'heart' },
};

const ICONS = {
  car: '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11m-14 0h14m-14 0a2 2 0 0 0-2 2v4h2m14-6a2 2 0 0 1 2 2v4h-2m0 0H7m12 0v2m-12-2v2M7 14h.01M17 14h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  health: '<path d="M12 7v10M7 12h10M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  plane: '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  home: '<path d="M4 10.5 12 4l8 6.5M6 9.5V20h12V9.5M10 20v-5h4v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  heart: '<path d="M12 20s-7-4.6-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.4 12 20 12 20Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
};

// Поля, специфічні для кожного типу
const TYPE_FIELDS = {
  osago: [
    { name: 'enginePower', label: 'Об’єм двигуна', type: 'select', options: [['1','до 1600 см³'],['2','1601–2000 см³'],['3','2001–3000 см³'],['4','понад 3000 см³']] },
    { name: 'usage', label: 'Використання', type: 'select', options: [['personal','Особисте'],['taxi','Таксі']] },
  ],
  kasko: [
    { name: 'carValue', label: 'Вартість авто, грн', type: 'number', placeholder: '300000' },
    { name: 'carYear', label: 'Рік випуску', type: 'number', placeholder: '2020' },
  ],
  medical: [
    { name: 'coverageSum', label: 'Страхова сума, грн', type: 'select', options: [['200000','200 000'],['500000','500 000'],['1000000','1 000 000']] },
    { name: 'includeDental', label: 'Включити стоматологію', type: 'checkbox' },
  ],
  travel: [
    { name: 'days', label: 'Кількість днів', type: 'number', placeholder: '7' },
    { name: 'persons', label: 'Кількість осіб', type: 'number', placeholder: '1' },
    { name: 'region', label: 'Регіон', type: 'select', options: [['europe','Європа / Шенген'],['worldwide','Весь світ']] },
    { name: 'activeRest', label: 'Активний відпочинок (спорт)', type: 'checkbox' },
  ],
  property: [
    { name: 'propertySum', label: 'Страхова сума, грн', type: 'number', placeholder: '500000' },
    { name: 'propertyType', label: 'Тип нерухомості', type: 'select', options: [['apartment','Квартира'],['house','Будинок']] },
  ],
  life: [
    { name: 'coverageSum', label: 'Страхова сума, грн', type: 'number', placeholder: '300000' },
    { name: 'age', label: 'Вік', type: 'number', placeholder: '30' },
  ],
};

const state = { type: 'osago', step: 1, details: {} };

// ───────── Рендер сітки типів ─────────
function svgIcon(name) { return `<svg viewBox="0 0 24 24" fill="none">${ICONS[name]}</svg>`; }
const fmt = (n) => Number(n).toLocaleString('uk-UA');

function renderTypesGrid() {
  document.getElementById('typesGrid').innerHTML = Object.entries(TYPE_META).map(([key, m]) => `
    <button class="type-card" data-type="${key}">
      <div class="ico">${svgIcon(m.icon)}</div>
      <h3>${m.label}</h3>
      <p>${m.desc}</p>
      <div class="from">від <b>${fmt(m.from)} грн</b></div>
    </button>`).join('');
  document.querySelectorAll('.type-card').forEach((el) => {
    el.addEventListener('click', () => {
      selectType(el.dataset.type);
      document.getElementById('apply').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function renderTypePicker() {
  document.getElementById('typePicker').innerHTML = Object.entries(TYPE_META).map(([key, m]) =>
    `<div class="type-pick ${key === state.type ? 'selected' : ''}" data-type="${key}">${m.label}</div>`
  ).join('');
  document.querySelectorAll('.type-pick').forEach((el) =>
    el.addEventListener('click', () => selectType(el.dataset.type))
  );
}

function selectType(type) {
  state.type = type;
  state.details = {};
  renderTypePicker();
  renderTypeFields();
  updateQuote();
}

function renderTypeFields() {
  const fields = TYPE_FIELDS[state.type] || [];
  document.getElementById('typeFields').innerHTML = fields.map((f) => {
    if (f.type === 'checkbox') {
      return `<div class="field checkbox"><input type="checkbox" id="f_${f.name}" data-field="${f.name}"><label for="f_${f.name}" style="margin:0;font-weight:400">${f.label}</label></div>`;
    }
    if (f.type === 'select') {
      const opts = f.options.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
      return `<div class="field"><label>${f.label}</label><select data-field="${f.name}">${opts}</select></div>`;
    }
    return `<div class="field"><label>${f.label}</label><input type="${f.type}" data-field="${f.name}" placeholder="${f.placeholder || ''}"></div>`;
  }).join('');

  document.querySelectorAll('#typeFields [data-field]').forEach((el) => {
    const evt = el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      state.details[el.dataset.field] = el.type === 'checkbox' ? el.checked : el.value;
      debouncedQuote();
    });
  });
  // ініціалізувати значення select-ів
  document.querySelectorAll('#typeFields select[data-field]').forEach((el) => {
    state.details[el.dataset.field] = el.value;
  });
}

// ───────── Розрахунок премії ─────────
let quoteTimer;
function debouncedQuote() { clearTimeout(quoteTimer); quoteTimer = setTimeout(updateQuote, 350); }

async function updateQuote() {
  try {
    const res = await fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insuranceType: state.type, details: state.details }),
    });
    const data = await res.json();
    if (data.price != null) {
      state.price = data.price;
      document.getElementById('priceVal').textContent = fmt(data.price);
      const pct = Math.min(100, Math.round((data.price / 15000) * 100));
      document.getElementById('meterFill').style.width = pct + '%';
      document.getElementById('meterLabel').textContent = 'Попередній розрахунок для обраних параметрів';
    }
  } catch {
    document.getElementById('meterLabel').textContent = 'Не вдалося розрахувати — перевірте з’єднання';
  }
}

// ───────── Кроки форми ─────────
function goStep(step) {
  state.step = step;
  document.querySelectorAll('.form-panel').forEach((p) => p.classList.toggle('active', +p.dataset.panel === step));
  document.querySelectorAll('.step-dot').forEach((d) => d.classList.toggle('active', +d.dataset.step <= step));
  if (step === 3) renderReview();
}

function renderReview() {
  const fields = TYPE_FIELDS[state.type] || [];
  const detailsHtml = fields.map((f) => {
    let v = state.details[f.name];
    if (f.type === 'checkbox') v = v ? 'Так' : 'Ні';
    else if (f.type === 'select') { const o = f.options.find(([val]) => val == v); v = o ? o[1] : v; }
    return `<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:var(--muted)">${f.label}</span><b>${v || '—'}</b></div>`;
  }).join('');
  document.getElementById('reviewBox').innerHTML = `
    <div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:var(--muted)">Вид</span><b>${TYPE_META[state.type].label}</b></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:var(--muted)">ПІБ</span><b>${val('fullName') || '—'}</b></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:var(--muted)">Телефон</span><b>${val('phone') || '—'}</b></div>
    ${detailsHtml}
    <div style="display:flex;justify-content:space-between;padding:8px 0 0;margin-top:8px;border-top:1px solid var(--line)"><span style="color:var(--muted)">Орієнтовна вартість</span><b style="color:var(--teal-dark)">${state.price ? fmt(state.price) + ' грн' : '—'}</b></div>`;
}

const val = (id) => (document.getElementById(id)?.value || '').trim();

function validateStep2() {
  if (val('fullName').length < 3) { alert('Вкажіть ПІБ'); return false; }
  if (!/^[+0-9\s\-()]{7,20}$/.test(val('phone'))) { alert('Вкажіть коректний телефон'); return false; }
  const email = val('email');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { alert('Некоректний email'); return false; }
  return true;
}

// ───────── Відправлення заявки ─────────
async function submitApplication() {
  if (!document.getElementById('consent').checked) { alert('Потрібна згода на обробку даних'); return; }
  const btn = document.getElementById('submitBtn');
  btn.disabled = true; btn.textContent = 'Надсилаємо…';
  try {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        insuranceType: state.type,
        fullName: val('fullName'),
        phone: val('phone'),
        email: val('email') || null,
        city: val('city') || null,
        birthDate: val('birthDate') || null,
        details: state.details,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Помилка');
    document.querySelectorAll('.form-panel, .steps').forEach((el) => el.style.display = 'none');
    document.getElementById('successBox').classList.add('show');
    document.getElementById('reqNum').textContent = data.requestNumber;
  } catch (err) {
    alert(err.message);
    btn.disabled = false; btn.textContent = 'Надіслати заявку';
  }
}

// ───────── Перевірка статусу ─────────
const STATUS_LABEL = { new: 'Нова', review: 'На розгляді', approved: 'Підтверджено', issued: 'Поліс видано', rejected: 'Відхилено' };

async function checkStatus() {
  const num = document.getElementById('statusInput').value.trim();
  const box = document.getElementById('checkerResult');
  if (!num) { box.innerHTML = '<span style="color:var(--danger)">Введіть номер заявки</span>'; return; }
  box.textContent = 'Шукаємо…';
  try {
    const res = await fetch('/api/applications/status/' + encodeURIComponent(num));
    const data = await res.json();
    if (!res.ok) { box.innerHTML = `<span style="color:var(--danger)">${data.error}</span>`; return; }
    const price = data.final_price || data.estimated_price;
    box.innerHTML = `
      <div style="background:#fcfdfd;border:1px solid var(--line);border-radius:10px;padding:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <b>${data.request_number}</b>
          <span class="badge ${data.status}">${STATUS_LABEL[data.status] || data.status}</span>
        </div>
        <div style="color:var(--muted);font-size:.92rem">Вид: ${TYPE_META[data.insurance_type]?.label || data.insurance_type}</div>
        <div style="color:var(--muted);font-size:.92rem">Вартість: ${price ? fmt(price) + ' грн' : '—'}</div>
      </div>`;
  } catch {
    box.innerHTML = '<span style="color:var(--danger)">Помилка з’єднання</span>';
  }
}

// ───────── Ініціалізація ─────────
document.addEventListener('DOMContentLoaded', () => {
  renderTypesGrid();
  renderTypePicker();
  renderTypeFields();
  updateQuote();

  document.querySelectorAll('[data-next]').forEach((b) => b.addEventListener('click', () => {
    if (state.step === 2 && !validateStep2()) return;
    goStep(state.step + 1);
  }));
  document.querySelectorAll('[data-prev]').forEach((b) => b.addEventListener('click', () => goStep(state.step - 1)));
  document.getElementById('submitBtn').addEventListener('click', submitApplication);
  document.getElementById('checkBtn').addEventListener('click', checkStatus);
  document.getElementById('statusInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') checkStatus(); });
});
