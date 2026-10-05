// Ejecutar con Node y Playwright instalado: node tests/pos-regression.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '..');
const key = 'freeze-monkey-pos-v1';
const server = http.createServer(async (req, res) => {
  try {
    const file = path.join(root, decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
    if (!file.startsWith(root + path.sep)) throw new Error('invalid path');
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404).end(); }
});
async function checkAutomaticCombos(page) {
  const clearDraft = async () => {
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify(FreezeMonkeyStorage.emptyState())), key);
    await page.reload();
  };
  await clearDraft();
  await page.locator('[data-product="frappe-dk-oreo"]').click();
  await page.locator('[data-product="snack-dedos-de-queso"]').click();
  assert.equal(await page.locator('.draft-line-main strong').textContent(), 'Combo Viral');
  assert.equal(await page.locator('#draft-total').textContent(), '$95.00');
  await page.locator('[data-product="smoothie-mango"]').click();
  await page.locator('[data-product="snack-papas-gajo"]').click();
  assert.equal(await page.locator('.draft-line-main strong').textContent(), 'Combo Ozaru');
  assert.equal(await page.locator('#draft-total').textContent(), '$180.00');
  await page.reload();
  assert.equal(await page.locator('#draft-total').textContent(), '$180.00');
  await page.locator('[data-duplicate-line]').click();
  assert.equal(await page.locator('.draft-line').count(), 2);
  assert.equal(await page.locator('#draft-total').textContent(), '$360.00');
  await page.locator('[data-remove-line]').first().click();
  assert.equal(await page.locator('#draft-total').textContent(), '$180.00');
  await page.locator('[data-edit-line]').click();
  await page.locator('[data-choice="drink"]').first().selectOption('limonada-azul');
  await page.locator('#builder-add').click();
  assert(await page.locator('.draft-line-main small').textContent().then(text => text.includes('Limonada Azul')));
  assert.equal(await page.locator('#draft-total').textContent(), '$180.00');

  await clearDraft();
  await page.locator('[data-product="limonada-fresa"]').click();
  await page.locator('[data-product="snack-monkey-tenders"]').click();
  await page.locator('[data-choice="tender"]').selectOption('Búfalo');
  await page.locator('#builder-add').click();
  assert.equal(await page.locator('.draft-line-main strong').textContent(), 'Combo Tender');
  assert.equal(await page.locator('#draft-total').textContent(), '$120.00');
  assert(await page.locator('.draft-line-main small').textContent().then(text => text.includes('Tenders Búfalo')));

  await clearDraft();
  await page.locator('[data-product="caja-salvaje"]').click();
  await page.locator('[data-product="smoothie-fresa"]').click();
  await page.locator('[data-product="frappe-dk-oreo"]').click();
  assert.equal(await page.locator('.draft-line-main strong').textContent(), 'Combo Manada');
  assert.equal(await page.locator('#draft-total').textContent(), '$289.00');
  await page.locator('#add-extra').click();
  await page.locator('#extra-form [name="amount"]').fill('11');
  await page.locator('#extra-form [name="description"]').fill('Extra crema');
  await page.locator('#extra-form button[type="submit"]').click();
  assert.equal(await page.locator('#draft-total').textContent(), '$300.00');
  await page.locator('#create-order').click();
  assert(await page.locator('#order-lines').textContent().then(text => text.includes('Caja Salvaje')));
  await page.locator('#confirm-order').click();
  await page.locator('#queue-items [data-open-order]').click();
  await page.locator('#mark-paid').click();
  await page.locator('#order-dialog [data-close-dialog]').click();
  await page.locator('#history-button').click();
  assert.deepEqual(await page.locator('#history-summary dd').allTextContents(), ['$300.00', '3', '1', '1', '0', '1']);
  await page.locator('#history-dialog [data-close-dialog]').click();
  await clearDraft();
}
async function checkHistory(page, browserName) {
  await page.locator('#history-button').click();
  assert(await page.locator('#history-empty').isVisible(), 'Empty history should explain the absence of orders');
  assert(await page.locator('#history-layout').isHidden(), 'Empty history should hide day/detail panels');
  await page.locator('#history-dialog [data-close-dialog]').click();
  await page.evaluate(key => {
    const data = FreezeMonkeyStorage.emptyState();
    const { findProduct, buildLine } = FreezeMonkeyMenu;
    const line = id => buildLine(findProduct(id));
    const manada = () => buildLine(findProduct('combo-manada'), { drinks: ['frappe-dk-oreo', 'smoothie-fresa'] });
    const order = (number, items, status = 'PAGADO', createdAt = '2026-10-01T18:31:00Z', paidAt = createdAt, extras = []) => ({
      id: `history-${number}`, number, items, extras, status, createdAt, paidAt: status === 'PAGADO' ? paidAt : null,
      label: number === 2 ? 'Domicilio <VIP> "Ana"' : ''
    });
    const legacyCombo = manada(); legacyCombo.components[0] = { name: 'Platón de snacks', price: 169 };
    data.orders = [
      order(1, [manada()], 'PAGADO', undefined, undefined, [{ uid: 'extra-1', amount: 11, description: 'Extra crema' }]),
      order(2, [line('limonada-fresa'), line('snack-papas-francesas')]),
      order(3, [buildLine(findProduct('combo-tenders'), { drinks: ['frappe-albino-kong'], tenderFlavor: 'BBQ' })]),
      // En Mérida, este pago de las 04:30 UTC sigue perteneciendo al 1 de octubre.
      order(4, [line('limonada-azul')], 'PAGADO', '2026-10-01T18:00:00Z', '2026-10-02T04:30:00Z'),
      // Un pedido creado el día 1 se contabiliza al cobrarse el día 5.
      order(5, [line('frappe-dk-oreo')], 'PAGADO', '2026-10-01T18:00:00Z', '2026-10-05T18:00:00Z'),
      order(6, [line('smoothie-fresa'), line('snack-papas-francesas')], 'ABIERTO', '2026-10-05T18:00:00Z'),
      order(7, [line('limonada-fresa')], 'LISTO', '2026-10-05T18:00:00Z'),
      order(8, [legacyCombo], 'PAGADO', '2026-10-01T18:31:00Z', null)
    ];
    data.nextNumber = 9;
    localStorage.setItem(key, JSON.stringify(data));
  }, key);
  await page.reload();
  await page.locator('#history-button').click();
  assert.deepEqual(await page.locator('[data-history-day]').evaluateAll(buttons => buttons.map(button => button.dataset.historyDay)), ['2026-10-05', '2026-10-01']);
  assert.equal(await page.locator('.history-day.active').getAttribute('data-history-day'), '2026-10-05');
  const values = () => page.locator('#history-summary dd').allTextContents();
  assert.deepEqual(await values(), ['$60.00', '1', '1', '0', '0', '0'], 'Only paid orders should count towards daily KPIs');
  assert.equal(await page.locator('#history-list .queue-tile').count(), 3, 'Open and ready orders should remain visible');
  assert.equal(await page.locator('#history-list [data-status="LISTO"]').count(), 1);
  await page.locator('[data-history-day="2026-10-01"]').focus();
  await page.locator('[data-history-day="2026-10-01"]').press('Enter');
  assert.deepEqual(await values(), ['$869.00', '11', '3', '2', '2', '4'], 'Combos, extras, local dates and legacy platters should all be counted correctly');
  assert.equal(await page.locator('#history-list .queue-tile').count(), 5);
  assert.equal(await page.locator('.history-label').textContent(), 'Domicilio <VIP> "Ana"');
  assert(await page.locator('#history-uncategorized').isHidden());
  assert.equal(await page.evaluate(() => document.activeElement.dataset.historyDay), '2026-10-01', 'Selecting a day should preserve keyboard focus');
  const sharedStyles = await page.evaluate(() => {
    const styles = selector => { const style = getComputedStyle(document.querySelector(selector)); return [style.backgroundColor, style.borderRadius, style.boxShadow]; };
    return [styles('#queue-items .queue-tile'), styles('#history-list .queue-tile')];
  });
  assert.deepEqual(sharedStyles[0], sharedStyles[1], 'History cards should share the visual style of open orders');
  await page.locator('#history-dialog [data-close-dialog]').click();
  await page.locator('#history-button').click();
  assert.equal(await page.locator('.history-day.active').getAttribute('data-history-day'), '2026-10-01', 'Reopening history should preserve the selected day');
  await page.locator('#history-dialog [data-close-dialog]').click();
  await page.clock.install({ time: new Date('2026-10-05T19:00:00Z') });
  await page.locator('#queue-items [data-open-order="history-6"]').click();
  await page.locator('#mark-paid').click();
  await page.locator('#order-dialog [data-close-dialog]').click();
  await page.locator('#history-button').click();
  await page.locator('[data-history-day="2026-10-05"]').click();
  assert.deepEqual(await values(), ['$160.00', '3', '1', '1', '0', '1'], 'Paying an order should refresh revenue and category counts');
  await page.locator('#history-dialog [data-close-dialog]').click();
  await page.evaluate(key => {
    const data = FreezeMonkeyStorage.loadState();
    const items = data.orders.find(order => order.number === 6).items;
    const add = createdAt => {
      const number = data.nextNumber++;
      data.orders.push({ id: `stress-${number}`, number, items: structuredClone(items), extras: [], label: '', status: 'ABIERTO', createdAt, paidAt: null });
    };
    for (let i = 0; i < 24; i++) add('2026-10-05T18:00:00Z');
    for (let i = 0; i < 40; i++) {
      const date = new Date('2026-09-30T18:00:00Z'); date.setUTCDate(date.getUTCDate() - i);
      add(date.toISOString());
    }
    localStorage.setItem(key, JSON.stringify(data));
  }, key);
  await page.reload();
  for (const [width, height] of [[1440,900],[1192,589],[768,1024],[390,844],[844,390]]) {
    await page.setViewportSize({ width, height });
    await page.locator('#history-button').click();
    const layout = await page.evaluate(() => {
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, height: r.height }; };
      const days = document.querySelector('#history-days'), detail = document.querySelector('#history-detail');
      days.scrollTop = 100;
      const dayScroll = days.scrollTop;
      detail.scrollTop = 150;
      return {
        modal: rect('#history-dialog'), sidebar: rect('.history-sidebar'), detail: rect('#history-detail'), close: rect('#history-dialog .icon-close'),
        sidebarScrolls: dayScroll > 0, detailScrolls: detail.scrollTop > 0, independentScroll: days.scrollTop === dayScroll,
        overflow: detail.scrollWidth > detail.clientWidth + 1 || days.scrollWidth > days.clientWidth + 1,
        modalScrolls: document.querySelector('#history-dialog').scrollHeight > document.querySelector('#history-dialog').clientHeight + 1
      };
    });
    assert(layout.modal.x >= 0 && layout.modal.right <= width + 1 && layout.modal.y >= 0 && layout.modal.bottom <= height + 1, `${browserName} ${width}x${height}: history outside viewport`);
    assert(layout.close.y >= 0 && layout.close.bottom <= height, 'History close action should stay visible');
    assert(layout.detail.height > 90 && layout.sidebar.height > 90, 'History panels should not collapse');
    assert(layout.sidebarScrolls && layout.detailScrolls && layout.independentScroll, 'History columns should scroll independently');
    assert(!layout.overflow && !layout.modalScrolls, `History should not overflow horizontally or scroll as a whole: ${JSON.stringify(layout)}`);
    if (width === 390 || width === 1440) {
      await page.evaluate(() => { document.querySelector('#history-days').scrollTop = 0; document.querySelector('#history-detail').scrollTop = 0; });
      await page.screenshot({ path: path.join('/private/tmp', `freeze-monkey-history-${browserName}-${width}.png`) });
    }
    await page.locator('#history-dialog [data-close-dialog]').click();
  }
}
async function run(browserType) {
  const browser = await browserType.launch(browserType.name() === 'chromium' ? {channel:'chromium'} : {});
  try {
    const context = await browser.newContext({ timezoneId: 'America/Merida' });
    // El POS debe funcionar también sin los CDN de fuente/Tailwind.
    await context.route('https://**/*', route => route.abort());
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(base);
    await checkAutomaticCombos(page);
    for (const [width, height] of [[1440,900],[1192,589],[768,1024],[390,844],[844,390]]) {
      await page.setViewportSize({ width, height });
      for (const count of [1,3,9,24]) {
        await page.evaluate(({ key, count }) => {
          const data = FreezeMonkeyStorage.emptyState();
          const product = FreezeMonkeyMenu.MENU.find(item => item.kind === 'product' && item.image);
          data.draft.items = Array.from({length:count}, () => FreezeMonkeyMenu.buildLine(product));
          localStorage.setItem(key, JSON.stringify(data));
        }, {key, count});
        await page.reload();
        await page.locator('#create-order').click();
        await page.locator('#order-gallery img').first().waitFor();
        const layout = await page.evaluate(() => {
          const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}; };
          return {modal:rect('#order-dialog'),body:rect('.order-modal-body'),image:rect('#order-gallery img'),button:rect('#confirm-order'), overflow:document.querySelector('.order-modal-body').scrollWidth > document.querySelector('.order-modal-body').clientWidth + 1};
        });
        assert(layout.body.height >= 100, `${browserType.name()} ${width}x${height} count${count}: collapsed body ${JSON.stringify(layout)}`);
        assert(layout.image.height >= 79, 'Product preview collapsed');
        assert(layout.button.bottom <= height && layout.button.y >= 0, 'Confirm action outside viewport');
        assert(layout.modal.y >= 0 && layout.modal.bottom <= height + 1, 'Modal outside viewport');
        assert(!layout.overflow, 'Horizontal overflow');
        assert.equal(await page.locator('#order-gallery figure').count(), count);
        if (width === 390 && count === 3 || width === 1192 && count === 9) {
          await page.screenshot({path: path.join('/private/tmp', `freeze-monkey-${browserType.name()}-${width}.png`)});
        }
        await page.locator('#order-dialog [data-close-dialog]').click();
      }
    }
    await page.setViewportSize({width:1192,height:800});
    const label = 'A domicilio · Ana <VIP> "1"';
    await page.locator('#draft-label').fill(label);
    await page.reload();
    assert.equal(await page.locator('#draft-label').inputValue(), label);
    await page.locator('#create-order').click();
    assert.equal(await page.locator('#order-label').inputValue(), label);
    await page.locator('#confirm-order').click();
    assert.equal(await page.locator('.queue-label').textContent(), label);
    await page.locator('[data-open-order]').click();
    await page.locator('#order-label').fill('Mesa 2');
    await page.locator('#mark-ready').click();
    await page.locator('#mark-paid').click();
    await page.locator('#order-dialog [data-close-dialog]').click();
    await page.reload();
    assert.equal(await page.locator('#sales-count').textContent(), '1');
    await page.locator('#history-button').click();
    assert.equal(await page.locator('.history-label').textContent(), 'Mesa 2');
    await page.locator('#history-dialog [data-close-dialog]').click();
    const roundtrip = await page.evaluate(async key => {
      const api = FreezeMonkeyStorage, state = api.loadState();
      let content;
      const oldCreate = URL.createObjectURL;
      URL.createObjectURL = blob => { content = blob; return oldCreate(blob); };
      api.exportExcelCSV(state);
      URL.createObjectURL = oldCreate;
      const csv = await content.text();
      const imported = await api.importExpediente(new File([csv], 'test.csv'));
      const json = await api.importExpediente(new File([JSON.stringify(state)], 'test.json'));
      // Expedientes anteriores sin etiqueta siguen siendo válidos.
      const oldState = structuredClone(state); delete oldState.orders[0].label;
      const legacy = api.normalizeState(oldState);
      const legacyCSV = csv.split('\r\n').map(row => row.slice(0, row.lastIndexOf(';'))).join('\r\n');
      const oldCSV = await api.importExpediente(new File([legacyCSV], 'legacy.csv'));
      return [imported.orders[0].label, json.orders[0].label, legacy.orders[0].label, oldCSV.orders[0].label];
    }, key);
    assert.deepEqual(roundtrip, ['Mesa 2','Mesa 2','','']);
    await page.evaluate(key => {
      const data = FreezeMonkeyStorage.loadState();
      data.orders.push({...structuredClone(data.orders[0]), id:'open-test', number:2, status:'ABIERTO', paidAt:null});
      data.nextNumber = 3;
      data.draft = {items:[structuredClone(data.orders[0].items[0])], extras:[], label:'Pendiente'};
      localStorage.setItem(key, JSON.stringify(data));
    }, key);
    await page.reload();
    await page.locator('#options-button').click(); await page.locator('#reset-day').click();
    await page.getByRole('button', {name:'Cancelar',exact:true}).click();
    assert.equal(await page.locator('#sales-count').textContent(), '1');
    await page.locator('#options-button').click(); await page.locator('#reset-day').click();
    await page.locator('#confirm-reset').click(); await page.reload();
    const reset = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(reset.orders.length,0); assert.equal(reset.nextNumber,1); assert.equal(reset.draft.label,''); assert.equal(reset.draft.items.length,0);
    assert.equal(await page.locator('#sales-total').textContent(), '$0.00');
    await checkHistory(page, browserType.name());
    assert.deepEqual(errors, []);
    console.log(`${browserType.name()}: 20 pruebas de pedido + etiquetas, JSON/CSV, reinicio y 5 tamaños de historial con KPIs, combos, fechas locales y scroll independiente OK`);
    await context.close();
  } finally { await browser.close(); }
}
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  try { for (const engine of (process.env.POS_TEST_BROWSER === 'chromium' ? [chromium] : [webkit,chromium])) await run(engine); }
  finally { server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
