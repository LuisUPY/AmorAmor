(() => {
'use strict';

const { MENU, DRINKS, SNACKS, findProduct, buildLine, combineAutomaticCombos, money, createId } = globalThis.FreezeMonkeyMenu;
const { emptyState, loadState, saveState, exportJSON, exportExcelCSV, importExpediente, localDate, loadQueueCollapsed, saveQueueCollapsed } = globalThis.FreezeMonkeyStorage;

const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const state = loadState();
let filter = 'todos';
let builderProduct = null;
let editingLineUid = null;
let activeOrderId = null;
let reviewingDraft = false;
let extraTarget = 'draft';
let toastTimer;
let queueCollapsed = loadQueueCollapsed();
let selectedHistoryDay = null;
let renderedHistoryDays = '';
const historyCategories = { frappes: 'Frappés', smoothies: 'Smoothies', limonadas: 'Limonadas', snacks: 'Snacks' };
const historyDayFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

function flash(message) {
  $('toast').textContent = message; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 3400);
}
function persist() { if (!saveState(state)) flash('No se pudo guardar en este navegador. Exporta un expediente.'); }
function updateDraftItems() {
  state.draft.items = combineAutomaticCombos(state.draft.items);
  persist(); renderDraft();
}
function subtotal(items) { return items.reduce((sum, item) => sum + item.price, 0); }
function extrasTotal(extras) { return extras.reduce((sum, extra) => sum + extra.amount, 0); }
function displayDate(iso) { return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); }
function categoryLabel(category) { return ({ combos: 'COMBO', frappes: 'FRAPPÉ', smoothies: 'SMOOTHIE', limonadas: 'LIMONADA', snacks: 'SNACK' })[category]; }
function imageMarkup(src, name, className = '') {
  return src ? `<img class="${className}" src="${escapeHTML(src)}" alt="${escapeHTML(name)}" loading="lazy">` : `<div class="image-fallback ${className}" aria-label="${escapeHTML(name)}">FM<span>🍋</span></div>`;
}

