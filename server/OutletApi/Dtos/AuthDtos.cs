using OutletApi.Models;

namespace OutletApi.Dtos;

// Cuerpos y respuestas de /api/auth.
// Los campos de entrada son nullables para poder responder un 400 con mensaje propio.

public record LoginRequest(string? Email, string? Password);

public record RegisterRequest(string? Nombre, string? Apellido, string? Email, string? Password);

// Datos públicos del usuario: nunca incluye el password_hash
public record UsuarioDto(int Id, string Nombre, string Apellido, string Email, string Rol)
{
    public static UsuarioDto From(Usuario u) => new(u.IdUsuario, u.Nombre, u.Apellido, u.Email, u.Rol);
}

public record AuthResponse(string Token, UsuarioDto Usuario);

public record ErrorResponse(string Message);
