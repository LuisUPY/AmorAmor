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
const apertura = '2026-10-08T13:00:00.000Z';
const movimiento = '2026-10-08T14:00:00.000Z';
const cierre = '2026-10-08T20:00:00.000Z';
const nuevaCaja = () => cash.abrirCaja(cash.cajaVacia(), '100', apertura);
const resumenVacio = { totalCentavos: 0, efectivoCentavos: 0, tarjetaCentavos: 0, reparto: [], configurado: false };

assert.deepEqual(clone(cash.resumirPropinas(undefined)), resumenVacio);
assert.deepEqual(clone(cash.resumirPropinas(cash.cajaVacia())), resumenVacio);
assert.throws(() => cash.registrarPropina(cash.cajaVacia(), '1', 'efectivo', movimiento), /Abre/);
assert.throws(() => cash.configurarRepartoPropinas(cash.cajaVacia(), { tipo: 'igual', personas: 2 }), /Abre/);
for (const monto of ['0', '', '-1', '0.001', '1000000', 'NaN']) {
  assert.throws(() => cash.registrarPropina(nuevaCaja(), monto, 'efectivo', movimiento));
}
assert.throws(() => cash.registrarPropina(nuevaCaja(), '1', 'mixto', movimiento), /Selecciona/);
assert.throws(() => cash.registrarPropina(nuevaCaja(), '1', 'efectivo', '2026-10-08T12:59:59Z'), /fecha/);
assert.throws(() => cash.registrarPropina(nuevaCaja(), '1', 'efectivo', 'fecha-invalida'), /fecha/);
// El placeholder vacío de la UI no debe aflojar la validación monetaria del núcleo.
assert.throws(() => cash.montoACentavos('', true));
assert.throws(() => cash.validarPago(100, '', '0'));

let caja = nuevaCaja();
const cajaOriginal = JSON.stringify(caja);
caja = cash.registrarPropina(caja, '50,05', 'efectivo', movimiento);
assert.equal(caja.propinas[0].montoCentavos, 5005);
assert.equal(JSON.parse(cajaOriginal).propinas.length, 0);
const primeraPropina = JSON.stringify(caja);
caja = cash.registrarPropina(caja, '24.99', 'tarjeta', movimiento);
assert.equal(JSON.parse(primeraPropina).propinas.length, 1);
let propinas = cash.resumirPropinas(caja);
assert.equal(propinas.totalCentavos, 7504);
assert.equal(propinas.efectivoCentavos, 5005);
assert.equal(propinas.tarjetaCentavos, 2499);
assert.equal(propinas.configurado, false);
assert.equal(caja.propinas.length, 2);
assert.notEqual(caja.propinas[0].id, caja.propinas[1].id);
const pedido = orders.nuevoPedido([pos.crearExtra('Venta', '20')], 'Mesa 1', 1, apertura);
const cobrado = cash.cobrarPartidas(pedido, 'todos', caja, { efectivoRecibido: '12', montoTarjeta: '8' }, movimiento);
caja = cash.registrarGasto(cobrado.caja, '10', 'Hielo', movimiento);
const resumen = cash.resumirCaja(caja, [cobrado.pedido]);
assert.equal(resumen.totalVentasCentavos, 2000);
assert.equal(resumen.ventasEfectivoCentavos, 1200);
assert.equal(resumen.ventasTarjetaCentavos, 800);
assert.equal(resumen.totalPropinasCentavos, 7504);
assert.equal(resumen.propinasEfectivoCentavos, 5005);
assert.equal(resumen.propinasTarjetaCentavos, 2499);
assert.equal(resumen.efectivoEsperadoCentavos, 15205); // Fondo + venta en efectivo + propina en efectivo - gasto.
assert.equal(cash.validarVinculos([cobrado.pedido], caja, []), true);