function renderCatalog() {
  const query = $('search').value.trim().toLocaleLowerCase('es-MX');
  const visible = MENU.filter(item => (filter === 'todos' || item.category === filter) && item.name.toLocaleLowerCase('es-MX').includes(query));
  $('result-count').textContent = `${visible.length} productos`;
  $('no-products').hidden = visible.length > 0;
  $('products').innerHTML = visible.map(item => `<button class="product-card" type="button" data-product="${item.id}" aria-label="Agregar ${escapeHTML(item.name)}, ${money(item.price)}">
    <span class="product-photo">${imageMarkup(item.image, item.name)}</span>
    <span class="product-info"><span class="product-type">${categoryLabel(item.category)}</span><strong>${escapeHTML(item.name)}</strong><span class="product-bottom"><span>${money(item.price)}</span><span class="add-circle" aria-hidden="true">+</span></span></span>
  </button>`).join('');
}
function componentBreakdown(line) {
  if (!line.components.length) return '';
  const regular = subtotal(line.components);
  const adjustment = line.price - regular;
  return `<ul class="component-list">${line.components.map(part => `<li><span>${escapeHTML(part.name)}</span><span>${money(part.price)}</span></li>`).join('')}</ul>
    <div class="combo-adjustment"><span>Ajuste del combo</span><span>${adjustment < 0 ? '−' : '+'}${money(Math.abs(adjustment))}</span></div>`;
}
function renderDraft() {
  const items = state.draft.items, extras = state.draft.extras;
  $('draft-count').textContent = items.length;
  $('draft-label').value = state.draft.label || '';
  $('draft-items').innerHTML = items.length ? items.map(line => `<div class="draft-line">
    <div class="draft-thumb">${imageMarkup(line.image, line.name)}</div>
    <div class="draft-line-main"><strong>${escapeHTML(line.name)}</strong><small>${line.components.length ? line.components.map(c => escapeHTML(c.name)).join(' · ') : 'Producto individual'}</small><div class="draft-line-actions"><button type="button" data-duplicate-line="${line.uid}" aria-label="Duplicar ${escapeHTML(line.name)}">+</button>${line.selections && (line.selections.drinks || line.selections.tenderFlavor) ? `<button type="button" data-edit-line="${line.uid}">Editar</button>` : ''}<button type="button" data-remove-line="${line.uid}" aria-label="Quitar ${escapeHTML(line.name)}">Quitar</button></div></div>
    <b>${money(line.price)}</b></div>`).join('') : '<p class="draft-empty">Selecciona un producto para empezar.</p>';
  $('draft-extras').innerHTML = extras.map(extra => `<div class="extra-row"><span>${escapeHTML(extra.description)}</span><b>${money(extra.amount)}</b><button type="button" data-remove-extra="${extra.uid}" data-target="draft" aria-label="Quitar extra ${escapeHTML(extra.description)}">×</button></div>`).join('');
  $('draft-subtotal').textContent = money(subtotal(items));
  $('draft-extras-total').textContent = money(extrasTotal(extras));
  $('draft-total').textContent = money(subtotal(items) + extrasTotal(extras));
  $('create-order').disabled = !items.length;
}
function renderSales() {
  const today = localDate();
  const paid = state.orders.filter(order => order.status === 'PAGADO' && order.paidAt && localDate(new Date(order.paidAt)) === today);
  $('sales-count').textContent = paid.length;
  $('sales-total').textContent = money(paid.reduce((sum, order) => sum + subtotal(order.items) + extrasTotal(order.extras), 0));
}
function renderQueue() {
  const open = state.orders.filter(order => order.status !== 'PAGADO').sort((a, b) => b.number - a.number);
  $('open-count').textContent = open.length;
  $('collapsed-open-count').textContent = open.length;
  document.body.dataset.queueEmpty = String(open.length === 0);
  $('queue-items').innerHTML = open.length ? open.map(order => orderCardMarkup(order, true)).join('') : '<p class="queue-empty">Aún no hay pedidos abiertos.</p>';
}
// La cola y el historial comparten el mismo marcado y los mismos estilos de tarjeta.
function orderCardMarkup(order, allowDelete = false) {
  return `<div class="queue-tile"><button type="button" class="queue-open" data-open-order="${escapeHTML(order.id)}" aria-label="Abrir pedido número ${order.number}${order.label ? `, ${escapeHTML(order.label)}` : ''}">
    ${queuePreview(order.items)}<span class="queue-data"><strong>N° ${order.number}</strong>${order.label ? `<span class="queue-label${allowDelete ? '' : ' history-label'}" title="${escapeHTML(order.label)}">${escapeHTML(order.label)}</span>` : ''}<small data-status="${escapeHTML(order.status)}">${escapeHTML(order.status)}</small><b>${money(subtotal(order.items) + extrasTotal(order.extras))}</b></span>
  </button>${allowDelete ? `<button type="button" class="queue-delete" data-delete-order="${escapeHTML(order.id)}" aria-label="Eliminar pedido número ${order.number}">×</button>` : ''}</div>`;
}
function queuePreview(items) {
  const visible = items.slice(0, items.length > 4 ? 3 : 4);
  const remaining = items.length - visible.length;
  return `<span class="queue-preview" aria-label="${items.length} ítems">${visible.map(item => `<span class="queue-thumb" title="${escapeHTML(item.name)}">${imageMarkup(item.image, item.name)}</span>`).join('')}${remaining ? `<span class="queue-more" aria-label="${remaining} ítems más">+${remaining}<small>ítems</small></span>` : ''}</span>`;
}
function setQueueCollapsed(collapsed, moveFocus = false) {
  queueCollapsed = collapsed;
  document.body.classList.toggle('queue-collapsed', collapsed);
  $('order-queue').hidden = collapsed;
  $('show-queue').hidden = !collapsed;
  $('hide-queue').setAttribute('aria-expanded', String(!collapsed));
  $('show-queue').setAttribute('aria-expanded', String(!collapsed));
  saveQueueCollapsed(collapsed);
  if (moveFocus) $(collapsed ? 'show-queue' : 'hide-queue').focus();
}
function renderAll() { renderDraft(); renderQueue(); renderSales(); if ($('history-dialog').open) renderHistory(); }
function openDialog(dialog) { if (!dialog.open) dialog.showModal(); }
function closeDialog(dialog) { if (dialog.open) dialog.close(); }

