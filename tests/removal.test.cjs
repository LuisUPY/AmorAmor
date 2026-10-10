const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const clone = value => JSON.parse(JSON.stringify(value));

function entorno() {
  const data = new Map();
  let failWrites = false;
  const localStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { if (failWrites) throw new Error('QuotaExceededError'); data.set(key, value); }
  };
  const app = vm.createContext({ Intl, localStorage });
  for (const file of ['menuData.js', 'orderCore.js', 'orders.js', 'history.js', 'cash.js', 'storage.js', 'printing.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), app);
  }
  return { ...app, failWrites: value => { failWrites = value; } };
}
const creado = '2026-10-10T15:00:00Z';
const eliminado = '2026-10-10T16:00:00Z';

test('elimina toda la cantidad, incluidos extras, y mantiene intactas las demás partidas', () => {
  const { AmorPOS: pos, AmorOrders: orders, AmorPrinting: printing } = entorno();
  const food = { ...pos.crearPartida('chilaquiles-con-pollo-o-huevo', { salsa: 'roja', proteina: 'pollo', extras: ['huevo'] }, 'Sin cebolla'), cantidad: 2 };
  const pedido = orders.nuevoPedido([food, pos.crearPartida('cafe-americano')], 'Mesa 1', 1, creado);
  const original = clone(pedido);
  const resultado = orders.eliminarPartida(pedido, pedido.partidas[0].id, eliminado);
  assert.deepEqual(clone(pedido), original);
  assert.deepEqual(clone(resultado.partidas), [original.partidas[1]]);
  assert.equal(resultado.totalCentavos, 6500);
  assert.equal(resultado.estado, 'ABIERTO');
  assert.deepEqual(clone(resultado.partidasEliminadas), [{ ...original.partidas[0], eliminadoEn: eliminado }]);
  const comandas = printing.separarComandas(resultado);
  assert.equal(comandas.comandaAlimentos.length, 0);
  assert.equal(comandas.comandaBebidas.length, 1);
  assert.throws(() => orders.eliminarPartida(resultado, pedido.partidas[0].id, eliminado), /ya no está/);
  assert.throws(() => orders.eliminarPartida(pedido, pedido.partidas[0].id, 'fecha-invalida'), /fecha/);
  assert.throws(() => orders.eliminarPartida(pedido, pedido.partidas[0].id, '2026-10-09T16:00:00Z'), /fecha/);
});

test('conserva cobros mixtos y cortes al eliminar un producto pendiente, incluso preparado', () => {
  const { AmorPOS: pos, AmorOrders: orders, AmorCash: cash, AmorStorage: storage } = entorno();
  const inicial = orders.nuevoPedido([pos.crearExtra('Pagado', 50), pos.crearExtra('Pendiente', 20)], 'Mesa 2', 2, creado);
  let { pedido, caja } = cash.cobrarPartidas(inicial, inicial.partidas[0].id, cash.abrirCaja(undefined, 100, creado),
    { efectivoRecibido: 30, montoTarjeta: 20 }, creado);
  pedido = orders.marcarPartida(pedido, 'todos', 'preparado', creado);
  const corte = cash.cerrarCaja(caja, creado, [pedido]).corte;
  const original = clone(pedido.partidas[0]);
  const next = orders.eliminarPartida(pedido, pedido.partidas[1].id, eliminado);
  assert.equal(next.estado, 'PAGADO');
  assert.equal(orders.estaAbierto(next), false);
  assert.equal(next.totalCentavos, 5000);
  assert.equal(next.montoEfectivo, 30);
  assert.equal(next.montoTarjeta, 20);
  assert.deepEqual(clone(next.partidas[0]), original);
  assert.throws(() => orders.eliminarPartida(pedido, pedido.partidas[0].id, eliminado), /ya cobrados/);
  const saved = storage.guardarExpediente({ ...storage.vacio(), pedidos: [next], historialCortes: [corte] });
  assert.equal(saved.historialCortes[0].totalVentasCentavos, 5000);
  assert.equal(saved.historialCortes[0].efectivoEsperadoCentavos, 13000);
});

