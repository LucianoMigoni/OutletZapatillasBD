using Npgsql;
using NpgsqlTypes;

namespace OutletApi.Data;

// Atajos para escribir las consultas a mano con Npgsql: parámetros tipados y lectura de columnas
public static class SqlExtensions
{
    // El tipo explícito permite usar parámetros opcionales en la consulta: (@x IS NULL OR col = @x)
    public static NpgsqlCommand Parametro(this NpgsqlCommand cmd, string nombre, object? valor, NpgsqlDbType tipo)
    {
        cmd.Parameters.Add(new NpgsqlParameter(nombre, tipo) { Value = valor ?? DBNull.Value });
        return cmd;
    }

    // Patrón para ILIKE '%texto%' escapando los comodines que escriba el usuario (null si no hay texto)
    public static string? PatronBusqueda(string? texto)
    {
        var limpio = texto?.Trim();
        if (string.IsNullOrEmpty(limpio)) return null;
        var escapado = limpio.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_");
        return $"%{escapado}%";
    }

    public static async Task<List<T>> ListaAsync<T>(this NpgsqlCommand cmd, Func<NpgsqlDataReader, T> leer)
    {
        var lista = new List<T>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) lista.Add(leer(reader));
        return lista;
    }

    // Primera fila de la consulta, o default si no devolvió filas
    public static async Task<T?> PrimeraAsync<T>(this NpgsqlCommand cmd, Func<NpgsqlDataReader, T> leer)
    {
        await using var reader = await cmd.ExecuteReaderAsync();
        return await reader.ReadAsync() ? leer(reader) : default;
    }

    // COUNT y SUM de enteros devuelven bigint: se convierten a int
    public static int Entero(this NpgsqlDataReader r, string columna) => Convert.ToInt32(r[columna]);

    public static int? EnteroONulo(this NpgsqlDataReader r, string columna) =>
        r.IsDBNull(r.GetOrdinal(columna)) ? null : Convert.ToInt32(r[columna]);

    public static decimal Decimal(this NpgsqlDataReader r, string columna) => Convert.ToDecimal(r[columna]);

    public static decimal? DecimalONulo(this NpgsqlDataReader r, string columna) =>
        r.IsDBNull(r.GetOrdinal(columna)) ? null : Convert.ToDecimal(r[columna]);

    public static string Texto(this NpgsqlDataReader r, string columna) => r.GetString(r.GetOrdinal(columna));

    public static string? TextoONulo(this NpgsqlDataReader r, string columna) =>
        r.IsDBNull(r.GetOrdinal(columna)) ? null : r.GetString(r.GetOrdinal(columna));

    public static DateOnly Fecha(this NpgsqlDataReader r, string columna) =>
        r.GetFieldValue<DateOnly>(r.GetOrdinal(columna));

    public static DateOnly? FechaONula(this NpgsqlDataReader r, string columna) =>
        r.IsDBNull(r.GetOrdinal(columna)) ? null : r.GetFieldValue<DateOnly>(r.GetOrdinal(columna));

    public static DateTime FechaHora(this NpgsqlDataReader r, string columna) => r.GetDateTime(r.GetOrdinal(columna));
}
