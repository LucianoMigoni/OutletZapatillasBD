# Contrato de la API del tablero

Este documento define los endpoints que el **frontend** (`client/`) consume y
que el **backend** (`server/`) implementa. Si se cambia un endpoint, hay que
cambiarlo en los dos lados y en este documento.

## Convenciones

- Todas las rutas empiezan con **`/api`**.
- Todos los endpoints del tablero requieren **`Authorization: Bearer <token>`**
  (el JWT que ya devuelve `/api/auth/login`). Sin token válido: `401`.
- Errores con el mismo formato que la autenticación: **`{ "message": "..." }`**.
  - `400`: parámetros inválidos (por ejemplo, falta `anio` o `mes`, o `mes`
    fuera de 1 a 12).
  - `404`: la sucursal, marca o producto pedido no existe.
- JSON en **camelCase** (el formato por defecto de ASP.NET Core).
- **Importes**: números sin formato (`85916400.00`). El front les da formato.
- **Porcentajes**: números en escala 0 a 100 con un decimal (`107.4` es
  107,4%).
- **Fechas**: `"2026-09-29"`. **Fecha y hora**: `"2026-09-29T20:10:00"`, sin
  zona horaria (es lo que devuelve Npgsql para una columna `timestamp`).
- **Talles**: número (`40` o `40.5`).
- **Filtros opcionales**: si un parámetro no viene o viene vacío, no se filtra
  por él.
- **Paginado**: parámetros `pagina` (desde 1, por defecto 1) y `porPagina` (por
  defecto 10, máximo 100). La respuesta trae:

  ```json
  { "items": [], "total": 1874, "pagina": 1, "porPagina": 10 }
  ```

  `total` es la cantidad de filas que cumplen el filtro (no solo las de la
  página).

## Semáforos

Los estados de los semáforos los calcula la **base de datos**, con las funciones
`estado_objetivo`, `estado_stock` y `estado_cliente` de
`server/base de datos/04_vistas_y_funciones.sql`. El front solo los muestra con
su color y su texto. Valores posibles:

| Semáforo | Campo | Verde | Amarillo | Rojo |
|---|---|---|---|---|
| Cumplimiento del objetivo mensual (ventas del mes ÷ objetivo) | `estado` | `"cumple"`: 100% o más | `"atencion"`: 80% a 99,9% | `"critico"`: menos de 80% |
| Stock por producto, talle y sucursal (cantidad vs. `stock_minimo`) | `estado` | `"normal"`: más del doble del mínimo | `"atencion"`: más del mínimo y hasta el doble | `"critico"`: igual o menor al mínimo (incluye sin stock) |
| Actividad de clientes (días desde la última compra) | `estado` | `"activo"`: 30 días o menos | `"en_riesgo"`: 31 a 90 días | `"inactivo"`: más de 90 días o sin compras |

- Si una sucursal no tiene objetivo cargado para el mes, `objetivo`,
  `cumplimiento` y `estado` vienen en `null`.
- El **estado de stock de un modelo** en una sucursal (nivel 3 del drill down)
  es el peor estado entre todos sus talles en esa sucursal.

Las expresiones que usan esas funciones:

```sql
-- Objetivo
CASE WHEN o.monto_objetivo IS NULL                    THEN NULL
     WHEN ventas >= o.monto_objetivo                  THEN 'cumple'
     WHEN ventas >= o.monto_objetivo * 0.8            THEN 'atencion'
     ELSE 'critico' END

-- Stock
CASE WHEN st.cantidad <= st.stock_minimo              THEN 'critico'
     WHEN st.cantidad <= st.stock_minimo * 2          THEN 'atencion'
     ELSE 'normal' END

-- Clientes (dias = fecha de referencia - fecha de la última compra)
CASE WHEN dias IS NULL OR dias > 90                   THEN 'inactivo'
     WHEN dias > 30                                   THEN 'en_riesgo'
     ELSE 'activo' END
```

### Fecha de referencia

