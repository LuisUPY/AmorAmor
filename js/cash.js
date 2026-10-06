/* Caja por turno: todos los cálculos usan centavos enteros. No modifica sus entradas. */
globalThis.AmorCash = (() => {
  'use strict';
  const metodos = Object.freeze(['efectivo', 'tarjeta']);
  const clavesResumen = Object.freeze(['fondoInicialCentavos', 'ventasEfectivoCentavos', 'gastosExtrasCentavos', 'efectivoEsperadoCentavos', 'ventasTarjetaCentavos', 'totalVentasCentavos']);
  const copia = value => JSON.parse(JSON.stringify(value));
  const cajaVacia = () => ({ abierta: false, turnoId: null, abiertoEn: null, fondoInicialCentavos: 0, gastosDelDia: [], pagos: [] });
  const idValido = id => typeof id === 'string' && !!id.trim() && id.length <= 200;
  const fechaValida = fecha => typeof fecha === 'string' && Number.isFinite(Date.parse(fecha));
  const entero = valor => Number.isSafeInteger(valor) && valor >= 0;
  function sumar(a, b) {
    const total = a + b;
    if (!entero(total)) throw new Error('El importe excede el límite de cálculo seguro.');
    return total;
  }
  function montoACentavos(monto, permiteCero = false) {
    const texto = String(monto).trim();
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(texto)) throw new Error('Escribe un monto con hasta dos decimales, usando coma o punto.');
    const [pesos, decimales = ''] = texto.replace(',', '.').split('.');
    const importe = Number(pesos) * 100 + Number(decimales.padEnd(2, '0'));
    if (!entero(importe) || importe > 99999999 || (!permiteCero && importe === 0)) throw new Error(`El monto debe ser entre ${permiteCero ? '$0.00' : '$0.01'} y $999,999.99.`);
    return importe;
  }
  function resumenSinValidar(caja) {
    let ventasEfectivoCentavos = 0, ventasTarjetaCentavos = 0, gastosExtrasCentavos = 0;
    for (const pago of caja.pagos) {
      if (pago.metodo === 'efectivo') ventasEfectivoCentavos = sumar(ventasEfectivoCentavos, pago.importeCentavos);
      else ventasTarjetaCentavos = sumar(ventasTarjetaCentavos, pago.importeCentavos);
    }
    for (const gasto of caja.gastosDelDia) gastosExtrasCentavos = sumar(gastosExtrasCentavos, gasto.montoCentavos);
    const efectivoDisponible = sumar(caja.fondoInicialCentavos, ventasEfectivoCentavos);
    if (gastosExtrasCentavos > efectivoDisponible) throw new Error('Los gastos exceden el efectivo disponible en caja.');
    return {
      fondoInicialCentavos: caja.fondoInicialCentavos, ventasEfectivoCentavos, gastosExtrasCentavos,
      efectivoEsperadoCentavos: efectivoDisponible - gastosExtrasCentavos, ventasTarjetaCentavos,
      totalVentasCentavos: sumar(ventasEfectivoCentavos, ventasTarjetaCentavos)
    };
  }
  function normalizarCaja(raw) {
    // Expedientes anteriores no tienen caja: empiezan cerrados y sus pagos conservan su historial.
    if (raw === undefined) return cajaVacia();
    if (!raw || typeof raw !== 'object' || typeof raw.abierta !== 'boolean' || !entero(raw.fondoInicialCentavos) ||
      !Array.isArray(raw.gastosDelDia) || !Array.isArray(raw.pagos)) throw new Error('Estado de caja inválido.');
    if (!raw.abierta) {
      if (raw.turnoId !== null || raw.abiertoEn !== null || raw.fondoInicialCentavos !== 0 || raw.gastosDelDia.length || raw.pagos.length) throw new Error('La caja cerrada debe estar en cero.');
      return cajaVacia();
    }
    if (!idValido(raw.turnoId) || !fechaValida(raw.abiertoEn)) throw new Error('Apertura de caja inválida.');
    const fechaApertura = Date.parse(raw.abiertoEn);
    const ids = new Set(), partidasPagadas = new Set();
    for (const gasto of raw.gastosDelDia) {
      if (!gasto || !idValido(gasto.id) || ids.has(gasto.id) || !entero(gasto.montoCentavos) || gasto.montoCentavos === 0 ||
        typeof gasto.concepto !== 'string' || !gasto.concepto.trim() || gasto.concepto.length > 200 ||
        !fechaValida(gasto.fecha) || Date.parse(gasto.fecha) < fechaApertura) throw new Error('Gasto de caja inválido.');
      ids.add(gasto.id);
    }
    for (const pago of raw.pagos) {
      if (!pago || !idValido(pago.id) || ids.has(pago.id) || !idValido(pago.pedidoId) || !entero(pago.importeCentavos) ||
        !metodos.includes(pago.metodo) || !fechaValida(pago.fecha) || Date.parse(pago.fecha) < fechaApertura ||
        !Array.isArray(pago.partidaIds) || !pago.partidaIds.length) throw new Error('Pago de caja inválido.');
      ids.add(pago.id);
      for (const partidaId of pago.partidaIds) {
        const clave = JSON.stringify([pago.pedidoId, partidaId]);
        if (!idValido(partidaId) || partidasPagadas.has(clave)) throw new Error('Hay productos cobrados más de una vez en caja.');
        partidasPagadas.add(clave);
      }
    }
    const caja = { abierta: true, turnoId: raw.turnoId, abiertoEn: raw.abiertoEn, fondoInicialCentavos: raw.fondoInicialCentavos,
      gastosDelDia: copia(raw.gastosDelDia), pagos: copia(raw.pagos) };
    resumenSinValidar(caja);
    return caja;
  }
  function exigirAbierta(caja) {
    const normalizada = normalizarCaja(caja);
    if (!normalizada.abierta) throw new Error('Abre la caja antes de registrar cobros o gastos.');
    return normalizada;
  }
  function fechaDelTurno(caja, fecha) {
    if (!fechaValida(fecha) || Date.parse(fecha) < Date.parse(caja.abiertoEn)) throw new Error('La fecha del movimiento debe ser posterior a la apertura.');
    return fecha;
  }
  function abrirCaja(caja, monto, fecha = new Date().toISOString()) {
    if (normalizarCaja(caja).abierta) throw new Error('La caja ya tiene un turno abierto.');
    if (!fechaValida(fecha)) throw new Error('Fecha de apertura inválida.');
    const fondoInicialCentavos = montoACentavos(monto, true);
    const sufijo = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
    return normalizarCaja({ abierta: true, turnoId: `turno-${Date.parse(fecha)}-${sufijo}`, abiertoEn: fecha,
      fondoInicialCentavos, gastosDelDia: [], pagos: [] });
  }
  function registrarGasto(caja, monto, concepto, fecha = new Date().toISOString()) {
    const resultado = exigirAbierta(caja);
    const montoCentavos = montoACentavos(monto);
    if (typeof concepto !== 'string' || !concepto.trim() || concepto.trim().length > 200) throw new Error('Escribe un concepto de hasta 200 caracteres.');
    if (montoCentavos > resumenSinValidar(resultado).efectivoEsperadoCentavos) throw new Error('El gasto excede el efectivo esperado en caja.');
    resultado.gastosDelDia.push({ id: `${resultado.turnoId}-gasto-${resultado.gastosDelDia.length + 1}`,
      montoCentavos, concepto: concepto.trim(), fecha: fechaDelTurno(resultado, fecha) });
    return normalizarCaja(resultado);
  }
  function resumirCaja(caja) {
    return resumenSinValidar(normalizarCaja(caja));
  }
  function normalizarCorte(raw) {
    if (!raw || raw.id !== raw.turnoId || !fechaValida(raw.cerradoEn) || !fechaValida(raw.abiertoEn) ||
      Date.parse(raw.cerradoEn) < Date.parse(raw.abiertoEn)) throw new Error('Corte de caja inválido.');
    const caja = normalizarCaja({ ...raw, abierta: true });
    if (caja.gastosDelDia.some(gasto => Date.parse(gasto.fecha) > Date.parse(raw.cerradoEn)) ||
      caja.pagos.some(pago => Date.parse(pago.fecha) > Date.parse(raw.cerradoEn))) throw new Error('El corte contiene movimientos posteriores al cierre.');
    const resumen = resumenSinValidar(caja);
    if (clavesResumen.some(clave => raw[clave] !== resumen[clave])) throw new Error('Las sumas del corte de caja son inconsistentes.');
    return { id: caja.turnoId, turnoId: caja.turnoId, abiertoEn: caja.abiertoEn, cerradoEn: raw.cerradoEn,
      gastosDelDia: caja.gastosDelDia, pagos: caja.pagos, ...resumen };
  }
  function cerrarCaja(caja, fecha = new Date().toISOString()) {
    const actual = exigirAbierta(caja);
    const corte = normalizarCorte({ id: actual.turnoId, turnoId: actual.turnoId, abiertoEn: actual.abiertoEn,
      cerradoEn: fechaDelTurno(actual, fecha), gastosDelDia: actual.gastosDelDia, pagos: actual.pagos, ...resumenSinValidar(actual) });
    return { caja: cajaVacia(), corte };
  }
  function importePartida(partida) {
    if (!partida || !Number.isInteger(partida.cantidad) || partida.cantidad < 1 || partida.cantidad > 99 ||
      !entero(partida.precioUnitarioCentavos) || !entero(partida.cantidad * partida.precioUnitarioCentavos)) throw new Error('Importe del producto inválido.');
    return partida.cantidad * partida.precioUnitarioCentavos;
  }
  function cobrarPartidas(pedido, partidaId, caja, metodo, fecha = new Date().toISOString()) {
    const siguienteCaja = exigirAbierta(caja);
    if (!metodos.includes(metodo)) throw new Error('Selecciona Efectivo o Tarjeta/Transferencia.');
    if (!pedido || !idValido(pedido.id) || !Array.isArray(pedido.partidas) || !pedido.partidas.length) throw new Error('Pedido inválido para cobrar.');
    const ids = new Set();
    for (const partida of pedido.partidas) {
      if (!partida || !idValido(partida.id) || ids.has(partida.id) || typeof partida.pagado !== 'boolean') throw new Error('Producto inválido para cobrar.');
      ids.add(partida.id);
    }
    const resultado = copia(pedido);
    const seleccionadas = partidaId === 'todos' ? resultado.partidas : resultado.partidas.filter(partida => partida.id === partidaId);
    if (!seleccionadas.length) throw new Error('Producto del pedido no encontrado.');
    const pendientes = seleccionadas.filter(partida => !partida.pagado);
    if (!pendientes.length) throw new Error('Estos productos ya están pagados.');
    fechaDelTurno(siguienteCaja, fecha);
    let montoCentavos = 0;
    for (const partida of pendientes) {
      montoCentavos = sumar(montoCentavos, importePartida(partida));
      partida.pagado = true; partida.pagadoEn = fecha;
      partida.metodoPago = metodo; partida.turnoId = siguienteCaja.turnoId;
    }
    resultado.estado = resultado.partidas.every(partida => partida.pagado) ? 'PAGADO' :
      resultado.partidas.every(partida => partida.preparado) ? 'PREPARADO' : 'ABIERTO';
    siguienteCaja.pagos.push({ id: `${siguienteCaja.turnoId}-pago-${siguienteCaja.pagos.length + 1}`, pedidoId: resultado.id,
      partidaIds: pendientes.map(partida => partida.id), importeCentavos: montoCentavos, metodo, fecha });
    return { pedido: resultado, caja: normalizarCaja(siguienteCaja), montoCentavos };
  }
  function validarVinculos(pedidos, caja, historialCortes) {
    if (!Array.isArray(pedidos) || !Array.isArray(historialCortes)) throw new Error('Expediente de caja inválido.');
    const actual = normalizarCaja(caja);
    const turnos = historialCortes.map(normalizarCorte);
    if (actual.abierta) turnos.push(actual);
    const turnosIds = new Set(), vinculadas = new Set();
    const pedidosPorId = new Map(pedidos.map(pedido => [pedido.id, pedido]));
    for (const turno of turnos) {
      if (turnosIds.has(turno.turnoId)) throw new Error('Hay turnos de caja repetidos.');
      turnosIds.add(turno.turnoId);
      for (const pago of turno.pagos) {
        const pedido = pedidosPorId.get(pago.pedidoId);
        if (!pedido || !Array.isArray(pedido.partidas)) throw new Error('Un pago de caja apunta a un pedido inexistente.');
        let importe = 0;
        for (const partidaId of pago.partidaIds) {
          const partida = pedido.partidas.find(item => item.id === partidaId);
          const clave = JSON.stringify([pago.pedidoId, partidaId]);
          if (!partida || !partida.pagado || partida.metodoPago !== pago.metodo || partida.turnoId !== turno.turnoId ||
            partida.pagadoEn !== pago.fecha || vinculadas.has(clave)) throw new Error('Un pago de caja no coincide con sus productos.');
          vinculadas.add(clave);
          importe = sumar(importe, importePartida(partida));
        }
        if (importe !== pago.importeCentavos) throw new Error('El importe del pago de caja no coincide con sus productos.');
      }
    }
    for (const pedido of pedidos) {
      for (const partida of pedido.partidas) {
        const tieneMetodo = partida.metodoPago != null, tieneTurno = partida.turnoId != null;
        if (!tieneMetodo && !tieneTurno) continue; // Pagos del expediente anterior: permanecen en el historial de ventas.
        if (!partida.pagado || !metodos.includes(partida.metodoPago) || !idValido(partida.turnoId) ||
          !vinculadas.has(JSON.stringify([pedido.id, partida.id]))) throw new Error('El producto pagado no tiene un movimiento de caja válido.');
      }
    }
    return true;
  }
  return Object.freeze({ metodos, montoACentavos, cajaVacia, normalizarCaja, abrirCaja, registrarGasto, resumirCaja,
    normalizarCorte, cerrarCaja, cobrarPartidas, validarVinculos });
})();
