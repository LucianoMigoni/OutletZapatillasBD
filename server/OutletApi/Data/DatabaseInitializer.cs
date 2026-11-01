using Npgsql;

namespace OutletApi.Data;

// Al arrancar la API: crea la base si no existe y ejecuta, en orden, los scripts de server/base de datos
// (creación de tablas y siembra). Los scripts pueden correr siempre.
public static class DatabaseInitializer
{
    public static async Task InicializarAsync(string connectionString, ILogger logger)
    {
        await CrearBaseSiNoExisteAsync(connectionString, logger);

        var carpeta = Path.Combine(AppContext.BaseDirectory, "base de datos");
        var scripts = Directory.GetFiles(carpeta, "*.sql").Order(StringComparer.Ordinal).ToList();

        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        foreach (var script in scripts)
        {
            logger.LogInformation("Ejecutando {Script}", Path.GetFileName(script));
            await using var cmd = new NpgsqlCommand(await File.ReadAllTextAsync(script), conn, tx);
            await cmd.ExecuteNonQueryAsync();
        }

        await tx.CommitAsync();
    }

    private static async Task CrearBaseSiNoExisteAsync(string connectionString, ILogger logger)
    {
        var builder = new NpgsqlConnectionStringBuilder(connectionString);
        var nombreBase = builder.Database
            ?? throw new InvalidOperationException("La cadena de conexión no indica la base (Database=...).");

        // Para crear la base hay que conectarse a otra: la base de mantenimiento "postgres"
        builder.Database = "postgres";
        await using var conn = new NpgsqlConnection(builder.ConnectionString);
        await conn.OpenAsync();

        await using var existe = new NpgsqlCommand("SELECT 1 FROM pg_database WHERE datname = @nombre", conn);
        existe.Parameters.AddWithValue("nombre", nombreBase);
        if (await existe.ExecuteScalarAsync() is not null) return;

        // CREATE DATABASE no acepta parámetros: se escapa el nombre como identificador
        var identificador = "\"" + nombreBase.Replace("\"", "\"\"") + "\"";
        await using var crear = new NpgsqlCommand($"CREATE DATABASE {identificador} ENCODING 'UTF8'", conn);
        await crear.ExecuteNonQueryAsync();
        logger.LogInformation("Base de datos {Base} creada", nombreBase);
    }
}
