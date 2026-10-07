# Amor & Amor · Punto de venta

POS en HTML, CSS y JavaScript vanilla. Funciona sin frameworks, instalaciones ni CDN. La referencia anterior permanece en `Example/`.

## Abrir

Abre `index.html` en el navegador, o ejecuta `python3 -m http.server 8000` y visita `http://localhost:8000`. Los scripts clásicos permiten trabajar también con `file://`.

## 1. Catálogo corregido

`js/menuData.js` define la constante literal `const menuDB = { ... }`; `assets/menu.json` contiene su copia JSON pura. Se conservan los 105 productos: 3 Entradas, 65 Bebidas, 32 Alimentos, 0 Postres y 5 Paquetes.

- Los cinco waffles (clásico, churro, Marque waffle, frutal y salado) están en **Alimentos → Waffles**.
- **Jugo de naranja** está en **Bebidas → Aguas naturales**.
- Se eliminan Jugos, Waffles dulces y Waffles salados. La macro Postres se conserva, actualmente vacía.
- Dirty chai sigue con precio pendiente y venta bloqueada. El untable del waffle clásico se captura como elección confirmada con cocina.

`assets/menu-notas.md` documenta precios, opciones y decisiones de clasificación. El PDF original se conserva en assets. Las opciones del menú siguen siendo grupos de tipo `unica`, `multiple` o `texto`, con `requerido` y alternativas `valores` con `precioExtra`.

La búsqueda actúa sobre **todo el catálogo** mientras hay texto, aunque la pestaña activa sea otra. También busca ingredientes y admite texto sin acentos. Al borrar la consulta reaparecen los filtros de la categoría activa.

## 2. HTML y modales

`index.html` contiene los diálogos Extras, Historial, Cargar Expediente, revisión y seguimiento de pedidos, además de Apertura de Caja, Cobrar pedido, Registrar Gasto Extra, Corte de Caja y Cortes guardados. El modal de cobro muestra el **Total a Pagar** y dos entradas numéricas: **Monto recibido en Efectivo** y **Monto en Tarjeta/Transferencia**, ambas inicialmente en cero. La cabecera muestra el estado de la caja y su efectivo esperado, junto a **Ver opciones de caja** (apertura, gasto, corte y cortes guardados). **Opciones** agrupa Menú, Historial, Cargar/Guardar expediente y **Reiniciar aplicación**; reiniciar guarda la selección actual y recarga conservando pedidos, caja y expediente. Los menús se cierran al elegir una acción, pulsar Escape o tocar fuera. `#zona-impresion` es un hijo directo de `body`, oculto en pantalla.

La etiqueta ofrece **Mesa 1–8**, **Delivery** y **Personalizado**, seguida de un campo libre para detalles. Se guarda como una sola etiqueta (por ejemplo, `Mesa 3 · Ana`); los pedidos anteriores conservan sus etiquetas. La etiqueta ocupa el primer nivel visual en la cola y el título del seguimiento; el número se muestra como referencia secundaria.

**Añadir Extra** solicita únicamente Concepto y Monto. Acepta punto o coma decimal, requiere un importe positivo de hasta dos decimales y agrega el ítem al mismo carrito. Puede modificarse su cantidad o quitarse como cualquier producto. No se inventa una macro para estos ítems.

## 3. CSS

`css/styles.css` mantiene el catálogo y los modificadores originales. `css/pos-features.css` añade el buscador global, el historial master-detail, los estados, los nuevos modales y la barra inferior.

`css/cash-print.css` contiene los estilos de caja: total de cobro destacado, entradas monetarias y aviso rojo cuando falta dinero o un monto es inválido, verde para cobro completo o cambio. También contiene las reglas térmicas: `@page { margin: 0; }`, ancho de 300 px, tipografía monoespaciada, cabecera centrada, opciones sangradas y ajuste de texto largo. En impresión se ocultan todos los elementos de `body`, incluidos los diálogos y sus fondos, excepto `#zona-impresion`. Cada área empieza en una página distinta, sin forzar una altura de papel.

El historial tiene lista de días a la izquierda y corte a la derecha, con scroll independiente. En teléfono la lista se convierte en una fila horizontal y el resumen se recorre verticalmente.

## 4. JavaScript modularizado

Los scripts se cargan en este orden: `menuData`, `orderCore`, `orders`, `history`, `cash`, `storage`, `media`, `salesUI`, `cashUI`, `printing`, `app`.

