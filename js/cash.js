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
  // El cambio siempre se resta del efectivo recibido, nunca de la tarjeta.
  function validarPago(totalCentavos, efectivoRecibido, montoTarjeta) {
    if (!entero(totalCentavos)) throw new Error('Total del cobro inválido.');
    const efectivoRecibidoCentavos = montoACentavos(efectivoRecibido, true);
    const montoTarjetaCentavos = montoACentavos(montoTarjeta, true);
    if (montoTarjetaCentavos > totalCentavos) throw new Error('El monto en tarjeta no puede superar el total a pagar.');
    const recibido = sumar(efectivoRecibidoCentavos, montoTarjetaCentavos);
    const faltanteCentavos = Math.max(0, totalCentavos - recibido);
    const cambioCentavos = Math.max(0, recibido - totalCentavos);
    return { completo: faltanteCentavos === 0, faltanteCentavos, cambioCentavos,
      efectivoRecibidoCentavos, montoEfectivoCentavos: efectivoRecibidoCentavos - cambioCentavos, montoTarjetaCentavos };
  }
  function importeGuardado(monto) {
    const centavos = Math.round(monto * 100);
    if (typeof monto !== 'number' || !entero(centavos) || centavos / 100 !== monto) throw new Error('Monto de pago guardado inválido.');
    return centavos;
  }
  function montosPartida(partida) {
    return { efectivo: importeGuardado(partida.montoEfectivo), tarjeta: importeGuardado(partida.montoTarjeta) };
  }
  function normalizarPedidoPagos(pedido) {
    if (!pedido || !Array.isArray(pedido.partidas)) throw new Error('Pedido inválido para cobrar.');
    const resultado = copia(pedido);
    let efectivo = 0, tarjeta = 0, tieneMontos = false;
    for (const partida of resultado.partidas) {
      const tieneEfectivo = Object.hasOwn(partida, 'montoEfectivo');
      const tieneTarjeta = Object.hasOwn(partida, 'montoTarjeta');
      if (tieneEfectivo !== tieneTarjeta) throw new Error('Los montos del producto pagado están incompletos.');
      if (partida.metodoPago != null) {
        if (!partida.pagado || !metodos.includes(partida.metodoPago)) throw new Error('Método del producto pagado inválido.');
        const importe = importePartida(partida);
        const efectivoAnterior = partida.metodoPago === 'efectivo' ? importe : 0;
        const tarjetaAnterior = importe - efectivoAnterior;
        if (tieneEfectivo && (importeGuardado(partida.montoEfectivo) !== efectivoAnterior ||
          importeGuardado(partida.montoTarjeta) !== tarjetaAnterior)) throw new Error('El método no coincide con los montos del producto pagado.');
        partida.montoEfectivo = efectivoAnterior / 100;
        partida.montoTarjeta = tarjetaAnterior / 100;
        delete partida.metodoPago;
      }
      if (!Object.hasOwn(partida, 'montoEfectivo')) continue; // Pagos anteriores sin método: no inventamos un desglose.
      const montos = montosPartida(partida);
      if (!partida.pagado || sumar(montos.efectivo, montos.tarjeta) !== importePartida(partida)) throw new Error('Los montos no coinciden con el producto pagado.');
      efectivo = sumar(efectivo, montos.efectivo); tarjeta = sumar(tarjeta, montos.tarjeta);
      tieneMontos = true;
    }
    const tieneEfectivo = Object.hasOwn(resultado, 'montoEfectivo');
    const tieneTarjeta = Object.hasOwn(resultado, 'montoTarjeta');
    if (tieneEfectivo !== tieneTarjeta || (tieneEfectivo &&
      (importeGuardado(resultado.montoEfectivo) !== efectivo || importeGuardado(resultado.montoTarjeta) !== tarjeta))) throw new Error('Los montos del pedido no coinciden con sus productos pagados.');
    if (tieneMontos || tieneEfectivo) {
      resultado.montoEfectivo = efectivo / 100; resultado.montoTarjeta = tarjeta / 100;
      delete resultado.metodoPago;
    }
    return resultado;
  }
  function resumenSinValidar(caja) {
    let ventasEfectivoCentavos = 0, ventasTarjetaCentavos = 0, gastosExtrasCentavos = 0;
    for (const pago of caja.pagos) {
      ventasEfectivoCentavos = sumar(ventasEfectivoCentavos, pago.montoEfectivoCentavos);
      ventasTarjetaCentavos = sumar(ventasTarjetaCentavos, pago.montoTarjetaCentavos);
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
    const pagos = copia(raw.pagos);
    for (const pago of pagos) {
      if (!pago || !idValido(pago.id) || ids.has(pago.id) || !idValido(pago.pedidoId) || !entero(pago.importeCentavos) ||
        !fechaValida(pago.fecha) || Date.parse(pago.fecha) < fechaApertura ||
        !Array.isArray(pago.partidaIds) || !pago.partidaIds.length) throw new Error('Pago de caja inválido.');
      const tieneEfectivo = Object.hasOwn(pago, 'montoEfectivoCentavos');
      const tieneTarjeta = Object.hasOwn(pago, 'montoTarjetaCentavos');
      if (tieneEfectivo !== tieneTarjeta) throw new Error('Los montos del pago de caja están incompletos.');
      if (pago.metodo != null) {
        if (!metodos.includes(pago.metodo)) throw new Error('Método de pago de caja inválido.');
        const efectivoAnterior = pago.metodo === 'efectivo' ? pago.importeCentavos : 0;
        if (tieneEfectivo && (pago.montoEfectivoCentavos !== efectivoAnterior ||
          pago.montoTarjetaCentavos !== pago.importeCentavos - efectivoAnterior)) throw new Error('El método no coincide con los montos del pago de caja.');
        pago.montoEfectivoCentavos = efectivoAnterior;
        pago.montoTarjetaCentavos = pago.importeCentavos - efectivoAnterior;
        delete pago.metodo;
      }
      if (!entero(pago.montoEfectivoCentavos) || !entero(pago.montoTarjetaCentavos) ||
        sumar(pago.montoEfectivoCentavos, pago.montoTarjetaCentavos) !== pago.importeCentavos) throw new Error('Los importes del pago de caja son inconsistentes.');
      ids.add(pago.id);
      for (const partidaId of pago.partidaIds) {
        const clave = JSON.stringify([pago.pedidoId, partidaId]);
        if (!idValido(partidaId) || partidasPagadas.has(clave)) throw new Error('Hay productos cobrados más de una vez en caja.');
        partidasPagadas.add(clave);
      }
    }
    const caja = { abierta: true, turnoId: raw.turnoId, abiertoEn: raw.abiertoEn, fondoInicialCentavos: raw.fondoInicialCentavos,
      gastosDelDia: copia(raw.gastosDelDia), pagos };
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
  function resumirCaja(caja, pedidos) {
    const actual = normalizarCaja(caja);
    const resumen = resumenSinValidar(actual);
    if (pedidos !== undefined) {
      if (!Array.isArray(pedidos)) throw new Error('Pedidos de caja inválidos.');
      const normalizados = pedidos.map(normalizarPedidoPagos);
      const vinculadas = new Set();
      validarPagosTurno(actual, new Map(normalizados.map(pedido => [pedido.id, pedido])), vinculadas);
      let efectivo = 0, tarjeta = 0;
      // Incluye cobros de productos aunque el resto del pedido siga pendiente.
      // Filtrar por turno evita recontar ventas al terminar un pedido otro día.
      for (const pedido of normalizados) for (const partida of pedido.partidas) {
        if (!actual.abierta || !partida.pagado || partida.turnoId !== actual.turnoId) continue;
        if (!vinculadas.has(JSON.stringify([pedido.id, partida.id]))) throw new Error('El producto pagado no tiene un movimiento de caja válido.');
        const montos = montosPartida(partida);
        efectivo = sumar(efectivo, montos.efectivo); tarjeta = sumar(tarjeta, montos.tarjeta);
      }
      if (efectivo !== resumen.ventasEfectivoCentavos || tarjeta !== resumen.ventasTarjetaCentavos) throw new Error('Los montos de los pedidos no coinciden con la caja.');
      resumen.ventasEfectivoCentavos = efectivo; resumen.ventasTarjetaCentavos = tarjeta;
    }
    return resumen;
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
  function cerrarCaja(caja, fecha = new Date().toISOString(), pedidos) {
    const actual = exigirAbierta(caja);
    const corte = normalizarCorte({ id: actual.turnoId, turnoId: actual.turnoId, abiertoEn: actual.abiertoEn,
      cerradoEn: fechaDelTurno(actual, fecha), gastosDelDia: actual.gastosDelDia, pagos: actual.pagos, ...resumirCaja(actual, pedidos) });
    return { caja: cajaVacia(), corte };
  }
  function importePartida(partida) {
    if (!partida || !Number.isInteger(partida.cantidad) || partida.cantidad < 1 || partida.cantidad > 99 ||
      !entero(partida.precioUnitarioCentavos) || !entero(partida.cantidad * partida.precioUnitarioCentavos)) throw new Error('Importe del producto inválido.');
    return partida.cantidad * partida.precioUnitarioCentavos;
  }
  function cobrarPartidas(pedido, partidaId, caja, pago, fecha = new Date().toISOString()) {
    const siguienteCaja = exigirAbierta(caja);
    if (!pedido || !idValido(pedido.id) || !Array.isArray(pedido.partidas) || !pedido.partidas.length) throw new Error('Pedido inválido para cobrar.');
    const ids = new Set();
    for (const partida of pedido.partidas) {
      if (!partida || !idValido(partida.id) || ids.has(partida.id) || typeof partida.pagado !== 'boolean') throw new Error('Producto inválido para cobrar.');
      ids.add(partida.id);
    }
    let resultado = normalizarPedidoPagos(pedido);
    const seleccionadas = partidaId === 'todos' ? resultado.partidas : resultado.partidas.filter(partida => partida.id === partidaId);
    if (!seleccionadas.length) throw new Error('Producto del pedido no encontrado.');
    const pendientes = seleccionadas.filter(partida => !partida.pagado);
    if (!pendientes.length) throw new Error('Estos productos ya están pagados.');
    fechaDelTurno(siguienteCaja, fecha);
    let montoCentavos = 0;
    for (const partida of pendientes) montoCentavos = sumar(montoCentavos, importePartida(partida));
    // Compatibilidad con clientes de la API anterior; los nuevos datos guardan montos.
    if (typeof pago === 'string') {
      if (!metodos.includes(pago)) throw new Error('Selecciona Efectivo o Tarjeta/Transferencia.');
      pago = { efectivoRecibido: pago === 'efectivo' ? montoCentavos / 100 : 0, montoTarjeta: pago === 'tarjeta' ? montoCentavos / 100 : 0 };
    }
    if (!pago || typeof pago !== 'object') throw new Error('Captura los montos del pago.');
    const validacion = validarPago(montoCentavos, pago.efectivoRecibido, pago.montoTarjeta);
    if (!validacion.completo) throw new Error(`Faltan: ${AmorPOS.dinero(validacion.faltanteCentavos / 100)}.`);
    let efectivoPorAsignar = validacion.montoEfectivoCentavos;
    for (const partida of pendientes) {
      const importe = importePartida(partida);
      const efectivo = Math.min(importe, efectivoPorAsignar);
      efectivoPorAsignar -= efectivo;
      partida.pagado = true; partida.pagadoEn = fecha;
      partida.montoEfectivo = efectivo / 100; partida.montoTarjeta = (importe - efectivo) / 100;
      partida.turnoId = siguienteCaja.turnoId;
    }
    delete resultado.montoEfectivo; delete resultado.montoTarjeta;
    resultado = normalizarPedidoPagos(resultado);
    resultado.estado = resultado.partidas.every(partida => partida.pagado) ? 'PAGADO' :
      resultado.partidas.every(partida => partida.preparado) ? 'PREPARADO' : 'ABIERTO';
    siguienteCaja.pagos.push({ id: `${siguienteCaja.turnoId}-pago-${siguienteCaja.pagos.length + 1}`, pedidoId: resultado.id,
      partidaIds: pendientes.map(partida => partida.id), importeCentavos: montoCentavos,
      montoEfectivoCentavos: validacion.montoEfectivoCentavos, montoTarjetaCentavos: validacion.montoTarjetaCentavos, fecha });
    return { pedido: resultado, caja: normalizarCaja(siguienteCaja), montoCentavos, cambioCentavos: validacion.cambioCentavos };
  }
  function validarPagosTurno(turno, pedidosPorId, vinculadas) {
    for (const pago of turno.pagos) {
      const pedido = pedidosPorId.get(pago.pedidoId);
      if (!pedido || !Array.isArray(pedido.partidas)) throw new Error('Un pago de caja apunta a un pedido inexistente.');
      let importe = 0, efectivo = 0, tarjeta = 0;
      for (const partidaId of pago.partidaIds) {
        const partida = pedido.partidas.find(item => item.id === partidaId);
        const clave = JSON.stringify([pago.pedidoId, partidaId]);
        if (!partida || !partida.pagado || partida.turnoId !== turno.turnoId ||
          partida.pagadoEn !== pago.fecha || vinculadas.has(clave)) throw new Error('Un pago de caja no coincide con sus productos.');
        const montos = montosPartida(partida);
        efectivo = sumar(efectivo, montos.efectivo); tarjeta = sumar(tarjeta, montos.tarjeta);
        vinculadas.add(clave); importe = sumar(importe, importePartida(partida));
      }
      if (importe !== pago.importeCentavos || efectivo !== pago.montoEfectivoCentavos ||
        tarjeta !== pago.montoTarjetaCentavos) throw new Error('El importe del pago de caja no coincide con sus productos.');
    }
  }
  function validarVinculos(pedidos, caja, historialCortes) {
    if (!Array.isArray(pedidos) || !Array.isArray(historialCortes)) throw new Error('Expediente de caja inválido.');
    const actual = normalizarCaja(caja);
    const turnos = historialCortes.map(normalizarCorte);
    if (actual.abierta) turnos.push(actual);
    const turnosIds = new Set(), vinculadas = new Set();
    const normalizados = pedidos.map(normalizarPedidoPagos);
    const pedidosPorId = new Map(normalizados.map(pedido => [pedido.id, pedido]));
    for (const turno of turnos) {
      if (turnosIds.has(turno.turnoId)) throw new Error('Hay turnos de caja repetidos.');
      turnosIds.add(turno.turnoId);
      validarPagosTurno(turno, pedidosPorId, vinculadas);
    }
    for (const pedido of normalizados) {
      for (const partida of pedido.partidas) {
        const tieneMontos = Object.hasOwn(partida, 'montoEfectivo'), tieneTurno = partida.turnoId != null;
        if (!tieneMontos && !tieneTurno) continue; // Pagos del expediente anterior: permanecen en el historial de ventas.
        if (!partida.pagado || !tieneMontos || !idValido(partida.turnoId) ||
          !vinculadas.has(JSON.stringify([pedido.id, partida.id]))) throw new Error('El producto pagado no tiene un movimiento de caja válido.');
      }
    }
    return true;
  }
  return Object.freeze({ metodos, montoACentavos, validarPago, normalizarPedidoPagos, cajaVacia, normalizarCaja, abrirCaja, registrarGasto, resumirCaja,
    normalizarCorte, cerrarCaja, cobrarPartidas, validarVinculos });
})();
