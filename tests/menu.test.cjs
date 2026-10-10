const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({ Intl });
for (const file of ['menuData.js', 'orderCore.js']) vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context);
const { menuDB, AmorPOS: pos } = context;
assert.deepEqual(JSON.parse(JSON.stringify(menuDB)), JSON.parse(fs.readFileSync(path.join(root, 'assets/menu.json'), 'utf8')));
assert.deepEqual(Object.keys(menuDB), ['Entradas', 'Bebidas', 'Alimentos', 'Postres', 'Paquetes']);
assert.equal(pos.catalogo.length, 105);
assert.equal(new Set(pos.catalogo.map(p => p.id)).size, 105);
assert.equal(pos.catalogo.find(p => p.id === 'dirty-chai').precio, 85);
assert.equal(pos.crearPartida('dirty-chai').precioUnitarioCentavos, 8500);
for (const [macro, expected] of [['Entradas', 3], ['Bebidas', 65], ['Alimentos', 32], ['Postres', 0], ['Paquetes', 5]]) {
  assert.equal(pos.catalogo.filter(p => p.macroCategoria === macro).length, expected);
}
assert.equal(menuDB.Alimentos.Waffles.length, 5);
assert.equal(menuDB.Bebidas['Aguas naturales'].some(p => p.id === 'jugo-de-naranja'), true);
assert.equal(Object.hasOwn(menuDB.Bebidas, 'Jugos'), false);
assert.equal(Object.hasOwn(menuDB.Postres, 'Waffles dulces'), false);
let extrasChecked = 0;
for (const product of pos.catalogo) {
  assert.equal(product.fuente.archivo, 'assets/Menu Amor & Amor.pdf');
  assert.ok(product.fuente.pagina >= 2 && product.fuente.pagina <= 8);
  assert.ok(Array.isArray(product.opciones));
  assert.equal(new Set(product.opciones.map(g => g.id)).size, product.opciones.length);
  if (product.precio === null) {
    assert.equal(product.id, 'dirty-chai');
    assert.throws(() => pos.crearPartida(product.id), /pendiente/);
    continue;
  }
  const selected = {};
  for (const group of product.opciones) {
    assert.ok(['unica', 'multiple', 'texto'].includes(group.tipo));
    if (group.requerido) selected[group.id] = group.tipo === 'texto' ? 'Untable confirmado' : group.valores[0].id;
    if (group.valores) for (const value of group.valores) assert.ok(Number.isFinite(value.precioExtra) && value.precioExtra >= 0);
  }
  const line = pos.crearPartida(product.id, selected);
  assert.equal(line.precioUnitario, product.precio);
  if (product.opciones.some(g => g.requerido)) assert.throws(() => pos.crearPartida(product.id), /Selecciona|Completa/);
  for (const group of product.opciones.filter(g => g.tipo === 'multiple')) {
    for (const value of group.valores) {
      const modified = pos.crearPartida(product.id, { ...selected, [group.id]: [value.id] });
      assert.equal(modified.precioUnitario, product.precio + value.precioExtra);
      extrasChecked++;
    }
    const all = pos.crearPartida(product.id, { ...selected, [group.id]: group.valores.map(v => v.id) });
    assert.equal(all.precioUnitario, product.precio + group.valores.reduce((sum, value) => sum + value.precioExtra, 0));
    assert.throws(() => pos.crearPartida(product.id, { ...selected, [group.id]: ['inexistente'] }), /inválida/);
    assert.throws(() => pos.crearPartida(product.id, { ...selected, [group.id]: [group.valores[0].id, group.valores[0].id] }), /repitas/);
  }
}
const first = pos.crearPartida('chilaquiles-con-pollo-o-huevo', { salsa: 'roja', proteina: 'pollo', extras: ['huevo', 'pollo'] }, 'Sin cebolla');
assert.equal(first.precioBase, 160);
assert.equal(first.extras, 70);
assert.equal(first.precioUnitario, 230);
assert.equal(first.clave, pos.crearPartida(first.productoId, { salsa: 'roja', proteina: 'pollo', extras: ['pollo', 'huevo'] }, ' Sin cebolla ').clave);
assert.notEqual(first.clave, pos.crearPartida(first.productoId, { salsa: 'verde', proteina: 'pollo', extras: ['pollo', 'huevo'] }, 'Sin cebolla').clave);
const order = [{ ...first, cantidad: 2 }, pos.crearPartida('cafe-americano', { extras: ['leche-deslactosada', 'shot-de-espresso'] })];
assert.equal(pos.totalPedido(order), 56000);
const extra = pos.crearExtra('Producto nuevo', '28,55');
assert.equal(extra.precioUnitarioCentavos, 2855);
assert.equal(extra.macroCategoria, null);
assert.equal(pos.totalPedido([...order, { ...extra, cantidad: 3 }]), 64565);
for (const value of ['-1', '0', '1.234', '', '1e2', 'NaN', '10 pesos', 'Infinity']) assert.throws(() => pos.crearExtra('Extra', value), /monto|Monto/);
assert.throws(() => pos.crearExtra('   ', 10), /concepto/);
assert.throws(() => pos.crearPartida('no-existe'), /desconocido/);
assert.throws(() => pos.crearPartida('cafe-americano', { salsa: 'roja' }), /no pertenecen/);
assert.throws(() => pos.crearPartida('cafe-americano', { extras: 'shot-de-espresso' }), /inválida/);
assert.throws(() => pos.crearPartida('waffle-clasico', { untable: '   ' }), /Completa/);
assert.throws(() => pos.crearPartida('waffle-clasico', { untable: 'a'.repeat(61) }), /demasiado/);
assert.throws(() => pos.totalPedido([{ ...first, cantidad: -1 }]), /cantidad/);
assert.throws(() => pos.totalPedido([{ ...first, cantidad: 100 }]), /cantidad/);
assert.equal(pos.buscar('Piña / Café / Plátano'), 'pina / cafe / platano');
console.log(`✓ 105 productos, ${extrasChecked} extras individuales, selecciones obligatorias y totales verificados.`);
