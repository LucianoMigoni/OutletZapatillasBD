-- Outlet de Zapatillas - Semáforos y vistas del tablero (PostgreSQL)
--
-- Las reglas de los tres semáforos viven en la base de datos, en funciones SQL, para que
-- todas las consultas del tablero las calculen igual. Las vistas juntan los datos que usan
-- varias pantallas: el stock con su estado y la actividad de cada cliente.
--
-- Se puede ejecutar varias veces: las vistas se recrean y las funciones se reemplazan.

DROP VIEW IF EXISTS vista_actividad_clientes;
DROP VIEW IF EXISTS vista_stock;

-- Cumplimiento del objetivo mensual: verde >= 100%, amarillo 80% a 99,9%, rojo < 80%.
-- Sin objetivo cargado no hay estado (NULL).
CREATE OR REPLACE FUNCTION estado_objetivo(ventas numeric, objetivo numeric)
RETURNS varchar
LANGUAGE sql IMMUTABLE
AS $$
    SELECT CASE WHEN objetivo IS NULL          THEN NULL
                WHEN ventas >= objetivo        THEN 'cumple'
                WHEN ventas >= objetivo * 0.8  THEN 'atencion'
                ELSE 'critico'
           END
$$;

-- Stock de un producto en un talle y una sucursal: rojo en o bajo el mínimo (incluye sin
-- stock), amarillo hasta el doble del mínimo, verde por encima del doble.
CREATE OR REPLACE FUNCTION estado_stock(cantidad integer, stock_minimo integer)
RETURNS varchar
LANGUAGE sql IMMUTABLE
AS $$
    SELECT CASE WHEN cantidad <= stock_minimo      THEN 'critico'
                WHEN cantidad <= stock_minimo * 2  THEN 'atencion'
                ELSE 'normal'
           END
$$;

-- Actividad de un cliente según los días desde su última compra: verde hasta 30 días,
-- amarillo de 31 a 90, rojo más de 90 o si nunca compró (NULL).
CREATE OR REPLACE FUNCTION estado_cliente(dias integer)
RETURNS varchar
LANGUAGE sql IMMUTABLE
AS $$
    SELECT CASE WHEN dias IS NULL OR dias > 90  THEN 'inactivo'
                WHEN dias > 30                  THEN 'en_riesgo'
                ELSE 'activo'
           END
$$;

-- Una fila por producto, talle y sucursal, con los nombres y el estado del semáforo
CREATE VIEW vista_stock AS
SELECT st.id_stock,
       st.id_sucursal,
       s.nombre    AS sucursal,
       st.id_producto,
       p.sku,
       p.modelo,
       p.id_marca,
       m.nombre    AS marca,
       p.activo,
       st.talle,
       st.cantidad,
       st.stock_minimo,
       estado_stock(st.cantidad, st.stock_minimo) AS estado
FROM stock st
JOIN productos  p ON p.id_producto = st.id_producto
JOIN marcas     m ON m.id_marca = p.id_marca
JOIN sucursales s ON s.id_sucursal = st.id_sucursal;

-- Actividad de cada cliente. Los días se cuentan contra la fecha de referencia (el día
-- siguiente a la última venta registrada) y no contra la fecha actual, así el estado no
-- depende del día en que se mira el tablero.
CREATE VIEW vista_actividad_clientes AS
WITH referencia AS (
    SELECT COALESCE(MAX(fecha)::date + 1, current_date) AS fecha
    FROM ventas
),
compras AS (
    SELECT v.id_cliente,
           MAX(v.fecha)::date AS ultima_compra,
           SUM(v.total)       AS total_gastado,
           COUNT(*) FILTER (WHERE v.fecha >= r.fecha - INTERVAL '12 months') AS compras_12_meses
    FROM ventas v
    CROSS JOIN referencia r
    GROUP BY v.id_cliente
),
-- Sucursal habitual: donde hizo más compras. Si empata, la de la compra más reciente
por_sucursal AS (
    SELECT id_cliente,
           id_sucursal,
           ROW_NUMBER() OVER (PARTITION BY id_cliente
                              ORDER BY COUNT(*) DESC, MAX(fecha) DESC) AS orden
    FROM ventas
    GROUP BY id_cliente, id_sucursal
)
SELECT c.id_cliente,
       c.nombre,
       c.apellido,
       c.dni,
       c.email,
       ps.id_sucursal                      AS id_sucursal_habitual,
       s.nombre                            AS sucursal_habitual,
       COALESCE(co.compras_12_meses, 0)    AS compras_12_meses,
       COALESCE(co.total_gastado, 0)       AS total_gastado,
       co.ultima_compra,
       r.fecha - co.ultima_compra          AS dias,
       estado_cliente(r.fecha - co.ultima_compra) AS estado,
       r.fecha                             AS fecha_referencia
FROM clientes c
CROSS JOIN referencia r
LEFT JOIN compras co      ON co.id_cliente = c.id_cliente
LEFT JOIN por_sucursal ps ON ps.id_cliente = c.id_cliente AND ps.orden = 1
LEFT JOIN sucursales s    ON s.id_sucursal = ps.id_sucursal;
