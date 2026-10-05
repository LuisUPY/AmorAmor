# Notas de transcripción del menú

Fuente: `Menu Amor & Amor.pdf`, 8 páginas. La portada no contiene productos. Se revisaron texto e imágenes de las páginas 2 a 8. El catálogo contiene 105 productos únicos.

## Clasificación editorial

- **Paquetes → Desayunos del día:** los cinco productos incluyen agua y/o café; Burrito conserva sus bebidas y guarniciones incluidas.
- **Alimentos → Waffles:** clásico, churro, Marque waffle, frutal y salado se agrupan juntos según la corrección solicitada. Se conserva la macro Postres, actualmente sin productos, para futuras altas.
- **Alimentos → Hot cakes:** los tres se mantienen como desayunos.
- Toast, sándwiches y croissants se separan. “Los favoritos” se identifica como Huevos y omelettes.
- Jugo de naranja queda en Aguas naturales. Se elimina la subcategoría vacía Jugos; los otros tres jugos siguen en Jugos nutritivos. Sabores con precio compartido son productos individuales.
- Se corrigieron acentos y errores ortográficos obvios, sin alterar ingredientes ni importes.

## Precios compartidos y revisión visual

- Página 6: aguas de sandía, melón, papaya y piña, limonada y naranjada $40; fresa con limón y pepino con limón $50; variantes con chía $55 salvo limonada con chía $45. Jugo de naranja $50.
- Página 6: té helado, horchata, tamarindo y jamaica comparten $55 bajo Bebidas rellenables. Jugo verde, Detox y Vampiro comparten $60.
- Página 7: las cuatro bebidas Sin café comparten $80; los cuatro Lattes saborizados $85; los nueve Lattes Amor $90; las cuatro sodas italianas $70.
- Página 8: los tres sabores de malteada comparten $90. Avena es un extra de licuados de $10, no un producto sin precio.
- La extracción de la página 5 incluye un $140 duplicado fuera del contenido visible. La revisión visual confirma huevos rancheros $140 y omelette nutritivo $160; no se cuenta el texto oculto como otro producto.

## Opciones y alcance de extras

- Fruta: yogurt natural y granola $30 c/u. Se asignan a Orden de fruta por su naturaleza; el PDF presenta el bloque bajo Entradas sin referencia individual explícita.
- Desayunos del día: tocino, huevo, frijol y jamón $35 c/u, de su bloque de extras.
- Pastas: tiras tender $45; Hot cakes: huevo y tocino $35 c/u; Chilaquiles: huevo y pollo $35 c/u.
- Cafés y ambas familias de lattes: leche deslactosada $10 y shot de espresso $25, de los bloques de café/lattes. No se extienden a Sin café, que no muestra su propio bloque de extras.
- Licuados: leche deslactosada, granola, miel y avena $10 c/u. Frappés y malteadas: leche deslactosada $10.
- Cada extra se selecciona una vez por unidad del producto. El PDF no especifica cantidades repetidas del mismo extra.
- Chilaquiles con pollo o huevo requieren salsa roja/verde y proteína pollo/huevo. Chilaquiles Amor y rajas poblanas requieren salsa roja/verde. Las otras recetas conservan su salsa publicada.
- Tempranero mexicano requiere fruta o café como acompañamiento incluido.
- Enchiladas suizas: se conserva roja/verde del título; el cuerpo menciona solo verde. Este conflicto se registra en `notaFuente` del producto.
- Oroweat, masa madre y pan tostado son ingredientes fijos. No hay elección publicada blanco/integral, con/sin hielo o de término de cocción.

## Datos que debe confirmar el restaurante

1. **Dirty chai, página 7:** sin precio impreso. `precio` queda en `null`; el botón y el cálculo bloquean su venta. Para habilitarlo, completa el precio confirmado y elimina `estadoPrecio: "pendiente"` y su nota de precio pendiente.
2. **Untable del waffle clásico, página 3:** el menú dice “untable a elegir”, sin alternativas. Se usa texto requerido, sin cargo inventado. Al confirmar la lista, reemplaza el grupo por `tipo: "unica"` y sus `valores` con costos confirmados.

No se deducen costos de ingredientes incluidos ni se crean productos o variantes ausentes de la fuente.