// Capturar el total del día agrega solo la diferencia en efectivo y conserva tarjeta.
const antesDelTotal = JSON.stringify(caja);
const completada = cash.completarPropinaDelDia(caja, '100.05', movimiento);
assert.equal(JSON.stringify(caja), antesDelTotal);
assert.equal(completada.propinas.length, caja.propinas.length + 1);
assert.equal(cash.resumirCaja(completada).totalPropinasCentavos, 10005);
assert.equal(cash.resumirCaja(completada).propinasTarjetaCentavos, 2499);
assert.equal(cash.resumirCaja(completada).efectivoEsperadoCentavos, 17706);
assert.deepEqual(clone(cash.completarPropinaDelDia(completada, '100.05', movimiento)), clone(completada));
assert.throws(() => cash.completarPropinaDelDia(caja, '75.03', movimiento), /menor/);
for (const monto of ['', '-1', '0.001', 'NaN']) assert.throws(() => cash.completarPropinaDelDia(caja, monto, movimiento));
assert.equal(cash.completarPropinaDelDia(nuevaCaja(), '0', movimiento).propinas.length, 0);
assert.throws(() => cash.completarPropinaDelDia(cash.cajaVacia(), '0', movimiento), /Abre/);
assert.equal(cash.cerrarCaja(completada, cierre, [cobrado.pedido]).corte.totalPropinasCentavos, 10005);

// Las propinas en tarjeta no pueden financiar un retiro de efectivo.
let sinFondo = cash.abrirCaja(cash.cajaVacia(), '0', apertura);
sinFondo = cash.registrarPropina(sinFondo, '30', 'tarjeta', movimiento);
assert.equal(cash.resumirCaja(sinFondo).efectivoEsperadoCentavos, 0);
assert.throws(() => cash.registrarGasto(sinFondo, '0.01', 'Hielo', movimiento), /excede/);
sinFondo = cash.registrarPropina(sinFondo, '1.01', 'efectivo', movimiento);
assert.equal(cash.registrarGasto(sinFondo, '1.01', 'Hielo', movimiento).gastosDelDia[0].montoCentavos, 101);

// Los centavos residuales se asignan de forma estable y ningún reparto pierde dinero.
let pocosCentavos = cash.registrarPropina(nuevaCaja(), '0.05', 'efectivo', movimiento);
const antesDelReparto = JSON.stringify(pocosCentavos);
pocosCentavos = cash.configurarRepartoPropinas(pocosCentavos, { tipo: 'igual', personas: 3 });
assert.equal(JSON.parse(antesDelReparto).repartoPropinas, null);
assert.deepEqual(clone(cash.resumirPropinas(pocosCentavos).reparto), [
  { nombre: 'Persona 1', montoCentavos: 2 }, { nombre: 'Persona 2', montoCentavos: 2 }, { nombre: 'Persona 3', montoCentavos: 1 }
]);
const configuracion = { tipo: 'porcentaje', personas: [
  { nombre: ' Ana ', porcentaje: 33.33 }, { nombre: 'Luis', porcentaje: 33.33 }, { nombre: 'María', porcentaje: 33.34 }
] };
pocosCentavos = cash.configurarRepartoPropinas(pocosCentavos, configuracion);
assert.equal(configuracion.personas[0].nombre, ' Ana ');
propinas = cash.resumirPropinas(pocosCentavos);
assert.deepEqual(clone(propinas.reparto), [
  { nombre: 'Ana', porcentaje: 33.33, montoCentavos: 2 }, { nombre: 'Luis', porcentaje: 33.33, montoCentavos: 1 },
  { nombre: 'María', porcentaje: 33.34, montoCentavos: 2 }
]);
assert.equal(propinas.configurado, true);
pocosCentavos = cash.configurarRepartoPropinas(pocosCentavos, { tipo: 'porcentaje', personas: [
  { nombre: 'A', porcentaje: 50 }, { nombre: 'B', porcentaje: 50 }
] });
assert.deepEqual(clone(cash.resumirPropinas(pocosCentavos).reparto).map(persona => persona.montoCentavos), [3, 2]);
pocosCentavos = cash.registrarPropina(pocosCentavos, '0.01', 'tarjeta', movimiento);
assert.deepEqual(clone(cash.resumirPropinas(pocosCentavos).reparto).map(persona => persona.montoCentavos), [3, 3]);
assert.equal(cash.resumirPropinas(cash.configurarRepartoPropinas(pocosCentavos, null)).configurado, false);
assert.equal(cash.resumirPropinas(cash.configurarRepartoPropinas(nuevaCaja(), { tipo: 'igual', personas: 50 })).reparto.length, 50);

