using Npgsql;
using NpgsqlTypes;
using OutletApi.Dtos;
using OutletApi.Models;

namespace OutletApi.Data;

// Consultas sobre vista_actividad_clientes: última compra, sucursal habitual y estado de cada cliente
public class ClientesRepository(NpgsqlDataSource db)
{
    public record FiltroClientes(string? Busqueda, int? IdSucursal, string? Estado);

    // Búsqueda y sucursal habitual (el filtro de estado va aparte, ver ListarAsync)
    private const string Condiciones =
        """
        WHERE (@id_sucursal IS NULL OR id_sucursal_habitual = @id_sucursal)
          AND (@patron IS NULL OR nombre ILIKE @patron
                               OR apellido ILIKE @patron
                               OR nombre || ' ' || apellido ILIKE @patron
                               OR dni ILIKE @patron
                               OR email ILIKE @patron)
        """;

    // Cantidad de clientes en cada estado (tarjetas de la pantalla y del resumen)
    public async Task<ConteoClientes> ConteosAsync(FiltroClientes filtro)
    {
        await using var cmd = Filtrar(db.CreateCommand(
            $"""
            SELECT COUNT(*) FILTER (WHERE estado = 'activo')    AS activo,
                   COUNT(*) FILTER (WHERE estado = 'en_riesgo') AS en_riesgo,
                   COUNT(*) FILTER (WHERE estado = 'inactivo')  AS inactivo
            FROM vista_actividad_clientes
            {Condiciones}
            """), filtro);
        return (await cmd.PrimeraAsync(r => new ConteoClientes(
            r.Entero("activo"), r.Entero("en_riesgo"), r.Entero("inactivo"))))!;
    }

    // Página de clientes, de la compra más reciente a la más antigua (los que nunca compraron al final)
    public async Task<(List<FilaCliente> Items, int Total)> ListarAsync(FiltroClientes filtro, Paginacion paginacion)
    {
        const string conEstado = $"{Condiciones}  AND (@estado IS NULL OR estado = @estado)";

        await using var total = Filtrar(db.CreateCommand(
            $"SELECT COUNT(*) AS total FROM vista_actividad_clientes {conEstado}"), filtro);

        await using var pagina = Filtrar(db.CreateCommand(
            $"""
            SELECT id_cliente, nombre, apellido, dni, email, sucursal_habitual,
                   compras_12_meses, total_gastado, ultima_compra, dias, estado
            FROM vista_actividad_clientes
            {conEstado}
            ORDER BY ultima_compra DESC NULLS LAST, apellido, nombre, id_cliente
            LIMIT @limite OFFSET @desplazamiento
            """), filtro)
            .Parametro("limite", paginacion.PorPagina, NpgsqlDbType.Integer)
            .Parametro("desplazamiento", paginacion.Offset, NpgsqlDbType.Integer);

        var cantidad = (await total.PrimeraAsync(r => r.Entero("total")))!;
        var items = await pagina.ListaAsync(r => new FilaCliente(
            r.Entero("id_cliente"), r.Texto("nombre"), r.Texto("apellido"), r.TextoONulo("dni"), r.TextoONulo("email"),
            r.TextoONulo("sucursal_habitual"), r.Entero("compras_12_meses"), r.Decimal("total_gastado"),
            r.FechaONula("ultima_compra"), r.EnteroONulo("dias"), r.Texto("estado")));
        return (items, cantidad);
    }

    private static NpgsqlCommand Filtrar(NpgsqlCommand cmd, FiltroClientes f) =>
        cmd.Parametro("id_sucursal", f.IdSucursal, NpgsqlDbType.Integer)
           .Parametro("patron", SqlExtensions.PatronBusqueda(f.Busqueda), NpgsqlDbType.Varchar)
           .Parametro("estado", f.Estado, NpgsqlDbType.Varchar);
}
