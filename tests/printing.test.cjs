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
  for (const file of ['menuData.js', 'orderCore.js', 'orders.js', 'printing.js']) {
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
  entorno.lanzarFrame();
  entorno.afterprint();
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
  const { texto, areas } = app.capturas[0];
  assert.deepEqual(areas, ['COCINA', 'BARRA']);
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
