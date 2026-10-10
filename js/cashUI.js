/* Diálogos de caja; toda mutación se guarda junto con el expediente. */
globalThis.AmorCashUI = (() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const moneda = centavos => AmorPOS.dinero(centavos / 100);
  const horario = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Merida', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const campos = [
    ['fondoInicialCentavos', 'Fondo Inicial', ''],
    ['ventasEfectivoCentavos', '(+) Ventas en Efectivo', ''],
    ['propinasEfectivoCentavos', '(+) Propinas en Efectivo', ''],
    ['gastosExtrasCentavos', '(-) Gastos Extras', ''],
    ['efectivoEsperadoCentavos', '(=) Efectivo Esperado en Caja', 'expected'],
    ['ventasTarjetaCentavos', 'Ventas en Tarjeta/Transferencia', ''],
    ['propinasTarjetaCentavos', 'Propinas en Tarjeta/Transferencia', ''],
    ['totalVentasCentavos', 'Total General de Ventas (Efectivo + Tarjeta)', 'sales'],
    ['totalPropinasCentavos', 'Total de Propinas', 'tips']
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
  function listaReparto(reparto) {
    return reparto.map(persona => {
      const row = node('li');
      row.append(node('span', '', `${persona.nombre}${persona.porcentaje != null ? ` · ${persona.porcentaje}%` : ''}`), node('strong', '', moneda(persona.montoCentavos)));
      return row;
    });
  }
  function repartoEn(container, caja) {
    const propinas = AmorCash.resumirPropinas(caja);
    container.replaceChildren(node('h3', '', 'Reparto de propinas'));
    if (!propinas.configurado) {
      container.append(node('p', 'group-help', 'Reparto sin configurar.'));
      return;
    }
    container.append(node('p', 'group-help', caja.repartoPropinas.tipo === 'igual' ? `Partes iguales entre ${propinas.reparto.length} personas` : `Por porcentaje entre ${propinas.reparto.length} personas`));
    const lista = node('ul', 'tips-split-list'); lista.append(...listaReparto(propinas.reparto));
    container.append(lista);
  }
  function iniciar({ getState, commit, notify }) {
    let pendingPayment = null;
    let expenseShiftId = null;
    let closeShiftId = null;
    let dailyTipEdited = false;
    let tipsShiftId = null;

    function importesPago() {
      const campos = [$('cash-payment-cash'), $('cash-payment-card')];
      if (campos.some(input => input.validity.badInput)) throw new Error('Escribe un monto válido en cada campo de cobro.');
      return { efectivoRecibido: campos[0].value === '' ? '0' : campos[0].value, montoTarjeta: campos[1].value === '' ? '0' : campos[1].value };
    }

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
        const montos = importesPago();
        const pago = AmorCash.validarPago(pendingPayment.montoCentavos, montos.efectivoRecibido, montos.montoTarjeta);
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
    function cajaParaCorte(fecha = new Date().toISOString()) {
      const { caja } = getState();
      if (!caja.abierta || caja.turnoId !== closeShiftId) throw new Error('El turno cambió. Vuelve a abrir su corte.');
      const input = $('cash-daily-tip');
      if (input.validity.badInput || input.value === '') throw new Error('Captura la Propina del Día; usa 0 si no hubo propinas.');
      return AmorCash.completarPropinaDelDia(caja, input.value, fecha);
    }
    function renderCorte() {
      const { caja, pedidos } = getState();
      const disponible = caja.abierta && caja.turnoId === closeShiftId;
      $('close-shift').disabled = !disponible;
      $('print-current-cut').disabled = !disponible;
      $('cash-daily-tip').disabled = !disponible;
      if (!dailyTipEdited) $('cash-daily-tip').value = (AmorCash.resumirPropinas(caja).totalCentavos / 100).toFixed(2);
      $('cash-close-note').textContent = caja.abierta ? `Turno abierto el ${horario.format(new Date(caja.abiertoEn))}. Importes en MXN.` : 'La caja está cerrada.';
      let prevista = caja;
      try {
        prevista = cajaParaCorte();
        $('cash-close-error').hidden = true;
      } catch (error) {
        mostrarError('cash-close-error', error.message);
        $('close-shift').disabled = true;
        $('print-current-cut').disabled = true;
      }
      resumenEn($('cash-summary'), AmorCash.resumirCaja(prevista, pedidos));
      $('cash-expenses-title').textContent = `Conceptos de gastos (${caja.gastosDelDia.length})`;
      gastosEn($('cash-expenses-list'), caja.gastosDelDia);
      repartoEn($('cash-close-tips'), prevista);
    }
    function renderHistorial() {
      const cortes = [...getState().historialCortes].reverse();
      $('cash-history-empty').hidden = cortes.length > 0;
      $('cash-history-list').replaceChildren(...cortes.map(corte => {
        const card = node('article', 'cash-saved-cut');
        const detail = node('details');
        const heading = node('summary', '', `${horario.format(new Date(corte.cerradoEn))} · Efectivo esperado: ${moneda(corte.efectivoEsperadoCentavos)}`);
        const period = node('p', 'modal-description', `Apertura: ${horario.format(new Date(corte.abiertoEn))}`);
        const summary = node('dl', 'cash-summary');
        resumenEn(summary, corte);
        const gastos = node('details', 'cash-expenses');
        const list = node('ul'); gastosEn(list, corte.gastosDelDia);
        gastos.append(node('summary', '', `Gastos (${corte.gastosDelDia.length})`), list);
        const propinas = node('section', 'cash-cut-tips'); repartoEn(propinas, corte);
        const print = node('button', 'secondary-button print-cut-button', 'Reimprimir Corte');
        print.type = 'button'; print.dataset.corte = corte.id;
        print.addEventListener('click', () => AmorPrinting.imprimirCorte(corte).catch(error => notify(`No se abrió la impresión: ${error.message}`)));
        detail.append(heading, period, summary, gastos, propinas);
        card.append(detail, print);
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
      $('cash-tips-button').disabled = !caja.abierta;
      if ($('cash-close-dialog').open) renderCorte();
      if ($('cash-history-dialog').open) renderHistorial();
      if ($('cash-tips-dialog').open) renderPropinas();
    }

    function numeroPersonas() {
      const texto = $('tips-people-count').value;
      const cantidad = Number(texto);
      if (!/^\d+$/.test(texto) || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 50) throw new Error('Elige entre 1 y 50 personas.');
      return cantidad;
    }
    function filasPorcentaje(personas = []) {
      const container = $('tips-percentages');
      container.hidden = $('tips-split-type').value !== 'porcentaje';
      if (container.hidden) return;
      let cantidad;
      try { cantidad = numeroPersonas(); }
      catch { container.replaceChildren(); return; }
      container.replaceChildren(...Array.from({ length: cantidad }, (_, index) => {
        const row = node('div', 'tips-person-row');
        const nombre = node('input'); nombre.type = 'text'; nombre.maxLength = 60; nombre.placeholder = `Persona ${index + 1}`;
        nombre.setAttribute('aria-label', `Nombre de persona ${index + 1}`);
        nombre.value = personas[index]?.nombre || '';
        const etiqueta = node('label', 'tips-percent-field', '%');
        const porcentaje = node('input'); porcentaje.type = 'number'; porcentaje.min = '0'; porcentaje.max = '100'; porcentaje.step = '0.01';
        porcentaje.setAttribute('aria-label', `Porcentaje de persona ${index + 1}`);
        const puntos = Math.floor(10000 / cantidad) + (index < 10000 % cantidad ? 1 : 0);
        porcentaje.value = personas[index]?.porcentaje ?? puntos / 100;
        etiqueta.prepend(porcentaje); row.append(nombre, etiqueta);
        return row;
      }));
    }
    function leerReparto() {
      const cantidad = numeroPersonas();
      if ($('tips-split-type').value === 'igual') return { tipo: 'igual', personas: cantidad };
      return { tipo: 'porcentaje', personas: [...$('tips-percentages').children].map((row, index) => {
        const [nombre, porcentaje] = row.querySelectorAll('input');
        if (porcentaje.validity.badInput || porcentaje.value === '') throw new Error('Captura el porcentaje de cada persona.');
        return { nombre: nombre.value.trim() || `Persona ${index + 1}`, porcentaje: Number(porcentaje.value) };
      }) };
    }
    function actualizarVistaReparto() {
      const status = $('tips-split-status');
      $('tips-save-split').disabled = true;
      try {
        const caja = getState().caja;
        if (!caja.abierta || caja.turnoId !== tipsShiftId) throw new Error('El turno cambió. Cierra esta ventana y vuelve a abrir las propinas.');
        const configurada = AmorCash.configurarRepartoPropinas(caja, leerReparto());
        const resumen = AmorCash.resumirPropinas(configurada);
        $('tips-split-preview').replaceChildren(...listaReparto(resumen.reparto));
        status.textContent = 'Vista previa del reparto · Guarda para incluirlo en el corte.';
        status.dataset.state = 'valid';
        $('tips-save-split').disabled = false;
      } catch (error) {
        $('tips-split-preview').replaceChildren();
        status.textContent = error.message;
        status.dataset.state = 'invalid';
      }
    }
    function renderPropinas() {
      const { caja } = getState();
      const propinas = AmorCash.resumirPropinas(caja);
      $('tips-total').textContent = moneda(propinas.totalCentavos);
      $('tips-methods').textContent = `Efectivo ${moneda(propinas.efectivoCentavos)} · Tarjeta/transferencia ${moneda(propinas.tarjetaCentavos)}`;
      const registros = caja.propinas || [];
      $('tips-records-title').textContent = `Propinas registradas (${registros.length})`;
      $('tips-records-list').replaceChildren(...registros.map(propina => {
        const row = node('li');
        row.append(node('span', '', `${propina.metodo === 'efectivo' ? 'Efectivo' : 'Tarjeta/transferencia'} · ${horario.format(new Date(propina.fecha))}`), node('strong', '', moneda(propina.montoCentavos)));
        return row;
      }));
      if (!registros.length) $('tips-records-list').append(node('li', '', 'Aún no hay propinas registradas.'));
      $('cash-tip-form').querySelector('button[type="submit"]').disabled = !caja.abierta || caja.turnoId !== tipsShiftId;
      actualizarVistaReparto();
    }
    function mostrarPropinas() {
      const { caja } = getState();
      if (!caja.abierta) { notify('Abre la caja antes de registrar propinas.'); return; }
      tipsShiftId = caja.turnoId;
      $('cash-tip-form').reset(); $('tips-split-form').reset();
      $('cash-tip-error').hidden = true; $('tips-split-error').hidden = true;
      const config = caja.repartoPropinas;
      $('tips-split-type').value = config?.tipo || 'igual';
      $('tips-people-count').value = config ? config.tipo === 'igual' ? config.personas : config.personas.length : 2;
      filasPorcentaje(config?.tipo === 'porcentaje' ? config.personas : []);
      renderPropinas();
      if (!$('cash-tips-dialog').open) $('cash-tips-dialog').showModal();
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
        const cobro = AmorCash.cobrarPartidas(next.pedidos[index], pendingPayment.partidaId, next.caja, importesPago());
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
    $('cash-tips-button').addEventListener('click', mostrarPropinas);
    $('cash-close-edit-tips').addEventListener('click', mostrarPropinas);
    $('cash-tip-form').addEventListener('submit', event => {
      event.preventDefault();
      try {
        const next = getState();
        if (next.caja.turnoId !== tipsShiftId) throw new Error('El turno cambió. Cierra esta ventana y vuelve a registrar la propina.');
        next.caja = AmorCash.registrarPropina(next.caja, $('cash-tip-amount').value, $('cash-tip-method').value);
        if (!commit(next)) throw new Error('No se guardó la propina. Intenta de nuevo.');
        $('cash-tip-amount').value = ''; $('cash-tip-error').hidden = true;
        notify('Propina guardada');
      } catch (error) { mostrarError('cash-tip-error', error.message); }
    });
    $('tips-split-type').addEventListener('change', () => { filasPorcentaje(); actualizarVistaReparto(); });
    $('tips-people-count').addEventListener('input', () => {
      const personas = [...$('tips-percentages').children].map(row => {
        const [nombre, porcentaje] = row.querySelectorAll('input'); return { nombre: nombre.value, porcentaje: porcentaje.value };
      });
      filasPorcentaje(personas); actualizarVistaReparto();
    });
    $('tips-split-form').addEventListener('input', () => { $('tips-split-error').hidden = true; actualizarVistaReparto(); });
    $('tips-split-form').addEventListener('submit', event => {
      event.preventDefault();
      try {
        const next = getState();
        if (next.caja.turnoId !== tipsShiftId) throw new Error('El turno cambió. Cierra esta ventana y vuelve a configurar el reparto.');
        next.caja = AmorCash.configurarRepartoPropinas(next.caja, leerReparto());
        if (!commit(next)) throw new Error('No se guardó el reparto. Intenta de nuevo.');
        $('tips-split-error').hidden = true;
        $('tips-split-status').textContent = 'Reparto guardado. Se incluirá en el corte.';
        notify('Reparto de propinas guardado');
      } catch (error) { mostrarError('tips-split-error', error.message); }
    });
    $('cash-close-button').addEventListener('click', () => {
      const { caja } = getState();
      if (!caja.abierta) { notify('La caja está cerrada.'); return; }
      closeShiftId = caja.turnoId; $('cash-close-error').hidden = true;
      dailyTipEdited = false;
      renderCorte(); $('cash-close-dialog').showModal();
    });
    $('cash-daily-tip').addEventListener('input', () => { dailyTipEdited = true; renderCorte(); });
    $('print-current-cut').addEventListener('click', () => {
      try {
        const fecha = new Date().toISOString();
        const { corte } = AmorCash.cerrarCaja(cajaParaCorte(fecha), fecha, getState().pedidos);
        AmorPrinting.imprimirCorte(corte, { provisional: true }).catch(error => mostrarError('cash-close-error', `No se abrió la impresión: ${error.message}`));
      } catch (error) { mostrarError('cash-close-error', error.message); }
    });
    $('close-shift').addEventListener('click', () => {
      try {
        const next = getState();
        if (next.caja.turnoId !== closeShiftId) throw new Error('El turno cambió. Vuelve a abrir su corte.');
        const fecha = new Date().toISOString();
        const cierre = AmorCash.cerrarCaja(cajaParaCorte(fecha), fecha, next.pedidos);
        next.historialCortes.push(cierre.corte); next.caja = cierre.caja;
        if (!commit(next)) throw new Error('No se guardó el corte. La caja sigue abierta.');
        $('cash-close-dialog').close(); notify('Turno cerrado y corte guardado');
        AmorPrinting.imprimirCorte(cierre.corte).catch(error => notify(`Corte guardado. No se abrió la impresión: ${error.message}. Puedes imprimirlo desde Cortes guardados.`));
      } catch (error) { mostrarError('cash-close-error', error.message); }
    });
    function abrirHistorial() {
      renderHistorial();
      if (!$('cash-history-dialog').open) $('cash-history-dialog').showModal();
    }
    $('cash-history-button').addEventListener('click', abrirHistorial);
    $('history-cuts-button').addEventListener('click', abrirHistorial);
    return Object.freeze({ renderAll, solicitarCobro, ofrecerApertura: mostrarApertura });
  }
  return Object.freeze({ iniciar });
})();