function selectField(label, group, index, chosen = '') {
  const source = group === 'drink' ? DRINKS : SNACKS;
  return `<label class="choice-field">${escapeHTML(label)}<select data-choice="${group}" data-index="${index}" required><option value="">Elige una opción</option>${source.map(item => `<option value="${item.id}" ${chosen === item.id ? 'selected' : ''}>${escapeHTML(item.name)} · ${money(item.price)}</option>`).join('')}</select></label>`;
}
function openBuilder(product, line = null) {
  builderProduct = product; editingLineUid = line?.uid || null;
  $('builder-title').textContent = product.name;
  $('builder-note').textContent = product.note || 'Elige la preparación';
  $('builder-price').textContent = money(product.price);
  $('builder-add').textContent = line ? 'Guardar cambios' : 'Agregar al pedido';
  const requirements = product.requirements || {};
  let fields = '';
  if (requirements.drink) fields += `<div class="choice-group"><h3>Bebidas incluidas <span>${requirements.drink}</span></h3>${Array.from({ length: requirements.drink }, (_, i) => selectField(`Bebida ${i + 1}`, 'drink', i, line?.selections?.drinks?.[i])).join('')}</div>`;
  if (requirements.snack) fields += `<div class="choice-group"><h3>Snacks incluidos <span>${requirements.snack}</span></h3>${Array.from({ length: requirements.snack }, (_, i) => selectField(`Snack ${i + 1}`, 'snack', i, line?.selections?.snacks?.[i])).join('')}</div>`;
  if (requirements.tender || product.kind === 'tender') fields += `<div class="choice-group"><h3>Preparación de tenders</h3><label class="choice-field">Sabor<select data-choice="tender" required><option value="">Elige una opción</option>${['Naturales', 'BBQ', 'Búfalo'].map(flavor => `<option value="${flavor}" ${line?.selections?.tenderFlavor === flavor ? 'selected' : ''}>${flavor}</option>`).join('')}</select></label></div>`;
  $('builder-fields').innerHTML = fields + '<div id="builder-breakdown" class="builder-breakdown"></div>';
  updateBuilder(); openDialog($('builder-dialog'));
}
function builderSelections() {
  const selects = [...$('builder-fields').querySelectorAll('select')];
  if (selects.some(select => !select.value)) return null;
  return {
    drinks: selects.filter(select => select.dataset.choice === 'drink').map(select => select.value),
    snacks: selects.filter(select => select.dataset.choice === 'snack').map(select => select.value),
    tenderFlavor: selects.find(select => select.dataset.choice === 'tender')?.value
  };
}
function updateBuilder() {
  const choices = builderSelections();
  $('builder-add').disabled = !choices;
  if (!choices) { $('builder-breakdown').innerHTML = '<p>Completa las elecciones para ver el desglose.</p>'; return; }
  try {
    const preview = buildLine(builderProduct, choices);
    $('builder-breakdown').innerHTML = `<strong>Desglose incluido</strong>${componentBreakdown(preview)}<div class="preview-total"><span>Precio del combo</span><b>${money(preview.price)}</b></div>`;
  } catch { $('builder-add').disabled = true; }
}
function addProduct(id) {
  const product = findProduct(id);
  if (!product) return;
  if (product.kind === 'combo' || product.kind === 'tender') { openBuilder(product); return; }
  state.draft.items.push(buildLine(product)); updateDraftItems(); flash(`${product.name} agregado`);
}
function activeOrder() { return state.orders.find(order => order.id === activeOrderId); }
function renderOrder() {
  const order = reviewingDraft ? state.draft : activeOrder();
  if (!order || !order.items.length) { closeDialog($('order-dialog')); return; }
  $('order-label').value = order.label || '';
  $('order-label').readOnly = order.status === 'PAGADO';
  $('order-title').textContent = reviewingDraft ? 'Revisar pedido' : `Pedido N° ${order.number}`;
  $('order-status').textContent = reviewingDraft ? 'POR CONFIRMAR' : order.status;
  $('order-status').dataset.status = reviewingDraft ? 'BORRADOR' : order.status;
  $('order-created').textContent = reviewingDraft ? 'Comprueba los productos y el total antes de confirmar.' : displayDate(order.createdAt);
  $('order-item-count').textContent = `${order.items.length} ${order.items.length === 1 ? 'producto' : 'productos'}`;
  $('order-gallery').dataset.density = order.items.length > 4 ? 'dense' : 'normal';
  $('order-gallery').innerHTML = order.items.map(line => `<figure class="order-gallery-item" role="listitem">${imageMarkup(line.image, line.name)}<figcaption>${escapeHTML(line.name)}</figcaption></figure>`).join('');
  $('order-lines').innerHTML = order.items.map(line => `<div class="order-line"><div class="order-line-top"><strong>${escapeHTML(line.name)}</strong><b>${money(line.price)}</b></div>${componentBreakdown(line)}</div>`).join('');
  $('order-extras').innerHTML = order.extras.length ? order.extras.map(extra => `<div class="extra-row"><span>${escapeHTML(extra.description)}</span><b>${money(extra.amount)}</b>${order.status !== 'PAGADO' ? `<button type="button" data-remove-extra="${extra.uid}" data-target="${reviewingDraft ? 'review' : 'order'}" aria-label="Quitar extra ${escapeHTML(extra.description)}">×</button>` : ''}</div>`).join('') : '<p class="muted">Sin extras.</p>';
  $('order-subtotal').textContent = money(subtotal(order.items));
  $('order-extras-total').textContent = money(extrasTotal(order.extras));
  $('order-total').textContent = money(subtotal(order.items) + extrasTotal(order.extras));
  $('confirm-order').hidden = !reviewingDraft;
  $('mark-ready').hidden = reviewingDraft || order.status !== 'ABIERTO';
  $('mark-paid').hidden = reviewingDraft || order.status === 'PAGADO';
  $('order-add-extra').hidden = order.status === 'PAGADO';
}
function openOrder(id) { reviewingDraft = false; activeOrderId = id; renderOrder(); if (activeOrder()) { closeDialog($('history-dialog')); openDialog($('order-dialog')); } }
function historyOrderDate(order) {
  // Los expedientes anteriores sin paidAt usan la fecha de creación como respaldo.
  return new Date(order.status === 'PAGADO' && order.paidAt ? order.paidAt : order.createdAt);
}
function productCategory(item, parentProduct = null) {
  const product = findProduct(item.productId || item.id) || MENU.find(product => product.name === item.name);
  // Los componentes antiguos del platón no guardaban id ni categoría.
  const included = parentProduct?.included?.find(part => part.name === item.name);
  if (parentProduct?.id === 'combo-manada' && item.name === 'Platón de snacks') return 'snacks';
  return product?.category || item.category || included?.category;
}
function summarizeHistoryDay(orders) {
  const summary = { total: 0, paidCount: 0, products: 0, categories: { frappes: 0, smoothies: 0, limonadas: 0, snacks: 0 }, uncategorized: 0 };
  for (const order of orders) {
    if (order.status !== 'PAGADO') continue;
    summary.paidCount++;
    summary.total += subtotal(order.items) + extrasTotal(order.extras);
    for (const line of order.items) {
      const parentProduct = findProduct(line.productId) || MENU.find(product => product.name === line.name);
      // Un combo se cuenta por sus componentes, sin sumar también el combo padre.
      const products = line.components.length ? line.components : [line];
      for (const item of products) {
        const category = productCategory(item, parentProduct);
        summary.products++;
        if (Object.hasOwn(summary.categories, category)) summary.categories[category]++;
        else summary.uncategorized++;
      }
    }
  }
  return summary;
}
function groupOrdersByDay(orders) {
  const groups = new Map();
  for (const order of orders) {
    const date = localDate(historyOrderDate(order));
    if (!groups.has(date)) groups.set(date, { date, orders: [] });
    groups.get(date).orders.push(order);
  }
  return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date)).map(day => ({
    ...day,
    orders: day.orders.sort((a, b) => historyOrderDate(b) - historyOrderDate(a) || b.number - a.number),
    summary: summarizeHistoryDay(day.orders)
  }));
}
function historyDayLabel(date) {
  // Constructor local: evita el cambio de día de new Date('YYYY-MM-DD') en México.
  const [year, month, day] = date.split('-').map(Number);
  return historyDayFormatter.format(new Date(year, month - 1, day, 12));
}
function renderHistory(date = selectedHistoryDay) {
  const days = groupOrdersByDay(state.orders);
  const selected = days.find(day => day.date === date) || days[0];
  selectedHistoryDay = selected?.date || null;
  $('history-layout').hidden = !selected;
  $('history-empty').hidden = !!selected;
  // Mantener los botones existentes conserva el foco y el scroll al cambiar de día.
  const dayMarkup = days.map(day => `<button type="button" class="history-day" data-history-day="${day.date}" aria-controls="history-detail">
    <time datetime="${day.date}">${historyDayLabel(day.date)}</time>
    <span>${money(day.summary.total)} · ${day.summary.paidCount} ${day.summary.paidCount === 1 ? 'venta pagada' : 'ventas pagadas'}</span>
    <small>${day.orders.length} ${day.orders.length === 1 ? 'pedido' : 'pedidos'}</small>
  </button>`).join('');
  if (renderedHistoryDays !== dayMarkup) {
    $('history-days').innerHTML = dayMarkup;
    renderedHistoryDays = dayMarkup;
  }
  $('history-days').querySelectorAll('[data-history-day]').forEach(button => {
    const active = button.dataset.historyDay === selectedHistoryDay;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (!selected) { $('history-summary').innerHTML = ''; $('history-list').innerHTML = ''; return; }
  const { summary } = selected;
  const pending = selected.orders.length - summary.paidCount;
  $('history-day-title').textContent = historyDayLabel(selected.date);
  $('history-day-meta').textContent = `${summary.paidCount} ${summary.paidCount === 1 ? 'venta pagada' : 'ventas pagadas'} · ${pending} ${pending === 1 ? 'pedido pendiente' : 'pedidos pendientes'}`;
  $('history-summary').innerHTML = `<div class="history-kpi history-kpi--main"><dt>Total de ventas</dt><dd>${money(summary.total)}</dd></div>
    <div class="history-kpi history-kpi--main"><dt>Productos vendidos</dt><dd>${summary.products}</dd></div>
    ${Object.entries(historyCategories).map(([category, label]) => `<div class="history-kpi"><dt>${label}</dt><dd>${summary.categories[category]}</dd></div>`).join('')}`;
  $('history-uncategorized').hidden = !summary.uncategorized;
  $('history-uncategorized').textContent = `${summary.uncategorized} ${summary.uncategorized === 1 ? 'producto sin categoría identificada' : 'productos sin categoría identificada'} en el expediente.`;
  $('history-order-count').textContent = selected.orders.length;
  $('history-list').innerHTML = selected.orders.map(order => orderCardMarkup(order)).join('');
}
function startExtra(target) {
  extraTarget = target; $('extra-form').reset();
  if (target !== 'draft') closeDialog($('order-dialog'));
  openDialog($('extra-dialog')); $('extra-form').elements.amount.focus();
}

document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.product) addProduct(button.dataset.product);
  if (button.dataset.filter) {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
    renderCatalog();
  }
  if (button.dataset.removeLine) { state.draft.items = state.draft.items.filter(line => line.uid !== button.dataset.removeLine); updateDraftItems(); }
  if (button.dataset.duplicateLine) {
    const line = state.draft.items.find(item => item.uid === button.dataset.duplicateLine);
    if (line) {
      const copy = { ...structuredClone(line), uid: createId() };
      if (copy.automaticCombo && Array.isArray(copy.sourceItems)) copy.sourceItems.forEach(item => { item.uid = createId(); });
      state.draft.items.push(copy); updateDraftItems();
    }
  }
  if (button.dataset.editLine) {
    const line = state.draft.items.find(item => item.uid === button.dataset.editLine);
    if (line) openBuilder(findProduct(line.productId), line);
  }
  if (button.dataset.removeExtra) {
    const list = button.dataset.target === 'order' ? activeOrder()?.extras : state.draft.extras;
    if (list) { const i = list.findIndex(extra => extra.uid === button.dataset.removeExtra); if (i >= 0) list.splice(i, 1); persist(); renderDraft(); renderOrder(); }
  }
  if (button.dataset.openOrder) openOrder(button.dataset.openOrder);
  if (button.dataset.historyDay) {
    selectedHistoryDay = button.dataset.historyDay;
    renderHistory();
    $('history-detail').scrollTop = 0;
  }
  if (button.dataset.deleteOrder) {
    const order = state.orders.find(item => item.id === button.dataset.deleteOrder);
    if (order && confirm(`¿Eliminar el pedido N° ${order.number}?`)) {
      state.orders = state.orders.filter(item => item.id !== order.id); persist(); renderAll(); flash(`Pedido N° ${order.number} eliminado`);
    }
  }
  if (button.hasAttribute('data-close-dialog')) closeDialog(button.closest('dialog'));
});