- `js/orderCore.js`: validación de modificadores, `crearPartida()`, `crearExtra()` y cálculo exacto en centavos.
- `js/orders.js`: `nuevoPedido()`, `agregarPartidas()`, estados de cada producto y `marcarPartida()` para registrar preparación o pago. Las acciones repetidas conservan la fecha original. Las adiciones crean partidas independientes con identificadores nuevos y estados pendientes, sin alterar las partidas previas.
- `js/history.js`: `fechaLocal()`, `resumirDia()` y `agruparPorDia()` en la zona **America/Merida**.
- `js/cash.js`: lógica pura de `AmorCash`, importes exactos en centavos y validación de vínculos entre cobros, partidas y turnos.
- `js/cashUI.js`: apertura, `actualizarValidacionPago()` en cada edición de los montos, confirmación de pagos mixtos, gastos, desglose del corte e historial de cierres.
- `js/printing.js`: `AmorPrinting.separarComandas(pedido)`, `imprimirComandas(pedido)` e `imprimirCuenta(pedido)`; las dos funciones de impresión también están disponibles globalmente.
- `js/storage.js`: `cargarExpediente()` y `guardarExpediente(estado)` para leer y escribir localStorage, con validación y revisión del estado guardado.
- `js/media.js`: mapa de imágenes representativas de las cinco macros y de extras personalizados.
- `js/salesUI.js`: cola, seguimiento por producto, historial, KPIs y selección de días guardados.
- `js/app.js`: catálogo, búsqueda global, borrador, extras y coordinación. Expone `guardarExpediente()` sin argumentos para guardar el estado actual.

## Operación

1. Agrega productos, sus opciones y extras personalizados. El borrador se guarda automáticamente.
2. Pulsa **Crear pedido**, revisa el detalle y **Confirmar pedido**. Se asigna un número correlativo persistente y el pedido aparece en la barra inferior. El borrador se vacía solo cuando el guardado tiene éxito; después se abre automáticamente la impresión de comandas. Puedes **Reimprimir comandas** desde el seguimiento o el historial.
3. Abre un ticket de **Pedidos abiertos**. Cada producto puede marcarse **PREPARADO** y cobrarse de forma independiente. **Cobrar pendientes** cobra solo las partidas sin pago. Cada cobro exige caja abierta y permite efectivo, tarjeta/transferencia o ambos. Captura los montos en el modal y pulsa **Confirmar Pago** cuando se cubra el total. Cada partida con varias unidades registra el estado de todas sus unidades juntas.
4. El ticket continúa en la cola hasta que todos sus productos estén preparados y pagados. La tarjeta de la cola mantiene la etiqueta ABIERTO mientras está en curso. El estado agregado del detalle/historial es PAGADO si todos están pagados, PREPARADO si todos están preparados, o ABIERTO.
5. **Historial** muestra las ventas por día. Solo cuentan las unidades pagadas en esa fecha; los pagos parciales se incluyen por producto. Un pedido cuyos productos se pagan en dos días aparece en ambos días, sin duplicar ventas. Las tarjetas muestran su total completo y el importe pagado en la fecha seleccionada. El **Corte de Caja** se calcula por turno, incluyendo turnos que cruzan medianoche.
6. **Cargar Expediente** lee los días guardados en este navegador. Elegir uno abre su corte en el historial; conserva el borrador y la cola actuales. No abre el explorador del sistema.
7. **Guardar expediente** guarda manualmente todos los pedidos, estados, numeración, preferencia de cola y borrador. Además se guarda tras cada cambio. No se descargan ni se importan archivos de ventas.
8. **Añadir productos +** en un pedido abierto lleva al catálogo. Selecciona productos y extras, pulsa **Revisar productos nuevos** y **Confirmar adición**. Se actualiza el mismo pedido y se imprimen solo los productos añadidos. Sus estados empiezan pendientes; los pagos, fechas, precios y preparación anteriores se conservan. Esta selección se guarda por separado en `adicion`, sobrevive a una recarga y conserva el borrador del próximo pedido. **Cancelar** descarta la adición después de confirmar si hay productos seleccionados. Un ticket completamente preparado y pagado ya no admite adiciones.
9. **Imprimir cuenta** en el seguimiento genera un único ticket para el cliente con etiqueta, número, fecha, cantidades, opciones, notas, precios unitarios, importes por producto, total, abonos y saldo pendiente. Incluye todos los productos del pedido y puede imprimirse antes o después de cobrar. Imprimir conserva los estados y pagos.

Los KPIs muestran Entradas, Bebidas, Alimentos, Postres y Paquetes, contando cantidades. Un paquete cuenta como una unidad vendida. Los extras de preparación aumentan el importe del producto sin aumentar su conteo. Los extras personalizados sí cuentan como productos y se muestran con un conteo separado de unidades sin categoría; también se incluyen en ventas.

