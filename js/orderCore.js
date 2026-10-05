/* Cálculo y validación independientes de la interfaz. */
(() => {
  'use strict';

  const catalogo = Object.entries(menuDB).flatMap(([macroCategoria, subcategorias]) =>
    Object.entries(subcategorias).flatMap(([subCategoria, productos]) =>
      productos.map(producto => ({ ...producto, macroCategoria, subCategoria }))));
  const porId = new Map(catalogo.map(producto => [producto.id, producto]));
  const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const dinero = importe => pesos.format(importe);
  const centavos = importe => Math.round(importe * 100);
  const buscar = texto => String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function errorOpcion(mensaje, grupo) {
    const error = new Error(mensaje);
    error.grupoId = grupo?.id;
    throw error;
  }

  function crearPartida(productoId, opciones = {}, nota = '') {
    const producto = porId.get(productoId);
    if (!producto) throw new Error('Producto desconocido.');
    if (!Number.isFinite(producto.precio) || producto.precio < 0) throw new Error('El precio de este producto está pendiente de confirmar.');
    if (!opciones || typeof opciones !== 'object' || Array.isArray(opciones)) throw new Error('Selección de opciones inválida.');
    const ids = new Set(producto.opciones.map(grupo => grupo.id));
    if (Object.keys(opciones).some(id => !ids.has(id))) throw new Error('Hay opciones que no pertenecen a este producto.');

    const elecciones = {};
    const selecciones = [];
    let extrasCentavos = 0;
    for (const grupo of producto.opciones) {
      const valor = opciones[grupo.id];
      if (grupo.tipo === 'texto') {
        if (valor != null && typeof valor !== 'string') errorOpcion(`Escribe ${grupo.nombre.toLowerCase()}.`, grupo);
        const texto = (valor || '').trim();
        if (grupo.requerido && !texto) errorOpcion(`Completa: ${grupo.nombre}.`, grupo);
        if (texto.length > (grupo.longitudMaxima || 100)) errorOpcion(`La elección de ${grupo.nombre} es demasiado larga.`, grupo);
        if (texto) {
          elecciones[grupo.id] = texto;
          selecciones.push({ grupoId: grupo.id, grupoNombre: grupo.nombre, texto, valores: [] });
        }
        continue;
      }
      if (!['unica', 'multiple'].includes(grupo.tipo)) throw new Error('Tipo de opción no reconocido.');
      if (grupo.tipo === 'unica' && valor != null && typeof valor !== 'string') errorOpcion(`Elige una opción de ${grupo.nombre}.`, grupo);
      if (grupo.tipo === 'multiple' && valor != null && !Array.isArray(valor)) errorOpcion(`Selección inválida en ${grupo.nombre}.`, grupo);
      const seleccionados = grupo.tipo === 'multiple' ? (valor || []) : (valor ? [valor] : []);
      if (new Set(seleccionados).size !== seleccionados.length) errorOpcion(`No repitas extras en ${grupo.nombre}.`, grupo);
      if (seleccionados.some(id => !grupo.valores.some(item => item.id === id))) errorOpcion(`Opción inválida en ${grupo.nombre}.`, grupo);
      if (grupo.requerido && !seleccionados.length) errorOpcion(`Selecciona: ${grupo.nombre}.`, grupo);
      const valores = grupo.valores.filter(item => seleccionados.includes(item.id));
      if (!valores.length) continue;
      elecciones[grupo.id] = grupo.tipo === 'unica' ? valores[0].id : valores.map(item => item.id);
      for (const item of valores) {
        if (!Number.isFinite(item.precioExtra) || item.precioExtra < 0) throw new Error('Precio de extra inválido.');
        extrasCentavos += centavos(item.precioExtra);
      }
      selecciones.push({ grupoId: grupo.id, grupoNombre: grupo.nombre, valores: valores.map(item => ({ ...item })) });
    }
    if (typeof nota !== 'string' || nota.length > 200) throw new Error('La nota debe tener hasta 200 caracteres.');
    const notaLimpia = nota.trim();
    const precioUnitarioCentavos = centavos(producto.precio) + extrasCentavos;
    return {
      clave: JSON.stringify([producto.id, elecciones, notaLimpia]),
      productoId: producto.id, nombre: producto.nombre,
      macroCategoria: producto.macroCategoria, subCategoria: producto.subCategoria,
      precioBase: producto.precio, extras: extrasCentavos / 100,
      precioUnitario: precioUnitarioCentavos / 100, precioUnitarioCentavos,
      opciones: elecciones, selecciones, nota: notaLimpia, cantidad: 1
    };
  }

  function totalPedido(partidas) {
    return partidas.reduce((total, partida) => {
      if (!Number.isInteger(partida.cantidad) || partida.cantidad < 1 || partida.cantidad > 99) throw new Error('La cantidad debe estar entre 1 y 99.');
      if (!Number.isInteger(partida.precioUnitarioCentavos) || partida.precioUnitarioCentavos < 0) throw new Error('Importe de partida inválido.');
      return total + partida.precioUnitarioCentavos * partida.cantidad;
    }, 0);
  }

  function crearExtra(concepto, monto) {
    if (typeof concepto !== 'string' || !concepto.trim() || concepto.trim().length > 100) throw new Error('Escribe un concepto de hasta 100 caracteres.');
    const texto = String(monto).trim();
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(texto)) throw new Error('Escribe un monto positivo con hasta dos decimales.');
    const valor = Number(texto.replace(',', '.'));
    const precioUnitarioCentavos = centavos(valor);
    if (!Number.isSafeInteger(precioUnitarioCentavos) || precioUnitarioCentavos <= 0 || precioUnitarioCentavos > 99999999) throw new Error('El monto debe ser entre $0.01 y $999,999.99.');
    const nombre = concepto.trim();
    return {
      clave: JSON.stringify(['extra', nombre, precioUnitarioCentavos]), tipo: 'extra',
      productoId: null, nombre, macroCategoria: null, subCategoria: 'Extras personalizados',
      precioBase: precioUnitarioCentavos / 100, extras: 0,
      precioUnitario: precioUnitarioCentavos / 100, precioUnitarioCentavos,
      opciones: {}, selecciones: [], nota: '', cantidad: 1
    };
  }

  globalThis.AmorPOS = Object.freeze({ catalogo, porId, dinero, centavos, buscar, crearPartida, crearExtra, totalPedido });
})();