Los días desde la última compra **no se calculan contra la fecha de hoy**: si
los datos de prueba terminan en septiembre y el tablero se mira en diciembre,
todos los clientes aparecerían como inactivos. Se usa una **fecha de
referencia**: el día siguiente a la última venta registrada.

```sql
SELECT MAX(fecha)::date + 1 AS fecha_referencia FROM ventas;
-- Última venta el 30/09/2026 -> fecha de referencia 01/10/2026
-- Un cliente que compró el 29/09/2026 lleva 2 días sin comprar
```

## Endpoints

| # | Endpoint | Pantalla |
|---|---|---|
| 1 | `GET /api/tablero/catalogos` | Todas (selectores y filtros) |
| 2 | `GET /api/tablero/resumen` | Resumen |
| 3 | `GET /api/ventas/sucursales` | Ventas por sucursal: nivel 1 |
| 4 | `GET /api/ventas/sucursales/{idSucursal}/marcas` | Nivel 2 |
| 5 | `GET /api/ventas/sucursales/{idSucursal}/marcas/{idMarca}/modelos` | Nivel 3 |
| 6 | `GET /api/ventas/sucursales/{idSucursal}/productos/{idProducto}` | Nivel 4 |
| 7 | `GET /api/stock` | Stock |
| 8 | `GET /api/clientes` | Clientes |
| 9 | `GET /api/ventas` | Detalle de ventas |

Los endpoints de autenticación (`/api/auth/login`, `/api/auth/register` y
`/api/auth/me`) quedan como están.

---

### 1. `GET /api/tablero/catalogos`

Datos para los selectores. El front lo pide una sola vez, al entrar al tablero.

```json
{
  "fechaReferencia": "2026-10-01",
  "periodos": [
    { "anio": 2026, "mes": 9 },
    { "anio": 2026, "mes": 8 }
  ],
  "sucursales": [
    { "id": 3, "nombre": "Belgrano", "ciudad": "CABA", "provincia": "CABA" }
  ],
  "marcas": [
    { "id": 2, "nombre": "Adidas" }
  ]
}
```

