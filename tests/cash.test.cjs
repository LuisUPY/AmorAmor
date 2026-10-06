const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ Intl });
for (const file of ['menuData.js', 'orderCore.js', 'orders.js', 'cash.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), context);
}
const { AmorPOS: pos, AmorOrders: orders, AmorCash: cash } = context;
const clone = value => JSON.parse(JSON.stringify(value));
const apertura = '2026-10-06T13:00:00.000Z';
const cobro1 = '2026-10-06T14:00:00.000Z';
const cobro2 = '2026-10-06T14:01:00.000Z';
const cierre = '2026-10-06T20:00:00.000Z';
assert.equal(cash.montoACentavos('10,05'), 1005);
assert.equal(cash.montoACentavos('0.01'), 1);
assert.equal(cash.montoACentavos('999999.99'), 99999999);
for (const invalid of ['1.001', '-5', '1,234.56', '1e2', '', '0', '1000000', 'NaN']) {
  assert.throws(() => cash.montoACentavos(invalid));
}
// El recibido se valida en centavos, y el cambio se descuenta sólo del efectivo.
let validacion = cash.validarPago(35000, '0', '0');
assert.equal(validacion.completo, false);
assert.equal(validacion.faltanteCentavos, 35000);
validacion = cash.validarPago(35000, '200', '149.99');
assert.equal(validacion.completo, false);
assert.equal(validacion.faltanteCentavos, 1);
for (const [efectivo, tarjeta, neto, cambio] of [
  ['500', '0', 35000, 15000], ['200', '150', 20000, 0], ['500', '150', 20000, 30000], ['0', '350', 0, 0]
]) {
  validacion = cash.validarPago(35000, efectivo, tarjeta);
  assert.equal(validacion.completo, true);
  assert.equal(validacion.faltanteCentavos, 0);
  assert.equal(validacion.montoEfectivoCentavos, neto);
  assert.equal(validacion.montoTarjetaCentavos, Number(tarjeta) * 100);
  assert.equal(validacion.efectivoRecibidoCentavos, Number(efectivo) * 100);
  assert.equal(validacion.cambioCentavos, cambio);
}
assert.equal(cash.validarPago(30, '0.10', '0.20').completo, true);
for (const invalid of ['-1', '1.001', 'NaN', 'Infinity', '1e2', Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.throws(() => cash.validarPago(35000, invalid, '0'));
  assert.throws(() => cash.validarPago(35000, '0', invalid));
}
assert.throws(() => cash.validarPago(35000, '500', '350.01'), /tarjeta/i);
assert.throws(() => cash.validarPago(35000, '0', '351'), /tarjeta/i);
assert.equal(cash.abrirCaja(cash.cajaVacia(), '0', apertura).fondoInicialCentavos, 0);
assert.equal(cash.normalizarCaja(undefined).abierta, false);
assert.throws(() => cash.normalizarCaja({ ...cash.cajaVacia(), fondoInicialCentavos: 1 }), /cero/);
const vacia = cash.cajaVacia();
let caja = cash.abrirCaja(vacia, '100.25', apertura);
assert.equal(vacia.abierta, false);
assert.throws(() => cash.abrirCaja(caja, '200', apertura), /abierto/);
assert.throws(() => cash.registrarGasto(vacia, '1', 'Hielo', cobro1), /Abre/);
const food = { ...pos.crearPartida('chilaquiles-con-pollo-o-huevo', { salsa: 'roja', proteina: 'pollo', extras: ['huevo', 'pollo'] }), cantidad: 2 };
const coffee = pos.crearPartida('cafe-americano', { extras: ['leche-deslactosada', 'shot-de-espresso'] });
let pedido = orders.nuevoPedido([food, coffee], 'Mesa 3', 1, apertura);
assert.throws(() => cash.cobrarPartidas(pedido, 'todos', vacia, 'efectivo', cobro1), /Abre/);
assert.throws(() => cash.cobrarPartidas(pedido, 'todos', caja, '', cobro1), /Selecciona/);
assert.throws(() => cash.cobrarPartidas(pedido, 'todos', caja, 'tarjeta', '2026-10-06T12:59:00Z'), /fecha/);
const originalPedido = JSON.stringify(pedido);
const originalCaja = JSON.stringify(caja);
assert.throws(() => cash.cobrarPartidas(pedido, 'todos', caja, { efectivoRecibido: '0', montoTarjeta: '0' }, cobro1), /Faltan|falta|insuficiente/i);
let resultado = cash.cobrarPartidas(pedido, pedido.partidas[0].id, caja, { efectivoRecibido: '500', montoTarjeta: '0' }, cobro1);
assert.equal(JSON.stringify(pedido), originalPedido);
assert.equal(JSON.stringify(caja), originalCaja);
assert.equal(resultado.montoCentavos, 46000);
assert.equal(resultado.cambioCentavos, 4000);
pedido = resultado.pedido; caja = resultado.caja;
assert.equal(pedido.partidas[0].montoEfectivo, 460);
assert.equal(pedido.partidas[0].montoTarjeta, 0);
assert.equal(pedido.partidas[0].metodoPago, undefined);
assert.equal(pedido.montoEfectivo, 460);
assert.equal(pedido.montoTarjeta, 0);
assert.equal(pedido.partidas[0].turnoId, caja.turnoId);
assert.equal(pedido.partidas[1].pagado, false);
assert.throws(() => cash.cobrarPartidas(pedido, pedido.partidas[0].id, caja, 'efectivo', cobro2), /ya están pagados/);
resultado = cash.cobrarPartidas(pedido, 'todos', caja, { efectivoRecibido: '0', montoTarjeta: '100' }, cobro2);
assert.equal(resultado.montoCentavos, 10000); // El cobro total restante no cuenta otra vez el pago parcial.
pedido = resultado.pedido; caja = resultado.caja;
assert.equal(pedido.estado, 'PAGADO');
assert.equal(pedido.partidas[0].pagadoEn, cobro1);
assert.equal(pedido.montoEfectivo, 460);
assert.equal(pedido.montoTarjeta, 100);
assert.equal(caja.pagos.length, 2);
assert.equal(caja.pagos[0].montoEfectivoCentavos, 46000);
assert.equal(caja.pagos[0].montoTarjetaCentavos, 0);
assert.equal(caja.pagos[0].metodo, undefined);
assert.throws(() => cash.cobrarPartidas(pedido, 'todos', caja, 'efectivo', cobro2), /ya están pagados/);
caja = cash.registrarGasto(caja, '20,10', ' Compra de hielo ', '2026-10-06T15:00:00Z');
assert.equal(caja.gastosDelDia[0].concepto, 'Compra de hielo');
assert.throws(() => cash.registrarGasto(caja, '0', 'Hielo', cobro2), /monto/);
assert.throws(() => cash.registrarGasto(caja, '1', '  ', cobro2), /concepto/);
const resumen = cash.resumirCaja(caja);
assert.deepEqual(clone(cash.resumirCaja(caja, [pedido])), clone(resumen));
assert.equal(resumen.fondoInicialCentavos, 10025);
assert.equal(resumen.ventasEfectivoCentavos, 46000);
assert.equal(resumen.ventasTarjetaCentavos, 10000);
assert.equal(resumen.gastosExtrasCentavos, 2010);
assert.equal(resumen.efectivoEsperadoCentavos, 54015);
assert.equal(resumen.totalVentasCentavos, 56000);
assert.throws(() => cash.registrarGasto(caja, '540.16', 'Proveedor', cobro2), /excede/);
assert.equal(cash.validarVinculos([pedido], caja, []), true);
const pagoTampered = clone(caja); pagoTampered.pagos[0].importeCentavos--;
assert.throws(() => cash.validarVinculos([pedido], pagoTampered, []), /importe/);
const pedidoTampered = clone(pedido); pedidoTampered.partidas[0].montoEfectivo = 459; pedidoTampered.partidas[0].montoTarjeta = 1;
assert.throws(() => cash.validarVinculos([pedidoTampered], caja, []), /coincide/);
const metodosTampered = clone(caja); metodosTampered.pagos[0].montoEfectivoCentavos--; metodosTampered.pagos[0].montoTarjetaCentavos++;
assert.throws(() => cash.validarVinculos([pedido], metodosTampered, []), /coincide/);
const pagoRepetido = clone(caja); pagoRepetido.pagos.push({ ...pagoRepetido.pagos[0], id: 'pago-duplicado' });
assert.throws(() => cash.normalizarCaja(pagoRepetido), /más de una vez/);
assert.throws(() => cash.cerrarCaja(caja, cobro2), /posteriores/);
const cajaAntesDeCierre = JSON.stringify(caja);
const { caja: cerrada, corte } = cash.cerrarCaja(caja, cierre, [pedido]);
assert.equal(JSON.stringify(caja), cajaAntesDeCierre);
assert.equal(cerrada.abierta, false);
assert.equal(cerrada.pagos.length, 0);
assert.equal(cerrada.gastosDelDia.length, 0);
assert.equal(cash.resumirCaja(cerrada).efectivoEsperadoCentavos, 0);
assert.equal(corte.totalVentasCentavos, 56000);
assert.equal(corte.efectivoEsperadoCentavos, 54015);
assert.equal(cash.validarVinculos([pedido], cerrada, [corte]), true);
assert.throws(() => cash.normalizarCorte({ ...corte, totalVentasCentavos: 56001 }), /inconsistentes/);
assert.throws(() => cash.validarVinculos([pedido], cerrada, [corte, corte]), /repetidos/);
assert.throws(() => cash.validarVinculos([pedido], cerrada, []), /movimiento/);
const siguiente = cash.abrirCaja(cerrada, '50', '2026-10-07T13:00:00Z');
assert.equal(cash.resumirCaja(siguiente).totalVentasCentavos, 0);
assert.equal(cash.validarVinculos([pedido], siguiente, [corte]), true);
let legacy = orders.nuevoPedido([coffee], 'Pago anterior', 2, apertura);
legacy = orders.marcarPartida(legacy, 'todos', 'pagado', cobro1);
assert.equal(cash.validarVinculos([legacy], cash.cajaVacia(), []), true);
assert.equal(cash.resumirCaja(siguiente).ventasTarjetaCentavos, 0);
// El corte suma la aportación de cada método, no clasifica pedidos enteros.
let cajaMixta = cash.abrirCaja(cash.cajaVacia(), '100.25', apertura);
const pedidosMixtos = [];
for (const [index, [efectivoRecibido, montoTarjeta, efectivoNeto, cambio]] of [
  ['500', '0', 350, 150], ['200', '150', 200, 0], ['500', '150', 200, 300], ['0', '350', 0, 0]
].entries()) {
  const original = orders.nuevoPedido([pos.crearExtra('Cuenta mixta', '350')], '', 20 + index, apertura);
  const cobrado = cash.cobrarPartidas(original, 'todos', cajaMixta, { efectivoRecibido, montoTarjeta }, cobro1);
  assert.equal(cobrado.pedido.estado, 'PAGADO');
  assert.equal(cobrado.pedido.montoEfectivo, efectivoNeto);
  assert.equal(cobrado.pedido.montoTarjeta, Number(montoTarjeta));
  assert.equal(cobrado.cambioCentavos, cambio * 100);
  assert.equal(cobrado.pedido.partidas[0].montoEfectivo, efectivoNeto);
  assert.equal(cobrado.pedido.partidas[0].montoTarjeta, Number(montoTarjeta));
  assert.equal(original.partidas[0].pagado, false);
  cajaMixta = cobrado.caja; pedidosMixtos.push(cobrado.pedido);
}
pedidosMixtos.push(orders.nuevoPedido([pos.crearExtra('Sin pagar', '900')], '', 30, apertura));
cajaMixta = cash.registrarGasto(cajaMixta, '20.10', 'Hielo', cobro2);
const resumenMixto = cash.resumirCaja(cajaMixta, pedidosMixtos);
assert.equal(resumenMixto.ventasEfectivoCentavos, 75000);
assert.equal(resumenMixto.ventasTarjetaCentavos, 65000);
assert.equal(resumenMixto.totalVentasCentavos, 140000);
assert.equal(resumenMixto.efectivoEsperadoCentavos, 83015);
assert.equal(cash.validarVinculos(pedidosMixtos, cajaMixta, []), true);
const corteMixto = cash.cerrarCaja(cajaMixta, cierre, pedidosMixtos).corte;
assert.equal(corteMixto.ventasEfectivoCentavos, 75000);
assert.equal(corteMixto.ventasTarjetaCentavos, 65000);
assert.equal(cash.validarVinculos(pedidosMixtos, cash.cajaVacia(), [corteMixto]), true);
// Un pedido puede completarse en otro turno; cada corte conserva sólo lo cobrado en él.
let pedidoDosTurnos = orders.nuevoPedido([pos.crearExtra('Primer producto', '100'), pos.crearExtra('Segundo producto', '250')], '', 31, apertura);
let primerTurno = cash.abrirCaja(cash.cajaVacia(), '0', apertura);
let parcial = cash.cobrarPartidas(pedidoDosTurnos, pedidoDosTurnos.partidas[0].id, primerTurno,
  { efectivoRecibido: '50', montoTarjeta: '50' }, cobro1);
pedidoDosTurnos = parcial.pedido; primerTurno = parcial.caja;
assert.equal(pedidoDosTurnos.estado, 'ABIERTO');
assert.equal(cash.resumirCaja(primerTurno, [pedidoDosTurnos]).ventasEfectivoCentavos, 5000);
const cierrePrimerTurno = cash.cerrarCaja(primerTurno, cierre, [pedidoDosTurnos]);
let segundoTurno = cash.abrirCaja(cierrePrimerTurno.caja, '100', '2026-10-07T13:00:00Z');
parcial = cash.cobrarPartidas(pedidoDosTurnos, 'todos', segundoTurno,
  { efectivoRecibido: '200', montoTarjeta: '100' }, '2026-10-07T14:00:00Z');
pedidoDosTurnos = parcial.pedido; segundoTurno = parcial.caja;
assert.equal(parcial.cambioCentavos, 5000);
assert.equal(pedidoDosTurnos.estado, 'PAGADO');
assert.equal(pedidoDosTurnos.montoEfectivo, 200);
assert.equal(pedidoDosTurnos.montoTarjeta, 150);
const resumenSegundoTurno = cash.resumirCaja(segundoTurno, [pedidoDosTurnos]);
assert.equal(resumenSegundoTurno.ventasEfectivoCentavos, 15000);
assert.equal(resumenSegundoTurno.ventasTarjetaCentavos, 10000);
assert.equal(resumenSegundoTurno.totalVentasCentavos, 25000);
assert.equal(resumenSegundoTurno.efectivoEsperadoCentavos, 25000);
assert.equal(cash.validarVinculos([pedidoDosTurnos], segundoTurno, [cierrePrimerTurno.corte]), true);
const cierreSegundoTurno = cash.cerrarCaja(segundoTurno, '2026-10-07T20:00:00Z', [pedidoDosTurnos]);
assert.equal(cash.validarVinculos([pedidoDosTurnos], cierreSegundoTurno.caja, [cierrePrimerTurno.corte, cierreSegundoTurno.corte]), true);
// Las partidas sin precio no crean ingresos ni cambio ficticios.
const cortesía = { ...pos.crearExtra('Cortesía', '1'), precioUnitarioCentavos: 0, precioUnitario: 0, precioBase: 0 };
const pagoCortesia = cash.cobrarPartidas(orders.nuevoPedido([cortesía], '', 32, apertura), 'todos',
  cash.abrirCaja(cash.cajaVacia(), '0', apertura), { efectivoRecibido: '0', montoTarjeta: '0' }, cobro1);
assert.equal(pagoCortesia.pedido.estado, 'PAGADO');
assert.equal(pagoCortesia.montoCentavos, 0);
assert.equal(pagoCortesia.cambioCentavos, 0);
assert.equal(cash.validarVinculos([pagoCortesia.pedido], pagoCortesia.caja, []), true);
// El importe cobrado en tarjeta nunca permite sacar ese dinero como efectivo.
let soloTarjeta = cash.abrirCaja(cash.cajaVacia(), '0', apertura);
const ticketTarjeta = orders.nuevoPedido([coffee], '', 3, apertura);
soloTarjeta = cash.cobrarPartidas(ticketTarjeta, 'todos', soloTarjeta, 'tarjeta', cobro1).caja;
assert.throws(() => cash.registrarGasto(soloTarjeta, '0.01', 'Hielo', cobro2), /excede/);

// Persistencia real: pago + caja y cierre + corte se escriben como un único expediente.
const data = new Map();
let failWrite = false;
context.localStorage = {
  getItem: key => data.get(key) ?? null,
  setItem: (key, value) => {
    if (failWrite) throw new Error('QuotaExceededError');
    data.set(key, value);
  }
};
for (const file of ['history.js', 'storage.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), context);
}
const storage = context.AmorStorage;
let expediente = storage.vacio();
expediente.pedidos = [orders.nuevoPedido([food, coffee], 'Persistencia', 10, apertura)];
expediente.caja = cash.abrirCaja(expediente.caja, '100', apertura);
expediente = storage.guardarExpediente(expediente);
const stale = clone(expediente);
const antesDelPago = data.get(storage.KEY);
let siguienteExpediente = clone(expediente);
const cobroPersistente = cash.cobrarPartidas(siguienteExpediente.pedidos[0], 'todos', siguienteExpediente.caja, { efectivoRecibido: '500', montoTarjeta: '150' }, cobro1);
siguienteExpediente.pedidos[0] = cobroPersistente.pedido;
siguienteExpediente.caja = cobroPersistente.caja;
failWrite = true;
assert.throws(() => storage.guardarExpediente(siguienteExpediente), /QuotaExceeded/);
assert.equal(data.get(storage.KEY), antesDelPago);
assert.equal(storage.cargarExpediente().pedidos[0].partidas[0].pagado, false);
assert.equal(storage.cargarExpediente().caja.pagos.length, 0);
assert.equal(expediente.revision, 1);
failWrite = false;
expediente = storage.guardarExpediente(siguienteExpediente);
assert.equal(storage.cargarExpediente().pedidos[0].montoEfectivo, 410);
assert.equal(storage.cargarExpediente().pedidos[0].montoTarjeta, 150);
assert.equal(storage.cargarExpediente().pedidos[0].partidas[0].metodoPago, undefined);
assert.equal(storage.cargarExpediente().caja.pagos.length, 1);
const afterPaid = storage.cargarExpediente();
assert.equal(afterPaid.caja.pagos[0].montoEfectivoCentavos, 41000);
assert.equal(afterPaid.caja.pagos[0].montoTarjetaCentavos, 15000);
assert.equal(afterPaid.caja.pagos[0].importeCentavos, 56000);
const antesDelCorte = data.get(storage.KEY);
siguienteExpediente = clone(expediente);
const cortePersistente = cash.cerrarCaja(siguienteExpediente.caja, cierre);
siguienteExpediente.caja = cortePersistente.caja;
siguienteExpediente.historialCortes.push(cortePersistente.corte);
failWrite = true;
assert.throws(() => storage.guardarExpediente(siguienteExpediente), /QuotaExceeded/);
assert.equal(data.get(storage.KEY), antesDelCorte);
assert.equal(storage.cargarExpediente().caja.abierta, true);
assert.equal(storage.cargarExpediente().historialCortes.length, 0);
failWrite = false;
expediente = storage.guardarExpediente(siguienteExpediente);
const recargado = storage.cargarExpediente();
assert.equal(recargado.caja.abierta, false);
assert.equal(recargado.caja.fondoInicialCentavos, 0);
assert.equal(recargado.historialCortes[0].totalVentasCentavos, 56000);
assert.equal(recargado.historialCortes[0].efectivoEsperadoCentavos, 51000);
assert.equal(recargado.historialCortes[0].ventasEfectivoCentavos, 41000);
assert.equal(recargado.historialCortes[0].ventasTarjetaCentavos, 15000);
assert.equal(recargado.pedidos[0].partidas[0].pagado, true);
const despuesDelCorte = data.get(storage.KEY);
assert.throws(() => storage.guardarExpediente(stale), /otra pestaña/);
assert.equal(data.get(storage.KEY), despuesDelCorte);
const legacyState = storage.vacio();
legacyState.pedidos = [legacy];
delete legacyState.caja;
delete legacyState.historialCortes;
const migrated = storage.normalizar(legacyState);
assert.equal(migrated.pedidos[0].partidas[0].pagado, true);
assert.equal(migrated.caja.abierta, false);
assert.equal(cash.resumirCaja(migrated.caja).totalVentasCentavos, 0);
const corteManipulado = clone(recargado);
corteManipulado.historialCortes[0].pagos[0].importeCentavos++;
assert.throws(() => storage.normalizar(corteManipulado), /inconsistentes|importe/i);
const agregadoManipulado = clone(recargado);
agregadoManipulado.pedidos[0].montoEfectivo -= 0.01;
agregadoManipulado.pedidos[0].montoTarjeta += 0.01;
assert.throws(() => storage.normalizar(agregadoManipulado), /montos del pedido/i);
const desgloseIncompleto = clone(recargado);
delete desgloseIncompleto.pedidos[0].partidas[0].montoTarjeta;
assert.throws(() => storage.normalizar(desgloseIncompleto), /incompleto/i);

// Los pagos antiguos por método se migran en la lectura sin volver a cobrarlos.
const antiguo = storage.vacio();
antiguo.caja = clone(caja);
antiguo.pedidos = [clone(pedido)];
delete antiguo.pedidos[0].montoEfectivo; delete antiguo.pedidos[0].montoTarjeta;
for (const partida of antiguo.pedidos[0].partidas) {
  partida.metodoPago = partida.montoTarjeta ? 'tarjeta' : 'efectivo';
  delete partida.montoEfectivo; delete partida.montoTarjeta;
}
for (const pago of antiguo.caja.pagos) {
  pago.metodo = pago.montoTarjetaCentavos ? 'tarjeta' : 'efectivo';
  delete pago.montoEfectivoCentavos; delete pago.montoTarjetaCentavos;
}
const anteriorMigrado = storage.normalizar(antiguo);
assert.equal(anteriorMigrado.pedidos[0].montoEfectivo, 460);
assert.equal(anteriorMigrado.pedidos[0].montoTarjeta, 100);
assert.equal(anteriorMigrado.pedidos[0].partidas[0].metodoPago, undefined);
assert.equal(anteriorMigrado.caja.pagos[0].metodo, undefined);
assert.equal(anteriorMigrado.caja.pagos[0].montoEfectivoCentavos, 46000);
assert.equal(anteriorMigrado.caja.pagos[1].montoTarjetaCentavos, 10000);
assert.equal(cash.validarVinculos(anteriorMigrado.pedidos, anteriorMigrado.caja, []), true);
assert.deepEqual(clone(cash.resumirCaja(anteriorMigrado.caja, anteriorMigrado.pedidos)), clone(resumen));
const historicoAnterior = clone(antiguo);
historicoAnterior.caja = cash.cajaVacia();
historicoAnterior.historialCortes = [clone(corte)];
for (const pago of historicoAnterior.historialCortes[0].pagos) {
  pago.metodo = pago.montoTarjetaCentavos ? 'tarjeta' : 'efectivo';
  delete pago.montoEfectivoCentavos; delete pago.montoTarjetaCentavos;
}
const historicoMigrado = storage.normalizar(historicoAnterior);
assert.equal(historicoMigrado.historialCortes[0].ventasEfectivoCentavos, 46000);
assert.equal(historicoMigrado.historialCortes[0].ventasTarjetaCentavos, 10000);
assert.equal(historicoMigrado.historialCortes[0].pagos[0].montoEfectivoCentavos, 46000);
assert.equal(historicoMigrado.historialCortes[0].pagos[0].metodo, undefined);
assert.equal(cash.validarVinculos(historicoMigrado.pedidos, historicoMigrado.caja, historicoMigrado.historialCortes), true);
assert.equal(migrated.pedidos[0].montoEfectivo, undefined);
assert.equal(migrated.pedidos[0].montoTarjeta, undefined);
console.log('✓ Pagos mixtos, cambio neto, corte por montos, migración, vínculos y persistencia atómica con cuota/revisiones verificados.');
