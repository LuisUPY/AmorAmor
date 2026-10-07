/* Pedidos confirmados: copias de precios y categorías al momento de vender. */
globalThis.AmorOrders = (() => {
  'use strict';
  const copia = value => JSON.parse(JSON.stringify(value));
  function nuevoPedido(partidas, etiqueta, numero, fecha = new Date().toISOString()) {
    if (!partidas.length) throw new Error('Agrega productos al pedido.');
    if (!Number.isSafeInteger(numero) || numero < 1) throw new Error('Número de pedido inválido.');
    AmorPOS.totalPedido(partidas);
    return {
      id: `pedido-${numero}`, numero, etiqueta: etiqueta.trim().slice(0, 60), creadoEn: fecha,
      estado: 'ABIERTO', totalCentavos: AmorPOS.totalPedido(partidas),
      partidas: copia(partidas).map((partida, index) => ({ ...partida, id: `partida-${numero}-${index + 1}`,
        preparado: false, pagado: false, preparadoEn: null, pagadoEn: null }))
    };
  }
  function estadoPedido(pedido) {
    if (pedido.partidas.every(partida => partida.pagado)) return 'PAGADO';
    if (pedido.partidas.every(partida => partida.preparado)) return 'PREPARADO';
    return 'ABIERTO';
  }
  function estaAbierto(pedido) {
    return pedido.partidas.some(partida => !partida.pagado || !partida.preparado);
  }
  function agregarPartidas(pedido, partidas) {
    if (!estaAbierto(pedido)) throw new Error('Este pedido ya está cerrado. Crea un pedido nuevo.');
    if (!partidas.length) throw new Error('Agrega productos al pedido.');
    AmorPOS.totalPedido(partidas);
    const resultado = copia(pedido);
    const ids = new Set(resultado.partidas.map(partida => partida.id));
    let numeroPartida = resultado.partidas.length + 1;
    for (const partida of copia(partidas)) {
      let id;
      do { id = `partida-${pedido.numero}-${numeroPartida++}`; } while (ids.has(id));
      ids.add(id);
      // Cada adición mantiene su propio estado, aunque repita un producto ya pagado.
      resultado.partidas.push({ ...partida, id, preparado: false, pagado: false, preparadoEn: null, pagadoEn: null });
    }
    resultado.totalCentavos = AmorPOS.totalPedido(resultado.partidas);
    resultado.estado = estadoPedido(resultado);
    return resultado;
  }
  function marcarPartida(pedido, partidaId, accion, fecha = new Date().toISOString()) {
    if (!['preparado', 'pagado'].includes(accion)) throw new Error('Acción inválida.');
    const resultado = copia(pedido);
    const partidas = partidaId === 'todos' ? resultado.partidas : resultado.partidas.filter(partida => partida.id === partidaId);
    if (!partidas.length) throw new Error('Producto del pedido no encontrado.');
    for (const partida of partidas) {
      // Repetir un toque nunca cambia la fecha de un pago ya registrado.
      if (!partida[accion]) {
        partida[accion] = true;
        partida[`${accion}En`] = fecha;
      }
    }
    resultado.estado = estadoPedido(resultado);
    return resultado;
  }
  return Object.freeze({ nuevoPedido, estadoPedido, estaAbierto, marcarPartida, agregarPartidas });
})();