for (const invalida of [
  undefined, {}, { tipo: 'otro', personas: 2 }, { tipo: 'igual', personas: 0 }, { tipo: 'igual', personas: 51 },
  { tipo: 'igual', personas: 1.5 }, { tipo: 'igual', personas: '2' }, { tipo: 'porcentaje', personas: [] },
  { tipo: 'porcentaje', personas: [{ nombre: 'A', porcentaje: 99.99 }] },
  { tipo: 'porcentaje', personas: [{ nombre: 'A', porcentaje: 101 }, { nombre: 'B', porcentaje: -1 }] },
  { tipo: 'porcentaje', personas: [{ nombre: 'A', porcentaje: 33.333 }, { nombre: 'B', porcentaje: 66.667 }] },
  { tipo: 'porcentaje', personas: [{ nombre: '', porcentaje: 100 }] },
  { tipo: 'porcentaje', personas: [{ nombre: 'A', porcentaje: '100' }] },
  { tipo: 'porcentaje', personas: [{ nombre: 'A', porcentaje: NaN }] },
  { tipo: 'porcentaje', personas: [{ nombre: 'A', porcentaje: Infinity }] },
  { tipo: 'porcentaje', personas: [{ nombre: 'Ana', porcentaje: 50 }, { nombre: ' ANA ', porcentaje: 50 }] },
  { tipo: 'porcentaje', personas: Array.from({ length: 51 }, (_, i) => ({ nombre: `P ${i}`, porcentaje: i ? 0 : 100 })) }
]) assert.throws(() => cash.configurarRepartoPropinas(nuevaCaja(), invalida));
const ceroPorcentaje = cash.configurarRepartoPropinas(pocosCentavos, { tipo: 'porcentaje', personas: [
  { nombre: 'A', porcentaje: 0 }, { nombre: 'B', porcentaje: 100 }
] });
assert.deepEqual(clone(cash.resumirPropinas(ceroPorcentaje).reparto).map(persona => persona.montoCentavos), [0, 6]);

// Un total grande aún conserva exactamente los centavos al multiplicar porcentajes.
const grande = nuevaCaja();
grande.propinas = Array.from({ length: 10001 }, (_, index) => ({ id: `propina-${index}`, montoCentavos: 99999999, metodo: 'efectivo', fecha: movimiento }));
grande.repartoPropinas = { tipo: 'porcentaje', personas: [{ nombre: 'A', porcentaje: 99.99 }, { nombre: 'B', porcentaje: 0.01 }] };
const resumenGrande = cash.resumirPropinas(grande);
assert.equal(resumenGrande.totalCentavos, 1000099989999);
assert.deepEqual(clone(resumenGrande.reparto).map(persona => persona.montoCentavos), [999999980000, 100009999]);
assert.equal(resumenGrande.reparto.reduce((total, persona) => total + persona.montoCentavos, 0), resumenGrande.totalCentavos);

// Las entradas inválidas del expediente se rechazan antes de aceptar la caja.
for (const modificar of [
  raw => { raw.propinas = null; }, raw => { raw.propinas.push({ ...raw.propinas[0] }); },
  raw => { raw.propinas[0].montoCentavos = 0; }, raw => { raw.propinas[0].montoCentavos = 0.5; },
  raw => { raw.propinas[0].montoCentavos = 100000000; }, raw => { raw.propinas[0].metodo = 'mixto'; },
  raw => { raw.propinas[0].fecha = '2026-10-08T12:59:59Z'; }, raw => { raw.propinas[0].id = raw.pagos[0].id; },
  raw => { raw.propinas[0].id = raw.gastosDelDia[0].id; }, raw => { raw.repartoPropinas = undefined; }
]) {
  const invalida = clone(caja); modificar(invalida);
  assert.throws(() => cash.normalizarCaja(invalida));
}
assert.throws(() => cash.normalizarCaja({ ...cash.cajaVacia(), propinas: clone(caja.propinas) }), /cero/);
assert.throws(() => cash.normalizarCaja({ ...cash.cajaVacia(), repartoPropinas: { tipo: 'igual', personas: 2 } }), /cero/);

