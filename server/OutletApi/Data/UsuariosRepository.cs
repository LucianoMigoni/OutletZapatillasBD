using Npgsql;
using OutletApi.Models;

namespace OutletApi.Data;

// Consultas SQL sobre la tabla usuarios, escritas a mano con Npgsql (sin ORM).
// Todas usan parámetros (@...) para evitar inyección SQL.
public class UsuariosRepository(NpgsqlDataSource db)
{
    private const string Columnas =
        "id_usuario, nombre, apellido, email, password_hash, rol, id_sucursal, activo, fecha_alta";

    public async Task<Usuario?> BuscarPorEmailAsync(string email)
    {
        await using var cmd = db.CreateCommand($"SELECT {Columnas} FROM usuarios WHERE email = @email");
        cmd.Parameters.AddWithValue("email", email);
        return await LeerUsuarioAsync(cmd);
    }

    public async Task<Usuario?> BuscarPorIdAsync(int id)
    {
        await using var cmd = db.CreateCommand($"SELECT {Columnas} FROM usuarios WHERE id_usuario = @id");
        cmd.Parameters.AddWithValue("id", id);
        return await LeerUsuarioAsync(cmd);
    }

    public async Task<bool> ExisteEmailAsync(string email)
    {
        await using var cmd = db.CreateCommand("SELECT EXISTS (SELECT 1 FROM usuarios WHERE email = @email)");
        cmd.Parameters.AddWithValue("email", email);
        return (bool)(await cmd.ExecuteScalarAsync())!;
    }

    // Inserta el usuario y devuelve la fila creada (con id y fecha_alta generados por la base)
    public async Task<Usuario> CrearAsync(Usuario u)
    {
        await using var cmd = db.CreateCommand(
            $"""
            INSERT INTO usuarios (nombre, apellido, email, password_hash, rol, id_sucursal)
            VALUES (@nombre, @apellido, @email, @password_hash, @rol, @id_sucursal)
            RETURNING {Columnas}
            """);
        cmd.Parameters.AddWithValue("nombre", u.Nombre);
        cmd.Parameters.AddWithValue("apellido", u.Apellido);
        cmd.Parameters.AddWithValue("email", u.Email);
        cmd.Parameters.AddWithValue("password_hash", u.PasswordHash);
        cmd.Parameters.AddWithValue("rol", u.Rol);
        cmd.Parameters.AddWithValue("id_sucursal", (object?)u.IdSucursal ?? DBNull.Value);
        return (await LeerUsuarioAsync(cmd))!;
    }

    // Ejecuta la consulta y arma el Usuario leyendo cada columna de la primera fila (null si no hay filas)
    private static async Task<Usuario?> LeerUsuarioAsync(NpgsqlCommand cmd)
    {
        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        var idSucursal = reader.GetOrdinal("id_sucursal");
        return new Usuario
        {
            IdUsuario = reader.GetInt32(reader.GetOrdinal("id_usuario")),
            Nombre = reader.GetString(reader.GetOrdinal("nombre")),
            Apellido = reader.GetString(reader.GetOrdinal("apellido")),
            Email = reader.GetString(reader.GetOrdinal("email")),
            PasswordHash = reader.GetString(reader.GetOrdinal("password_hash")),
            Rol = reader.GetString(reader.GetOrdinal("rol")),
            IdSucursal = reader.IsDBNull(idSucursal) ? null : reader.GetInt32(idSucursal),
            Activo = reader.GetBoolean(reader.GetOrdinal("activo")),
            FechaAlta = reader.GetDateTime(reader.GetOrdinal("fecha_alta")),
        };
    }
}
