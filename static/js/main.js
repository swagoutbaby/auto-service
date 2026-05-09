/* ════════════════════════════════════════════
   AutoService Admin — main.js
   Адаптирован под реальную схему БД:
   clients(id, surname, first_name, father_name, phone, visits)
   masters(id, surname, first_name, father_name, specialty)
   orders(id, client_id, master_id, box_num, car, service_type,
          status, booking_type, created_at, completed_at)
   discounts(id, client_id, percent)
   box_schedule(id, box_num, date, hour, order_id)
   ════════════════════════════════════════════ */

const API = '/api';

// ─────────────────────────────────────────────
//  Утилиты
// ─────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  // DELETE возвращает 204 без тела
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) {
    // Connexion возвращает ошибку в поле detail или title
    const msg = data.detail || data.title || data.error || 'Ошибка запроса';
    throw new Error(msg);
  }
  return data;
}

function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Закрытие по клику на оверлей
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

function statusBadge(status) {
  const map = {
    'Завершён': 'badge-green',
    'В работе': 'badge-orange',
    'Отменён':  'badge-red',
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status ?? '—'}</span>`;
}

function emptyState(text = 'Нет данных') {
  return `<div class="empty-state"><span class="empty-state__icon">⚙️</span>${text}</div>`;
}

function fullName(obj) {
  return [obj.surname, obj.first_name, obj.father_name].filter(Boolean).join(' ') || '—';
}

// ─────────────────────────────────────────────
//  Навигация
// ─────────────────────────────────────────────

document.querySelectorAll('.nav__btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav__btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('section-' + btn.dataset.section).classList.add('active');
  });
});

// ─────────────────────────────────────────────
//  CLIENTS
// ─────────────────────────────────────────────

async function loadClients() {
  const data = await apiFetch('/clients');
  const list = document.getElementById('clients-list');
  document.getElementById('clients-count').textContent = data.length + ' записей';
  document.getElementById('stat-clients').textContent = data.length;

  if (!data.length) { list.innerHTML = emptyState('Клиентов пока нет'); return; }

  list.innerHTML = data.map(c => `
    <div class="card">
      <span class="card__id">#${c.id}</span>
      <div class="card__title">${fullName(c)}</div>
      <div class="card__row">
        <span class="card__label">Телефон</span>
        <span class="card__value">${c.phone || '—'}</span>
      </div>
      <div class="card__row">
        <span class="card__label">Визиты</span>
        <span class="card__value" style="color:var(--accent2);font-family:var(--mono);font-weight:600">${c.visits ?? 0}</span>
      </div>
      <div class="card__actions">
        <button class="btn btn-secondary btn-sm" onclick="editClient(${c.id})">✏️ Изменить</button>
        <button class="btn btn-danger btn-sm" onclick="deleteClient(${c.id})">🗑 Удалить</button>
      </div>
    </div>`).join('');
}

document.getElementById('btn-add-client').addEventListener('click', () => {
  document.getElementById('client-edit-id').value = '';
  document.getElementById('client-modal-title').textContent = 'ДОБАВИТЬ КЛИЕНТА';
  ['client-surname','client-first-name','client-father-name','client-phone'].forEach(id =>
    document.getElementById(id).value = '');
  document.getElementById('client-visits').value = 0;
  openModal('client-modal');
});

document.getElementById('client-cancel').addEventListener('click', () => closeModal('client-modal'));

document.getElementById('client-save').addEventListener('click', async () => {
  const id = document.getElementById('client-edit-id').value;
  const surname    = document.getElementById('client-surname').value.trim();
  const first_name = document.getElementById('client-first-name').value.trim();
  if (!surname || !first_name) { toast('Заполните фамилию и имя', 'error'); return; }

  const body = {
    surname,
    first_name,
    father_name: document.getElementById('client-father-name').value.trim() || null,
    phone:       document.getElementById('client-phone').value.trim() || null,
    visits:      parseInt(document.getElementById('client-visits').value) || 0,
  };
  try {
    if (id) {
      await apiFetch(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Клиент обновлён');
    } else {
      await apiFetch('/clients', { method: 'POST', body: JSON.stringify(body) });
      toast('Клиент добавлен');
    }
    closeModal('client-modal');
    loadClients();
  } catch (e) { toast(e.message, 'error'); }
});

async function editClient(id) {
  try {
    const c = await apiFetch(`/clients/${id}`);
    document.getElementById('client-edit-id').value      = c.id;
    document.getElementById('client-surname').value      = c.surname || '';
    document.getElementById('client-first-name').value   = c.first_name || '';
    document.getElementById('client-father-name').value  = c.father_name || '';
    document.getElementById('client-phone').value        = c.phone || '';
    document.getElementById('client-visits').value       = c.visits ?? 0;
    document.getElementById('client-modal-title').textContent = 'РЕДАКТИРОВАТЬ КЛИЕНТА';
    openModal('client-modal');
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteClient(id) {
  if (!confirm('Удалить клиента? Связанные скидки тоже будут удалены.')) return;
  try {
    await apiFetch(`/clients/${id}`, { method: 'DELETE' });
    toast('Клиент удалён');
    loadClients();
    loadDiscounts();
  } catch (e) { toast(e.message, 'error'); }
}

// ─────────────────────────────────────────────
//  MASTERS
// ─────────────────────────────────────────────

async function loadMasters() {
  const data = await apiFetch('/masters');
  const list = document.getElementById('masters-list');
  document.getElementById('masters-count').textContent = data.length + ' записей';
  document.getElementById('stat-masters').textContent = data.length;

  if (!data.length) { list.innerHTML = emptyState('Мастеров пока нет'); return; }

  list.innerHTML = data.map(m => `
    <div class="card">
      <span class="card__id">#${m.id}</span>
      <div class="card__title">${fullName(m)}</div>
      <div class="card__row">
        <span class="card__label">Специализация</span>
        <span class="card__value">${m.specialty || '—'}</span>
      </div>
      <div class="card__actions">
        <button class="btn btn-secondary btn-sm" onclick="editMaster(${m.id})">✏️ Изменить</button>
        <button class="btn btn-danger btn-sm" onclick="deleteMaster(${m.id})">🗑 Удалить</button>
      </div>
    </div>`).join('');
}

document.getElementById('btn-add-master').addEventListener('click', () => {
  document.getElementById('master-edit-id').value = '';
  document.getElementById('master-modal-title').textContent = 'ДОБАВИТЬ МАСТЕРА';
  ['master-surname','master-first-name','master-father-name','master-specialty'].forEach(id =>
    document.getElementById(id).value = '');
  openModal('master-modal');
});

document.getElementById('master-cancel').addEventListener('click', () => closeModal('master-modal'));

document.getElementById('master-save').addEventListener('click', async () => {
  const id = document.getElementById('master-edit-id').value;
  const surname    = document.getElementById('master-surname').value.trim();
  const first_name = document.getElementById('master-first-name').value.trim();
  const specialty  = document.getElementById('master-specialty').value.trim();
  if (!surname || !first_name || !specialty) {
    toast('Заполните фамилию, имя и специализацию', 'error'); return;
  }
  const body = {
    surname,
    first_name,
    father_name: document.getElementById('master-father-name').value.trim() || null,
    specialty,
  };
  try {
    if (id) {
      await apiFetch(`/masters/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Мастер обновлён');
    } else {
      await apiFetch('/masters', { method: 'POST', body: JSON.stringify(body) });
      toast('Мастер добавлен');
    }
    closeModal('master-modal');
    loadMasters();
  } catch (e) { toast(e.message, 'error'); }
});

