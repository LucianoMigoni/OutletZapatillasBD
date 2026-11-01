using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using Npgsql;
using OutletApi.Data;
using OutletApi.Dtos;
using OutletApi.Models;
using OutletApi.Services;

namespace OutletApi.Controllers;

[ApiController]
[Route("api/auth")]
public partial class AuthController(
    UsuariosRepository usuarios,
    IPasswordHasher<Usuario> hasher,
    TokenService tokens) : ControllerBase
{
    private const int PasswordMinLength = 8;
    private const int PasswordMaxLength = 100;
    private const string CredencialesInvalidas = "Email o contraseña incorrectos.";

    // Hash de una contraseña cualquiera: se verifica contra él cuando el email no existe, para que
    // la respuesta tarde lo mismo y no se pueda averiguar qué emails están registrados.
    private static readonly string HashFicticio =
        new PasswordHasher<Usuario>().HashPassword(new Usuario(), Guid.NewGuid().ToString());

    // POST /api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest dto)
    {
        var email = NormalizarEmail(dto.Email);
        if (email.Length == 0 || string.IsNullOrEmpty(dto.Password))
            return BadRequest(new ErrorResponse("Ingresá tu email y tu contraseña."));

        var usuario = await usuarios.BuscarPorEmailAsync(email);
        if (usuario is null)
        {
            hasher.VerifyHashedPassword(new Usuario(), HashFicticio, dto.Password);
            return Unauthorized(new ErrorResponse(CredencialesInvalidas));
        }

        var resultado = hasher.VerifyHashedPassword(usuario, usuario.PasswordHash, dto.Password);
        if (resultado == PasswordVerificationResult.Failed)
            return Unauthorized(new ErrorResponse(CredencialesInvalidas));

        if (!usuario.Activo)
            return StatusCode(StatusCodes.Status403Forbidden,
                new ErrorResponse("La cuenta está deshabilitada. Consultá con la administración."));

        return Ok(new AuthResponse(tokens.Crear(usuario), UsuarioDto.From(usuario)));
    }

    // POST /api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest dto)
    {
        var nombre = dto.Nombre?.Trim() ?? "";
        var apellido = dto.Apellido?.Trim() ?? "";
        var email = NormalizarEmail(dto.Email);
        var password = dto.Password ?? "";

        var error = ValidarNombre(nombre, "nombre")
            ?? ValidarNombre(apellido, "apellido")
            ?? ValidarEmail(email)
            ?? ValidarPassword(password);
        if (error is not null) return BadRequest(new ErrorResponse(error));

        if (await usuarios.ExisteEmailAsync(email))
            return Conflict(new ErrorResponse("Ya existe una cuenta con ese email."));

        var usuario = new Usuario { Nombre = nombre, Apellido = apellido, Email = email, Rol = Roles.Consulta };
        usuario.PasswordHash = hasher.HashPassword(usuario, password);

        try
        {
            usuario = await usuarios.CrearAsync(usuario);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            // Dos registros simultáneos con el mismo email: lo frena la restricción UNIQUE
            return Conflict(new ErrorResponse("Ya existe una cuenta con ese email."));
        }

        return StatusCode(StatusCodes.Status201Created,
            new AuthResponse(tokens.Crear(usuario), UsuarioDto.From(usuario)));
    }

    // GET /api/auth/me - valida el token guardado en el navegador y devuelve el usuario
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!int.TryParse(User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var id))
            return Unauthorized(new ErrorResponse("Sesión inválida."));

        var usuario = await usuarios.BuscarPorIdAsync(id);
        if (usuario is null || !usuario.Activo)
            return Unauthorized(new ErrorResponse("Sesión expirada."));

        return Ok(UsuarioDto.From(usuario));
    }

    // El email se guarda y se busca siempre en minúsculas
    private static string NormalizarEmail(string? email) => email?.Trim().ToLowerInvariant() ?? "";

    // Mismas reglas que client/src/utils/validation.js
    private static string? ValidarNombre(string valor, string campo)
    {
        if (valor.Length == 0) return $"Ingresá tu {campo}.";
        if (valor.Length < 2) return $"El {campo} es demasiado corto.";
        if (valor.Length > 60) return $"El {campo} no puede superar los 60 caracteres.";
        return null;
    }

    private static string? ValidarEmail(string email)
    {
        if (email.Length == 0) return "Ingresá tu email.";
        if (email.Length > 120 || !EmailRegex().IsMatch(email)) return "Ingresá un email válido.";
        return null;
    }

    private static string? ValidarPassword(string password)
    {
        if (password.Length == 0) return "Ingresá una contraseña.";
        if (password.Length < PasswordMinLength) return $"La contraseña debe tener al menos {PasswordMinLength} caracteres.";
        if (password.Length > PasswordMaxLength) return $"La contraseña no puede superar los {PasswordMaxLength} caracteres.";
        if (!password.Any(char.IsAsciiLetter) || !password.Any(char.IsAsciiDigit))
            return "La contraseña debe combinar letras y números.";
        return null;
    }

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$")]
    private static partial Regex EmailRegex();
}
