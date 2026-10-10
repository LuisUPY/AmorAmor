/* Comandas de preparación: las partidas conservan sus opciones del pedido. */
(() => {
  'use strict';

  const categoriasCocina = new Set(['entradas', 'alimentos', 'postres']);
  const normalizar = valor => String(valor || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let impresionActiva = null;

  function separarComandas(pedido) {
    if (!pedido || !Array.isArray(pedido.partidas) || !pedido.partidas.length) {
      throw new Error('El pedido debe contener productos para imprimir.');
    }
    const comandaBebidas = [];
    const comandaAlimentos = [];
    for (const partida of pedido.partidas) {
      if (!partida || !Number.isInteger(partida.cantidad) || partida.cantidad < 1 || !String(partida.nombre || '').trim()) {
        throw new Error('Hay una partida sin nombre o con una cantidad inválida.');
      }
      const copia = { ...partida };
      const categoria = normalizar(partida.macroCategoria);
      if (categoria === 'bebidas') {
        comandaBebidas.push(copia);
      } else {
        // El catálogo incluye paquetes mixtos y cargos personalizados. No se
        // inventan componentes ni se pierden partidas que no tienen área.
        if (categoria === 'paquetes') {
          copia.avisoComanda = 'Paquete sin desglose por áreas. Coordinar sus bebidas con Barra.';
        } else if (!categoriasCocina.has(categoria)) {
          copia.avisoComanda = partida.tipo === 'extra'
            ? 'Extra personalizado sin área asignada. Confirmar su preparación.'
            : 'Categoría sin área asignada. Confirmar su preparación con Cocina o Barra.';
        }
        comandaAlimentos.push(copia);
      }
    }
    return { comandaBebidas, comandaAlimentos };
  }

  function elemento(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto != null) nodo.textContent = String(texto);
    return nodo;
  }

  function textosOpciones(partida) {
    if (Array.isArray(partida.selecciones) && partida.selecciones.length) {
      return partida.selecciones.map(seleccion => {
        const valores = seleccion.texto || (Array.isArray(seleccion.valores)
          ? seleccion.valores.map(valor => valor.nombre).filter(Boolean).join(', ')
          : '');
        return valores ? `${seleccion.grupoNombre || 'Opción'}: ${valores}` : '';
      }).filter(Boolean);
    }
    // Permite imprimir pedidos anteriores que solo guardaron sus opciones.
    if (partida.opciones && typeof partida.opciones === 'object') {
      return Object.entries(partida.opciones).map(([grupo, valores]) => {
        const texto = Array.isArray(valores) ? valores.join(', ') : String(valores || '');
        return texto ? `${grupo}: ${texto}` : '';
      }).filter(Boolean);
    }
    return [];
  }

  function crearTicket(pedido, area, partidas, fechaHora) {
    const ticket = elemento('section', 'comanda-ticket');
    ticket.dataset.area = area;
    const cabecera = elemento('header', 'comanda-cabecera');
    cabecera.append(
      elemento('h2', 'comanda-restaurante', 'AMOR & AMOR'),
      elemento('p', 'comanda-fecha', fechaHora),
      elemento('p', 'comanda-numero', `Pedido #${pedido.numero}`),
      elemento('h3', 'comanda-area', `--- ${area} ---`)
    );
    if (pedido.etiqueta) cabecera.append(elemento('p', 'comanda-etiqueta', pedido.etiqueta));
    ticket.append(cabecera);
    const lista = elemento('ul', 'comanda-lista');
    for (const partida of partidas) {
      const item = elemento('li', 'comanda-producto');
      item.append(elemento('strong', 'comanda-producto-nombre', `${partida.cantidad} x ${partida.nombre}`));
      const opciones = textosOpciones(partida);
      if (partida.nota) opciones.push(`Nota: ${partida.nota}`);
      if (opciones.length) {
        const modificadores = elemento('ul', 'comanda-modificadores');
        opciones.forEach(opcion => modificadores.append(elemento('li', '', opcion)));
        item.append(modificadores);
      }
      if (partida.avisoComanda) item.append(elemento('p', 'comanda-aviso', partida.avisoComanda));
      lista.append(item);
    }
    ticket.append(lista, elemento('footer', 'comanda-pie', '--- FIN DE COMANDA ---'));
    return ticket;
  }

  function crearCuenta(pedido, fechaHora) {
    const ticket = elemento('section', 'comanda-ticket cuenta-ticket');
    ticket.dataset.area = 'CUENTA';
    const cabecera = elemento('header', 'comanda-cabecera');
    cabecera.append(elemento('h2', '', 'AMOR & AMOR'), elemento('h3', 'comanda-area', 'CUENTA'),
      elemento('p', 'comanda-etiqueta', pedido.etiqueta || 'Sin etiqueta'),
      elemento('p', '', `Pedido #${pedido.numero}`), elemento('p', '', fechaHora));
    ticket.append(cabecera, elemento('p', 'cuenta-ayuda', 'Precios en MXN. Incluyen los extras seleccionados.'));
    const lista = elemento('ul', 'comanda-lista');
    for (const partida of pedido.partidas) {
      const item = elemento('li', 'comanda-producto');
      item.append(elemento('strong', '', `${partida.cantidad} x ${partida.nombre}`));
      const opciones = textosOpciones(partida);
      if (partida.nota) opciones.push(`Nota: ${partida.nota}`);
      if (opciones.length) {
        const detalles = elemento('ul', 'comanda-modificadores');
        opciones.forEach(opcion => detalles.append(elemento('li', '', opcion)));
        item.append(detalles);
      }
      const importes = elemento('div', 'cuenta-fila');
      importes.append(elemento('span', '', `${AmorPOS.dinero(partida.precioUnitarioCentavos / 100)} c/u`),
        elemento('strong', '', AmorPOS.dinero(partida.precioUnitarioCentavos * partida.cantidad / 100)));
      item.append(importes); lista.append(item);
    }
    const pagado = pedido.partidas.filter(p => p.pagado).reduce((total, p) => total + p.precioUnitarioCentavos * p.cantidad, 0);
    const totales = elemento('div', 'cuenta-totales');
    for (const [etiqueta, monto, clase] of [['TOTAL', pedido.totalCentavos, 'cuenta-total'], ['Abonado', pagado, ''], ['Pendiente de pago', pedido.totalCentavos - pagado, 'cuenta-saldo']]) {
      const fila = elemento('div', `cuenta-fila ${clase}`);
      fila.append(elemento('span', '', etiqueta), elemento('strong', '', AmorPOS.dinero(monto / 100)));
      totales.append(fila);
    }
    ticket.append(lista, totales, elemento('footer', 'comanda-pie', 'Gracias por compartir tu día con nosotros.'));
    return ticket;
  }

  function fechaImpresion(fecha) {
    const instante = new Date(fecha);
    if (!Number.isFinite(instante.getTime())) throw new Error('La fecha del documento no es válida.');
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Merida', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(instante);
  }

  function filaCorte(etiqueta, centavos, clase = '') {
    const fila = elemento('div', `corte-fila ${clase}`);
    fila.append(elemento('span', '', etiqueta), elemento('strong', '', AmorPOS.dinero(centavos / 100)));
    return fila;
  }

  function crearCorte(corte, propinas) {
    const ticket = elemento('section', 'comanda-ticket corte-ticket');
    ticket.dataset.area = 'CORTE';
    const cabecera = elemento('header', 'comanda-cabecera');
    cabecera.append(elemento('h2', '', 'AMOR & AMOR'), elemento('h3', 'comanda-area', 'CORTE DE CAJA'),
      elemento('p', '', `Apertura: ${fechaImpresion(corte.abiertoEn)}`),
      elemento('p', '', `Cierre: ${fechaImpresion(corte.cerradoEn)}`));
    ticket.append(cabecera, elemento('p', 'corte-ayuda', 'Importes en MXN. Turno cerrado.'));
    const resumen = elemento('div', 'corte-resumen');
    for (const [etiqueta, clave, clase] of [
      ['Fondo inicial', 'fondoInicialCentavos', ''],
      ['Ventas en efectivo', 'ventasEfectivoCentavos', ''],
      ['Gastos extra', 'gastosExtrasCentavos', ''],
      ['Propinas en efectivo', 'propinasEfectivoCentavos', ''],
      ['Efectivo esperado', 'efectivoEsperadoCentavos', 'corte-destacado'],
      ['Ventas en tarjeta/transferencia', 'ventasTarjetaCentavos', ''],
      ['Propinas en tarjeta/transferencia', 'propinasTarjetaCentavos', ''],
      ['TOTAL VENTAS', 'totalVentasCentavos', 'corte-total'],
      ['TOTAL PROPINAS', 'totalPropinasCentavos', 'corte-total']
    ]) resumen.append(filaCorte(etiqueta, corte[clave], clase));
    ticket.append(resumen);

    const gastos = elemento('section', 'corte-seccion');
    gastos.append(elemento('h4', '', 'DETALLE DE GASTOS'));
    if (!corte.gastosDelDia.length) gastos.append(elemento('p', '', 'Sin gastos registrados.'));
    for (const gasto of corte.gastosDelDia) {
      const detalle = elemento('div', 'corte-movimiento');
      detalle.append(filaCorte(gasto.concepto, gasto.montoCentavos),
        elemento('p', 'corte-fecha', fechaImpresion(gasto.fecha)));
      gastos.append(detalle);
    }
    ticket.append(gastos);

    const reparto = elemento('section', 'corte-seccion');
    reparto.append(elemento('h4', '', 'REPARTO DE PROPINAS'));
    if (!propinas.configurado) reparto.append(elemento('p', '', 'Reparto sin configurar.'));
    else {
      const iguales = corte.repartoPropinas.tipo === 'igual';
      const personas = propinas.reparto.length;
      reparto.append(elemento('p', '', iguales
        ? `Partes iguales entre ${personas} ${personas === 1 ? 'persona' : 'personas'}.`
        : `Por porcentaje entre ${personas} ${personas === 1 ? 'persona' : 'personas'}.`));
      for (const persona of propinas.reparto) {
        const etiqueta = iguales ? persona.nombre : `${persona.nombre} (${persona.porcentaje}%)`;
        reparto.append(filaCorte(etiqueta, persona.montoCentavos));
      }
      reparto.append(elemento('p', 'corte-ayuda', 'Reparto calculado al centavo sobre el total de propinas.'));
    }
    ticket.append(reparto, elemento('footer', 'comanda-pie', '--- FIN DEL CORTE ---'));
    return ticket;
  }

  function imprimirDocumento(documento, tipo) {
    if (impresionActiva) return Promise.reject(new Error('Hay una impresión en curso. Cierra su diálogo antes de reimprimir.'));
    let zona;
    let copia;
    let comandas;
    let fechaHora;
    let propinas;
    try {
      if (typeof window === 'undefined' || typeof window.print !== 'function') throw new Error('Este navegador no permite imprimir.');
      zona = document.getElementById('zona-impresion');
      if (!zona || zona.parentElement !== document.body) throw new Error('La zona de impresión debe ser un contenedor directo del body.');
      // La impresión usa una instantánea: modificar la venta mientras se prepara
      // el diálogo no debe cambiar sus cantidades ni sus modificadores.
      copia = JSON.parse(JSON.stringify(documento));
      if (tipo === 'corte') {
        // Solo los cortes finalizados con movimientos y sumas válidas pueden
        // imprimirse. Los datos de la caja abierta no son un corte guardado.
        copia = AmorCash.normalizarCorte(copia);
        propinas = AmorCash.resumirPropinas(copia);
      } else {
        if (!Number.isSafeInteger(copia?.numero) || copia.numero < 1) throw new Error('El número de pedido no es válido.');
        comandas = separarComandas(copia);
        if (tipo === 'cuenta') {
          const total = AmorPOS.totalPedido(copia.partidas);
          if (copia.totalCentavos !== total) throw new Error('El total de la cuenta no coincide con sus productos.');
        }
        fechaHora = fechaImpresion(copia.creadoEn);
      }
    } catch (error) {
      return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
      const trabajo = { invocada: false, finalizado: false };
      impresionActiva = trabajo;
      const areas = [];
      let medioImpresion = null;
      let frame = null;
      function finalizar(error) {
        if (trabajo.finalizado) return;
        trabajo.finalizado = true;
        window.removeEventListener('afterprint', alTerminar);
        if (medioImpresion) {
          if (medioImpresion.removeEventListener) medioImpresion.removeEventListener('change', alCambiarMedio);
          else if (medioImpresion.removeListener) medioImpresion.removeListener(alCambiarMedio);
        }
        if (frame != null && window.cancelAnimationFrame) window.cancelAnimationFrame(frame);
        zona.replaceChildren();
        document.body.classList.remove('imprimiendo-comandas');
        impresionActiva = null;
        if (error) reject(error);
        // afterprint indica cierre del diálogo, incluso al cancelar; el navegador
        // no informa si el papel realmente salió de la impresora.
        else resolve(tipo === 'corte' ? { id: copia.id, areas } : { numero: copia.numero, areas });
      }
      function alTerminar() {
        if (trabajo.invocada) finalizar();
      }
      let entroEnImpresion = false;
      function alCambiarMedio(evento) {
        if (evento.matches) entroEnImpresion = true;
        else if (trabajo.invocada && entroEnImpresion) finalizar();
      }
      function ejecutar() {
        frame = null;
        if (trabajo.finalizado) return;
        trabajo.invocada = true;
        try {
          window.print();
        } catch (error) {
          finalizar(error);
        }
      }

      try {
        zona.replaceChildren();
        if (tipo === 'corte') {
          zona.append(crearCorte(copia, propinas));
          areas.push('CORTE');
        } else if (tipo === 'cuenta') {
          zona.append(crearCuenta(copia, fechaHora));
          areas.push('CUENTA');
        } else {
          if (comandas.comandaAlimentos.length) {
            zona.append(crearTicket(copia, 'COCINA', comandas.comandaAlimentos, fechaHora));
            areas.push('COCINA');
          }
          if (comandas.comandaBebidas.length) {
            zona.append(crearTicket(copia, 'BARRA', comandas.comandaBebidas, fechaHora));
            areas.push('BARRA');
          }
        }
        document.body.classList.add('imprimiendo-comandas');
        window.addEventListener('afterprint', alTerminar);
        if (window.matchMedia) {
          medioImpresion = window.matchMedia('print');
          if (medioImpresion.addEventListener) medioImpresion.addEventListener('change', alCambiarMedio);
          else if (medioImpresion.addListener) medioImpresion.addListener(alCambiarMedio);
        }
        // Esperar un frame permite aplicar las reglas de impresión al DOM nuevo.
        // No se usa un temporizador de limpieza que pudiera vaciar una vista previa.
        if (window.requestAnimationFrame) frame = window.requestAnimationFrame(ejecutar);
        else ejecutar();
      } catch (error) {
        finalizar(error);
      }
    });
  }

  const imprimirComandas = pedido => imprimirDocumento(pedido, 'comandas');
  const imprimirCuenta = pedido => imprimirDocumento(pedido, 'cuenta');
  const imprimirCorte = corte => imprimirDocumento(corte, 'corte');
  globalThis.AmorPrinting = Object.freeze({ separarComandas, imprimirComandas, imprimirCuenta, imprimirCorte });
  globalThis.imprimirComandas = imprimirComandas;
  globalThis.imprimirCuenta = imprimirCuenta;
  globalThis.imprimirCorte = imprimirCorte;
})();
