using Npgsql;
using NpgsqlTypes;
using OutletApi.Dtos;
using OutletApi.Models;

namespace OutletApi.Data;

// Consultas de ventas: totales por sucursal, los cuatro niveles del drill down y el listado de
// "Detalle de ventas". Todas son SQL escrito a mano y parametrizado. Los semáforos los calculan
// las funciones de 04_vistas_y_funciones.sql.
public class VentasRepository(NpgsqlDataSource db)
{
    // Ventas, tickets, pares y cumplimiento del objetivo de cada sucursal en un mes.
    // Incluye las sucursales sin ventas (LEFT JOIN). Con @id_sucursal NULL trae todas.
    private const string FilasSucursalesSql =
        """
        WITH ventas_mes AS (
            SELECT id_sucursal, SUM(total) AS ventas, COUNT(*) AS tickets
            FROM ventas
            WHERE fecha >= @desde AND fecha < @hasta
            GROUP BY id_sucursal
        ),
        pares_mes AS (
            SELECT v.id_sucursal, SUM(d.cantidad) AS pares
            FROM ventas v
            JOIN detalle_ventas d ON d.id_venta = v.id_venta
            WHERE v.fecha >= @desde AND v.fecha < @hasta
            GROUP BY v.id_sucursal
        )
        SELECT s.id_sucursal, s.nombre, s.ciudad, s.provincia,
               COALESCE(vm.ventas, 0)  AS ventas,
               COALESCE(vm.tickets, 0) AS tickets,
               COALESCE(pm.pares, 0)   AS pares,
               o.monto_objetivo        AS objetivo,
               ROUND(COALESCE(vm.ventas, 0) * 100 / o.monto_objetivo, 1) AS cumplimiento,
               estado_objetivo(COALESCE(vm.ventas, 0), o.monto_objetivo)  AS estado
        FROM sucursales s
        LEFT JOIN ventas_mes vm ON vm.id_sucursal = s.id_sucursal
        LEFT JOIN pares_mes  pm ON pm.id_sucursal = s.id_sucursal
        LEFT JOIN objetivos_venta o ON o.id_sucursal = s.id_sucursal
                                   AND o.anio = @anio AND o.mes = @mes
        WHERE @id_sucursal IS NULL OR s.id_sucursal = @id_sucursal
        """;

    public async Task<List<FilaSucursal>> FilasSucursalesAsync(Periodo periodo, int? idSucursal = null)
    {
        await using var cmd = ConObjetivo(db.CreateCommand($"{FilasSucursalesSql} ORDER BY ventas DESC, s.nombre"), periodo)
            .Parametro("id_sucursal", idSucursal, NpgsqlDbType.Integer);
        return await cmd.ListaAsync(r => new FilaSucursal(
            r.Entero("id_sucursal"), r.Texto("nombre"), r.Texto("ciudad"), r.Texto("provincia"),
            r.Decimal("ventas"), r.Entero("tickets"), r.Entero("pares"),
            r.DecimalONulo("objetivo"), r.DecimalONulo("cumplimiento"), r.TextoONulo("estado")));
    }

    // La fila "Total": suma de las sucursales y cumplimiento contra la suma de sus objetivos
    public async Task<TotalesSucursales> TotalesSucursalesAsync(Periodo periodo, int? idSucursal = null)
    {
        await using var cmd = ConObjetivo(db.CreateCommand(
            $"""
            SELECT SUM(f.ventas)   AS ventas,
                   SUM(f.tickets)  AS tickets,
                   SUM(f.pares)    AS pares,
                   SUM(f.objetivo) AS objetivo,
                   ROUND(SUM(f.ventas) * 100 / SUM(f.objetivo), 1) AS cumplimiento,
                   estado_objetivo(SUM(f.ventas), SUM(f.objetivo))  AS estado
            FROM ({FilasSucursalesSql}) f
            """), periodo)
            .Parametro("id_sucursal", idSucursal, NpgsqlDbType.Integer);
        return (await cmd.PrimeraAsync(r => new TotalesSucursales(
            r.DecimalONulo("ventas") ?? 0, r.EnteroONulo("tickets") ?? 0, r.EnteroONulo("pares") ?? 0,
            r.DecimalONulo("objetivo"), r.DecimalONulo("cumplimiento"), r.TextoONulo("estado"))))!;
    }