caja = cash.configurarRepartoPropinas(caja, { tipo: 'igual', personas: 3 });
const antesDeCerrar = JSON.stringify(caja);
const { caja: cerrada, corte } = cash.cerrarCaja(caja, cierre, [cobrado.pedido]);
assert.equal(JSON.stringify(caja), antesDeCerrar);
assert.deepEqual(clone(cash.resumirPropinas(cerrada)), resumenVacio);
assert.equal(corte.totalVentasCentavos, 2000);
assert.equal(corte.totalPropinasCentavos, 7504);
assert.equal(corte.efectivoEsperadoCentavos, 15205);
assert.deepEqual(clone(corte.distribucionPropinas), clone(cash.resumirPropinas(caja).reparto));
assert.deepEqual(clone(cash.resumirPropinas(corte)), clone(cash.resumirPropinas(caja)));
assert.equal(cash.validarVinculos([cobrado.pedido], cerrada, [corte]), true);
assert.throws(() => cash.cerrarCaja(caja, '2026-10-08T13:30:00Z'), /posteriores/);
for (const modificar of [
  raw => { raw.propinas[0].montoCentavos++; }, raw => { raw.totalPropinasCentavos++; },
  raw => { raw.propinasEfectivoCentavos++; }, raw => { raw.propinasTarjetaCentavos++; },
  raw => { delete raw.totalPropinasCentavos; }, raw => { raw.totalPropinasCentavos = null; },
  raw => { raw.propinas[0].fecha = '2026-10-08T20:00:01Z'; },
  raw => { raw.repartoPropinas.personas = 2; }, raw => { raw.distribucionPropinas[0].montoCentavos++; },
  raw => { raw.distribucionPropinas[0].nombre = 'Otra persona'; }, raw => { delete raw.distribucionPropinas; }
]) {
  const invalido = clone(corte); modificar(invalido);
  assert.throws(() => cash.normalizarCorte(invalido));
}
const cortePorcentual = cash.cerrarCaja(pocosCentavos, cierre).corte;
const porcentajeManipulado = clone(cortePorcentual);
porcentajeManipulado.distribucionPropinas[0].porcentaje = 49;
assert.throws(() => cash.normalizarCorte(porcentajeManipulado), /reparto/);

// Migración: los turnos y cortes anteriores a las propinas mantienen sus sumas.
const antiguaCaja = clone(nuevaCaja()); delete antiguaCaja.propinas; delete antiguaCaja.repartoPropinas;
assert.deepEqual(clone(cash.resumirPropinas(antiguaCaja)), resumenVacio);
const corteAnterior = clone(cash.cerrarCaja(nuevaCaja(), cierre).corte);
for (const clave of ['propinas', 'repartoPropinas', 'distribucionPropinas', 'propinasEfectivoCentavos', 'propinasTarjetaCentavos', 'totalPropinasCentavos']) delete corteAnterior[clave];
const migrado = cash.normalizarCorte(corteAnterior);
assert.equal(migrado.efectivoEsperadoCentavos, 10000);
assert.deepEqual(clone(cash.resumirPropinas(migrado)), resumenVacio);
assert.throws(() => cash.normalizarCorte({ ...corteAnterior, efectivoEsperadoCentavos: 10001 }), /inconsistentes/);

// Guardado atómico: las propinas y el reparto sobreviven a recargas, exportaciones y cortes.
const data = new Map(); let falla = false;
context.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => {
  if (falla) throw new Error('QuotaExceededError');
  data.set(key, value);
} };
for (const file of ['history.js', 'storage.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), context);
const storage = context.AmorStorage;
let expediente = storage.vacio();
expediente.caja = caja; expediente.pedidos = [cobrado.pedido];
expediente = storage.guardarExpediente(expediente);
assert.equal(storage.cargarExpediente().caja.propinas.length, 2);
assert.deepEqual(clone(storage.normalizar(clone(expediente)).caja.repartoPropinas), { tipo: 'igual', personas: 3 });
const siguiente = clone(expediente);
siguiente.caja = cash.registrarPropina(siguiente.caja, '10', 'tarjeta', movimiento);
const antes = data.get(storage.KEY);
falla = true;
assert.throws(() => storage.guardarExpediente(siguiente), /Quota/);
assert.equal(data.get(storage.KEY), antes);
assert.equal(storage.cargarExpediente().caja.propinas.length, 2);
falla = false;
expediente.caja = cerrada; expediente.historialCortes.push(corte);
storage.guardarExpediente(expediente);
const recargado = storage.cargarExpediente();
assert.equal(recargado.caja.propinas.length, 0);
assert.equal(recargado.historialCortes[0].totalPropinasCentavos, 7504);
assert.deepEqual(clone(recargado.historialCortes[0].distribucionPropinas), clone(corte.distribucionPropinas));
console.log('✓ Propinas separadas, efectivo esperado, reparto exacto, cortes, migración, integridad y persistencia atómica verificados.');
