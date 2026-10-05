OLDDDD:

// Scripts clásicos para permitir abrir index.html directamente desde file://.
globalThis.FreezeMonkeyMenu = (() => {
'use strict';

// Catálogo basado en las fotografías entregadas. Todos los importes están en MXN.
const image = file => file ? `./assets/img/productos/${file}.webp` : null;
let idSequence = 0;
function createId() {
  return globalThis.crypto?.randomUUID?.() || `fm-${Date.now().toString(36)}-${++idSequence}-${Math.random().toString(36).slice(2)}`;
}

const DRINKS = [
  ['frappe-albino-kong', 'Frappé Albino Kong', 'frappes'],
  ['frappe-dk-oreo', 'Frappé DK Oreo', 'frappes'],
  ['frappe-kranfiky', 'Frappé Kranfiky', 'frappes'],
  ['frappe-lotus-de-george', 'Frappé El Lotus de George', 'frappes'],
  ['frappe-mandril-mamut', 'Frappé Mandril Mamut', 'frappes'],
  ['frappe-mojo-choco', 'Frappé Mojo Choco', 'frappes'],
  ['frappe-mono-capuccino', 'Frappé Mono Capuccino', 'frappes'],
  ['frappe-mono-real', 'Frappé Mono Real', 'frappes'],
  ['smoothie-fresa', 'Smoothie Fresa', 'smoothies'],
  ['smoothie-fresa-salvaje', 'Smoothie Fresa Salvaje', 'smoothies'],
  ['smoothie-mango', 'Smoothie Mango', 'smoothies'],
  ['smoothie-mango-salvaje', 'Smoothie Mango Salvaje', 'smoothies'],
  ['smoothie-mono-sandillero', 'Smoothie Mono Sandillero', 'smoothies'],
  ['smoothie-pina', 'Smoothie Piña', 'smoothies'],
  ['smoothie-pina-tropical', 'Smoothie Piña Tropical', 'smoothies'],
  ['smoothie-sandia', 'Smoothie Sandía', 'smoothies'],
  ['limonada-fresa', 'Limonada de Fresa', 'limonadas'],
  ['limonada-azul', 'Limonada Azul', 'limonadas']
].map(([id, name, category]) => ({ id, name, category, kind: 'drink', price: 60, image: image(category === 'limonadas' ? null : id) }));

const SNACKS = [
  ['snack-papas-francesas', 'Papas francesas', 40],
  ['snack-papas-gajo', 'Papas gajo', 40],
  ['snack-aros-de-cebolla', 'Aros de cebolla', 40],
  ['snack-salchipulpos', 'Salchipulpos', 40],
  ['snack-dedos-de-queso', 'Dedos de queso', 50]
].map(([id, name, price]) => ({ id, name, category: 'snacks', kind: 'snack', price, image: image(id) }));

const TENDER_FLAVORS = ['Naturales', 'BBQ', 'Búfalo'];
const TENDER = {
  id: 'snack-monkey-tenders', name: 'Tenders', category: 'snacks', kind: 'tender',
  price: 70, image: image('snack-monkey-tenders')
};

const BONELESS_FLAVORS = ['Naturales', 'BBQ', 'Búfalo'];
const BONELESS = {
  id: 'snack-monkey-boneless', name: 'Boneless', category: 'snacks', kind: 'boneless',
  price: 100, image: image('snack-monkey-boneless')
};
const COMBOS = [
  { id: 'combo-viral', name: 'Combo Viral', category: 'combos', kind: 'combo', price: 95, image: image('combo-viral'), requirements: { drink: 1, snack: 1 }, note: '1 bebida + 1 snack' },
  { id: 'combo-ozaru', name: 'Combo Ozaru', category: 'combos', kind: 'combo', price: 180, image: image('combo-ozaru'), requirements: { drink: 2, snack: 2 }, note: '2 bebidas + 2 snacks' },
  { id: 'combo-manada', name: 'Combo Manada', category: 'combos', kind: 'combo', price: 289, image: image('combo-manada'), requirements: { drink: 2 }, included: [{ id: 'caja-salvaje', name: 'Caja Salvaje', category: 'snacks', price: 179 }], note: '2 bebidas + 1 Caja Salvaje' },
  { id: 'combo-tenders', name: 'Combo Tender', category: 'combos', kind: 'combo', price: 120, image: image('combo-tenders'), requirements: { drink: 1, tender: 1 }, note: 'Tenders + 1 bebida' }
];

const CAJA = { id: 'caja-salvaje', name: 'Caja Salvaje', category: 'snacks', kind: 'product', price: 179, image: image('caja-salvaje') };

// Combos intercalados para que estén visibles durante el recorrido del catálogo.
const byId = new Map([...DRINKS, ...SNACKS, TENDER, BONELESS, ...COMBOS, CAJA].map(product => [product.id, product]));
const order = [
  'combo-viral', 'frappe-albino-kong', 'smoothie-fresa', 'snack-papas-francesas',
  'combo-ozaru', 'frappe-dk-oreo', 'smoothie-mango', 'snack-dedos-de-queso',
  'combo-manada', 'frappe-kranfiky', 'smoothie-sandia', 'snack-aros-de-cebolla',
  'combo-tenders', 'snack-monkey-tenders', 'snack-monkey-boneless', 'frappe-lotus-de-george', 'smoothie-pina',
  'caja-salvaje', 'frappe-mandril-mamut', 'smoothie-fresa-salvaje', 'snack-papas-gajo',
  'frappe-mojo-choco', 'smoothie-mango-salvaje', 'snack-salchipulpos',
  'frappe-mono-capuccino', 'smoothie-mono-sandillero', 'limonada-fresa', 'limonada-azul',
  'frappe-mono-real', 'smoothie-pina-tropical'
];
const MENU = order.map(id => byId.get(id));
const findProduct = id => byId.get(id);

function buildLine(product, selections = {}) {
  if (!product) throw new Error('Producto desconocido');
  if (product.kind === 'combo') {
    const drinks = selections.drinks || [];
    const snacks = selections.snacks || [];
    const flavor = selections.tenderFlavor;
    const req = product.requirements;
    if (drinks.length !== (req.drink || 0) || snacks.length !== (req.snack || 0) || (req.tender && !TENDER_FLAVORS.includes(flavor))) {
      throw new Error('Completa todas las elecciones del combo');
    }
    const chosen = [...drinks.map(id => findProduct(id)), ...snacks.map(id => findProduct(id))];
    if (chosen.some((item, index) => !item || (index < drinks.length ? item.kind !== 'drink' : item.kind !== 'snack'))) {
      throw new Error('Selección de combo inválida');
    }
    const components = [
      ...(product.included || []).map(item => ({ ...item })),
      ...chosen.map(item => ({ id: item.id, name: item.name, price: item.price })),
      ...(req.tender ? [{ id: TENDER.id, name: `Tenders ${flavor}`, price: TENDER.price }] : [])
    ];
    return { uid: createId(), productId: product.id, name: product.name, price: product.price, image: product.image, components, selections: { drinks, snacks, tenderFlavor: flavor || null } };
  }
  if (product.kind === 'tender' && !TENDER_FLAVORS.includes(selections.tenderFlavor)) throw new Error('Elige el sabor de tenders');
  return {
    uid: createId(), productId: product.id,
    name: product.kind === 'tender' ? `Tenders ${selections.tenderFlavor}` : product.name,
    price: product.price, image: product.image,
    components: [], selections: product.kind === 'tender' ? { tenderFlavor: selections.tenderFlavor } : {}
  };
}

const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

function combineAutomaticCombos(items) {
  // Solo se desarman combos automáticos; los elegidos desde el selector se conservan.
  const previous = new Map();
  const keyFor = lines => lines.map(line => line.uid).sort().join('|');
  const validSources = line => line.automaticCombo && Array.isArray(line.sourceItems) && line.sourceItems.length &&
    line.sourceItems.every(item => item && typeof item.uid === 'string' && typeof item.name === 'string' &&
      Number.isFinite(item.price) && Array.isArray(item.components) && !item.components.length);
  const flat = items.flatMap(line => {
    if (!validSources(line)) return [line];
    previous.set(`${line.productId}:${keyFor(line.sourceItems)}`, line);
    return line.sourceItems;
  });
  const pools = { drink: [], snack: [], tender: [], box: [] };
  flat.forEach((line, index) => {
    const product = findProduct(line.productId);
    if (!product || line.components.length || line.price !== product.price) return;
    const kind = product.id === CAJA.id ? 'box' : product.kind;
    if (kind === 'tender' && !TENDER_FLAVORS.includes(line.selections?.tenderFlavor)) return;
    if (pools[kind]) pools[kind].push({ line, index });
  });
  // Los dedos de queso pueden ahorrar más; se usan primero sin cambiar su precio individual.
  pools.snack.sort((a, b) => b.line.price - a.line.price || a.index - b.index);
  const snackTotals = [0];
  pools.snack.forEach(entry => snackTotals.push(snackTotals.at(-1) + entry.line.price));
  let best = { saving: 0, snacks: 0, tenders: 0, boxes: 0 };
  for (let snacks = 0; snacks <= Math.min(pools.drink.length, pools.snack.length); snacks++) {
    const tenders = Math.min(pools.tender.length, pools.drink.length - snacks);
    const boxes = Math.min(pools.box.length, Math.floor((pools.drink.length - snacks - tenders) / 2));
    // Ozaru cuesta menos que dos Viral. Tender ahorra lo mismo que Manada usando una bebida menos.
    const comboPrice = Math.floor(snacks / 2) * findProduct('combo-ozaru').price + (snacks % 2) * findProduct('combo-viral').price;
    const saving = snacks * DRINKS[0].price + snackTotals[snacks] - comboPrice +
      tenders * (DRINKS[0].price + TENDER.price - findProduct('combo-tenders').price) +
      boxes * (2 * DRINKS[0].price + CAJA.price - findProduct('combo-manada').price);
    if (saving > best.saving || saving === best.saving && snacks > best.snacks) best = { saving, snacks, tenders, boxes };
  }
  const used = new Set(), grouped = [];
  let drinkIndex = 0, snackIndex = 0;
  const addCombo = (id, entries) => {
    const sourceItems = entries.map(entry => entry.line);
    const selections = {
      drinks: sourceItems.filter(line => findProduct(line.productId).kind === 'drink').map(line => line.productId),
      snacks: sourceItems.filter(line => findProduct(line.productId).kind === 'snack').map(line => line.productId),
      tenderFlavor: sourceItems.find(line => line.productId === TENDER.id)?.selections.tenderFlavor
    };
    const combo = previous.get(`${id}:${keyFor(sourceItems)}`) || {
      ...buildLine(findProduct(id), selections), automaticCombo: true, sourceItems
    };
    entries.forEach(entry => used.add(entry.index));
    grouped.push({ index: Math.min(...entries.map(entry => entry.index)), line: combo });
  };
  for (let i = 0; i < Math.floor(best.snacks / 2); i++) {
    addCombo('combo-ozaru', [...pools.drink.slice(drinkIndex, drinkIndex + 2), ...pools.snack.slice(snackIndex, snackIndex + 2)]);
    drinkIndex += 2; snackIndex += 2;
  }
  if (best.snacks % 2) addCombo('combo-viral', [pools.drink[drinkIndex++], pools.snack[snackIndex++]]);
  for (let i = 0; i < best.tenders; i++) addCombo('combo-tenders', [pools.drink[drinkIndex++], pools.tender[i]]);
  for (let i = 0; i < best.boxes; i++) {
    addCombo('combo-manada', [...pools.drink.slice(drinkIndex, drinkIndex + 2), pools.box[i]]);
    drinkIndex += 2;
  }
  flat.forEach((line, index) => { if (!used.has(index)) grouped.push({ index, line }); });
  const result = grouped.sort((a, b) => a.index - b.index).map(entry => entry.line);
  return result.length === items.length && result.every((line, index) => line === items[index]) ? items : result;
}

return { DRINKS, SNACKS, TENDER_FLAVORS, TENDER, COMBOS, CAJA, MENU, findProduct, buildLine, combineAutomaticCombos, money, createId };
})();
