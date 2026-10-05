// Ejecutar con Node: node tests/combo-regression.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../js/menuData.js'), 'utf8'));
const { DRINKS, SNACKS, findProduct, buildLine, combineAutomaticCombos } = FreezeMonkeyMenu;
const line = (id, flavor = 'BBQ') => buildLine(findProduct(id), { tenderFlavor: flavor });
const total = items => items.reduce((sum, item) => sum + item.price, 0);
for (const drink of DRINKS) for (const snack of SNACKS) {
  for (const input of [[line(drink.id), line(snack.id)], [line(snack.id), line(drink.id)]]) {
    const output = combineAutomaticCombos(input);
    assert.equal(output.length, 1);
    assert.equal(output[0].productId, 'combo-viral');
    assert.equal(total(output), 95);
    assert.deepEqual(output[0].selections.drinks, [drink.id]);
    assert.deepEqual(output[0].selections.snacks, [snack.id]);
    assert.equal(combineAutomaticCombos(output), output, 'Recalculating an unchanged draft should preserve its lines');
  }
}
let items = combineAutomaticCombos([line('limonada-azul'), line('snack-dedos-de-queso')]);
items = combineAutomaticCombos([...items, line('smoothie-mango'), line('snack-aros-de-cebolla')]);
assert.equal(items.length, 1); assert.equal(items[0].productId, 'combo-ozaru'); assert.equal(total(items), 180);
assert.deepEqual(items[0].selections.drinks, ['limonada-azul', 'smoothie-mango']);
for (const flavor of ['Naturales', 'BBQ', 'Búfalo']) {
  const result = combineAutomaticCombos([line('frappe-dk-oreo'), line('snack-monkey-tenders', flavor)]);
  assert.equal(result[0].productId, 'combo-tenders'); assert.equal(total(result), 120);
  assert.equal(result[0].selections.tenderFlavor, flavor);
}
items = combineAutomaticCombos([line('caja-salvaje'), line('limonada-fresa'), line('smoothie-fresa')]);
assert.equal(items[0].productId, 'combo-manada'); assert.equal(total(items), 289);
assert.equal(items[0].components.find(item => item.id === 'caja-salvaje').price, 179);
assert.equal(combineAutomaticCombos([line('limonada-fresa'), line('snack-monkey-boneless')]).length, 2, 'Boneless is not one of the five eligible snacks');
const manual = buildLine(findProduct('combo-viral'), { drinks: ['limonada-fresa'], snacks: ['snack-dedos-de-queso'] });
assert.equal(combineAutomaticCombos([manual])[0], manual, 'Explicitly selected combos should retain their choices');
const historical = [buildLine(findProduct('combo-manada'), { drinks: ['smoothie-mango', 'limonada-fresa'] })];
historical[0].components[0] = { name: 'Platón de snacks', price: 169 };
assert.equal(combineAutomaticCombos(historical), historical, 'Existing combo snapshots should not be repriced');

// Comparar con todas las asignaciones posibles de las cuatro promociones.
let combinations = 0;
for (let drinks = 0; drinks <= 6; drinks++) for (let snacks = 0; snacks <= 4; snacks++)
for (let tenders = 0; tenders <= 2; tenders++) for (let boxes = 0; boxes <= 2; boxes++) {
  const raw = [
    ...Array.from({ length: drinks }, (_, i) => line(DRINKS[i].id)),
    ...Array.from({ length: snacks }, (_, i) => line(i % 2 ? 'snack-papas-gajo' : 'snack-dedos-de-queso')),
    ...Array.from({ length: tenders }, () => line('snack-monkey-tenders')),
    ...Array.from({ length: boxes }, () => line('caja-salvaje'))
  ];
  const snackPrices = raw.filter(item => findProduct(item.productId).kind === 'snack').map(item => item.price).sort((a, b) => b - a);
  let cheapest = total(raw);
  for (let viral = 0; viral <= snacks; viral++) for (let ozaru = 0; ozaru <= Math.floor(snacks / 2); ozaru++)
  for (let tender = 0; tender <= tenders; tender++) for (let manada = 0; manada <= boxes; manada++) {
    const usedDrinks = viral + 2 * ozaru + tender + 2 * manada, usedSnacks = viral + 2 * ozaru;
    if (usedDrinks > drinks || usedSnacks > snacks) continue;
    const cost = viral * 95 + ozaru * 180 + tender * 120 + manada * 289 +
      (drinks - usedDrinks) * 60 + snackPrices.slice(usedSnacks).reduce((sum, price) => sum + price, 0) +
      (tenders - tender) * 70 + (boxes - manada) * 179;
    cheapest = Math.min(cheapest, cost);
  }
  const output = combineAutomaticCombos(raw);
  assert.equal(total(output), cheapest, `Incorrect promotion allocation: ${JSON.stringify({ drinks, snacks, tenders, boxes })}`);
  const originals = output.flatMap(item => item.automaticCombo ? item.sourceItems : [item]);
  assert.deepEqual(originals.map(item => item.uid).sort(), raw.map(item => item.uid).sort(), 'Products must not be lost or counted twice');
  assert.equal(combineAutomaticCombos(output), output);
  combinations++;
}
console.log(`Combos: todas las bebidas/snacks, sabores, Ozaru progresivo, Caja Salvaje y ${combinations} asignaciones de precio mínimo OK`);
