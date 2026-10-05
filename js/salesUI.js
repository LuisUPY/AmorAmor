/* Vistas de cola, seguimiento, historial y carga de expedientes locales. */
globalThis.AmorSalesUI = (() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const { dinero } = AmorPOS;
  const { agruparPorDia, etiquetaDia, fechaLocal, macros } = AmorHistory;
  const horario = new Intl.DateTimeFormat('es-MX', { timeZone: AmorHistory.zona, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text != null) result.textContent = text;
    return result;
  }
  function button(text, className, callback) {
    const result = node('button', className, text);
    result.type = 'button'; result.addEventListener('click', callback);
    return result;
  }
  function imagen(partida) {
    const img = node('img', 'category-thumbnail');
    img.src = AmorMedia.imagenesCategoria[partida.macroCategoria] || AmorMedia.imagenExtra;
    img.alt = `Imagen representativa: ${partida.macroCategoria || 'extra personalizado'}`;
    img.width = 44; img.height = 44;
    return img;
  }
  function estados(partida) {
    const badges = node('div', 'line-statuses');
    badges.append(node('span', `status-badge ${partida.preparado ? 'prepared' : 'pending'}`, partida.preparado ? 'PREPARADO' : 'POR PREPARAR'),
      node('span', `status-badge ${partida.pagado ? 'paid' : 'pending'}`, partida.pagado ? 'PAGADO' : 'PENDIENTE DE PAGO'));
    return badges;
  }
  function resumenOpciones(partida) {
    return partida.selecciones.map(s => s.texto ? `${s.grupoNombre}: ${s.texto}` : `${s.grupoNombre}: ${s.valores.map(v => v.nombre).join(', ')}`).join(' · ');
  }
  function iniciar({ getState, commit, notify, reload }) {
    let selectedDay = null;
    let selectedLoadDay = null;
    let activeOrderId = null;
    let daysSignature = '';

    function linea(partida, pedido = null) {
      const row = node('article', 'ticket-line');
      row.dataset.partida = partida.id;
      const content = node('div', 'ticket-line-content');
      const heading = node('div', 'line-heading');
      heading.append(node('h3', '', `${partida.cantidad} × ${partida.nombre}`), node('strong', '', dinero(partida.precioUnitarioCentavos * partida.cantidad / 100)));
      content.append(heading);
      const options = resumenOpciones(partida);
      if (options) content.append(node('p', 'line-options', options));
      if (partida.nota) content.append(node('p', 'line-note', `Nota: ${partida.nota}`));
      content.append(estados(partida));
      if (pedido) {
        const actions = node('div', 'line-state-actions');
        const prepare = button(partida.preparado ? 'Preparado ✓' : 'Marcar PREPARADO', 'secondary-button', () => cambiarEstado(pedido.id, partida.id, 'preparado'));
        const pay = button(partida.pagado ? 'Pagado ✓' : 'Marcar PAGADO', 'secondary-button', () => cambiarEstado(pedido.id, partida.id, 'pagado'));
        prepare.disabled = partida.preparado; pay.disabled = partida.pagado;
        actions.append(prepare, pay); content.append(actions);
      }
      row.append(imagen(partida), content);
      return row;
    }
    function cambiarEstado(pedidoId, partidaId, accion) {
      const next = getState();
      const index = next.pedidos.findIndex(pedido => pedido.id === pedidoId);
      if (index < 0) { notify('No se encontró el pedido.'); return; }
      next.pedidos[index] = AmorOrders.marcarPartida(next.pedidos[index], partidaId, accion);
      if (commit(next)) notify(accion === 'pagado' ? 'Pago guardado en el expediente' : 'Preparación guardada');
    }
    function abrirPedido(id) {
      activeOrderId = id;
      renderTicket();
      if (!$('ticket-dialog').open) $('ticket-dialog').showModal();
    }
    function renderTicket() {
      const pedido = getState().pedidos.find(p => p.id === activeOrderId);
      if (!pedido) return;
      $('ticket-title').textContent = `Pedido N° ${pedido.numero}`;
      $('ticket-meta').textContent = `${pedido.etiqueta || 'Sin etiqueta'} · ${horario.format(new Date(pedido.creadoEn))}`;
      $('ticket-lines').replaceChildren(...pedido.partidas.map(partida => linea(partida, pedido)));
      $('ticket-total').textContent = dinero(pedido.totalCentavos / 100);
      $('prepare-all').disabled = pedido.partidas.every(partida => partida.preparado);
      $('pay-all').disabled = pedido.partidas.every(partida => partida.pagado);
    }
    function renderQueue() {
      const state = getState();
      const abiertos = state.pedidos.filter(AmorOrders.estaAbierto).sort((a, b) => b.numero - a.numero);
      $('open-orders-count').textContent = abiertos.length;
      $('open-orders-bar').classList.toggle('collapsed', state.colaOculta);
      $('open-orders-list').hidden = state.colaOculta;
      $('toggle-queue').textContent = state.colaOculta ? 'Mostrar ↑' : 'Ocultar ↓';
      $('toggle-queue').setAttribute('aria-expanded', String(!state.colaOculta));
      document.body.dataset.queueCollapsed = String(state.colaOculta);
      $('open-orders-list').replaceChildren(...abiertos.map(pedido => {
        const card = button('', 'queue-ticket', () => abrirPedido(pedido.id));
        card.dataset.pedido = pedido.id;
        card.setAttribute('aria-label', `Abrir pedido número ${pedido.numero}${pedido.etiqueta ? `, ${pedido.etiqueta}` : ''}`);
        const preview = node('span', 'queue-thumbnails');
        const visible = pedido.partidas.slice(0, pedido.partidas.length > 4 ? 3 : 4);
        for (const partida of visible) {
          const thumb = node('span', 'queue-thumbnail');
          thumb.title = partida.nombre;
          thumb.append(imagen(partida));
          if (partida.cantidad > 1) thumb.append(node('small', 'thumbnail-quantity', partida.cantidad));
          preview.append(thumb);
        }
        if (visible.length < pedido.partidas.length) preview.append(node('span', 'queue-more', `+${pedido.partidas.length - visible.length}`));
        const data = node('span', 'queue-data');
        const title = node('span', 'queue-ticket-title');
        title.append(node('strong', '', `N° ${pedido.numero}`), node('span', 'status-badge open', 'ABIERTO'));
        data.append(title, node('span', 'queue-label', pedido.etiqueta || 'Sin etiqueta'), node('strong', 'queue-price', dinero(pedido.totalCentavos / 100)));
        card.append(preview, data); return card;
      }));
      if (!abiertos.length) $('open-orders-list').append(node('p', 'queue-empty', 'Los pedidos confirmados aparecerán aquí.'));
    }
    function metric(label, value, className = '') {
      const card = node('div', `history-metric ${className}`);
      card.append(node('span', '', label), node('strong', '', value));
      return card;
    }
    function renderHistory(date = selectedDay) {
      const dias = agruparPorDia(getState().pedidos);
      const selected = dias.find(dia => dia.fecha === date) || dias[0];
      selectedDay = selected?.fecha || null;
      $('history-layout').hidden = !selected;
      $('history-empty').hidden = !!selected;
      const signature = JSON.stringify(dias.map(dia => [dia.fecha, dia.resumen.totalCentavos, dia.pedidos.length]));
      if (signature !== daysSignature) {
        const scroll = $('history-days').scrollTop;
        $('history-days').replaceChildren(...dias.map(dia => {
          const day = button('', 'history-day', () => renderHistory(dia.fecha));
          day.dataset.fecha = dia.fecha;
          day.setAttribute('aria-controls', 'history-detail');
          day.append(node('time', '', etiquetaDia(dia.fecha)), node('span', '', dinero(dia.resumen.totalCentavos / 100)), node('small', '', `${dia.pedidos.length} pedidos`));
          day.querySelector('time').dateTime = dia.fecha;
          return day;
        }));
        $('history-days').scrollTop = scroll;
        daysSignature = signature;
      }
      for (const day of $('history-days').children) day.setAttribute('aria-pressed', String(day.dataset.fecha === selectedDay));
      if (!selected) return;
      $('history-day-title').textContent = etiquetaDia(selected.fecha);
      const resumen = selected.resumen;
      $('history-summary').replaceChildren(metric('Total de ventas', dinero(resumen.totalCentavos / 100), 'sales-total'), metric('Productos vendidos', resumen.productos), metric('Pedidos con pagos', resumen.ventas));
      $('history-category-kpis').replaceChildren(...macros.map(macro => {
        const card = metric(macro, resumen.categorias[macro]);
        card.dataset.categoria = macro;
        return card;
      }));
      $('history-extra-note').textContent = resumen.extras ? `${resumen.extras} unidades de extras personalizados incluidas en productos vendidos y total, sin categoría asignada.` : 'Cada paquete cuenta como una unidad vendida. Los extras de preparación no se cuentan como productos adicionales.';
      $('history-order-count').textContent = `${selected.pedidos.length} pedidos`;
      $('history-orders').replaceChildren(...selected.pedidos.map(pedido => {
        const card = node('article', 'history-order');
        const title = node('div', 'history-order-heading');
        title.append(button(`Pedido N° ${pedido.numero} ↗`, 'text-button', () => abrirPedido(pedido.id)), node('span', 'status-badge', pedido.estado), node('strong', '', dinero(pedido.totalCentavos / 100)));
        card.append(title, node('p', 'history-order-label', pedido.etiqueta || 'Sin etiqueta'), ...pedido.partidas.map(partida => linea(partida)));
        const cobrado = pedido.partidas.filter(p => p.pagado && fechaLocal(p.pagadoEn) === selected.fecha).reduce((sum, p) => sum + p.precioUnitarioCentavos * p.cantidad, 0);
        card.append(node('p', 'history-order-note', `Pagado en este corte: ${dinero(cobrado / 100)}`));
        return card;
      }));
      $('history-detail').scrollTop = 0;
    }
    function openHistory(date = selectedDay) {
      renderHistory(date);
      if (!$('history-dialog').open) $('history-dialog').showModal();
    }
    function openLoad() {
      if (!reload()) return;
      const dias = agruparPorDia(getState().pedidos);
      selectedLoadDay = dias[0]?.fecha || null;
      $('load-empty').hidden = dias.length > 0;
      $('load-selected-day').disabled = !selectedLoadDay;
      $('load-days').replaceChildren(...dias.map(dia => {
        const day = button('', 'load-day', () => {
          selectedLoadDay = dia.fecha;
          for (const sibling of $('load-days').children) sibling.setAttribute('aria-pressed', String(sibling.dataset.fecha === selectedLoadDay));
        });
        day.dataset.fecha = dia.fecha;
        day.setAttribute('aria-pressed', String(dia.fecha === selectedLoadDay));
        day.append(node('strong', '', etiquetaDia(dia.fecha)), node('span', '', `${dia.pedidos.length} pedidos · ${dinero(dia.resumen.totalCentavos / 100)}`));
        return day;
      }));
      $('load-dialog').showModal();
    }
    function renderAll() {
      renderQueue();
      if ($('history-dialog').open) renderHistory();
      if ($('ticket-dialog').open) renderTicket();
    }
    $('history-button').addEventListener('click', () => openHistory());
    $('load-expediente').addEventListener('click', openLoad);
    $('load-selected-day').addEventListener('click', () => {
      if (!selectedLoadDay) return;
      $('load-dialog').close(); openHistory(selectedLoadDay);
    });
    $('prepare-all').addEventListener('click', () => cambiarEstado(activeOrderId, 'todos', 'preparado'));
    $('pay-all').addEventListener('click', () => cambiarEstado(activeOrderId, 'todos', 'pagado'));
    $('toggle-queue').addEventListener('click', () => {
      const next = getState(); next.colaOculta = !next.colaOculta;
      commit(next);
    });
    return Object.freeze({ renderAll, openHistory, abrirPedido });
  }
  return Object.freeze({ iniciar });
})();