Las miniaturas de los tickets usan la imagen de la **macro-categoría** de cada partida, mediante `AmorMedia.imagenesCategoria`. Hay una imagen genérica para extras personalizados. Con más de cuatro partidas se muestran tres miniaturas y un indicador de las restantes.

## Control de caja

Al iniciar sin un turno abierto se ofrece **Apertura de Caja**. Puede cerrarse para navegar o preparar pedidos, pero ningún cobro se registra sin apertura. **Fondo de Caja** acepta cero o un importe positivo, con coma o punto y hasta dos decimales; el turno se conserva al recargar.

En **Cobrar pedido**, el aviso se actualiza al escribir: **Faltan: $X** deshabilita **Confirmar Pago**; **Cobro completo** lo habilita cuando la suma es exacta; **Cambio a entregar: $X** lo habilita cuando sobra efectivo. Los montos deben ser no negativos y tener hasta dos decimales. Tarjeta/transferencia nunca puede superar el total; el excedente solo puede salir del efectivo recibido.

El pedido y cada partida pagada guardan `montoEfectivo` y `montoTarjeta` en pesos, y sus cálculos usan centavos enteros. `montoEfectivo` representa el dinero que queda en el restaurante después del cambio. Para una cuenta de $350.00, recibir $500.00 en efectivo y $0.00 en tarjeta produce $150.00 de cambio y guarda `{ montoEfectivo: 350, montoTarjeta: 0 }`. Recibir $200.00 en efectivo y $150.00 en tarjeta guarda `{ montoEfectivo: 200, montoTarjeta: 150 }`. El agregado del pedido suma sus partidas pagadas. Al cobrar varias partidas juntas, se asigna efectivo hasta agotar su importe neto y tarjeta al resto; los totales conservan exactamente el desglose capturado.

**Registrar Gasto Extra** guarda monto, concepto y fecha en `caja.gastosDelDia`. Los gastos deben ser positivos y no superar el efectivo disponible. Se descuentan únicamente del efectivo, sin reducir ventas en tarjeta ni ventas generales.

El corte suma `montoEfectivo` y `montoTarjeta` de las partidas **pagadas en el turno actual**, y muestra fondo inicial, ventas en efectivo, gastos con sus conceptos, efectivo esperado, ventas en tarjeta/transferencia y total de ventas. La fórmula es `efectivo esperado = fondo inicial + suma de montoEfectivo − gastos`; `ventas generales = suma de montoEfectivo + suma de montoTarjeta`. El fondo y los gastos no son ventas. También se incluyen partidas ya cobradas de tickets que aún tengan productos pendientes: ese dinero ya entró a caja. Si el resto se paga en otro turno, solo sus nuevos cobros entran al siguiente corte; el total histórico del pedido no se vuelve a sumar.

**Cerrar Turno** agrega una instantánea inmutable a `historialCortes` y deja `caja` cerrada, con fondo, pagos y gastos en cero. Conserva el historial de pedidos y las partidas pagadas. Los productos pendientes pueden cobrarse en un nuevo turno y los turnos cerrados se consultan con **Cortes guardados**.

La API `AmorCash` devuelve copias sin modificar sus argumentos:

- `cajaVacia()`, `abrirCaja(caja, monto)` y `registrarGasto(caja, monto, concepto)` gestionan el turno y sus gastos.
- `validarPago(totalCentavos, efectivoRecibido, montoTarjeta)` recibe el total en centavos y los montos capturados en pesos, como números o cadenas. Devuelve `{ completo, faltanteCentavos, cambioCentavos, efectivoRecibidoCentavos, montoEfectivoCentavos, montoTarjetaCentavos }`. Rechaza montos inválidos y tarjeta superior al total.
- `cobrarPartidas(pedido, partidaId, caja, { efectivoRecibido, montoTarjeta }, fecha)` cobra las partidas pendientes; `partidaId` puede ser `todos`. Devuelve `{ pedido, caja, montoCentavos, cambioCentavos }`. `fecha` es opcional y usa el instante actual en ISO. Las cadenas anteriores `efectivo` o `tarjeta` se aceptan por compatibilidad, pero los nuevos registros siempre guardan los montos de cada método.
- `resumirCaja(caja, pedidos)` suma el desglose de las partidas pagadas del turno y verifica su correspondencia con los movimientos de caja. `pedidos` es opcional; al omitirlo, suma los montos de los movimientos registrados en `caja.pagos`. La interfaz siempre pasa los pedidos.
- `cerrarCaja(caja, fecha, pedidos)` devuelve `{ caja, corte }` y genera el resumen anterior antes de cerrar. `fecha` y `pedidos` son opcionales; para usar la fecha actual y validar los pedidos se llama `cerrarCaja(caja, undefined, pedidos)`.

