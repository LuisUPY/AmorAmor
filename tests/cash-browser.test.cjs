const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

async function main() {
  await fs.mkdir(output, { recursive: true });
  const core = vm.createContext({ Intl });
  for (const file of ['menuData.js', 'orderCore.js', 'orders.js', 'history.js', 'cash.js', 'storage.js']) {
    vm.runInContext(await fs.readFile(path.join(root, 'js', file), 'utf8'), core);
  }
  const seed = core.AmorStorage.vacio();
  const food = { ...core.AmorPOS.crearPartida('chilaquiles-con-pollo-o-huevo', { salsa: 'roja', proteina: 'pollo', extras: ['huevo', 'pollo'] }, 'Sin cebolla'), cantidad: 2 };
  const coffee = core.AmorPOS.crearPartida('cafe-americano', { extras: ['leche-deslactosada', 'shot-de-espresso'] });
  seed.borrador = { etiqueta: 'Mesa 03', partidas: [food, coffee, core.AmorPOS.crearPartida('orden-de-pan-tostado'), core.AmorPOS.crearExtra('Nuevo desayuno', '42.35')] };
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const filename = path.resolve(root, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
      if (!filename.startsWith(root + path.sep)) throw new Error();
      response.setHeader('Content-Type', mime[path.extname(filename)] || 'application/octet-stream');
      response.end(await fs.readFile(filename));
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.on('error', reject); server.listen(0, '127.0.0.1', resolve); });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(({ key, state }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
      window.printedTickets = [];
      window.print = () => {
        const zone = document.getElementById('zona-impresion');
        window.printedTickets.push({ html: zone.innerHTML, text: zone.textContent,
          areas: [...zone.querySelectorAll('.comanda-ticket')].map(ticket => ({ area: ticket.dataset.area, text: ticket.textContent })) });
        if (!window.holdPrint) setTimeout(() => window.dispatchEvent(new Event('afterprint')), 0);
      };
    }, { key: core.AmorStorage.KEY, state: seed });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-10-06T16:00:00Z'));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForSelector('.product-card');
    const snapshot = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), core.AmorStorage.KEY);
    const failWrites = () => page.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = () => { throw new Error('QuotaExceededError'); };
    });
    const restoreWrites = () => page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
    const setPayment = async (cash, card) => {
      await page.locator('#cash-payment-cash').fill(cash);
      await page.locator('#cash-payment-card').fill(card);
    };
    const submitPayment = async (cash, card) => {
      await setPayment(cash, card);
      assert.equal(await page.locator('#cash-payment-confirm').isDisabled(), false);
      await page.locator('#cash-payment-confirm').click();
    };

    // La apertura inicial puede cerrarse para navegar; sigue siendo requisito de cualquier cobro.
    assert.equal(await page.locator('#cash-open-dialog').isVisible(), true);
    assert.equal((await snapshot()).caja.abierta, false);
    await page.locator('#cash-open-dialog [data-close]').click();
    await page.locator('#review-order').click();
    await page.locator('#confirm-order').click();
    await page.waitForFunction(() => window.printedTickets.length === 1);
    const printed = await page.evaluate(() => window.printedTickets[0]);
    assert.match(printed.text, /COCINA/);
    assert.match(printed.text, /BARRA/);
    assert.match(printed.text, /Chilaquiles con pollo o huevo/);
    assert.match(printed.text, /Café americano/);
    assert.match(printed.text, /Sin cebolla/);
    assert.match(printed.text, /Salsa.*Roja/i);
    assert.match(printed.text, /Leche deslactosada/i);
    assert.match(printed.text, /Mesa 03/);
    assert.match(printed.text, /1/);
    assert.deepEqual(printed.areas.map(area => area.area), ['COCINA', 'BARRA']);
    assert.match(printed.areas[0].text, /2\s*[×x]?\s*Chilaquiles con pollo o huevo/);
    assert.match(printed.areas[0].text, /Orden de pan tostado/);
    assert.doesNotMatch(printed.areas[0].text, /Café americano/);
    assert.doesNotMatch(printed.areas[1].text, /Chilaquiles|Orden de pan tostado/);
    assert.match(printed.areas[0].text, /Nuevo desayuno/);
    assert.match(printed.areas[0].text, /Extra personalizado sin área asignada/);
    await page.waitForFunction(() => document.getElementById('zona-impresion').childElementCount === 0);
    assert.equal(await page.locator('#zona-impresion').isVisible(), false);

    // Reimprimir desde un diálogo abierto no debe incluir la capa modal en el papel.
    await page.locator('[data-pedido="pedido-1"]').click();
    await page.evaluate(() => { window.holdPrint = true; });
    await page.locator('#reprint-order').click();
    await page.waitForFunction(() => window.printedTickets.length === 2);
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('#zona-impresion').evaluate(n => getComputedStyle(n).width), '300px');
    assert.equal(await page.locator('#zona-impresion').isVisible(), true);
    assert.equal(await page.locator('main').isVisible(), false);
    assert.equal(await page.locator('#ticket-dialog').evaluate(n => n.open), true);
    assert.equal(await page.locator('#ticket-dialog').isVisible(), false);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await page.emulateMedia({ media: 'screen' });
    await page.waitForFunction(() => document.getElementById('zona-impresion').childElementCount === 0);
    assert.equal(await page.locator('#ticket-dialog').isVisible(), true);

    // Una comanda de bebida no genera Cocina; las notas sin espacios siguen dentro de los 300px.
    await page.evaluate(() => {
      window.drinkOnlyJob = AmorPrinting.imprimirComandas({ numero: 999, creadoEn: '2026-10-06T16:00:00Z',
        etiqueta: 'Prueba de ajuste', partidas: [{ ...AmorPOS.crearPartida('cafe-americano'), nota: 'X'.repeat(200) }] });
    });
    await page.waitForFunction(() => window.printedTickets.length === 3);
    assert.deepEqual(await page.evaluate(() => window.printedTickets[2].areas.map(area => area.area)), ['BARRA']);
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('#zona-impresion').evaluate(n => n.scrollWidth <= n.clientWidth), true);
    assert.equal(await page.locator('#zona-impresion .comanda-modificadores').evaluate(n => n.scrollWidth <= n.clientWidth), true);
    assert.equal(await page.locator('#ticket-dialog').isVisible(), false);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => window.drinkOnlyJob);
    await page.evaluate(() => { window.holdPrint = false; });
    assert.equal(await page.locator('#zona-impresion').isVisible(), false);

    await page.locator('#ticket-lines .ticket-line').first().getByRole('button', { name: 'Cobrar producto', exact: true }).click();
    assert.equal(await page.locator('#cash-open-dialog').isVisible(), true);
    assert.equal((await snapshot()).pedidos[0].partidas.some(p => p.pagado), false);
    await page.locator('#cash-opening-fund').fill('-10');
    await page.locator('#cash-open-form button[type="submit"]').click();
    assert.equal(await page.locator('#cash-open-dialog').isVisible(), true);
    await page.locator('#cash-opening-fund').fill('0');
    const beforeOpenFailure = await snapshot();
    await failWrites();
    await page.locator('#cash-open-form button[type="submit"]').click();
    assert.deepEqual(await snapshot(), beforeOpenFailure);
    assert.equal(await page.locator('#cash-open-dialog').isVisible(), true);
    await restoreWrites();
    await page.locator('#cash-open-form button[type="submit"]').click();
    assert.equal((await snapshot()).caja.abierta, true);
    assert.equal((await snapshot()).caja.fondoInicialCentavos, 0);
    assert.equal(await page.locator('#cash-payment-dialog').isVisible(), true);

    // El pago comienza en cero y la validación reacciona sin enviar el formulario.
    assert.equal(await page.locator('#cash-payment-cash').inputValue(), '0');
    assert.equal(await page.locator('#cash-payment-card').inputValue(), '0');
    assert.equal(await page.locator('#cash-payment-confirm').isDisabled(), true);
    assert.match(await page.locator('#cash-payment-status').textContent(), /Faltan:.*460\.00/);
    await setPayment('200', '150');
    assert.equal(await page.locator('#cash-payment-confirm').isDisabled(), true);
    assert.match(await page.locator('#cash-payment-status').textContent(), /Faltan:.*110\.00/);
    for (const [cash, card] of [['-1', '0'], ['1.001', '0'], ['500', '460.01']]) {
      await setPayment(cash, card);
      assert.equal(await page.locator('#cash-payment-confirm').isDisabled(), true);
    }
    await setPayment('310', '150');
    assert.equal(await page.locator('#cash-payment-status').textContent(), 'Cobro completo');
    assert.equal(await page.locator('#cash-payment-confirm').isDisabled(), false);
    await setPayment('500', '150');
    assert.match(await page.locator('#cash-payment-status').textContent(), /Cambio a entregar:.*190\.00/);
    assert.equal(await page.locator('#cash-payment-confirm').isDisabled(), false);
    await page.screenshot({ path: path.join(output, 'payment-mixed-1440.png') });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.locator('#cash-payment-dialog').evaluate(n => n.scrollWidth <= n.clientWidth), true, `Cobro a ${width}px`);
      assert.equal(await page.locator('#cash-payment-form input').evaluateAll(inputs => inputs.every(input => {
        const bounds = input.getBoundingClientRect();
        const dialog = input.closest('dialog').getBoundingClientRect();
        return bounds.left >= dialog.left && bounds.right <= dialog.right;
      })), true, `Campos de cobro a ${width}px`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Página con cobro a ${width}px`);
    }
    await page.screenshot({ path: path.join(output, 'payment-mixed-320.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await page.locator('#cash-payment-dialog').isVisible(), true);
    assert.equal((await snapshot()).pedidos[0].partidas.some(p => p.pagado), false);
    const beforePaymentFailure = await snapshot();
    await failWrites();
    await page.locator('#cash-payment-confirm').click();
    assert.deepEqual(await snapshot(), beforePaymentFailure);
    assert.equal(await page.locator('#cash-payment-dialog').isVisible(), true);
    await restoreWrites();
    await page.locator('#cash-payment-confirm').click();
    const cashPaid = await snapshot();
    assert.equal(cashPaid.pedidos[0].partidas.filter(p => p.pagado).length, 1);
    assert.equal(cashPaid.caja.pagos.length, 1);
    assert.equal(cashPaid.pedidos[0].montoEfectivo, 310);
    assert.equal(cashPaid.pedidos[0].montoTarjeta, 150);
    assert.equal(cashPaid.pedidos[0].partidas[0].montoEfectivo, 310);
    assert.equal(cashPaid.caja.pagos[0].montoEfectivoCentavos, 31000);
    assert.equal(cashPaid.caja.pagos[0].montoTarjetaCentavos, 15000);
    assert.equal(cashPaid.caja.pagos[0].metodo, undefined);
    assert.match(await page.locator('#ticket-lines .ticket-line').first().textContent(), /Efectivo \$310\.00 · Tarjeta\/Transferencia \$150\.00/);

    await page.locator('#pay-all').click();
    assert.equal(await page.locator('#cash-payment-cash').inputValue(), '0');
    assert.equal(await page.locator('#cash-payment-card').inputValue(), '0');
    assert.equal(await page.locator('#cash-payment-confirm').isDisabled(), true);
    await submitPayment('0', '202.35');
    const fullyPaid = await snapshot();
    assert.equal(fullyPaid.pedidos[0].partidas.every(p => p.pagado), true);
    assert.equal(fullyPaid.pedidos[0].montoEfectivo, 310);
    assert.equal(fullyPaid.pedidos[0].montoTarjeta, 352.35);
    await page.locator('#ticket-dialog [data-close]').click();

    await page.locator('#cash-expense-button').click();
    await page.locator('#cash-expense-amount').fill('25.35');
    await page.locator('#cash-expense-concept').fill('Compra de hielo');
    const beforeExpenseFailure = await snapshot();
    await failWrites();
    await page.locator('#cash-expense-form button[type="submit"]').click();
    assert.deepEqual(await snapshot(), beforeExpenseFailure);
    assert.equal(await page.locator('#cash-expense-dialog').isVisible(), true);
    await restoreWrites();
    await page.locator('#cash-expense-form button[type="submit"]').click();
    assert.equal((await snapshot()).caja.gastosDelDia.length, 1);
    await page.locator('#cash-close-button').click();
    const expected = {
      fondoInicialCentavos: '$0.00', ventasEfectivoCentavos: '$310.00', gastosExtrasCentavos: '$25.35',
      efectivoEsperadoCentavos: '$284.65', ventasTarjetaCentavos: '$352.35', totalVentasCentavos: '$662.35'
    };
    for (const [key, value] of Object.entries(expected)) {
      assert.equal(await page.locator(`#cash-summary [data-value="${key}"]`).textContent(), value, key);
    }
    assert.match(await page.locator('#cash-close-dialog').textContent(), /Compra de hielo/);
    await page.locator('#cash-close-dialog .cash-expenses').evaluate(n => { n.open = true; });
    await page.screenshot({ path: path.join(output, 'cash-1440.png') });
    await page.setViewportSize({ width: 320, height: 844 });
    await page.screenshot({ path: path.join(output, 'cash-320.png') });
    assert.equal(await page.locator('#cash-close-dialog').evaluate(n => n.scrollWidth <= n.clientWidth), true);
    assert.equal(await page.locator('#cash-summary dd').evaluateAll(nodes => nodes.every(node => {
      const range = document.createRange(); range.selectNodeContents(node);
      return range.getClientRects().length === 1;
    })), true, 'Los importes de caja deben permanecer completos en una sola línea a 320px');
    await page.setViewportSize({ width: 1440, height: 1000 });
    const beforeCloseFailure = await snapshot();
    await failWrites();
    await page.locator('#close-shift').click();
    assert.deepEqual(await snapshot(), beforeCloseFailure);
    assert.equal(await page.locator('#cash-close-dialog').isVisible(), true);
    await restoreWrites();
    await page.locator('#close-shift').click();
    const closed = await snapshot();
    assert.equal(closed.caja.abierta, false);
    assert.equal(closed.caja.fondoInicialCentavos, 0);
    assert.equal(closed.caja.pagos.length, 0);
    assert.equal(closed.caja.gastosDelDia.length, 0);
    assert.equal(closed.historialCortes.length, 1);
    assert.equal(closed.historialCortes[0].ventasEfectivoCentavos, 31000);
    assert.equal(closed.historialCortes[0].ventasTarjetaCentavos, 35235);
    assert.equal(closed.historialCortes[0].efectivoEsperadoCentavos, 28465);
    assert.equal(closed.pedidos[0].partidas.every(p => p.pagado), true);
    await page.reload(); await page.waitForSelector('.product-card');
    await page.locator('#cash-open-dialog [data-close]').click();
    assert.equal((await snapshot()).historialCortes.length, 1);
    await page.locator('#cash-history-button').click();
    assert.match(await page.locator('#cash-history-dialog').textContent(), /284\.65/);
    assert.match(await page.locator('#cash-history-dialog').textContent(), /Compra de hielo/);
    await page.locator('#cash-history-dialog [data-close]').click();

    // Reabrir no agrega las ventas ya cerradas al nuevo turno.
    await page.locator('#add-extra').click();
    await page.locator('#extra-concept').fill('Nuevo turno');
    await page.locator('#extra-amount').fill('350');
    await page.locator('#extra-form button[type="submit"]').click();
    await page.locator('#review-order').click();
    await page.locator('#confirm-order').click();
    await page.locator('[data-pedido="pedido-2"]').click();
    await page.locator('#pay-all').click();
    assert.equal(await page.locator('#cash-open-dialog').isVisible(), true);
    await page.locator('#cash-opening-fund').fill('300.10');
    await page.locator('#cash-open-form button[type="submit"]').click();
    await setPayment('500', '0');
    assert.match(await page.locator('#cash-payment-status').textContent(), /Cambio a entregar:.*150\.00/);
    await submitPayment('500', '0');
    const reopened = await snapshot();
    assert.equal(reopened.caja.fondoInicialCentavos, 30010);
    assert.equal(reopened.caja.pagos.length, 1);
    assert.equal(reopened.historialCortes.length, 1);
    assert.equal(reopened.pedidos[1].montoEfectivo, 350);
    assert.equal(reopened.pedidos[1].montoTarjeta, 0);
    assert.equal(reopened.caja.pagos[0].montoEfectivoCentavos, 35000);
    await page.locator('#ticket-dialog [data-close]').click();
    await page.locator('#cash-close-button').click();
    assert.equal(await page.locator('#cash-summary [data-value="efectivoEsperadoCentavos"]').textContent(), '$650.10');

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.locator('#cash-close-dialog').evaluate(n => n.scrollWidth <= n.clientWidth), true, `Corte a ${width}px`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Página a ${width}px`);
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log('✓ Caja: pagos mixtos, cambio neto, validación dinámica, corte e historial; fallos atómicos; comandas y CSS térmico.');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
