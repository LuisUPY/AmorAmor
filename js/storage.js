/* Una sola fuente local para borrador, numeración y expediente de ventas. */
globalThis.AmorStorage = (() => {
  'use strict';
  const KEY = 'amor-amor-pos:expediente:v2';
  const LEGACY_KEY = 'amor-amor-pos:borrador:v1';
  const vacio = () => ({ version: 2, revision: 0, siguienteNumero: 1, pedidos: [], borrador: { etiqueta: '', partidas: [] }, adicion: null, caja: AmorCash.cajaVacia(), historialCortes: [], colaOculta: false, guardadoEn: null });
  const copia = value => JSON.parse(JSON.stringify(value));
  const fechaValida = valor => typeof valor === 'string' && Number.isFinite(Date.parse(valor));
  function validarPartida(partida) {
    if (!partida || typeof partida.nombre !== 'string' || !partida.nombre.trim() || partida.nombre.length > 200 ||
      !Number.isInteger(partida.cantidad) || partida.cantidad < 1 || partida.cantidad > 99 ||
      !Number.isSafeInteger(partida.precioUnitarioCentavos) || partida.precioUnitarioCentavos < 0 ||
      !Array.isArray(partida.selecciones) || typeof partida.nota !== 'string' || partida.nota.length > 200 ||
      !(partida.macroCategoria === null || AmorHistory.macros.includes(partida.macroCategoria))) throw new Error('Partida inválida en el expediente.');
    if (partida.tipo === 'extra' && (partida.macroCategoria !== null || partida.productoId !== null)) throw new Error('Extra inválido.');
    for (const seleccion of partida.selecciones) {
      if (!seleccion || typeof seleccion.grupoNombre !== 'string' || !Array.isArray(seleccion.valores) ||
        seleccion.valores.some(valor => !valor || typeof valor.nombre !== 'string' || !Number.isFinite(valor.precioExtra) || valor.precioExtra < 0) ||
        (seleccion.texto != null && typeof seleccion.texto !== 'string')) throw new Error('Opciones inválidas en el expediente.');
    }
  }
  function normalizar(raw) {
    if (!raw || raw.version !== 2 || !Number.isSafeInteger(raw.revision) || raw.revision < 0 || !Array.isArray(raw.pedidos) || !raw.borrador || !Array.isArray(raw.borrador.partidas)) throw new Error('El expediente local no es válido.');
    const state = copia(raw);
    const numeros = new Set();
    for (const pedido of state.pedidos) {
      if (!pedido || !Number.isSafeInteger(pedido.numero) || pedido.numero < 1 || numeros.has(pedido.numero) ||
        pedido.id !== `pedido-${pedido.numero}` || !fechaValida(pedido.creadoEn) || typeof pedido.etiqueta !== 'string' || pedido.etiqueta.length > 60 ||
        !Array.isArray(pedido.partidas) || !pedido.partidas.length) throw new Error('Pedido inválido en el expediente.');
      numeros.add(pedido.numero);
      const ids = new Set();
      for (const partida of pedido.partidas) {
        validarPartida(partida);
        if (typeof partida.id !== 'string' || ids.has(partida.id) || typeof partida.pagado !== 'boolean' || typeof partida.preparado !== 'boolean' ||
          (partida.pagado && !fechaValida(partida.pagadoEn)) || (partida.preparado && !fechaValida(partida.preparadoEn))) throw new Error('Estado de producto inválido.');
        ids.add(partida.id);
      }
      const total = AmorPOS.totalPedido(pedido.partidas);
      if (pedido.totalCentavos !== total) throw new Error('Total inconsistente en el expediente.');
      pedido.estado = AmorOrders.estadoPedido(pedido);
    }
    state.pedidos = state.pedidos.map(AmorCash.normalizarPedidoPagos);
    for (const partida of state.borrador.partidas) validarPartida(partida);
    if (typeof state.borrador.etiqueta !== 'string' || state.borrador.etiqueta.length > 60) throw new Error('Etiqueta de borrador inválida.');
    if (state.adicion == null) state.adicion = null;
    else {
      if (!state.adicion || !state.pedidos.some(pedido => pedido.id === state.adicion.pedidoId) || !Array.isArray(state.adicion.partidas)) throw new Error('Selección para añadir inválida.');
      for (const partida of state.adicion.partidas) validarPartida(partida);
    }
    state.siguienteNumero = Math.max(1, ...numeros) + (numeros.size ? 1 : 0);
    if (Number.isSafeInteger(raw.siguienteNumero)) state.siguienteNumero = Math.max(state.siguienteNumero, raw.siguienteNumero);
    state.colaOculta = !!state.colaOculta;
    // Los expedientes anteriores conservan sus ventas; empiezan sin turno activo.
    state.caja = AmorCash.normalizarCaja(state.caja);
    if (state.historialCortes === undefined) state.historialCortes = [];
    if (!Array.isArray(state.historialCortes)) throw new Error('Historial de cortes inválido.');
    state.historialCortes = state.historialCortes.map(AmorCash.normalizarCorte);
    AmorCash.validarVinculos(state.pedidos, state.caja, state.historialCortes);
    return state;
  }
  function cargarExpediente() {
    const text = localStorage.getItem(KEY);
    if (text != null) return normalizar(JSON.parse(text));
    const state = vacio();
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const draft = JSON.parse(legacy);
      if (draft.version !== 1 || !Array.isArray(draft.partidas)) throw new Error('Borrador anterior inválido.');
      state.borrador.etiqueta = typeof draft.etiqueta === 'string' ? draft.etiqueta.slice(0, 60) : '';
      for (const stored of draft.partidas) {
        const partida = AmorPOS.crearPartida(stored.productoId, stored.opciones, stored.nota);
        partida.cantidad = stored.cantidad;
        validarPartida(partida);
        state.borrador.partidas.push(partida);
      }
    }
    return state;
  }
  function guardarExpediente(state) {
    const existing = localStorage.getItem(KEY);
    const revision = existing === null ? 0 : normalizar(JSON.parse(existing)).revision;
    if (revision !== state.revision) throw new Error('El expediente cambió en otra pestaña. Recarga para continuar.');
    const next = normalizar(state);
    next.revision++;
    next.guardadoEn = new Date().toISOString();
    // Si setItem falla, el estado anterior permanece íntegro y la venta no se confirma.
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }
  return Object.freeze({ KEY, vacio, normalizar, cargarExpediente, guardarExpediente });
})();