- `fechaReferencia`: ver [Fecha de referencia](#fecha-de-referencia).
- `periodos`: meses que tienen al menos una venta, del más reciente al más
  antiguo. El primero es el que el tablero muestra por defecto.

  ```sql
  SELECT DISTINCT EXTRACT(YEAR FROM fecha)::int AS anio,
                  EXTRACT(MONTH FROM fecha)::int AS mes
  FROM ventas
  ORDER BY anio DESC, mes DESC;
  ```

- `sucursales` y `marcas`: todas, ordenadas por nombre.
- El front muestra la ubicación como `ciudad, provincia`, o solo `ciudad` si
  las dos son iguales (por ejemplo, `CABA`).

---

### 2. `GET /api/tablero/resumen?anio=2026&mes=9&idSucursal=`

Pantalla principal. `idSucursal` es opcional: sin él, el resumen es de todas
las sucursales.

```json
{
  "kpis": {
    "ventas": 290026400.00,
    "ventasAnterior": 264123500.00,
    "pares": 2418,
    "paresAnterior": 2279,
    "tickets": 1874,
    "ticketsAnterior": 1690,
    "objetivo": 302000000.00,
    "cumplimiento": 96.0,
    "estado": "atencion"
  },
  "sucursales": [
    {
      "id": 1,
      "nombre": "Palermo",
      "ciudad": "CABA",
      "provincia": "CABA",
      "ventas": 85916400.00,
      "objetivo": 80000000.00,
      "cumplimiento": 107.4,
      "estado": "cumple"
    }
  ],
  "stock": { "critico": 46, "atencion": 112, "normal": 1284 },
  "clientes": { "activo": 1932, "enRiesgo": 864, "inactivo": 1215 },
  "ventasPorDia": [
    { "fecha": "2026-09-01", "ventas": 8650000.00, "tickets": 57 }
  ]
}
```

- `kpis.ventas`: suma de `ventas.total` del mes. `pares`: suma de
  `detalle_ventas.cantidad`. `tickets`: cantidad de ventas.
- `kpis.*Anterior`: el mismo cálculo para el mes anterior (`0` si no hubo
  ventas). El front calcula la variación y el ticket promedio
  (`ventas / tickets`).
- `kpis.objetivo`: suma de los objetivos del mes de las sucursales incluidas
  (`null` si ninguna tiene objetivo). `cumplimiento` y `estado` salen de
  comparar `ventas` contra ese objetivo.
- `sucursales`: todas las sucursales del filtro, **también las que no
  vendieron** (`LEFT JOIN`), ordenadas por `ventas` de mayor a menor.
- `stock`: cantidad de combinaciones producto - talle - sucursal en cada
  estado. Es el stock actual (no depende del mes). Con `idSucursal`, solo las de
  esa sucursal.
- `clientes`: cantidad de clientes en cada estado. Con `idSucursal`, solo los
  que tienen esa sucursal como sucursal habitual (ver endpoint 8).
- `ventasPorDia`: ventas e importe de cada día del mes, ordenado por fecha. Los
  días sin ventas se pueden omitir: el front los completa con 0.

---

### 3. `GET /api/ventas/sucursales?anio=2026&mes=9`

Drill down, **nivel 1**: ventas de cada sucursal en el mes.

```json
{
  "items": [
    {
      "id": 1,
      "nombre": "Palermo",
      "ciudad": "CABA",
      "provincia": "CABA",
      "ventas": 85916400.00,
      "tickets": 551,
      "pares": 712,
      "objetivo": 80000000.00,
      "cumplimiento": 107.4,
      "estado": "cumple"
    }
  ],
  "totales": {
    "ventas": 290026400.00,
    "tickets": 1874,
    "pares": 2418,
    "objetivo": 302000000.00,
    "cumplimiento": 96.0,
    "estado": "atencion"
  }
}
```

- `items`: todas las sucursales, ordenadas por `ventas` de mayor a menor.
- `totales`: la fila "Total" de la tabla.
- La participación de cada sucursal (`% del total`) la calcula el front.

---

### 4. `GET /api/ventas/sucursales/{idSucursal}/marcas?anio=2026&mes=9`

Drill down, **nivel 2**: ventas por marca dentro de una sucursal.

```json
{
  "sucursal": {
    "id": 1,
    "nombre": "Palermo",
    "ciudad": "CABA",
    "provincia": "CABA",
    "ventas": 85916400.00,
    "tickets": 551,
    "pares": 712,
    "objetivo": 80000000.00,
    "cumplimiento": 107.4,
    "estado": "cumple"
  },
  "items": [
    { "id": 1, "nombre": "Nike", "ventas": 30736400.00, "pares": 236, "ventasAnterior": 27443200.00 }
  ]
}
```

- `sucursal`: los datos de la sucursal en el mes (los indicadores de arriba de
  la pantalla). Mismos campos que un ítem del nivel 1.
- `items`: solo las marcas **con ventas** en esa sucursal y ese mes, ordenadas
  por `ventas` de mayor a menor.
- `ventasAnterior`: ventas de esa marca en esa sucursal en el mes anterior
  (`0` si no vendió).
- Precio promedio (`ventas / pares`), `% de la sucursal` y variación contra el
  mes anterior los calcula el front.
- `404` si la sucursal no existe.

---

### 5. `GET /api/ventas/sucursales/{idSucursal}/marcas/{idMarca}/modelos?anio=2026&mes=9`

Drill down, **nivel 3**: modelos de una marca vendidos en una sucursal.

```json
{
  "sucursal": { "id": 1, "nombre": "Palermo" },
  "marca": { "id": 1, "nombre": "Nike" },
  "items": [
    {
      "id": 12,
      "modelo": "Air Max 90",
      "sku": "NK-AM90",
      "categoria": "Urbana",
      "precioOutlet": 159900.00,
      "pares": 58,
      "ventas": 9274200.00,
      "stock": 9,
      "estadoStock": "critico"
    }
  ]
}
```

- `items`: productos de esa marca **con ventas** en esa sucursal y ese mes,
  ordenados por `ventas` de mayor a menor.
- `stock`: suma de `stock.cantidad` del producto en esa sucursal (todos los
  talles). Si no tiene filas de stock: `0`.
- `estadoStock`: el peor estado entre sus talles en esa sucursal (`"critico"`
  si no tiene filas de stock).
- `404` si la sucursal o la marca no existen.

---

### 6. `GET /api/ventas/sucursales/{idSucursal}/productos/{idProducto}?anio=2026&mes=9&pagina=1&porPagina=8`

Drill down, **nivel 4**: cada línea de venta de un modelo en una sucursal.

```json
{
  "sucursal": { "id": 1, "nombre": "Palermo" },
  "marca": { "id": 1, "nombre": "Nike" },
  "producto": {
    "id": 12,
    "modelo": "Air Max 90",
    "sku": "NK-AM90",
    "precioLista": 229900.00,
    "precioOutlet": 159900.00
  },
  "resumen": { "lineas": 52, "pares": 58, "ventas": 9274200.00 },
  "paresPorTalle": [
    { "talle": 36, "pares": 2 },
    { "talle": 37, "pares": 4 }
  ],
  "lineas": {
    "items": [
      {
        "idDetalle": 40211,
        "fecha": "2026-09-29T20:10:00",
        "numero": "V-004812",
        "cliente": "Martina López",
        "talle": 38,
        "cantidad": 1,
        "precioUnitario": 159900.00,
        "subtotal": 159900.00,
        "medioPago": "debito"
      }
    ],
    "total": 52,
    "pagina": 1,
    "porPagina": 8
  }
}
```

- `marca`: la marca del producto (el front la usa para la ruta de navegación y
  el botón "Volver").
- `resumen`: totales de todas las líneas del mes (no solo de la página).
- `paresPorTalle`: pares vendidos de cada talle en el mes, ordenado por talle.
- `lineas`: líneas de `detalle_ventas` paginadas, de la más reciente a la más
  antigua. `cliente` es `nombre || ' ' || apellido`.
- `medioPago`: el valor guardado en `ventas.medio_pago` (`efectivo`, `debito`,
  `credito`, `transferencia` o `billetera`).
- `404` si la sucursal o el producto no existen.

---

### 7. `GET /api/stock?busqueda=&idSucursal=&idMarca=&estado=&pagina=1&porPagina=10`

Pantalla de stock: una fila por producto, talle y sucursal.

```json
{
  "items": [
    {
      "idStock": 731,
      "idProducto": 24,
      "sku": "TP-TIE",
      "modelo": "Tie Break",
      "marca": "Topper",
      "sucursal": "Córdoba Nuevocentro",
      "talle": 42,
      "cantidad": 0,
      "stockMinimo": 3,
      "estado": "critico"
    }
  ],
  "total": 1442,
  "pagina": 1,
  "porPagina": 10,
  "conteos": { "critico": 46, "atencion": 112, "normal": 1284 }
}
```

- `busqueda`: busca en el modelo o en el SKU (`ILIKE '%texto%'`).
- `estado`: `critico`, `atencion` o `normal`.
- `conteos`: cantidad de filas en cada estado aplicando `busqueda`, `idSucursal`
  e `idMarca`, **pero no** `estado` (así los botones de estado muestran cuántas
  hay de cada una).
- Solo productos activos (`productos.activo = true`).
- Orden: primero las críticas, después atención y después normal; dentro de
  cada estado, por `cantidad` de menor a mayor, y después por modelo, sucursal y
  talle.
- El front muestra el SKU con el talle (`TP-TIE-42`).

---

### 8. `GET /api/clientes?busqueda=&idSucursal=&estado=&pagina=1&porPagina=10`

Pantalla de clientes con su estado de actividad.

```json
{
  "items": [
    {
      "id": 1,
      "nombre": "Martina",
      "apellido": "López",
      "dni": "38456120",
      "email": "martina.lopez@mail.com",
      "sucursalHabitual": "Palermo",
      "compras12Meses": 6,
      "totalGastado": 812400.00,
      "ultimaCompra": "2026-09-29",
      "dias": 2,
      "estado": "activo"
    }
  ],
  "total": 4011,
  "pagina": 1,
  "porPagina": 10,
  "conteos": { "activo": 1932, "enRiesgo": 864, "inactivo": 1215 }
}
```

- `sucursalHabitual`: la sucursal donde el cliente hizo más compras (si hay
  empate, la de la compra más reciente). `null` si nunca compró.
- `compras12Meses`: cantidad de ventas en los 12 meses anteriores a la fecha de
  referencia.
- `totalGastado`: suma de `ventas.total` de todas sus compras.
- `ultimaCompra` y `dias`: `null` si nunca compró. `dias` = fecha de referencia
  − fecha de la última compra.
- `busqueda`: busca en nombre, apellido, nombre y apellido juntos, DNI o email.
- `idSucursal`: filtra por sucursal habitual.
- `estado`: `activo`, `en_riesgo` o `inactivo`.
- `conteos`: igual que en stock, aplica `busqueda` e `idSucursal` pero no
  `estado`.
- Orden: última compra de la más reciente a la más antigua (los que nunca
  compraron al final), y después apellido y nombre.

---

### 9. `GET /api/ventas?desde=2026-09-01&hasta=2026-09-30&idSucursal=&medioPago=&busqueda=&orden=fecha_desc&pagina=1&porPagina=10`

Pantalla "Detalle de ventas": una fila por venta (ticket).

```json
{
  "items": [
    {
      "id": 4818,
      "numero": "V-004818",
      "fecha": "2026-09-30T19:42:00",
      "sucursal": "Unicenter",
      "cliente": "Nicolás Paz",
      "producto": "Adidas Samba OG",
      "otrosProductos": 0,
      "pares": 1,
      "medioPago": "credito",
      "total": 149900.00
    }
  ],
  "total": 1874,
  "pagina": 1,
  "porPagina": 10,
  "totales": { "ventas": 1874, "pares": 2418, "importe": 290026400.00 }
}
```

- `desde` y `hasta`: fechas inclusive (`fecha >= desde AND fecha < hasta + 1`).
- `medioPago`: `efectivo`, `debito`, `credito`, `transferencia` o `billetera`.
- `busqueda`: busca en el número de venta o en el nombre y apellido del
  cliente.
- `orden`: `fecha_desc` (por defecto), `fecha_asc`, `total_desc` o
  `total_asc`.
- `producto`: `marca + ' ' + modelo` de la primera línea de la venta (la de
  menor `id_detalle`). `otrosProductos`: cantidad de líneas restantes (el front
  muestra "Puma Suede Classic + 1").
- `pares`: suma de las cantidades de la venta.
- `totales`: de **todas** las ventas que cumplen el filtro, no solo de la
  página. El ticket promedio (`importe / ventas`) lo calcula el front.

## Estado de la implementación

- [x] Script `server/base de datos/03_siembra_datos.sql` con datos de todas las
      tablas: seis meses de ventas, los tres colores de cada semáforo,
      `ventas.total` igual a la suma de sus subtotales y ejecutable varias veces
      sin duplicar (`ON CONFLICT DO NOTHING`).
- [x] Endpoints 1 a 9 con `[Authorize]` y consultas SQL parametrizadas.
- [x] Estados de los semáforos calculados en SQL (funciones de
      `04_vistas_y_funciones.sql`) con los umbrales de la tabla de
      [Semáforos](#semáforos).
- [x] Días de los clientes contra la [fecha de referencia](#fecha-de-referencia),
      no contra `now()`.
- [x] `400`, `401` y `404` con `{ "message" }` como en la autenticación.
- [x] `server/README.md` actualizado con los endpoints nuevos.