    // Importe y cantidad de tickets de cada día del mes (gráfico del resumen)
    public async Task<List<VentaDelDia>> VentasPorDiaAsync(Periodo periodo, int? idSucursal)
    {
        await using var cmd = ConPeriodo(db.CreateCommand(
            """
            SELECT fecha::date AS dia, SUM(total) AS ventas, COUNT(*) AS tickets
            FROM ventas
            WHERE fecha >= @desde AND fecha < @hasta
              AND (@id_sucursal IS NULL OR id_sucursal = @id_sucursal)
            GROUP BY fecha::date
            ORDER BY dia
            """), periodo)
            .Parametro("id_sucursal", idSucursal, NpgsqlDbType.Integer);
        return await cmd.ListaAsync(r => new VentaDelDia(r.Fecha("dia"), r.Decimal("ventas"), r.Entero("tickets")));
    }

    // Nivel 2: ventas y pares de cada marca en la sucursal, del mes y del mes anterior
    public async Task<List<VentaMarca>> VentasPorMarcaAsync(int idSucursal, Periodo periodo)
    {
        await using var cmd = ConPeriodo(db.CreateCommand(
            """
            WITH lineas AS (
                SELECT p.id_marca, d.subtotal, d.cantidad, v.fecha >= @desde AS del_mes
                FROM ventas v
                JOIN detalle_ventas d ON d.id_venta = v.id_venta
                JOIN productos p      ON p.id_producto = d.id_producto
                WHERE v.id_sucursal = @id_sucursal
                  AND v.fecha >= @desde_anterior AND v.fecha < @hasta
            )
            SELECT m.id_marca, m.nombre,
                   SUM(l.subtotal) FILTER (WHERE l.del_mes)                  AS ventas,
                   SUM(l.cantidad) FILTER (WHERE l.del_mes)                  AS pares,
                   COALESCE(SUM(l.subtotal) FILTER (WHERE NOT l.del_mes), 0) AS ventas_anterior
            FROM lineas l
            JOIN marcas m ON m.id_marca = l.id_marca
            GROUP BY m.id_marca, m.nombre
            HAVING SUM(l.subtotal) FILTER (WHERE l.del_mes) > 0
            ORDER BY ventas DESC, m.nombre
            """), periodo)
            .Parametro("id_sucursal", idSucursal, NpgsqlDbType.Integer)
            .Parametro("desde_anterior", periodo.Anterior.Desde, NpgsqlDbType.Timestamp);
        return await cmd.ListaAsync(r => new VentaMarca(
            r.Entero("id_marca"), r.Texto("nombre"), r.Decimal("ventas"), r.Entero("pares"), r.Decimal("ventas_anterior")));
    }