async function editMaster(id) {
  try {
    const m = await apiFetch(`/masters/${id}`);
    document.getElementById('master-edit-id').value     = m.id;
    document.getElementById('master-surname').value     = m.surname || '';
    document.getElementById('master-first-name').value  = m.first_name || '';
    document.getElementById('master-father-name').value = m.father_name || '';
    document.getElementById('master-specialty').value   = m.specialty || '';
    document.getElementById('master-modal-title').textContent = 'РЕДАКТИРОВАТЬ МАСТЕРА';
    openModal('master-modal');
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteMaster(id) {
  if (!confirm('Удалить мастера?')) return;
  try {
    await apiFetch(`/masters/${id}`, { method: 'DELETE' });
    toast('Мастер удалён');
    loadMasters();
  } catch (e) { toast(e.message, 'error'); }
}

// ─────────────────────────────────────────────
//  ORDERS
// ─────────────────────────────────────────────

// Показываем поле "дата завершения" только когда статус = Завершён
document.getElementById('order-status').addEventListener('change', function () {
  document.getElementById('order-completed-wrap').style.display =
    this.value === 'Завершён' ? 'block' : 'none';
});

async function loadOrders() {
  const data = await apiFetch('/orders');
  const tbody = document.getElementById('orders-body');
  document.getElementById('orders-count').textContent = data.length + ' записей';
  document.getElementById('stat-orders').textContent = data.length;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--text-dim);
      font-family:var(--mono);font-size:12px;padding:32px">Заказов пока нет</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(o => `
    <tr>
      <td><span style="font-family:var(--mono);color:var(--text-dim)">#${o.id}</span></td>
      <td>${o.client_id}</td>
      <td>${o.master_id ?? '—'}</td>
      <td style="font-family:var(--mono)">${o.box_num ?? '—'}</td>
      <td>${o.car || '—'}</td>
      <td>${o.service_type || '—'}</td>
      <td><span class="badge badge-gray">${o.booking_type || '—'}</span></td>
      <td>${statusBadge(o.status)}</td>
      <td style="font-family:var(--mono);color:var(--text-dim);font-size:11px">${o.created_at || '—'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="editOrder(${o.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteOrder(${o.id})">🗑</button>
        </div>
      </td>
    </tr>`).join('');
}

document.getElementById('btn-add-order').addEventListener('click', () => {
  document.getElementById('order-edit-id').value = '';
  document.getElementById('order-modal-title').textContent = 'НОВЫЙ ЗАКАЗ';
  ['order-client-id','order-master-id','order-box-num','order-car',
   'order-service-type','order-completed-at'].forEach(id =>
    document.getElementById(id).value = '');
  document.getElementById('order-status').value = 'В работе';
  document.getElementById('order-booking-type').value = 'Онлайн';
  document.getElementById('order-completed-wrap').style.display = 'none';
  openModal('order-modal');
});

document.getElementById('order-cancel').addEventListener('click', () => closeModal('order-modal'));

document.getElementById('order-save').addEventListener('click', async () => {
  const id         = document.getElementById('order-edit-id').value;
  const client_id  = parseInt(document.getElementById('order-client-id').value);
  const master_id  = parseInt(document.getElementById('order-master-id').value);
  const box_num    = parseInt(document.getElementById('order-box-num').value);
  const service_type  = document.getElementById('order-service-type').value.trim();
  const booking_type  = document.getElementById('order-booking-type').value;

  if (!client_id || !master_id || !box_num || !service_type || !booking_type) {
    toast('Заполните все обязательные поля', 'error'); return;
  }

  const body = {
    client_id, master_id, box_num,
    car:          document.getElementById('order-car').value.trim() || null,
    service_type,
    booking_type,
    status:       document.getElementById('order-status').value,
    completed_at: document.getElementById('order-completed-at').value || null,
  };

  try {
    if (id) {
      await apiFetch(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Заказ обновлён');
    } else {
      await apiFetch('/orders', { method: 'POST', body: JSON.stringify(body) });
      toast('Заказ создан');
    }
    closeModal('order-modal');
    loadOrders();
  } catch (e) { toast(e.message, 'error'); }
});

async function editOrder(id) {
  try {
    const o = await apiFetch(`/orders/${id}`);
    document.getElementById('order-edit-id').value       = o.id;
    document.getElementById('order-client-id').value     = o.client_id;
    document.getElementById('order-master-id').value     = o.master_id || '';
    document.getElementById('order-box-num').value       = o.box_num || '';
    document.getElementById('order-car').value           = o.car || '';
    document.getElementById('order-service-type').value  = o.service_type || '';
    document.getElementById('order-booking-type').value  = o.booking_type || 'Онлайн';
    document.getElementById('order-status').value        = o.status || 'В работе';
    document.getElementById('order-completed-at').value  = o.completed_at || '';
    document.getElementById('order-completed-wrap').style.display =
      o.status === 'Завершён' ? 'block' : 'none';
    document.getElementById('order-modal-title').textContent = 'РЕДАКТИРОВАТЬ ЗАКАЗ';
    openModal('order-modal');
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteOrder(id) {
  if (!confirm('Удалить заказ? Связанные записи в расписании тоже будут удалены.')) return;
  try {
    await apiFetch(`/orders/${id}`, { method: 'DELETE' });
    toast('Заказ удалён');
    loadOrders();
    loadSchedule();
  } catch (e) { toast(e.message, 'error'); }
}

// ─────────────────────────────────────────────
//  DISCOUNTS
// ─────────────────────────────────────────────

async function loadDiscounts() {
  const data = await apiFetch('/discounts');
  const list = document.getElementById('discounts-list');
  document.getElementById('discounts-count').textContent = data.length + ' записей';

  if (!data.length) { list.innerHTML = emptyState('Скидок пока нет'); return; }

  list.innerHTML = data.map(d => `
    <div class="card">
      <span class="card__id">#${d.id}</span>
      <div class="card__title">Клиент #${d.client_id}</div>
      <div class="card__row">
        <span class="card__label">Скидка</span>
        <span class="card__value" style="color:var(--accent2);font-family:var(--mono);
          font-size:24px;font-weight:600;line-height:1">${d.percent}%</span>
      </div>
      <div class="card__actions">
        <button class="btn btn-secondary btn-sm" onclick="editDiscount(${d.id})">✏️ Изменить</button>
        <button class="btn btn-danger btn-sm" onclick="deleteDiscount(${d.id})">🗑 Удалить</button>
      </div>
    </div>`).join('');
}

document.getElementById('btn-add-discount').addEventListener('click', () => {
  document.getElementById('discount-edit-id').value = '';
  document.getElementById('discount-modal-title').textContent = 'ДОБАВИТЬ СКИДКУ';
  document.getElementById('discount-client-id').value = '';
  document.getElementById('discount-percent').value = '';
  openModal('discount-modal');
});

document.getElementById('discount-cancel').addEventListener('click', () => closeModal('discount-modal'));

document.getElementById('discount-save').addEventListener('click', async () => {
  const id        = document.getElementById('discount-edit-id').value;
  const client_id = parseInt(document.getElementById('discount-client-id').value);
  const percent   = parseInt(document.getElementById('discount-percent').value);

  if (!client_id) { toast('Укажите ID клиента', 'error'); return; }
  if (isNaN(percent) || percent < 0 || percent > 30) {
    toast('Процент должен быть от 0 до 30', 'error'); return;
  }

  const body = { client_id, percent };
  try {
    if (id) {
      await apiFetch(`/discounts/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Скидка обновлена');
    } else {
      await apiFetch('/discounts', { method: 'POST', body: JSON.stringify(body) });
      toast('Скидка добавлена');
    }
    closeModal('discount-modal');
    loadDiscounts();
  } catch (e) { toast(e.message, 'error'); }
});

