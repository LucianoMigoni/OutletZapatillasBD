using Npgsql;
using NpgsqlTypes;
using OutletApi.Dtos;

namespace OutletApi.Data;

// Datos de los selectores del tablero (meses con ventas, sucursales y marcas) y búsquedas por id
public class CatalogosRepository(NpgsqlDataSource db)
{
    public async Task<CatalogosResponse> CatalogosAsync()
    {
        // Fecha de referencia: el día siguiente a la última venta (ver docs/contrato-api.md)
        await using var referencia = db.CreateCommand(
            "SELECT COALESCE(MAX(fecha)::date + 1, current_date) AS fecha FROM ventas");
        var fechaReferencia = await referencia.PrimeraAsync(r => r.Fecha("fecha"));

        await using var periodos = db.CreateCommand(
            """
            SELECT DISTINCT EXTRACT(YEAR FROM fecha)::int  AS anio,
                            EXTRACT(MONTH FROM fecha)::int AS mes
            FROM ventas
            ORDER BY anio DESC, mes DESC
            """);

        await using var sucursales = db.CreateCommand(
            "SELECT id_sucursal, nombre, ciudad, provincia FROM sucursales ORDER BY nombre");

        await using var marcas = db.CreateCommand("SELECT id_marca, nombre FROM marcas ORDER BY nombre");

        return new CatalogosResponse(
            fechaReferencia,
            await periodos.ListaAsync(r => new PeriodoDto(r.Entero("anio"), r.Entero("mes"))),
            await sucursales.ListaAsync(r => new SucursalDto(
                r.Entero("id_sucursal"), r.Texto("nombre"), r.Texto("ciudad"), r.Texto("provincia"))),
            await marcas.ListaAsync(r => new Referencia(r.Entero("id_marca"), r.Texto("nombre"))));
    }

    public async Task<Referencia?> BuscarSucursalAsync(int id)
    {
        await using var cmd = db.CreateCommand("SELECT id_sucursal, nombre FROM sucursales WHERE id_sucursal = @id")
            .Parametro("id", id, NpgsqlDbType.Integer);
        return await cmd.PrimeraAsync(r => new Referencia(r.Entero("id_sucursal"), r.Texto("nombre")));
    }

    public async Task<Referencia?> BuscarMarcaAsync(int id)
    {
        await using var cmd = db.CreateCommand("SELECT id_marca, nombre FROM marcas WHERE id_marca = @id")
            .Parametro("id", id, NpgsqlDbType.Integer);
        return await cmd.PrimeraAsync(r => new Referencia(r.Entero("id_marca"), r.Texto("nombre")));
    }
}