    // Nivel 3: modelos de la marca vendidos en la sucursal, con su stock y el peor estado de sus talles
    public async Task<List<VentaModelo>> VentasPorModeloAsync(int idSucursal, int idMarca, Periodo periodo)
    {
        await using var cmd = ConPeriodo(db.CreateCommand(
            """
            WITH vendidos AS (
                SELECT d.id_producto, SUM(d.cantidad) AS pares, SUM(d.subtotal) AS ventas
                FROM ventas v
                JOIN detalle_ventas d ON d.id_venta = v.id_venta
                JOIN productos p      ON p.id_producto = d.id_producto
                WHERE v.id_sucursal = @id_sucursal AND p.id_marca = @id_marca
                  AND v.fecha >= @desde AND v.fecha < @hasta
                GROUP BY d.id_producto
            ),
            existencias AS (
                SELECT id_producto,
                       SUM(cantidad) AS stock,
                       MIN(CASE estado WHEN 'critico' THEN 0 WHEN 'atencion' THEN 1 ELSE 2 END) AS severidad
                FROM vista_stock
                WHERE id_sucursal = @id_sucursal
                GROUP BY id_producto
            )
            SELECT p.id_producto, p.modelo, p.sku, c.nombre AS categoria, p.precio_outlet,
                   vd.pares, vd.ventas,
                   COALESCE(e.stock, 0) AS stock,
                   CASE COALESCE(e.severidad, 0)
                        WHEN 0 THEN 'critico' WHEN 1 THEN 'atencion' ELSE 'normal'
                   END AS estado_stock
            FROM vendidos vd
            JOIN productos p  ON p.id_producto = vd.id_producto
            JOIN categorias c ON c.id_categoria = p.id_categoria
            LEFT JOIN existencias e ON e.id_producto = vd.id_producto
            ORDER BY vd.ventas DESC, p.modelo
            """), periodo)
            .Parametro("id_sucursal", idSucursal, NpgsqlDbType.Integer)
            .Parametro("id_marca", idMarca, NpgsqlDbType.Integer);
        return await cmd.ListaAsync(r => new VentaModelo(
            r.Entero("id_producto"), r.Texto("modelo"), r.Texto("sku"), r.Texto("categoria"), r.Decimal("precio_outlet"),
            r.Entero("pares"), r.Decimal("ventas"), r.Entero("stock"), r.Texto("estado_stock")));
    }

    // Producto con su marca, para el encabezado del nivel 4 (null si no existe)
    public async Task<(ProductoDetalle Producto, Referencia Marca)?> BuscarProductoAsync(int idProducto)
    {
        await using var cmd = db.CreateCommand(
            """
            SELECT p.id_producto, p.modelo, p.sku, p.precio_lista, p.precio_outlet, m.id_marca, m.nombre AS marca
            FROM productos p
            JOIN marcas m ON m.id_marca = p.id_marca
            WHERE p.id_producto = @id_producto
            """)
            .Parametro("id_producto", idProducto, NpgsqlDbType.Integer);
        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return (
            new ProductoDetalle(reader.Entero("id_producto"), reader.Texto("modelo"), reader.Texto("sku"),
                reader.Decimal("precio_lista"), reader.Decimal("precio_outlet")),
            new Referencia(reader.Entero("id_marca"), reader.Texto("marca")));
    }