async function editDiscount(id) {
  try {
    const d = await apiFetch(`/discounts/${id}`);
    document.getElementById('discount-edit-id').value    = d.id;
    document.getElementById('discount-client-id').value  = d.client_id;
    document.getElementById('discount-percent').value    = d.percent;
    document.getElementById('discount-modal-title').textContent = 'РЕДАКТИРОВАТЬ СКИДКУ';
    openModal('discount-modal');
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteDiscount(id) {
  if (!confirm('Удалить скидку?')) return;
  try {
    await apiFetch(`/discounts/${id}`, { method: 'DELETE' });
    toast('Скидка удалена');
    loadDiscounts();
  } catch (e) { toast(e.message, 'error'); }
}

// ─────────────────────────────────────────────
//  BOX SCHEDULE
// ─────────────────────────────────────────────

async function loadSchedule() {
  const data = await apiFetch('/box_schedule');
  const list = document.getElementById('schedule-list');
  document.getElementById('schedule-count').textContent = data.length + ' записей';

  if (!data.length) { list.innerHTML = emptyState('Расписание пусто'); return; }

  list.innerHTML = data.map(s => `
    <div class="card">
      <span class="card__id">#${s.id}</span>
      <div class="card__title" style="display:flex;align-items:center;gap:10px">
        <span style="background:var(--accent);color:#fff;font-family:var(--mono);
          font-size:11px;padding:3px 8px;border-radius:3px;flex-shrink:0">БОКС ${s.box_num}</span>
        <span style="font-family:var(--mono);color:var(--accent2)">${s.date}</span>
      </div>
      <div class="card__row">
        <span class="card__label">Заказ</span>
        <span class="card__value" style="font-family:var(--mono)">#${s.order_id}</span>
      </div>
      <div class="card__actions">
        <button class="btn btn-secondary btn-sm" onclick="editSchedule(${s.id})">✏️ Изменить</button>
        <button class="btn btn-danger btn-sm" onclick="deleteSchedule(${s.id})">🗑 Удалить</button>
      </div>
    </div>`).join('');
}

document.getElementById('btn-add-schedule').addEventListener('click', () => {
  document.getElementById('schedule-edit-id').value = '';
  document.getElementById('schedule-modal-title').textContent = 'ДОБАВИТЬ ЗАПИСЬ В БОКС';
  ['schedule-box-num','schedule-date','schedule-order-id'].forEach(id =>
    document.getElementById(id).value = '');
  openModal('schedule-modal');
});

document.getElementById('schedule-cancel').addEventListener('click', () => closeModal('schedule-modal'));

document.getElementById('schedule-save').addEventListener('click', async () => {
  const id       = document.getElementById('schedule-edit-id').value;
  const box_num  = parseInt(document.getElementById('schedule-box-num').value);
  const date     = document.getElementById('schedule-date').value;
  const order_id = parseInt(document.getElementById('schedule-order-id').value);

  if (!box_num || !date || !order_id) {
    toast('Заполните все поля', 'error'); return;
  }

  const body = { box_num, date, order_id };
  try {
    if (id) {
      await apiFetch(`/box_schedule/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Запись обновлена');
    } else {
      await apiFetch('/box_schedule', { method: 'POST', body: JSON.stringify(body) });
      toast('Запись добавлена');
    }
    closeModal('schedule-modal');
    loadSchedule();
  } catch (e) { toast(e.message, 'error'); }
});

async function editSchedule(id) {
  try {
    const s = await apiFetch(`/box_schedule/${id}`);
    document.getElementById('schedule-edit-id').value   = s.id;
    document.getElementById('schedule-box-num').value   = s.box_num;
    document.getElementById('schedule-date').value      = s.date;
    document.getElementById('schedule-order-id').value  = s.order_id;
    document.getElementById('schedule-modal-title').textContent = 'РЕДАКТИРОВАТЬ ЗАПИСЬ';
    openModal('schedule-modal');
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteSchedule(id) {
  if (!confirm('Удалить запись из расписания?')) return;
  try {
    await apiFetch(`/box_schedule/${id}`, { method: 'DELETE' });
    toast('Запись удалена');
    loadSchedule();
  } catch (e) { toast(e.message, 'error'); }
}

// ─────────────────────────────────────────────
//  Инициализация
// ─────────────────────────────────────────────

async function init() {
  try {
    await Promise.all([
      loadClients(),
      loadMasters(),
      loadOrders(),
      loadDiscounts(),
      loadSchedule(),
    ]);
  } catch (e) {
    toast('Ошибка загрузки: ' + e.message, 'error');
  }
}

init();