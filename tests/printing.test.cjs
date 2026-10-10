const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

// El mock cubre el contrato DOM y los eventos del diálogo. El ancho térmico y
// las reglas CSS se comprueban por separado en las pruebas de navegador.
function entorno() {
  class Elemento {
    constructor(etiqueta) {
      this.tagName = etiqueta;
      this.children = [];
      this.dataset = {};
      this.className = '';
      this.parentElement = null;
      this._texto = '';
      const clases = new Set();
      this.classList = {
        add: clase => clases.add(clase),
        remove: clase => clases.delete(clase),
        contains: clase => clases.has(clase)
      };
    }
    set textContent(texto) { this._texto = String(texto); this.children = []; }
    get textContent() { return this._texto + this.children.map(hijo => hijo.textContent).join(''); }
    set innerHTML(_) { throw new Error('Las comandas deben usar textContent para datos del pedido.'); }
    append(...hijos) { hijos.forEach(hijo => { hijo.parentElement = this; this.children.push(hijo); }); }
    replaceChildren(...hijos) { this.children = []; this._texto = ''; this.append(...hijos); }
  }
  const body = new Elemento('body');
  const zona = new Elemento('div');
  body.append(zona);
  const listeners = new Map();
  const frames = new Map();
  const mediaListeners = new Set();
  let siguienteFrame = 1;
  const capturas = [];
  let errorImpresora = false;
  const window = {
    addEventListener(nombre, fn) {
      if (!listeners.has(nombre)) listeners.set(nombre, new Set());
      listeners.get(nombre).add(fn);
    },
    removeEventListener(nombre, fn) { listeners.get(nombre)?.delete(fn); },
    requestAnimationFrame(fn) { const id = siguienteFrame++; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    matchMedia() {
      return {
        addEventListener(nombre, fn) { assert.equal(nombre, 'change'); mediaListeners.add(fn); },
        removeEventListener(nombre, fn) { assert.equal(nombre, 'change'); mediaListeners.delete(fn); }
      };
    },
    print() {
      if (errorImpresora) throw new Error('Impresora no disponible');
      capturas.push({ texto: zona.textContent, areas: zona.children.map(ticket => ticket.dataset.area) });
    }
  };
  const document = { body, getElementById: id => id === 'zona-impresion' ? zona : null, createElement: etiqueta => new Elemento(etiqueta) };
  const context = vm.createContext({ window, document, Intl });
  for (const file of ['menuData.js', 'orderCore.js', 'orders.js', 'cash.js', 'printing.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), context, { filename: file });
  }
  return {
    ...context, zona, capturas,
    lanzarFrame() {
      const pendientes = [...frames.values()];
      frames.clear();
      pendientes.forEach(fn => fn());
    },
    afterprint() { [...(listeners.get('afterprint') || [])].forEach(fn => fn()); },
    cambiarMedio(matches) { [...mediaListeners].forEach(fn => fn({ matches })); },
    fallarImpresora(valor) { errorImpresora = valor; },
    listenersActivos() { return [...listeners.values()].reduce((suma, grupo) => suma + grupo.size, 0) + mediaListeners.size; }
  };
}

const simple = (nombre, macroCategoria, cantidad = 1) => ({ nombre, macroCategoria, cantidad, selecciones: [], opciones: {}, nota: '' });
const pedido = partidas => ({ numero: 42, creadoEn: '2026-10-06T15:05:00Z', etiqueta: 'Mesa 3', partidas });
const copia = valor => JSON.parse(JSON.stringify(valor));
async function imprimir(entorno, ticket) {
  const promesa = entorno.imprimirComandas(ticket);
  while (entorno.zona.children.length) {
    entorno.lanzarFrame();
    entorno.afterprint();
  }
  return promesa;
}

test('separa todas las macrocategorías sin modificar el pedido ni perder paquetes/extras', () => {
  const app = entorno();
  const ticket = pedido([
    simple('Latte', 'Bebidas'), simple('Pan', 'Entradas'), simple('Huevos', 'Alimentos'),
    simple('Pastel', 'Postres'), simple('Desayuno', 'Paquetes'),
    { ...simple('Cargo personalizado', null), tipo: 'extra' }, simple('Especial', 'Sin clasificar')
  ]);
  const antes = JSON.stringify(ticket);
  const { comandaBebidas, comandaAlimentos } = app.AmorPrinting.separarComandas(ticket);
  assert.deepEqual(copia(comandaBebidas.map(item => item.nombre)), ['Latte']);
  assert.deepEqual(copia(comandaAlimentos.map(item => item.nombre)), ['Pan', 'Huevos', 'Pastel', 'Desayuno', 'Cargo personalizado', 'Especial']);
  assert.match(comandaAlimentos[3].avisoComanda, /Coordinar sus bebidas con Barra/);
  assert.match(comandaAlimentos[4].avisoComanda, /Extra personalizado sin área/);
  assert.match(comandaAlimentos[5].avisoComanda, /Categoría sin área/);
  assert.equal(JSON.stringify(ticket), antes);
});

test('solo genera el área que tiene productos y rechaza pedidos vacíos', async () => {
  const app = entorno();
  let resumen = await imprimir(app, pedido([simple('Café', 'Bebidas')]));
  assert.deepEqual(copia(resumen.areas), ['BARRA']);
  assert.deepEqual(app.capturas[0].areas, ['BARRA']);
  resumen = await imprimir(app, pedido([simple('Pan', 'Entradas')]));
  assert.deepEqual(copia(resumen.areas), ['COCINA']);
  assert.deepEqual(app.capturas[1].areas, ['COCINA']);
  await assert.rejects(app.imprimirComandas(pedido([])), /contener productos/);
  assert.equal(app.capturas.length, 2);
});

test('dos trabajos independientes conservan la instantánea y el bloqueo entre áreas', async () => {
  const app = entorno();
  app.document.title = 'POS';
  const ticket = pedido([simple('Pan', 'Alimentos'), simple('Latte', 'Bebidas')]);
  const job = app.imprimirComandas(ticket);
  app.lanzarFrame();
  assert.deepEqual(app.capturas[0].areas, ['COCINA']);
  assert.equal(app.document.title, 'Pedido-42-COCINA');
  ticket.partidas[1].nombre = 'Cambio posterior';
  app.afterprint();
  await assert.rejects(app.imprimirCuenta(ticket), /en curso/);
  app.afterprint(); // Un evento duplicado antes del siguiente print no omite Barra.
  app.lanzarFrame();
  assert.deepEqual(app.capturas[1].areas, ['BARRA']);
  assert.match(app.capturas[1].texto, /Latte/);
  assert.doesNotMatch(app.capturas[1].texto, /Pan|Cambio posterior/);
  assert.equal(app.document.title, 'Pedido-42-BARRA');
  app.afterprint();
  assert.deepEqual(copia((await job).areas), ['COCINA', 'BARRA']);
  assert.equal(app.document.title, 'POS');
});

test('reimpresiones por área omiten áreas vacías y no alteran los productos', async () => {
  const app = entorno();
  const ticket = pedido([simple('Pan', 'Alimentos'), simple('Latte', 'Bebidas')]);
  const original = JSON.stringify(ticket);
  for (const [fn, area] of [['imprimirComandaCocina', 'COCINA'], ['imprimirComandaBarra', 'BARRA']]) {
    const job = app[fn](ticket);
    app.lanzarFrame(); app.afterprint(); await job;
    assert.deepEqual(app.capturas.at(-1).areas, [area]);
  }
  const vacia = await app.imprimirComandaBarra(pedido([simple('Pan', 'Entradas')]));
  assert.deepEqual(copia(vacia.areas), []);
  assert.equal(app.capturas.length, 2);
  assert.equal(JSON.stringify(ticket), original);
});

test('imprime selecciones reales, opciones de texto, notas seguras y fecha/hora de Mérida', async () => {
  const app = entorno();
  const food = app.AmorPOS.crearPartida('chilaquiles-con-pollo-o-huevo', { salsa: 'roja', proteina: 'pollo', extras: ['huevo'] });
  const waffle = app.AmorPOS.crearPartida('waffle-clasico', { untable: 'Nutella' });
  const coffee = app.AmorPOS.crearPartida('cafe-americano', { extras: ['leche-deslactosada', 'shot-de-espresso'] });
  food.cantidad = 2;
  food.nota = '<img src=x onerror=alert(1)> Sin cebolla';
  const ticket = pedido([food, waffle, coffee]);
  ticket.etiqueta = '<svg onload=alert(2)>Mesa 3';
  await imprimir(app, ticket);
  const texto = app.capturas.map(captura => captura.texto).join('');
  assert.deepEqual(app.capturas.map(captura => captura.areas), [['COCINA'], ['BARRA']]);
  assert.match(texto, /Pedido #42/);
  assert.match(texto, /2 x Chilaquiles/);
  assert.match(texto, /Salsa: Roja/);
  assert.match(texto, /Proteína: Pollo/);
  assert.match(texto, /Extras: Huevo/);
  assert.match(texto, /Untable: Nutella/);
  assert.match(texto, /Leche deslactosada, Shot de espresso/);
  assert.match(texto, /Nota: <img src=x onerror=alert\(1\)> Sin cebolla/);
  assert.match(texto, /<svg onload=alert\(2\)>Mesa 3/);
  assert.match(texto, /06\/10\/2026.*09:05/);
});

test('conserva las opciones de pedidos antiguos y deja visibles los avisos de paquetes y extras', async () => {
  const app = entorno();
  await imprimir(app, pedido([
    { ...simple('Pedido antiguo', 'Alimentos'), opciones: { salsa: 'verde', extras: ['pollo', 'huevo'] }, nota: 'Sin sal' },
    simple('Desayuno', 'Paquetes'), { ...simple('Cargo', null), tipo: 'extra' }
  ]));
  assert.match(app.capturas[0].texto, /salsa: verde/);
  assert.match(app.capturas[0].texto, /extras: pollo, huevo/);
  assert.match(app.capturas[0].texto, /Nota: Sin sal/);
  assert.match(app.capturas[0].texto, /Coordinar sus bebidas con Barra/);
  assert.match(app.capturas[0].texto, /Extra personalizado sin área/);
});

test('la impresión usa una instantánea y mantiene el ticket hasta afterprint', async () => {
  const app = entorno();
  const ticket = pedido([simple('Latte', 'Bebidas', 2)]);
  const promesa = app.imprimirComandas(ticket);
  assert.equal(app.capturas.length, 0); // Todavía no se invoca print: el frame queda pendiente.
  assert.equal(app.zona.children.length, 1);
  assert.equal(app.document.body.classList.contains('imprimiendo-comandas'), true);
  app.afterprint(); // Un evento ajeno antes de invocar print no debe borrar la comanda.
  assert.equal(app.zona.children.length, 1);
  ticket.partidas[0].nombre = 'Cambio posterior';
  ticket.partidas[0].cantidad = 9;
  app.lanzarFrame();
  assert.match(app.capturas[0].texto, /2 x Latte/);
  assert.doesNotMatch(app.capturas[0].texto, /Cambio posterior/);
  assert.equal(app.zona.children.length, 1);
  app.afterprint();
  const resumen = await promesa;
  assert.equal(resumen.numero, 42);
  assert.equal(app.zona.children.length, 0);
  assert.equal(app.document.body.classList.contains('imprimiendo-comandas'), false);
  assert.equal(app.listenersActivos(), 0);
});

test('rechaza impresiones concurrentes y permite reimprimir tras cerrar el diálogo', async () => {
  const app = entorno();
  const ticket = pedido([simple('Pan', 'Entradas')]);
  const primera = app.imprimirComandas(ticket);
  await assert.rejects(app.imprimirComandas(ticket), /en curso/);
  await assert.rejects(app.imprimirComandas({ ...ticket, numero: 43 }), /en curso/);
  app.lanzarFrame();
  app.afterprint();
  await primera;
  await imprimir(app, ticket);
  assert.equal(app.capturas.length, 2);
  assert.equal(app.zona.children.length, 0);
});

test('limpia y libera la impresión ante errores y permite el reintento', async () => {
  const app = entorno();
  const ticket = pedido([simple('Café', 'Bebidas')]);
  app.fallarImpresora(true);
  const fallida = app.imprimirComandas(ticket);
  app.lanzarFrame();
  await assert.rejects(fallida, /Impresora no disponible/);
  assert.equal(app.zona.children.length, 0);
  assert.equal(app.document.body.classList.contains('imprimiendo-comandas'), false);
  assert.equal(app.listenersActivos(), 0);
  app.fallarImpresora(false);
  await imprimir(app, ticket);
  assert.equal(app.capturas.length, 1);
  await assert.rejects(app.imprimirComandas({ ...ticket, creadoEn: 'inválida' }), /fecha/);
  await assert.rejects(app.imprimirComandas({ ...ticket, numero: 0 }), /número/);
  await assert.rejects(app.imprimirComandas(pedido([simple('Café', 'Bebidas', 0)])), /cantidad/);
  assert.equal(app.zona.children.length, 0);
});

test('usa la salida del medio print como respaldo de afterprint', async () => {
  const app = entorno();
  const promesa = app.imprimirComandas(pedido([simple('Pan', 'Entradas')]));
  app.lanzarFrame();
  app.cambiarMedio(false); // No limpiar sin haber entrado en impresión.
  assert.equal(app.zona.children.length, 1);
  app.cambiarMedio(true);
  app.cambiarMedio(false);
  await promesa;
  assert.equal(app.zona.children.length, 0);
  assert.equal(app.listenersActivos(), 0);
});

test('cuenta detallada: subtotal, total y métodos ingresados sin abonos ni saldo', async () => {
  const app = entorno();
  const food = { ...app.AmorPOS.crearPartida('chilaquiles-con-pollo-o-huevo', { salsa: 'roja', proteina: 'pollo', extras: ['huevo', 'pollo'] }, '<b>Sin cebolla</b>'), cantidad: 2 };
  const coffee = app.AmorPOS.crearPartida('cafe-americano', { extras: ['leche-deslactosada', 'shot-de-espresso'] });
  let ticket = app.AmorOrders.nuevoPedido([food, coffee], 'Mesa 3 · Ana', 42);
  ticket = app.AmorOrders.marcarPartida(ticket, ticket.partidas[0].id, 'pagado');
  ticket.partidas[0].montoEfectivo = 300;
  ticket.partidas[0].montoTarjeta = 160;
  const before = JSON.stringify(ticket);
  const job = app.imprimirCuenta(ticket);
  await assert.rejects(app.imprimirComandas(ticket), /en curso/);
  app.lanzarFrame();
  assert.deepEqual(app.capturas[0].areas, ['CUENTA']);
  const text = app.capturas[0].texto;
  assert.match(text, /Mesa 3 · Ana/);
  assert.match(text, /2 x Chilaquiles/);
  assert.match(text, /\$230\.00 c\/u\$460\.00/);
  assert.match(text, /\$100\.00 c\/u\$100\.00/);
  assert.match(text, /Subtotal\$560\.00TOTAL A PAGAR\$560\.00/);
  assert.match(text, /Efectivo\$300\.00.*Tarjeta\/Transferencia\$160\.00/);
  assert.doesNotMatch(text, /Abonado|Pendiente de pago/);
  assert.match(text, /Nota: <b>Sin cebolla<\/b>/);
  assert.equal(JSON.stringify(ticket), before);
  app.afterprint(); await job;
  assert.equal(app.zona.children.length, 0);
  const invalid = { ...ticket, totalCentavos: 1 };
  await assert.rejects(app.imprimirCuenta(invalid), /total/);
  ticket = app.AmorOrders.marcarPartida(ticket, 'todos', 'pagado');
  const settled = app.imprimirCuenta(ticket);
  app.lanzarFrame(); app.afterprint(); await settled;
  assert.doesNotMatch(app.capturas[1].texto, /Abonado|Pendiente de pago/);
  assert.match(app.capturas[1].texto, /pagos anteriores sin método/);
});

function corteGuardado(app, config = { tipo: 'igual', personas: 3 }) {
  let caja = app.AmorCash.abrirCaja(undefined, '350', '2026-10-06T15:05:00Z');
  const ticket = app.AmorOrders.nuevoPedido([app.AmorPOS.crearPartida('cafe-americano')], 'Mesa 3', 1);
  caja = app.AmorCash.cobrarPartidas(ticket, 'todos', caja,
    { efectivoRecibido: '20', montoTarjeta: '45' }, '2026-10-06T15:10:00Z').caja;
  caja = app.AmorCash.registrarGasto(caja, '15', '<img src=x onerror=alert(1)> Insumos', '2026-10-06T15:15:00Z');
  caja = app.AmorCash.registrarPropina(caja, '100.01', 'efectivo', '2026-10-06T15:20:00Z');
  caja = app.AmorCash.registrarPropina(caja, '50', 'tarjeta', '2026-10-06T15:25:00Z');
  caja = app.AmorCash.configurarRepartoPropinas(caja, config);
  return app.AmorCash.cerrarCaja(caja, '2026-10-06T20:30:00Z').corte;
}

test('corte térmico imprime un ticket con ventas, gastos, propinas y reparto exacto de una instantánea', async () => {
  const app = entorno();
  const corte = corteGuardado(app);
  const original = JSON.stringify(corte);
  const job = app.imprimirCorte(corte);
  assert.equal(app.zona.children.length, 1);
  assert.equal(JSON.stringify(corte), original);
  corte.gastosDelDia[0].concepto = 'Cambio posterior';
  corte.repartoPropinas.personas = 50;
  app.afterprint();
  assert.equal(app.zona.children.length, 1);
  app.lanzarFrame();
  const { texto, areas } = app.capturas[0];
  assert.deepEqual(areas, ['CORTE']);
  assert.match(texto, /AMOR & AMORCORTE DE CAJA/);
  assert.match(texto, /Apertura: 06\/10\/2026.*09:05/);
  assert.match(texto, /Cierre: 06\/10\/2026.*14:30/);
  assert.match(texto, /Fondo inicial\$350\.00/);
  assert.match(texto, /Ventas en efectivo\$20\.00/);
  assert.match(texto, /Gastos extra\$15\.00/);
  assert.match(texto, /Propinas en efectivo\$100\.01/);
  assert.match(texto, /Efectivo esperado\$455\.01/);
  assert.match(texto, /Ventas en tarjeta\/transferencia\$45\.00/);
  assert.match(texto, /Propinas en tarjeta\/transferencia\$50\.00/);
  assert.match(texto, /TOTAL VENTAS\$65\.00TOTAL PROPINAS\$150\.01/);
  assert.match(texto, /<img src=x onerror=alert\(1\)> Insumos\$15\.00/);
  assert.match(texto, /Partes iguales entre 3 personas/);
  assert.match(texto, /Persona 1\$50\.01Persona 2\$50\.00Persona 3\$50\.00/);
  assert.doesNotMatch(texto, /Cambio posterior/);
  assert.equal(app.zona.children.length, 1);
  app.afterprint();
  const resultado = await job;
  assert.equal(resultado.id, corte.id);
  assert.deepEqual(copia(resultado.areas), ['CORTE']);
  assert.equal(app.zona.children.length, 0);
  assert.equal(app.listenersActivos(), 0);
});

test('corte térmico conserva nombres seguros y porcentajes y admite cortes antiguos sin propinas', async () => {
  const app = entorno();
  const corte = corteGuardado(app, { tipo: 'porcentaje', personas: [
    { nombre: '<svg onload=alert(2)> Ana', porcentaje: 70 }, { nombre: 'Luis', porcentaje: 30 }
  ] });
  const job = app.imprimirCorte(corte);
  app.lanzarFrame(); app.afterprint(); await job;
  assert.match(app.capturas[0].texto, /Por porcentaje entre 2 personas/);
  assert.match(app.capturas[0].texto, /<svg onload=alert\(2\)> Ana \(70%\)\$105\.01Luis \(30%\)\$45\.00/);

  // Cortes de versiones anteriores guardaban únicamente ventas y gastos.
  const antiguo = {
    id: 'turno-antiguo', turnoId: 'turno-antiguo', abiertoEn: '2026-10-06T15:05:00Z', cerradoEn: '2026-10-06T20:30:00Z',
    fondoInicialCentavos: 35000, ventasEfectivoCentavos: 0, gastosExtrasCentavos: 0,
    efectivoEsperadoCentavos: 35000, ventasTarjetaCentavos: 0, totalVentasCentavos: 0,
    gastosDelDia: [], pagos: []
  };
  const anterior = app.imprimirCorte(antiguo);
  app.lanzarFrame(); app.afterprint(); await anterior;
  assert.match(app.capturas[1].texto, /TOTAL PROPINAS\$0\.00/);
  assert.match(app.capturas[1].texto, /Sin gastos registrados/);
  assert.match(app.capturas[1].texto, /Reparto sin configurar/);
});

test('corte usa el bloqueo compartido, rechaza datos abiertos o inconsistentes y libera errores de impresión', async () => {
  const app = entorno();
  const corte = corteGuardado(app);
  const job = app.imprimirCorte(corte);
  await assert.rejects(app.imprimirCorte(corte), /en curso/);
  await assert.rejects(app.imprimirComandas(pedido([simple('Pan', 'Entradas')])), /en curso/);
  app.lanzarFrame();
  app.cambiarMedio(true); app.cambiarMedio(false);
  await job;
  assert.equal(app.zona.children.length, 0);
  await assert.rejects(app.imprimirCorte(app.AmorCash.abrirCaja(undefined, '350')), /Corte de caja inválido/);
  await assert.rejects(app.imprimirCorte({ ...corte, totalVentasCentavos: 1 }), /sumas.*inconsistentes/);
  await assert.rejects(app.imprimirCorte({ ...corte, cerradoEn: '2026-10-06T15:05:00Z' }), /posteriores al cierre/);
  assert.equal(app.capturas.length, 1);
  app.fallarImpresora(true);
  const fallida = app.imprimirCorte(corte);
  app.lanzarFrame();
  await assert.rejects(fallida, /Impresora no disponible/);
  assert.equal(app.zona.children.length, 0);
  assert.equal(app.listenersActivos(), 0);
  app.fallarImpresora(false);
  const reintento = app.imprimirCorte(corte);
  app.lanzarFrame(); app.afterprint(); await reintento;
  assert.equal(app.capturas.length, 2);
});

test('la impresión previa de corte identifica el turno abierto y conserva sus datos', async () => {
  const app = entorno();
  const corte = corteGuardado(app);
  const before = JSON.stringify(corte);
  const job = app.imprimirCorte(corte, { provisional: true });
  app.lanzarFrame(); app.afterprint(); await job;
  assert.match(app.capturas[0].texto, /VISTA PREVIA · Turno abierto/);
  assert.doesNotMatch(app.capturas[0].texto, /Turno cerrado|Cierre:/);
  assert.equal(JSON.stringify(corte), before);
});
