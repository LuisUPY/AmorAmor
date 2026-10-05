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

`index.html` contiene los diálogos Extras, Historial, Cargar Expediente, revisión y seguimiento de pedidos. Los botones de la cabecera permiten abrir el historial, consultar expedientes y guardar manualmente el estado.

**Añadir Extra** solicita únicamente Concepto y Monto. Acepta punto o coma decimal, requiere un importe positivo de hasta dos decimales y agrega el ítem al mismo carrito. Puede modificarse su cantidad o quitarse como cualquier producto. No se inventa una macro para estos ítems.

## 3. CSS

`css/styles.css` mantiene el catálogo y los modificadores originales. `css/pos-features.css` añade el buscador global, el historial master-detail, los estados, los nuevos modales y la barra inferior.

El historial tiene lista de días a la izquierda y corte a la derecha, con scroll independiente. En teléfono la lista se convierte en una fila horizontal y el resumen se recorre verticalmente.

## 4. JavaScript modularizado

Los scripts se cargan en este orden: `menuData`, `orderCore`, `orders`, `history`, `storage`, `media`, `salesUI`, `app`.

- `js/orderCore.js`: validación de modificadores, `crearPartida()`, `crearExtra()` y cálculo exacto en centavos.
- `js/orders.js`: `nuevoPedido()`, estados de cada producto y `marcarPartida()` para registrar preparación o pago. Las acciones repetidas conservan la fecha original.
- `js/history.js`: `fechaLocal()`, `resumirDia()` y `agruparPorDia()` en la zona **America/Merida**.
- `js/storage.js`: `cargarExpediente()` y `guardarExpediente(estado)` para leer y escribir localStorage, con validación y revisión del estado guardado.
- `js/media.js`: mapa de imágenes representativas de las cinco macros y de extras personalizados.
- `js/salesUI.js`: cola, seguimiento por producto, historial, KPIs y selección de días guardados.
- `js/app.js`: catálogo, búsqueda global, borrador, extras y coordinación. Expone `guardarExpediente()` sin argumentos para guardar el estado actual.

## Operación

1. Agrega productos, sus opciones y extras personalizados. El borrador se guarda automáticamente.
2. Pulsa **Crear pedido**, revisa el detalle y **Confirmar pedido**. Se asigna un número correlativo persistente y el pedido aparece en la barra inferior. El borrador se vacía solo cuando el guardado tiene éxito.
3. Abre un ticket de **Pedidos abiertos**. Cada producto puede marcarse **PREPARADO** y **PAGADO** de forma independiente. También hay acciones para todo el pedido. Cada partida con varias unidades registra el estado de todas sus unidades juntas.
4. El ticket continúa en la cola hasta que todos sus productos estén preparados y pagados. La tarjeta de la cola mantiene la etiqueta ABIERTO mientras está en curso. El estado agregado del detalle/historial es PAGADO si todos están pagados, PREPARADO si todos están preparados, o ABIERTO.
5. **Historial** muestra el corte por día. Solo cuentan las unidades pagadas en esa fecha; los pagos parciales se incluyen por producto. Un pedido cuyos productos se pagan en dos días aparece en ambos cortes, sin duplicar ventas. Las tarjetas muestran su total completo y el importe pagado en el corte seleccionado.
6. **Cargar Expediente** lee los días guardados en este navegador. Elegir uno abre su corte en el historial; conserva el borrador y la cola actuales. No abre el explorador del sistema.
7. **Guardar expediente** guarda manualmente todos los pedidos, estados, numeración, preferencia de cola y borrador. Además se guarda tras cada cambio. No se descargan ni se importan archivos de ventas.

Los KPIs muestran Entradas, Bebidas, Alimentos, Postres y Paquetes, contando cantidades. Un paquete cuenta como una unidad vendida. Los extras de preparación aumentan el importe del producto sin aumentar su conteo. Los extras personalizados sí cuentan como productos y se muestran con un conteo separado de unidades sin categoría; también se incluyen en ventas.

Las miniaturas de los tickets usan la imagen de la **macro-categoría** de cada partida, mediante `AmorMedia.imagenesCategoria`. Hay una imagen genérica para extras personalizados. Con más de cuatro partidas se muestran tres miniaturas y un indicador de las restantes.

## Persistencia

La clave `amor-amor-pos:expediente:v2` contiene todos los datos de ventas. El borrador anterior en `amor-amor-pos:borrador:v1` se recupera automáticamente si no existe un expediente nuevo. No se borra la clave anterior durante la migración.

Los pedidos confirmados guardan copias de nombres, precios, opciones y categorías; cambiar el menú no reescribe las ventas anteriores. El borrador del catálogo se recalcula con los precios actuales al recargar.

Si localStorage no puede guardar, se muestra el error y no se confirma una venta ni se borra su borrador. Los expedientes inválidos se conservan sin sobrescribirlos. La app detecta cambios de otra pestaña y actualiza su estado; una escritura con revisión antigua se rechaza.

Los datos pertenecen al navegador, perfil y origen actuales. `file://`, localhost y un alojamiento web tienen almacenamientos separados. Esta versión no sincroniza dispositivos ni procesa cargos en una terminal bancaria; PAGADO registra la indicación del operador.

## Verificación

```sh
node tests/menu.test.cjs
node tests/sales.test.cjs
node tests/browser.test.cjs
```

Las dos primeras pruebas no requieren dependencias externas. La tercera requiere Playwright y Chromium; inicia y cierra un servidor local automáticamente. Si Playwright está en otra carpeta, apunta NODE_PATH a su directorio de paquetes.

Se verifica el catálogo completo, extras, totales, pagos parciales, cambio de día en Mérida, migración del borrador, revisión de almacenamiento y errores de escritura. En navegador se comprueban búsqueda global, pedidos, estados por producto, expedientes, historial, ausencia de descargas, file:// y cuatro anchos (1440, 820, 390 y 320 px). Las capturas quedan en test-results/.
