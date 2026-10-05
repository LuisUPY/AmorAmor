const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.json': 'application/json' };

async function main() {
  await fs.mkdir(output, { recursive: true });
  const core = vm.createContext({ Intl });
  for (const file of ['menuData.js', 'orderCore.js', 'orders.js', 'history.js', 'storage.js']) {
    vm.runInContext(await fs.readFile(path.join(root, 'js', file), 'utf8'), core);
  }
  let previous = core.AmorOrders.nuevoPedido([{ ...core.AmorPOS.crearPartida('orden-de-papas'), cantidad: 2 }, core.AmorPOS.crearPartida('latte')], 'Día anterior', 1, '2026-10-03T15:00:00Z');
  previous = core.AmorOrders.marcarPartida(previous, 'todos', 'preparado', '2026-10-03T15:05:00Z');
  previous = core.AmorOrders.marcarPartida(previous, 'todos', 'pagado', '2026-10-03T15:10:00Z');
  let previous2 = core.AmorOrders.nuevoPedido([core.AmorPOS.crearPartida('waffle-clasico', { untable: 'Confirmado' }), { ...core.AmorPOS.crearExtra('Extra previo', '28.55'), cantidad: 2 }], 'Otro día', 2, '2026-10-04T15:00:00Z');
  previous2 = core.AmorOrders.marcarPartida(previous2, 'todos', 'preparado', '2026-10-04T15:05:00Z');
  previous2 = core.AmorOrders.marcarPartida(previous2, 'todos', 'pagado', '2026-10-04T15:10:00Z');
  const seeded = { ...core.AmorStorage.vacio(), pedidos: [previous, previous2], siguienteNumero: 3 };
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
    await context.addInitScript(({ key, state }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)); }, { key: core.AmorStorage.KEY, state: seeded });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-10-05T16:00:00Z'));
    const errors = []; let downloads = 0;
    page.on('pageerror', error => errors.push(error.message));
    page.on('download', () => downloads++);
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.goto(url);
    await page.waitForSelector('.product-card');
    assert.equal(await page.getByRole('tab').count(), 5);
    assert.equal(await page.locator('.product-card').count(), 32);
    assert.equal(await page.locator('#open-orders-count').textContent(), '0');
    const macros = await page.evaluate(() => Object.entries(menuDB).map(([nombre, subs]) => ({ nombre, subs: Object.entries(subs).map(([nombre, p]) => ({ nombre, cantidad: p.length })) })));
    for (const macro of macros) {
      await page.getByRole('tab', { name: macro.nombre, exact: true }).click();
      assert.equal(await page.locator('.product-card').count(), macro.subs.reduce((n, sub) => n + sub.cantidad, 0));
      for (const sub of macro.subs) {
        await page.locator('#subcategory-chips').getByRole('button', { name: sub.nombre, exact: true }).click();
        assert.equal(await page.locator('.product-card').count(), sub.cantidad);
      }
    }
    await page.getByRole('tab', { name: 'Entradas', exact: true }).click();
    await page.locator('#product-search').fill('cafe americano');
    assert.equal(await page.locator('.product-card').count(), 2);
    assert.equal(await page.locator('.product-card .category-label').first().textContent(), 'Bebidas · Cafés');
    await page.getByRole('tab', { name: 'Postres', exact: true }).click();
    assert.equal(await page.locator('.product-card').count(), 2); // Cambiar pestaña conserva la búsqueda global.
    await page.locator('#product-search').fill('waffle');
    assert.equal(await page.locator('.product-card').count(), 5);
    await page.locator('#product-search').fill('jugo de naranja');
    assert.ok(await page.locator('.product-card').count() >= 1);
    assert.equal(await page.locator('[data-producto="jugo-de-naranja"] .category-label').textContent(), 'Bebidas · Aguas naturales');
    await page.locator('#product-search').fill('no-existe-xyz');
    assert.equal(await page.locator('#catalog-empty').isVisible(), true);
    await page.locator('#product-search').fill('dirty chai');
    assert.equal(await page.locator('[data-producto="dirty-chai"] button').isDisabled(), true);
    await page.locator('#product-search').fill('');
    assert.equal(await page.locator('.product-card').count(), 0);

    await page.getByRole('tab', { name: 'Alimentos', exact: true }).click();
    await page.locator('#subcategory-chips').getByRole('button', { name: 'Chilaquiles', exact: true }).click();
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: 'Agregar Chilaquiles con pollo o huevo', exact: true }).click();
      if (i === 0) {
        await page.locator('#modifier-form button[type="submit"]').click();
        assert.equal(await page.locator('#modifier-error').isVisible(), true);
      }
      for (const [name, value] of [['salsa','roja'], ['proteina','pollo'], ['extras','huevo'], ['extras','pollo']]) await page.locator(`input[name="${name}"][value="${value}"]`).check();
      await page.locator('#modifier-note').fill('Sin cebolla');
      assert.equal(await page.locator('#modifier-total').textContent(), '$230.00');
      await page.locator('#modifier-form button[type="submit"]').click();
    }
    assert.equal(await page.locator('#order-items .order-item').count(), 1);
    assert.equal(await page.locator('#order-count').textContent(), '2');
    await page.locator('#product-search').fill('cafe americano');
    await page.getByRole('button', { name: 'Agregar Café americano', exact: true }).click();
    await page.locator('input[name="extras"][value="leche-deslactosada"]').check();
    await page.locator('input[name="extras"][value="shot-de-espresso"]').check();
    await page.locator('#modifier-form button[type="submit"]').click();
    await page.locator('#product-search').fill('pan tostado');
    await page.getByRole('button', { name: 'Agregar Orden de pan tostado', exact: true }).click();
    await page.locator('#add-extra').click();
    await page.locator('#extra-form button[type="submit"]').click();
    assert.equal(await page.locator('#extra-error').isVisible(), true);
    await page.locator('#extra-concept').fill('Nuevo desayuno');
    await page.locator('#extra-amount').fill('-5');
    await page.locator('#extra-form button[type="submit"]').click();
    assert.equal(await page.locator('#extra-error').isVisible(), true);
    await page.locator('#extra-amount').fill('42,35');
    await page.locator('#extra-form button[type="submit"]').click();
    assert.equal(await page.locator('#order-total').textContent(), '$662.35');
    await page.locator('#order-label').fill('Mesa 03');
    await page.locator('#save-expediente').click();
    assert.equal(downloads, 0);
    await page.reload(); await page.waitForSelector('.product-card');
    assert.equal(await page.locator('#order-total').textContent(), '$662.35');
    assert.equal(await page.locator('#order-label').inputValue(), 'Mesa 03');
    await page.locator('#review-order').click();
    assert.equal(await page.locator('#review-total').textContent(), '$662.35');
    await page.locator('#confirm-order').click();
    assert.equal(await page.locator('#order-count').textContent(), '0');
    assert.equal(await page.locator('#open-orders-count').textContent(), '1');
    const queue = page.locator('[data-pedido="pedido-3"]');
    assert.equal(await queue.locator('.status-badge').textContent(), 'ABIERTO');
    await page.waitForFunction(() => [...document.querySelectorAll('[data-pedido="pedido-3"] img')].every(n => n.complete && n.naturalWidth > 0));
    const thumbnails = await queue.locator('img').evaluateAll(nodes => nodes.map(n => ({ src: n.getAttribute('src'), loaded: n.complete && n.naturalWidth > 0 })));
    assert.ok(thumbnails.every(t => t.loaded));
    assert.deepEqual(thumbnails.map(t => t.src), ['assets/img/categorias/alimentos.svg', 'assets/img/categorias/bebidas.svg', 'assets/img/categorias/entradas.svg', 'assets/img/categorias/extra.svg']);
    await page.reload(); await page.waitForSelector('.product-card');
    assert.equal(await page.locator('#open-orders-count').textContent(), '1');
    await page.locator('[data-pedido="pedido-3"]').click();
    await page.locator('#ticket-lines .ticket-line').first().getByRole('button', { name: 'Marcar PAGADO', exact: true }).click();
    assert.equal(await page.locator('#ticket-lines .paid').count(), 1);
    assert.equal(await page.locator('#open-orders-count').textContent(), '1');
    await page.locator('#ticket-dialog [data-close]').click();
    await page.locator('#history-button').click();
    assert.equal(await page.locator('#history-category-kpis .history-metric').count(), 5);
    assert.equal(await page.locator('#history-summary .sales-total strong').textContent(), '$460.00');
    assert.equal(await page.locator('[data-categoria="Alimentos"] strong').textContent(), '2');
    await page.locator('#history-dialog [data-close]').click();

    for (const width of [1440, 820, 390, 320]) {
      await page.setViewportSize({ width, height: width > 700 ? 1000 : 844 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(output, `pos-${width}.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Desbordamiento a ${width}px`);
      assert.equal(await page.locator('#open-orders-bar').evaluate(n => n.getBoundingClientRect().bottom <= innerHeight), true);
      await page.locator('#history-button').click();
      await page.screenshot({ path: path.join(output, `history-${width}.png`) });
      assert.equal(await page.locator('#history-dialog').evaluate(n => n.scrollWidth <= n.clientWidth), true);
      assert.equal(await page.locator('#history-detail').evaluate(n => n.scrollWidth <= n.clientWidth), true);
      await page.locator('#history-days [data-fecha="2026-10-03"]').click();
      assert.equal(await page.locator('#history-summary .sales-total strong').textContent(), '$210.00');
      assert.equal(await page.locator('#history-days [data-fecha="2026-10-03"]').evaluate(n => n === document.activeElement), true);
      await page.keyboard.press('Escape');
      await page.locator('#load-expediente').click();
      await page.locator('#load-days [data-fecha="2026-10-04"]').click();
      await page.locator('#load-selected-day').click();
      assert.equal(await page.locator('#history-summary .sales-total strong').textContent(), '$182.10');
      assert.equal(await page.locator('#history-extra-note').textContent().then(t => t.includes('2 unidades')), true);
      await page.keyboard.press('Escape');
    }
    await page.locator('#toggle-queue').click();
    assert.equal(await page.locator('#open-orders-list').isVisible(), false);
    await page.locator('#toggle-queue').click();
    await page.locator('[data-pedido="pedido-3"]').click();
    await page.locator('#pay-all').click();
    assert.equal(await page.locator('#ticket-lines .paid').count(), 4);
    assert.equal(await page.locator('#open-orders-count').textContent(), '1'); // Pagado, pero falta preparar.
    await page.locator('#prepare-all').click();
    assert.equal(await page.locator('#ticket-lines .prepared').count(), 4);
    assert.equal(await page.locator('#open-orders-count').textContent(), '0');
    await page.keyboard.press('Escape');
    await page.locator('#add-extra').click();
    await page.locator('#extra-concept').fill('Solo extra');
    await page.locator('#extra-amount').fill('15.20');
    await page.locator('#extra-form button[type="submit"]').click();
    // Una escritura fallida no borra el carrito ni asigna un pedido sin guardar.
    await page.evaluate(() => { window.realSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('QuotaExceededError'); }; });
    await page.locator('#review-order').click();
    await page.locator('#confirm-order').click();
    assert.equal(await page.locator('#review-dialog').isVisible(), true);
    assert.equal(await page.locator('#order-total').textContent(), '$15.20');
    assert.equal(await page.locator('#open-orders-count').textContent(), '0');
    await page.evaluate(() => { Storage.prototype.setItem = window.realSetItem; });
    await page.locator('#confirm-order').click();
    assert.equal(await page.locator('[data-pedido="pedido-4"]').count(), 1);
    assert.equal(await page.locator('input[type="file"]').count(), 0);
    assert.equal(downloads, 0);
    assert.deepEqual(errors, []);

    const fileContext = await browser.newContext();
    const filePage = await fileContext.newPage();
    await filePage.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await filePage.waitForSelector('.product-card');
    assert.equal(await filePage.locator('.product-card').count(), 32);
    await fileContext.close(); await context.close();
    console.log('✓ POS, búsqueda global, extras, pedidos por producto, expedientes e historial en cuatro tamaños; sin descargas.');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