Las acciones de la interfaz guardan el pedido y la caja en la misma escritura del expediente. Un pago con faltante se rechaza también en la lógica de guardado, aunque se intente enviar el formulario directamente.

## Comandas de Cocina y Barra

`separarComandas` produce `comandaBebidas` para **Bebidas** y `comandaAlimentos` para **Entradas**, **Alimentos** y **Postres**. El menú actual también incluye **Paquetes** mixtos y extras sin macro: se envían a Cocina con avisos explícitos para coordinar sus bebidas con Barra o confirmar su área. No se inventan componentes del paquete.

Los tickets incluyen número de pedido, mesa o nombre, fecha y hora de creación en Mérida, área, cantidades, selecciones guardadas y notas. El contenido se construye con `textContent`, de modo que nombres, conceptos y notas se imprimen como texto.

`imprimirComandas(pedido)` genera únicamente las áreas con productos y llama `window.print()`. `imprimirCuenta(pedido)` usa el mismo formato térmico y comprueba que el total coincide con sus partidas. Ambas devuelven una promesa y limpian el contenedor tras `afterprint` o cuando el navegador sale del modo de impresión. Impiden impresiones simultáneas y también limpian si `window.print()` falla. Cancelar la impresión conserva el pedido confirmado y permite reimprimirlo.

El navegador abre su diálogo de impresión: selecciona papel de **80 mm**, escala **100 %** y desactiva cabeceras/pies del navegador. Ambas áreas se envían como páginas separadas en una sola llamada a la impresora seleccionada. Asignar automáticamente impresoras físicas diferentes o imprimir sin diálogo requiere integración adicional; `window.print()` no informa si salió el papel.

## Persistencia

La clave `amor-amor-pos:expediente:v2` contiene pedidos, borrador, caja activa y `historialCortes`. Al cargar expedientes con `metodoPago` anterior, los pagos de efectivo se convierten al importe completo en `montoEfectivo` y cero en `montoTarjeta`; los de tarjeta se convierten al desglose inverso. Los movimientos anteriores de caja también se convierten a montos por método y conservan sus vínculos de turno. Se elimina el campo antiguo en las copias normalizadas y se comprueba que los montos coincidan con los productos y cortes.

Los expedientes previos sin caja se cargan con caja cerrada; los pagos anteriores sin método conservan su historial sin atribuirse a un nuevo turno, y muestran método sin registrar. No se inventa un desglose para esos pagos. El borrador anterior en `amor-amor-pos:borrador:v1` se recupera automáticamente si no existe un expediente nuevo. No se borra la clave anterior durante la migración.

Los pedidos confirmados guardan copias de nombres, precios, opciones y categorías; cambiar el menú no reescribe las ventas anteriores. El borrador del catálogo se recalcula con los precios actuales al recargar.

Si localStorage no puede guardar, se muestra el error y no se confirma una venta ni se borra su borrador. Una apertura, cobro, gasto o cierre fallido conserva el estado anterior. Se validan las sumas de los cortes y la correspondencia entre cada pago y sus productos. Los expedientes inválidos se conservan sin sobrescribirlos. La app detecta cambios de otra pestaña y actualiza su estado; una escritura con revisión antigua se rechaza. Los formularios de caja comprueban el turno antes de guardar un movimiento.

Los datos pertenecen al navegador, perfil y origen actuales. `file://`, localhost y un alojamiento web tienen almacenamientos separados. Esta versión no sincroniza dispositivos ni procesa cargos en una terminal bancaria; PAGADO registra la indicación del operador.

## Verificación

```sh
node tests/menu.test.cjs
node tests/sales.test.cjs
node tests/cash.test.cjs
node tests/printing.test.cjs
node tests/browser.test.cjs
node tests/cash-browser.test.cjs
```

Las pruebas unitarias no requieren dependencias externas. Las pruebas de navegador requieren Playwright y Chromium; inician y cierran un servidor local automáticamente. Si Playwright está en otra carpeta, apunta NODE_PATH a su directorio de paquetes.

Se verifica el catálogo completo, extras, totales, pagos parciales, cambio de día en Mérida, migración del borrador, revisión de almacenamiento y errores de escritura. Caja cubre pagos mixtos, faltantes, cambio, tarjeta superior al total, fondo cero, límites, prevención de pagos repetidos, gastos, cierre/reinicio, migración de métodos anteriores e integridad de los montos con las partidas. En navegador se comprueban búsqueda global, pedidos, estados por producto, expedientes, historial, ausencia de descargas, file:// y cuatro anchos (1440, 820, 390 y 320 px). También se simulan fallos de escritura en apertura, cobro, gasto y cierre, y se validan comandas, modificadores, limpieza y CSS de impresión. Las capturas quedan en test-results/.