    // Nivel 4: totales del modelo en el mes, pares por talle y las líneas de detalle_ventas paginadas
    public async Task<(ResumenModelo Resumen, List<TalleVendido> Talles, List<LineaVenta> Lineas)> DetalleModeloAsync(
        int idSucursal, int idProducto, Periodo periodo, Paginacion paginacion)
    {
        // Las tres consultas filtran las líneas del producto en la sucursal y el mes
        const string lineasDelMes =
            """
            FROM ventas v
            JOIN detalle_ventas d ON d.id_venta = v.id_venta
            JOIN clientes c       ON c.id_cliente = v.id_cliente
            WHERE v.id_sucursal = @id_sucursal AND d.id_producto = @id_producto
              AND v.fecha >= @desde AND v.fecha < @hasta
            """;

        await using var resumen = Filtrar(db.CreateCommand(
            $"""
            SELECT COUNT(*) AS lineas, COALESCE(SUM(d.cantidad), 0) AS pares, COALESCE(SUM(d.subtotal), 0) AS ventas
            {lineasDelMes}
            """), idSucursal, idProducto, periodo);

        await using var talles = Filtrar(db.CreateCommand(
            $"""
            SELECT d.talle, SUM(d.cantidad) AS pares
            {lineasDelMes}
            GROUP BY d.talle
            ORDER BY d.talle
            """), idSucursal, idProducto, periodo);

        await using var lineas = Filtrar(db.CreateCommand(
            $"""
            SELECT d.id_detalle, v.fecha, v.numero, c.nombre || ' ' || c.apellido AS cliente,
                   d.talle, d.cantidad, d.precio_unitario, d.subtotal, v.medio_pago
            {lineasDelMes}
            ORDER BY v.fecha DESC, d.id_detalle DESC
            LIMIT @limite OFFSET @desplazamiento
            """), idSucursal, idProducto, periodo)
            .Parametro("limite", paginacion.PorPagina, NpgsqlDbType.Integer)
            .Parametro("desplazamiento", paginacion.Offset, NpgsqlDbType.Integer);

        return (
            (await resumen.PrimeraAsync(r => new ResumenModelo(r.Entero("lineas"), r.Entero("pares"), r.Decimal("ventas"))))!,
            await talles.ListaAsync(r => new TalleVendido(r.Decimal("talle"), r.Entero("pares"))),
            await lineas.ListaAsync(r => new LineaVenta(
                r.Entero("id_detalle"), r.FechaHora("fecha"), r.Texto("numero"), r.Texto("cliente"),
                r.Decimal("talle"), r.Entero("cantidad"), r.Decimal("precio_unitario"), r.Decimal("subtotal"),
                r.Texto("medio_pago"))));

        static NpgsqlCommand Filtrar(NpgsqlCommand cmd, int idSucursal, int idProducto, Periodo periodo) =>
            ConPeriodo(cmd, periodo)
                .Parametro("id_sucursal", idSucursal, NpgsqlDbType.Integer)
                .Parametro("id_producto", idProducto, NpgsqlDbType.Integer);
    }

    // Filtros de la pantalla "Detalle de ventas". Hasta es inclusive: se compara contra el día siguiente
    public record FiltroVentas(
        DateOnly? Desde, DateOnly? Hasta, int? IdSucursal, string? MedioPago, string? Busqueda, string Orden);

    // Orden permitido -> ORDER BY (nunca se arma el ORDER BY con texto del usuario)
    public static readonly Dictionary<string, string> OrdenesVentas = new()
    {
        ["fecha_desc"] = "v.fecha DESC, v.id_venta DESC",
        ["fecha_asc"] = "v.fecha ASC, v.id_venta ASC",
        ["total_desc"] = "v.total DESC, v.fecha DESC, v.id_venta DESC",
        ["total_asc"] = "v.total ASC, v.fecha DESC, v.id_venta DESC",
    };

