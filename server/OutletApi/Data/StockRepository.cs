using Npgsql;
using NpgsqlTypes;
using OutletApi.Dtos;
using OutletApi.Models;

namespace OutletApi.Data;

// Consultas sobre vista_stock: una fila por producto, talle y sucursal con su estado de semáforo
public class StockRepository(NpgsqlDataSource db)
{
    public record FiltroStock(string? Busqueda, int? IdSucursal, int? IdMarca, string? Estado);

    // Los filtros de búsqueda, sucursal y marca (el de estado va aparte, ver ListarAsync)
    private const string Condiciones =
        """
        WHERE activo
          AND (@id_sucursal IS NULL OR id_sucursal = @id_sucursal)
          AND (@id_marca IS NULL OR id_marca = @id_marca)
          AND (@patron IS NULL OR modelo ILIKE @patron OR sku ILIKE @patron)
        """;

    // Cantidad de filas en cada estado. Sirve para los botones de estado y para el resumen
    public async Task<ConteoStock> ConteosAsync(FiltroStock filtro)
    {
        await using var cmd = Filtrar(db.CreateCommand(
            $"""
            SELECT COUNT(*) FILTER (WHERE estado = 'critico')  AS critico,
                   COUNT(*) FILTER (WHERE estado = 'atencion') AS atencion,
                   COUNT(*) FILTER (WHERE estado = 'normal')   AS normal
            FROM vista_stock
            {Condiciones}
            """), filtro);
        return (await cmd.PrimeraAsync(r => new ConteoStock(r.Entero("critico"), r.Entero("atencion"), r.Entero("normal"))))!;
    }

    // Página de stock ordenada de lo más crítico a lo más holgado
    public async Task<(List<FilaStock> Items, int Total)> ListarAsync(FiltroStock filtro, Paginacion paginacion)
    {
        const string conEstado = $"{Condiciones}  AND (@estado IS NULL OR estado = @estado)";

        await using var total = Filtrar(db.CreateCommand($"SELECT COUNT(*) AS total FROM vista_stock {conEstado}"), filtro);

        await using var pagina = Filtrar(db.CreateCommand(
            $"""
            SELECT id_stock, id_producto, sku, modelo, marca, sucursal, talle, cantidad, stock_minimo, estado
            FROM vista_stock
            {conEstado}
            ORDER BY CASE estado WHEN 'critico' THEN 0 WHEN 'atencion' THEN 1 ELSE 2 END,
                     cantidad, modelo, sucursal, talle
            LIMIT @limite OFFSET @desplazamiento
            """), filtro)
            .Parametro("limite", paginacion.PorPagina, NpgsqlDbType.Integer)
            .Parametro("desplazamiento", paginacion.Offset, NpgsqlDbType.Integer);

        var cantidad = (await total.PrimeraAsync(r => r.Entero("total")))!;
        var items = await pagina.ListaAsync(r => new FilaStock(
            r.Entero("id_stock"), r.Entero("id_producto"), r.Texto("sku"), r.Texto("modelo"), r.Texto("marca"),
            r.Texto("sucursal"), r.Decimal("talle"), r.Entero("cantidad"), r.Entero("stock_minimo"), r.Texto("estado")));
        return (items, cantidad);
    }

    private static NpgsqlCommand Filtrar(NpgsqlCommand cmd, FiltroStock f) =>
        cmd.Parametro("id_sucursal", f.IdSucursal, NpgsqlDbType.Integer)
           .Parametro("id_marca", f.IdMarca, NpgsqlDbType.Integer)
           .Parametro("patron", SqlExtensions.PatronBusqueda(f.Busqueda), NpgsqlDbType.Varchar)
           .Parametro("estado", f.Estado, NpgsqlDbType.Varchar);
}