document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
function updateLabel(target, value) {
  if (!target || target.status === 'PAGADO') return;
  target.label = value.trim().slice(0, 60);
  persist();
}
$('draft-label').addEventListener('input', event => updateLabel(state.draft, event.target.value));
$('order-label').addEventListener('input', event => {
  updateLabel(reviewingDraft ? state.draft : activeOrder(), event.target.value);
  if (reviewingDraft) $('draft-label').value = state.draft.label;
  else renderQueue();
});
$('search').addEventListener('input', renderCatalog);
$('hide-queue').addEventListener('click', () => setQueueCollapsed(true, true));
$('show-queue').addEventListener('click', () => setQueueCollapsed(false, true));
$('builder-fields').addEventListener('change', updateBuilder);
$('builder-add').addEventListener('click', () => {
  try {
    const line = buildLine(builderProduct, builderSelections());
    if (editingLineUid) {
      const index = state.draft.items.findIndex(item => item.uid === editingLineUid);
      if (index >= 0) { line.uid = editingLineUid; state.draft.items[index] = line; }
    } else state.draft.items.push(line);
    updateDraftItems(); closeDialog($('builder-dialog')); flash(`${line.name} agregado`);
  } catch (error) { flash(error.message); }
});
$('add-extra').addEventListener('click', () => startExtra('draft'));
$('order-add-extra').addEventListener('click', () => startExtra(reviewingDraft ? 'review' : 'order'));
$('extra-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget, amount = Number(form.elements.amount.value), description = form.elements.description.value.trim();
  if (!Number.isFinite(amount) || amount <= 0 || !description) return;
  const extra = { uid: createId(), amount: Math.round(amount * 100) / 100, description };
  const order = extraTarget === 'order' ? activeOrder() : null;
  if (extraTarget === 'order' && (!order || order.status === 'PAGADO')) return;
  (order ? order.extras : state.draft.extras).push(extra);
  persist(); renderAll(); closeDialog($('extra-dialog'));
  if (extraTarget !== 'draft') { renderOrder(); openDialog($('order-dialog')); }
  flash('Extra agregado');
});
$('extra-dialog').addEventListener('close', () => {
  if (extraTarget !== 'draft' && (reviewingDraft || activeOrder()) && !$('order-dialog').open) {
    renderOrder(); openDialog($('order-dialog'));
  }
});
$('create-order').addEventListener('click', () => {
  if (!state.draft.items.length) return;
  updateDraftItems();
  reviewingDraft = true; activeOrderId = null;
  renderOrder(); openDialog($('order-dialog'));
});
$('confirm-order').addEventListener('click', () => {
  if (!reviewingDraft || !state.draft.items.length) return;
  const number = state.nextNumber++;
  const order = { id: createId(), number, status: 'ABIERTO', createdAt: new Date().toISOString(), paidAt: null, items: state.draft.items, extras: state.draft.extras, label: state.draft.label || '' };
  state.orders.push(order); state.draft = emptyState().draft;
  reviewingDraft = false;
  persist(); renderAll(); closeDialog($('order-dialog')); flash(`Pedido N° ${number} confirmado`);
});
$('mark-ready').addEventListener('click', () => {
  const order = activeOrder(); if (!order || order.status !== 'ABIERTO') return;
  order.status = 'LISTO'; persist(); renderAll(); renderOrder(); flash(`Pedido N° ${order.number} listo`);
});
$('mark-paid').addEventListener('click', () => {
  const order = activeOrder(); if (!order || order.status === 'PAGADO') return;
  order.status = 'PAGADO'; order.paidAt = new Date().toISOString();
  persist(); renderAll(); renderOrder(); flash(`Pedido N° ${order.number} pagado`);
});
$('history-button').addEventListener('click', () => {
  renderHistory(); openDialog($('history-dialog'));
  $('history-days').querySelector('.active')?.scrollIntoView({ block: 'nearest' });
});
$('options-button').addEventListener('click', () => openDialog($('options-dialog')));
$('reset-day').addEventListener('click', () => {
  closeDialog($('options-dialog')); openDialog($('reset-dialog'));
});
$('backup-before-reset').addEventListener('click', () => exportJSON(state));
$('confirm-reset').addEventListener('click', () => {
  const fresh = emptyState();
  if (!saveState(fresh)) { flash('No se pudo reiniciar. Los datos actuales se conservan.'); return; }
  Object.assign(state, fresh);
  activeOrderId = null; reviewingDraft = false; builderProduct = null; editingLineUid = null; extraTarget = 'draft'; selectedHistoryDay = null;
  filter = 'todos'; $('search').value = '';
  document.querySelectorAll('[data-filter]').forEach(button => button.classList.toggle('active', button.dataset.filter === filter));
  document.querySelectorAll('dialog[open]').forEach(closeDialog);
  renderDate(); renderCatalog(); renderAll(); renderHistory(); flash('Datos reiniciados. El siguiente pedido será N° 1.');
});
$('save-file').addEventListener('click', () => exportJSON(state));
$('open-file').addEventListener('click', () => $('file-input').click());
$('export-json').addEventListener('click', () => exportJSON(state));
$('export-csv').addEventListener('click', () => exportExcelCSV(state));
$('import-file').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    const incoming = await importExpediente(file);
    if (!confirm(`Abrir este expediente reemplazará los ${state.orders.length} pedidos guardados en este navegador. ¿Continuar?`)) return;
    Object.assign(state, incoming); state.draft.items = combineAutomaticCombos(state.draft.items); selectedHistoryDay = null; persist(); renderAll(); closeDialog($('options-dialog')); flash('Expediente cargado');
  } catch (error) { flash(`No se pudo abrir: ${error.message}`); }
  finally { event.target.value = ''; }
});

function renderDate() {
const today = new Date();
$('today').textContent = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(today);
$('header-date').textContent = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(today);
}
const combinedDraft = combineAutomaticCombos(state.draft.items);
if (combinedDraft !== state.draft.items) { state.draft.items = combinedDraft; persist(); }
renderDate(); renderCatalog(); renderAll(); setQueueCollapsed(queueCollapsed);

})();