test('el último producto cancela el pedido, libera la mesa y queda en el historial sin ventas', () => {
  const { AmorPOS: pos, AmorOrders: orders, AmorStorage: storage, AmorHistory: history } = entorno();
  const pedido = orders.nuevoPedido([pos.crearExtra('Único', 15)], 'Mesa 3', 3, creado);
  const cancelado = orders.eliminarPartida(pedido, pedido.partidas[0].id, eliminado);
  assert.equal(cancelado.estado, 'CANCELADO');
  assert.equal(cancelado.totalCentavos, 0);
  assert.equal(orders.estaAbierto(cancelado), false);
  assert.equal(orders.cuentaPendiente(cancelado), false);
  assert.equal(orders.pedidoConEtiqueta([cancelado], 'Mesa 03'), null);
  storage.guardarExpediente({ ...storage.vacio(), pedidos: [cancelado] });
  const loaded = storage.cargarExpediente();
  assert.equal(loaded.pedidos[0].estado, 'CANCELADO');
  assert.equal(loaded.siguienteNumero, 4);
  const dias = history.agruparPorDia(loaded.pedidos);
  assert.equal(dias.length, 1);
  assert.equal(dias[0].pedidos[0].estado, 'CANCELADO');
  assert.equal(dias[0].resumen.totalCentavos, 0);
  assert.equal(dias[0].resumen.productos, 0);
  assert.throws(() => orders.agregarPartidas(cancelado, [pos.crearExtra('Nuevo', 5)]), /cerrado/);
});

test('una adición no reutiliza identificadores eliminados', () => {
  const { AmorPOS: pos, AmorOrders: orders } = entorno();
  const extra = pos.crearExtra('Producto', 10);
  const pedido = orders.nuevoPedido([extra, extra, extra], '', 1, creado);
  const reducido = orders.eliminarPartida(pedido, pedido.partidas[2].id, eliminado);
  const ampliado = orders.agregarPartidas(reducido, [extra]);
  assert.equal(ampliado.partidas.at(-1).id, 'partida-1-4');
  assert.throws(() => orders.eliminarPartida(ampliado, pedido.partidas[2].id, eliminado), /ya no está/);
});

test('fallos de almacenamiento y revisiones antiguas conservan el pedido anterior', () => {
  const app = entorno();
  const { AmorPOS: pos, AmorOrders: orders, AmorStorage: storage } = app;
  const pedido = orders.nuevoPedido([pos.crearExtra('Producto', 10)], '', 1, creado);
  const saved = storage.guardarExpediente({ ...storage.vacio(), pedidos: [pedido] });
  const next = clone(saved);
  next.pedidos[0] = orders.eliminarPartida(pedido, pedido.partidas[0].id, eliminado);
  app.failWrites(true);
  assert.throws(() => storage.guardarExpediente(next), /QuotaExceeded/);
  assert.equal(storage.cargarExpediente().pedidos[0].partidas.length, 1);
  app.failWrites(false);
  storage.guardarExpediente(saved);
  assert.throws(() => storage.guardarExpediente(next), /otra pestaña/);
  const retry = storage.cargarExpediente();
  retry.pedidos[0] = next.pedidos[0];
  storage.guardarExpediente(retry);
  assert.equal(storage.cargarExpediente().pedidos[0].partidasEliminadas.length, 1);
});

test('rechaza pedidos vacíos sin registro y registros de eliminación inválidos', () => {
  const { AmorPOS: pos, AmorOrders: orders, AmorStorage: storage } = entorno();
  const pedido = orders.nuevoPedido([pos.crearExtra('Producto', 10)], '', 1, creado);
  assert.throws(() => storage.normalizar({ ...storage.vacio(), pedidos: [{ ...pedido, partidas: [], totalCentavos: 0 }] }), /inválido/);
  const cancelado = orders.eliminarPartida(pedido, pedido.partidas[0].id, eliminado);
  for (const cambio of [{ pagado: true }, { eliminadoEn: 'inválida' }, { montoEfectivo: 0 }, { cantidad: 0 }]) {
    const invalid = clone(cancelado);
    Object.assign(invalid.partidasEliminadas[0], cambio);
    assert.throws(() => storage.normalizar({ ...storage.vacio(), pedidos: [invalid] }), /inválid/);
  }
  const duplicate = { ...pedido, partidasEliminadas: cancelado.partidasEliminadas };
  assert.throws(() => storage.normalizar({ ...storage.vacio(), pedidos: [duplicate] }), /eliminado inválido/);
});
