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
  function resumenPago(partida) {
    if (Number.isFinite(partida.montoEfectivo) && Number.isFinite(partida.montoTarjeta)) {
      return `Efectivo ${dinero(partida.montoEfectivo)} · Tarjeta/Transferencia ${dinero(partida.montoTarjeta)}`;
    }
    return `Método: ${partida.metodoPago === 'efectivo' ? 'Efectivo' : partida.metodoPago === 'tarjeta' ? 'Tarjeta/Transferencia' : 'Sin registrar (pago anterior)'}`;
  }
  function iniciar({ getState, commit, notify, reload, solicitarCobro, agregarProductos }) {
    let selectedDay = null;
    let selectedLoadDay = null;
    let activeOrderId = null;
    let pendingRemoval = null;
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
      if (partida.pagado) content.append(node('p', 'line-options', resumenPago(partida)));
      if (pedido) {
        const actions = node('div', 'line-state-actions');
        const prepare = button(partida.preparado ? 'Preparado ✓' : 'Marcar PREPARADO', 'secondary-button', () => cambiarEstado(pedido.id, partida.id, 'preparado'));
        const pay = button(partida.pagado ? 'Pagado ✓' : 'Cobrar producto', 'secondary-button', () => solicitarCobro(pedido.id, partida.id));
        const remove = button('Eliminar producto', 'secondary-button remove-product-button', () => solicitarEliminacion(pedido.id, partida.id));
        prepare.disabled = partida.preparado; pay.disabled = partida.pagado;
        remove.disabled = partida.pagado || !AmorOrders.estaAbierto(pedido);
        if (partida.pagado) remove.title = 'Los productos ya cobrados no se pueden eliminar.';
        actions.append(prepare, pay, remove); content.append(actions);
      }
      row.append(imagen(partida), content);
      return row;
    }
    function solicitarEliminacion(pedidoId, partidaId) {
      const pedido = getState().pedidos.find(p => p.id === pedidoId);
      const partida = pedido?.partidas.find(p => p.id === partidaId);
      if (!partida || partida.pagado || !AmorOrders.estaAbierto(pedido)) { notify('Este producto ya no se puede eliminar.'); return; }
      pendingRemoval = { pedidoId, partidaId };
      const importe = partida.precioUnitarioCentavos * partida.cantidad;
      $('remove-item-description').textContent = `Se eliminará la partida completa: ${partida.cantidad} × ${partida.nombre} (${dinero(importe / 100)}). El total quedará en ${dinero((pedido.totalCentavos - importe) / 100)}.${pedido.partidas.length === 1 ? ' Al ser el último producto, el pedido quedará CANCELADO y su mesa se liberará.' : ''}`;
      $('remove-item-error').hidden = true;
      if (!$('remove-item-dialog').open) $('remove-item-dialog').showModal();
    }
    function confirmarEliminacion() {
      try {
        if (!pendingRemoval) throw new Error('Vuelve a seleccionar el producto que quieres eliminar.');
        const next = getState();
        const index = next.pedidos.findIndex(p => p.id === pendingRemoval.pedidoId);
        if (index < 0) throw new Error('No se encontró el pedido.');
        const pedido = AmorOrders.eliminarPartida(next.pedidos[index], pendingRemoval.partidaId);
        if (!AmorOrders.estaAbierto(pedido) && next.adicion?.pedidoId === pedido.id) {
          if (next.adicion.partidas.length) throw new Error('Confirma o cancela la selección de productos nuevos antes de cerrar este pedido.');
          next.adicion = null;
        }
        next.pedidos[index] = pedido;
        if (!commit(next)) throw new Error('No se guardó la eliminación. El producto sigue en el pedido. Intenta de nuevo.');
        $('remove-item-dialog').close();
        notify(pedido.estado === 'CANCELADO' ? 'Pedido cancelado y mesa liberada' : 'Producto eliminado y total actualizado');
      } catch (error) {
        $('remove-item-error').textContent = error.message;
        $('remove-item-error').hidden = false;
      }
    }
    function renderEliminados(pedido) {
      const eliminadas = pedido.partidasEliminadas || [];
      $('ticket-removed').hidden = !eliminadas.length;
      $('ticket-removed-title').textContent = `Productos eliminados (${eliminadas.length}) · No incluidos en el total`;
      $('ticket-removed-lines').replaceChildren(...eliminadas.map(partida => {
        const row = node('article', 'removed-product');
        row.append(node('strong', '', `${partida.cantidad} × ${partida.nombre} · ${dinero(partida.precioUnitarioCentavos * partida.cantidad / 100)}`));
        const opciones = resumenOpciones(partida);
        if (opciones) row.append(node('p', 'line-options', opciones));
        if (partida.nota) row.append(node('p', 'line-note', `Nota: ${partida.nota}`));
        row.append(node('p', 'line-options', `Eliminado: ${horario.format(new Date(partida.eliminadoEn))}`));
        return row;
      }));
    }
    function cambiarEstado(pedidoId, partidaId, accion) {
      if (accion === 'pagado') { solicitarCobro(pedidoId, partidaId); return; }
      const next = getState();
      const index = next.pedidos.findIndex(pedido => pedido.id === pedidoId);
      if (index < 0) { notify('No se encontró el pedido.'); return; }
      next.pedidos[index] = AmorOrders.marcarPartida(next.pedidos[index], partidaId, accion);
      if (commit(next)) notify('Preparación guardada');
    }
    function abrirPedido(id) {
      activeOrderId = id;
      renderTicket();
      if (!$('ticket-dialog').open) $('ticket-dialog').showModal();
    }
    function renderTicket() {
      const pedido = getState().pedidos.find(p => p.id === activeOrderId);
      if (!pedido) return;
      $('ticket-title').textContent = pedido.etiqueta || `Pedido N° ${pedido.numero}`;
      $('ticket-meta').textContent = `Pedido N° ${pedido.numero} · ${horario.format(new Date(pedido.creadoEn))}`;
      $('ticket-status').textContent = `Estado: ${AmorOrders.estadoPedido(pedido)}`;
      $('ticket-lines').replaceChildren(...pedido.partidas.map(partida => linea(partida, pedido)));
      if (!pedido.partidas.length) $('ticket-lines').append(node('p', 'empty-state', 'Pedido cancelado. Todos sus productos se eliminaron.'));
      renderEliminados(pedido);
      $('ticket-total').textContent = dinero(pedido.totalCentavos / 100);
      $('prepare-all').disabled = pedido.partidas.every(partida => partida.preparado);
      $('pay-all').disabled = pedido.partidas.every(partida => partida.pagado);
      $('add-to-order').disabled = !AmorOrders.estaAbierto(pedido);
      const { comandaAlimentos, comandaBebidas } = pedido.partidas.length ? AmorPrinting.separarComandas(pedido) : { comandaAlimentos: [], comandaBebidas: [] };
      $('reprint-kitchen').disabled = !comandaAlimentos.length;
      $('reprint-bar').disabled = !comandaBebidas.length;
      $('reprint-order').disabled = !pedido.partidas.length;
      $('print-bill').disabled = !pedido.partidas.length;
      const pagado = pedido.partidas.filter(p => p.pagado).reduce((total, p) => total + p.precioUnitarioCentavos * p.cantidad, 0);
      $('ticket-balance').textContent = `Abonado ${dinero(pagado / 100)} · Pendiente ${dinero((pedido.totalCentavos - pagado) / 100)}`;
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
        title.append(node('span', 'queue-number', `N° ${pedido.numero}`), node('span', 'status-badge open', 'ABIERTO'));
        data.append(node('strong', 'queue-label', pedido.etiqueta || 'Sin etiqueta'), title, node('strong', 'queue-price', dinero(pedido.totalCentavos / 100)));
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
        const open = button('', 'history-order-open', () => abrirPedido(pedido.id));
        const title = node('span', 'history-order-heading');
        title.append(node('span', 'text-button', `Pedido N° ${pedido.numero} ↗`), node('span', 'status-badge', pedido.estado), node('strong', '', dinero(pedido.totalCentavos / 100)));
        open.append(title, node('span', 'history-order-label', pedido.etiqueta || 'Sin etiqueta'));
        card.append(open);
        const cobrado = pedido.partidas.filter(p => p.pagado && fechaLocal(p.pagadoEn) === selected.fecha).reduce((sum, p) => sum + p.precioUnitarioCentavos * p.cantidad, 0);
        open.append(node('span', 'history-order-note', `Pagado en este día: ${dinero(cobrado / 100)} · Ver detalle y reimpresiones`));
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
    $('confirm-remove-item').addEventListener('click', confirmarEliminacion);
    $('remove-item-dialog').addEventListener('close', () => { pendingRemoval = null; });
    $('load-expediente').addEventListener('click', openLoad);
    $('load-selected-day').addEventListener('click', () => {
      if (!selectedLoadDay) return;
      $('load-dialog').close(); openHistory(selectedLoadDay);
    });
    $('prepare-all').addEventListener('click', () => cambiarEstado(activeOrderId, 'todos', 'preparado'));
    $('pay-all').addEventListener('click', () => cambiarEstado(activeOrderId, 'todos', 'pagado'));
    $('reprint-order').addEventListener('click', () => {
      const pedido = getState().pedidos.find(p => p.id === activeOrderId);
      if (!pedido) return;
      AmorPrinting.imprimirComandas(pedido).catch(error => notify(`No se abrió la impresión: ${error.message}`));
    });
    $('print-bill').addEventListener('click', () => {
      const pedido = getState().pedidos.find(p => p.id === activeOrderId);
      if (pedido) AmorPrinting.imprimirCuenta(pedido).catch(error => notify(`No se abrió la impresión: ${error.message}`));
    });
    for (const [id, imprimir] of [['reprint-kitchen', 'imprimirComandaCocina'], ['reprint-bar', 'imprimirComandaBarra']]) {
      $(id).addEventListener('click', () => {
        const pedido = getState().pedidos.find(p => p.id === activeOrderId);
        if (pedido) AmorPrinting[imprimir](pedido).catch(error => notify(`No se abrió la impresión: ${error.message}`));
      });
    }
    $('add-to-order').addEventListener('click', () => agregarProductos(activeOrderId));
    $('toggle-queue').addEventListener('click', () => {
      const next = getState(); next.colaOculta = !next.colaOculta;
      commit(next);
    });
    return Object.freeze({ renderAll, openHistory, abrirPedido });
  }
  return Object.freeze({ iniciar });
})();
