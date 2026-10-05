/* Cortes por fecha de pago de cada partida, en la zona del restaurante. */
globalThis.AmorHistory = (() => {
  'use strict';
  const zona = 'America/Merida';
  const macros = ['Entradas', 'Bebidas', 'Alimentos', 'Postres', 'Paquetes'];
  const fechaFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' });
  const diaFormatter = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
  function fechaLocal(fecha = new Date()) {
    const partes = Object.fromEntries(fechaFormatter.formatToParts(new Date(fecha)).map(parte => [parte.type, parte.value]));
    return `${partes.year}-${partes.month}-${partes.day}`;
  }
  const etiquetaDia = fecha => diaFormatter.format(new Date(`${fecha}T12:00:00Z`));
  function resumirDia(pedidos, fecha) {
    const resumen = { totalCentavos: 0, productos: 0, ventas: 0, categorias: Object.fromEntries(macros.map(macro => [macro, 0])), extras: 0 };
    for (const pedido of pedidos) {
      let tienePago = false;
      for (const partida of pedido.partidas) {
        if (!partida.pagado || fechaLocal(partida.pagadoEn) !== fecha) continue;
        tienePago = true;
        resumen.totalCentavos += partida.precioUnitarioCentavos * partida.cantidad;
        resumen.productos += partida.cantidad;
        if (Object.hasOwn(resumen.categorias, partida.macroCategoria)) resumen.categorias[partida.macroCategoria] += partida.cantidad;
        else resumen.extras += partida.cantidad;
      }
      if (tienePago) resumen.ventas++;
    }
    return resumen;
  }
  function agruparPorDia(pedidos) {
    const dias = new Map();
    for (const pedido of pedidos) {
      const fechas = new Set(pedido.partidas.filter(partida => partida.pagado).map(partida => fechaLocal(partida.pagadoEn)));
      if (pedido.partidas.some(partida => !partida.pagado)) fechas.add(fechaLocal(pedido.creadoEn));
      for (const fecha of fechas) {
        if (!dias.has(fecha)) dias.set(fecha, []);
        dias.get(fecha).push(pedido);
      }
    }
    return [...dias].sort(([a], [b]) => b.localeCompare(a)).map(([fecha, lista]) => ({
      fecha, pedidos: [...lista].sort((a, b) => b.numero - a.numero), resumen: resumirDia(lista, fecha)
    }));
  }
  return Object.freeze({ zona, macros, fechaLocal, etiquetaDia, resumirDia, agruparPorDia });
})();
