/* Diálogos de caja; toda mutación se guarda junto con el expediente. */
globalThis.AmorCashUI = (() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const moneda = centavos => AmorPOS.dinero(centavos / 100);
  const horario = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Merida', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const campos = [
    ['fondoInicialCentavos', 'Fondo Inicial', ''],
    ['ventasEfectivoCentavos', '(+) Ventas en Efectivo', ''],
    ['gastosExtrasCentavos', '(-) Gastos Extras', ''],
    ['efectivoEsperadoCentavos', '(=) Efectivo Esperado en Caja', 'expected'],
    ['ventasTarjetaCentavos', 'Ventas en Tarjeta/Transferencia', ''],
    ['totalVentasCentavos', 'Total General de Ventas (Efectivo + Tarjeta)', 'sales']
  ];
  function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text != null) result.textContent = text;
    return result;
  }
  function mostrarError(id, mensaje) {
    $(id).textContent = mensaje;
    $(id).hidden = false;
  }
  function resumenEn(container, resumen) {
    container.replaceChildren(...campos.map(([key, label, className]) => {
      const row = node('div', `cash-summary-row ${className}`);
      const value = node('dd', '', moneda(resumen[key]));
      value.dataset.value = key;
      row.append(node('dt', '', label), value);
      return row;
    }));
  }
  function gastosEn(container, gastos) {
    container.replaceChildren(...gastos.map(gasto => {
      const row = node('li');
      row.append(node('span', '', gasto.concepto), node('strong', '', moneda(gasto.montoCentavos)));
      return row;
    }));
    if (!gastos.length) container.append(node('li', '', 'Sin gastos registrados.'));
  }
  function iniciar({ getState, commit, notify }) {
    let pendingPayment = null;
    let expenseShiftId = null;
    let closeShiftId = null;

    function pendiente(pedidoId, partidaId) {
      const state = getState();
      const pedido = state.pedidos.find(p => p.id === pedidoId);
      if (!pedido) throw new Error('No se encontró el pedido.');
      const partidas = pedido.partidas.filter(p => !p.pagado && (partidaId === 'todos' || p.id === partidaId));
      if (!partidas.length) throw new Error('Estos productos ya están pagados.');
      return { pedido, partidas, montoCentavos: AmorPOS.totalPedido(partidas), turnoId: state.caja.turnoId };
    }
    function mostrarApertura() {
      if (getState().caja.abierta) return;
      $('cash-open-form').reset(); $('cash-open-error').hidden = true;
      if (!$('cash-open-dialog').open) $('cash-open-dialog').showModal();
    }
    function mostrarPago() {
      const { pedido, partidas, montoCentavos, turnoId } = pendiente(pendingPayment.pedidoId, pendingPayment.partidaId);
      if (!getState().caja.abierta) throw new Error('Abre la caja antes de cobrar.');
      pendingPayment = { ...pendingPayment, turnoId, montoCentavos, partidaIds: partidas.map(p => p.id) };
      $('cash-payment-form').reset(); $('cash-payment-error').hidden = true;
      $('cash-payment-note').textContent = `Pedido N° ${pedido.numero} · ${pedido.etiqueta || 'Sin etiqueta'} · ${partidas.reduce((sum, p) => sum + p.cantidad, 0)} productos pendientes`;
      $('cash-payment-total').textContent = moneda(montoCentavos);
      actualizarValidacionPago();
      if (!$('cash-payment-dialog').open) $('cash-payment-dialog').showModal();
    }
    function actualizarValidacionPago() {
      const status = $('cash-payment-status');
      const confirm = $('cash-payment-confirm');
      confirm.disabled = true;
      $('cash-payment-error').hidden = true;
      if (!pendingPayment) return null;
      try {
        const pago = AmorCash.validarPago(pendingPayment.montoCentavos, $('cash-payment-cash').value, $('cash-payment-card').value);
        if (!pago.completo) {
          status.dataset.state = 'missing';
          status.textContent = `Faltan: ${moneda(pago.faltanteCentavos)}`;
        } else if (pago.cambioCentavos > 0) {
          status.dataset.state = 'change';
          status.textContent = `Cambio a entregar: ${moneda(pago.cambioCentavos)}`;
        } else {
          status.dataset.state = 'complete';
          status.textContent = 'Cobro completo';
        }
        confirm.disabled = !pago.completo;
        return pago;
      } catch (error) {
        status.dataset.state = 'invalid';
        status.textContent = error.message;
        return null;
      }
    }
    function solicitarCobro(pedidoId, partidaId = 'todos') {
      try {
        pendiente(pedidoId, partidaId);
        pendingPayment = { pedidoId, partidaId };
        if (!getState().caja.abierta) mostrarApertura();
        else mostrarPago();
      } catch (error) { pendingPayment = null; notify(error.message); }
    }
    function renderCorte() {
      const { caja, pedidos } = getState();
      $('close-shift').disabled = !caja.abierta || caja.turnoId !== closeShiftId;
      $('cash-close-note').textContent = caja.abierta ? `Turno abierto el ${horario.format(new Date(caja.abiertoEn))}. Importes en MXN.` : 'La caja está cerrada.';
      resumenEn($('cash-summary'), AmorCash.resumirCaja(caja, pedidos));
      $('cash-expenses-title').textContent = `Conceptos de gastos (${caja.gastosDelDia.length})`;
      gastosEn($('cash-expenses-list'), caja.gastosDelDia);
    }
    function renderHistorial() {
      const cortes = [...getState().historialCortes].reverse();
      $('cash-history-empty').hidden = cortes.length > 0;
      $('cash-history-list').replaceChildren(...cortes.map(corte => {
        const card = node('details', 'cash-saved-cut');
        const heading = node('summary', '', `${horario.format(new Date(corte.cerradoEn))} · Efectivo esperado: ${moneda(corte.efectivoEsperadoCentavos)}`);
        const period = node('p', 'modal-description', `Apertura: ${horario.format(new Date(corte.abiertoEn))}`);
        const summary = node('dl', 'cash-summary');
        resumenEn(summary, corte);
        const gastos = node('details', 'cash-expenses');
        const list = node('ul'); gastosEn(list, corte.gastosDelDia);
        gastos.append(node('summary', '', `Gastos (${corte.gastosDelDia.length})`), list);
        card.append(heading, period, summary, gastos);
        return card;
      }));
    }
    function renderAll() {
      const { caja, pedidos } = getState();
      const resumen = AmorCash.resumirCaja(caja, pedidos);
      $('cash-status').textContent = caja.abierta ? `Caja abierta · Efectivo esperado ${moneda(resumen.efectivoEsperadoCentavos)}` : 'Caja cerrada · Abre un turno para cobrar';
      $('cash-status').dataset.open = String(caja.abierta);
      $('cash-open-button').disabled = caja.abierta;
      $('cash-expense-button').disabled = !caja.abierta;
      $('cash-close-button').disabled = !caja.abierta;
      if ($('cash-close-dialog').open) renderCorte();
      if ($('cash-history-dialog').open) renderHistorial();
    }

    $('cash-open-button').addEventListener('click', () => { pendingPayment = null; mostrarApertura(); });
    $('cash-open-dialog').addEventListener('close', () => {
      if (!getState().caja.abierta) pendingPayment = null;
    });
    $('cash-open-form').addEventListener('submit', event => {
      event.preventDefault();
      try {
        const next = getState();
        next.caja = AmorCash.abrirCaja(next.caja, $('cash-opening-fund').value);
        if (!commit(next)) throw new Error('No se guardó la apertura. Revisa el almacenamiento e intenta de nuevo.');
        $('cash-open-dialog').close(); notify('Caja abierta');
        if (pendingPayment) mostrarPago();
      } catch (error) { mostrarError('cash-open-error', error.message); }
    });
    $('cash-payment-dialog').addEventListener('close', () => { pendingPayment = null; });
    for (const id of ['cash-payment-cash', 'cash-payment-card']) $(id).addEventListener('input', actualizarValidacionPago);
    $('cash-payment-form').addEventListener('submit', event => {
      event.preventDefault();
      try {
        if (!pendingPayment) throw new Error('Vuelve a seleccionar el pedido que quieres cobrar.');
        const next = getState();
        if (!next.caja.abierta || next.caja.turnoId !== pendingPayment.turnoId) throw new Error('El turno cambió. Cancela este cobro y vuelve a abrirlo.');
        const current = pendiente(pendingPayment.pedidoId, pendingPayment.partidaId);
        if (current.montoCentavos !== pendingPayment.montoCentavos || JSON.stringify(current.partidas.map(p => p.id)) !== JSON.stringify(pendingPayment.partidaIds)) {
          mostrarPago();
          throw new Error('Los pagos del pedido cambiaron. Revisa el total e ingresa nuevamente los montos.');
        }
        const pago = actualizarValidacionPago();
        if (!pago || !pago.completo) throw new Error($('cash-payment-status').textContent);
        const index = next.pedidos.findIndex(p => p.id === pendingPayment.pedidoId);
        const cobro = AmorCash.cobrarPartidas(next.pedidos[index], pendingPayment.partidaId, next.caja, { efectivoRecibido: $('cash-payment-cash').value, montoTarjeta: $('cash-payment-card').value });
        next.pedidos[index] = cobro.pedido; next.caja = cobro.caja;
        if (!commit(next)) throw new Error('No se guardó el cobro. El pedido sigue pendiente.');
        pendingPayment = null; $('cash-payment-dialog').close();
        notify(`Cobro registrado: ${moneda(cobro.montoCentavos)}${pago.cambioCentavos > 0 ? ` · Cambio a entregar: ${moneda(pago.cambioCentavos)}` : ''}`);
      } catch (error) { mostrarError('cash-payment-error', error.message); }
    });
    $('cash-expense-button').addEventListener('click', () => {
      const { caja } = getState();
      if (!caja.abierta) { notify('Abre la caja antes de registrar un gasto.'); return; }
      expenseShiftId = caja.turnoId;
      $('cash-expense-form').reset(); $('cash-expense-error').hidden = true;
      $('cash-expense-dialog').showModal();
    });
    $('cash-expense-form').addEventListener('submit', event => {
      event.preventDefault();
      try {
        const next = getState();
        if (next.caja.turnoId !== expenseShiftId) throw new Error('El turno cambió. Cancela y vuelve a registrar el gasto.');
        next.caja = AmorCash.registrarGasto(next.caja, $('cash-expense-amount').value, $('cash-expense-concept').value);
        if (!commit(next)) throw new Error('No se guardó el gasto. Intenta de nuevo.');
        $('cash-expense-dialog').close(); notify('Gasto de efectivo guardado');
      } catch (error) { mostrarError('cash-expense-error', error.message); }
    });
    $('cash-close-button').addEventListener('click', () => {
      const { caja } = getState();
      if (!caja.abierta) { notify('La caja está cerrada.'); return; }
      closeShiftId = caja.turnoId; $('cash-close-error').hidden = true;
      renderCorte(); $('cash-close-dialog').showModal();
    });
    $('close-shift').addEventListener('click', () => {
      try {
        const next = getState();
        if (next.caja.turnoId !== closeShiftId) throw new Error('El turno cambió. Vuelve a abrir su corte.');
        const cierre = AmorCash.cerrarCaja(next.caja, undefined, next.pedidos);
        next.historialCortes.push(cierre.corte); next.caja = cierre.caja;
        if (!commit(next)) throw new Error('No se guardó el corte. La caja sigue abierta.');
        $('cash-close-dialog').close(); notify('Turno cerrado y corte guardado');
      } catch (error) { mostrarError('cash-close-error', error.message); }
    });
    $('cash-history-button').addEventListener('click', () => { renderHistorial(); $('cash-history-dialog').showModal(); });
    return Object.freeze({ renderAll, solicitarCobro, ofrecerApertura: mostrarApertura });
  }
  return Object.freeze({ iniciar });
})();
