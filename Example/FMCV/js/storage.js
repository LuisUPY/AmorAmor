// Scripts clásicos para permitir abrir index.html directamente desde file://.
globalThis.FreezeMonkeyStorage = (() => {
'use strict';

const KEY = 'freeze-monkey-pos-v1';
const QUEUE_PREFERENCE_KEY = 'freeze-monkey-pos-queue-collapsed';
const empty = () => ({ version: 1, nextNumber: 1, orders: [], draft: { items: [], extras: [], label: '' } });
const cleanLabel = value => typeof value === 'string' ? value.trim().slice(0, 60) : '';

function loadQueueCollapsed() {
  try { return localStorage.getItem(QUEUE_PREFERENCE_KEY) === 'true'; }
  catch { return false; }
}
function saveQueueCollapsed(collapsed) {
  try { localStorage.setItem(QUEUE_PREFERENCE_KEY, String(collapsed)); }
  catch { /* La preferencia visual no impide usar la caja. */ }
}

function isLine(line) {
  return line && typeof line.uid === 'string' && typeof line.name === 'string' &&
    Number.isFinite(line.price) && line.price >= 0 && Array.isArray(line.components);
}
function isExtra(extra) {
  return extra && typeof extra.uid === 'string' && typeof extra.description === 'string' &&
    extra.description.trim() && Number.isFinite(extra.amount) && extra.amount > 0;
}
function cleanOrder(order) {
  if (!order || !Number.isSafeInteger(order.number) || order.number < 1 ||
      !['ABIERTO', 'LISTO', 'PAGADO'].includes(order.status) ||
      !Array.isArray(order.items) || !order.items.every(isLine) || !order.items.length ||
      !Array.isArray(order.extras) || !order.extras.every(isExtra) ||
      !Number.isFinite(Date.parse(order.createdAt))) throw new Error('El expediente contiene un pedido inválido');
  return {
    id: String(order.id || `pedido-${order.number}`), number: order.number,
    status: order.status, createdAt: order.createdAt,
    paidAt: order.status === 'PAGADO' && Number.isFinite(Date.parse(order.paidAt)) ? order.paidAt : null,
    items: order.items, extras: order.extras, label: cleanLabel(order.label)
  };
}
function normalizeState(raw) {
  if (!raw || !Array.isArray(raw.orders)) throw new Error('Formato de expediente no válido');
  const orders = raw.orders.map(cleanOrder);
  const numbers = orders.map(order => order.number);
  if (new Set(numbers).size !== numbers.length) throw new Error('Hay números de pedido duplicados');
  const max = Math.max(0, ...numbers);
  const draft = raw.draft && Array.isArray(raw.draft.items) && raw.draft.items.every(isLine) &&
    Array.isArray(raw.draft.extras) && raw.draft.extras.every(isExtra) ? raw.draft : { items: [], extras: [] };
  return { version: 1, nextNumber: Math.max(max + 1, Number.isSafeInteger(raw.nextNumber) ? raw.nextNumber : 1), orders,
    draft: { items: draft.items, extras: draft.extras, label: cleanLabel(draft.label) } };
}
function loadState() {
  try { return normalizeState(JSON.parse(localStorage.getItem(KEY))); }
  catch { return empty(); }
}
function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(normalizeState(state))); return true; }
  catch { return false; }
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportJSON(state) {
  download(`freeze-monkey-expediente-${localDate()}.json`, JSON.stringify(normalizeState(state), null, 2), 'application/json;charset=utf-8');
}
const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
function exportExcelCSV(state) {
  const columns = ['numero', 'estado', 'creado', 'pagado', 'subtotal', 'extras_total', 'total', 'items_json', 'extras_json', 'etiqueta_json'];
  const rows = state.orders.map(order => {
    const subtotal = order.items.reduce((sum, line) => sum + line.price, 0);
    const extras = order.extras.reduce((sum, extra) => sum + extra.amount, 0);
    return [order.number, order.status, order.createdAt, order.paidAt || '', subtotal, extras, subtotal + extras,
      JSON.stringify(order.items), JSON.stringify(order.extras), JSON.stringify(cleanLabel(order.label))].map(quote).join(';');
  });
  download(`freeze-monkey-expediente-${localDate()}.csv`, '\uFEFF' + [columns.map(quote).join(';'), ...rows].join('\r\n'), 'text/csv;charset=utf-8');
}
function parseCSV(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted && c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ';' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(value => value !== '')) rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('CSV incompleto');
  row.push(cell); if (row.some(value => value !== '')) rows.push(row);
  return rows;
}
async function importExpediente(file) {
  const text = (await file.text()).replace(/^\uFEFF/, '');
  if (file.name.toLowerCase().endsWith('.json')) return normalizeState(JSON.parse(text));
  if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Selecciona un archivo JSON o CSV');
  const rows = parseCSV(text);
  const expected = ['numero', 'estado', 'creado', 'pagado', 'subtotal', 'extras_total', 'total', 'items_json', 'extras_json'];
  if (!rows.length || expected.some((column, i) => rows[0][i] !== column)) throw new Error('CSV incompatible: usa un expediente exportado por este POS');
  const hasLabels = rows[0].length === 10 && rows[0][9] === 'etiqueta_json';
  if (rows[0].length !== 9 && !hasLabels) throw new Error('Columnas de CSV incompatibles');
  const orders = rows.slice(1).map((cells, index) => {
    if (cells.length !== rows[0].length) throw new Error(`Fila ${index + 2} incompleta`);
    const items = JSON.parse(cells[7]); const extras = JSON.parse(cells[8]);
    const subtotal = items.reduce((sum, line) => sum + line.price, 0);
    const extraTotal = extras.reduce((sum, extra) => sum + extra.amount, 0);
    if (Math.abs(Number(cells[4]) - subtotal) > 0.001 || Math.abs(Number(cells[5]) - extraTotal) > 0.001 ||
        Math.abs(Number(cells[6]) - subtotal - extraTotal) > 0.001) throw new Error(`Importes inconsistentes en fila ${index + 2}`);
    return { id: `pedido-${cells[0]}`, number: Number(cells[0]), status: cells[1], createdAt: cells[2], paidAt: cells[3] || null, items, extras, label: hasLabels ? JSON.parse(cells[9]) : '' };
  });
  return normalizeState({ orders, draft: { items: [], extras: [] } });
}
function localDate(date = new Date()) {
  const year = date.getFullYear(), month = String(date.getMonth() + 1).padStart(2, '0'), day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

return { emptyState: empty, normalizeState, loadState, saveState, exportJSON, exportExcelCSV, importExpediente, localDate, loadQueueCollapsed, saveQueueCollapsed };
})();