    public async Task<(List<FilaVenta> Items, TotalesVentas Totales)> ListarVentasAsync(
        FiltroVentas filtro, Paginacion paginacion)
    {
        const string condiciones =
            """
            WHERE (@desde IS NULL OR v.fecha >= @desde)
              AND (@hasta IS NULL OR v.fecha < @hasta)
              AND (@id_sucursal IS NULL OR v.id_sucursal = @id_sucursal)
              AND (@medio_pago IS NULL OR v.medio_pago = @medio_pago)
              AND (@patron IS NULL OR v.numero ILIKE @patron
                                   OR c.nombre || ' ' || c.apellido ILIKE @patron)
            """;

        // Totales de todas las ventas del filtro, no solo de la página
        await using var totales = Filtrar(db.CreateCommand(
            $"""
            SELECT COUNT(*)                  AS ventas,
                   COALESCE(SUM(v.total), 0) AS importe,
                   COALESCE(SUM(dp.pares), 0) AS pares
            FROM ventas v
            JOIN clientes c ON c.id_cliente = v.id_cliente
            JOIN (SELECT id_venta, SUM(cantidad) AS pares
                  FROM detalle_ventas
                  GROUP BY id_venta) dp ON dp.id_venta = v.id_venta
            {condiciones}
            """), filtro);

        // Primero se elige la página y después se buscan los productos de esas ventas
        var orden = OrdenesVentas[filtro.Orden];
        await using var pagina = Filtrar(db.CreateCommand(
            $"""
            WITH pagina AS (
                SELECT v.id_venta, v.numero, v.fecha, v.id_sucursal, v.medio_pago, v.total,
                       c.nombre || ' ' || c.apellido AS cliente
                FROM ventas v
                JOIN clientes c ON c.id_cliente = v.id_cliente
                {condiciones}
                ORDER BY {orden}
                LIMIT @limite OFFSET @desplazamiento
            )
            SELECT v.id_venta, v.numero, v.fecha, s.nombre AS sucursal, v.cliente,
                   primera.producto, detalle.lineas - 1 AS otros_productos, detalle.pares,
                   v.medio_pago, v.total
            FROM pagina v
            JOIN sucursales s ON s.id_sucursal = v.id_sucursal
            CROSS JOIN LATERAL (
                SELECT COUNT(*) AS lineas, SUM(d.cantidad) AS pares
                FROM detalle_ventas d
                WHERE d.id_venta = v.id_venta
            ) detalle
            CROSS JOIN LATERAL (
                SELECT m.nombre || ' ' || p.modelo AS producto
                FROM detalle_ventas d
                JOIN productos p ON p.id_producto = d.id_producto
                JOIN marcas m    ON m.id_marca = p.id_marca
                WHERE d.id_venta = v.id_venta
                ORDER BY d.id_detalle
                LIMIT 1
            ) primera
            ORDER BY {orden}
            """), filtro)
            .Parametro("limite", paginacion.PorPagina, NpgsqlDbType.Integer)
            .Parametro("desplazamiento", paginacion.Offset, NpgsqlDbType.Integer);

        var resumen = (await totales.PrimeraAsync(r => new TotalesVentas(
            r.Entero("ventas"), r.Entero("pares"), r.Decimal("importe"))))!;
        var items = await pagina.ListaAsync(r => new FilaVenta(
            r.Entero("id_venta"), r.Texto("numero"), r.FechaHora("fecha"), r.Texto("sucursal"), r.Texto("cliente"),
            r.Texto("producto"), r.Entero("otros_productos"), r.Entero("pares"), r.Texto("medio_pago"),
            r.Decimal("total")));
        return (items, resumen);

        static NpgsqlCommand Filtrar(NpgsqlCommand cmd, FiltroVentas f) =>
            cmd.Parametro("desde", f.Desde?.ToDateTime(TimeOnly.MinValue), NpgsqlDbType.Timestamp)
               .Parametro("hasta", f.Hasta?.AddDays(1).ToDateTime(TimeOnly.MinValue), NpgsqlDbType.Timestamp)
               .Parametro("id_sucursal", f.IdSucursal, NpgsqlDbType.Integer)
               .Parametro("medio_pago", f.MedioPago, NpgsqlDbType.Varchar)
               .Parametro("patron", SqlExtensions.PatronBusqueda(f.Busqueda), NpgsqlDbType.Varchar);
    }

    // Rango de fechas del mes: fecha >= @desde AND fecha < @hasta
    private static NpgsqlCommand ConPeriodo(NpgsqlCommand cmd, Periodo periodo) =>
        cmd.Parametro("desde", periodo.Desde, NpgsqlDbType.Timestamp)
           .Parametro("hasta", periodo.Hasta, NpgsqlDbType.Timestamp);

    // Además del rango, el año y el mes para buscar el objetivo en objetivos_venta
    private static NpgsqlCommand ConObjetivo(NpgsqlCommand cmd, Periodo periodo) =>
        ConPeriodo(cmd, periodo)
            .Parametro("anio", periodo.Anio, NpgsqlDbType.Integer)
            .Parametro("mes", periodo.Mes, NpgsqlDbType.Integer);
}
