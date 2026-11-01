using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using OutletApi.Models;

namespace OutletApi.Services;

public class JwtOptions
{
    public string Key { get; set; } = "";
    public string Issuer { get; set; } = "OutletApi";
    public string Audience { get; set; } = "OutletClient";
    public int ExpiraHoras { get; set; } = 8;

    public SymmetricSecurityKey SigningKey() => new(Encoding.UTF8.GetBytes(Key));
}

// Genera el token JWT que el frontend guarda en la sesión y manda en cada pedido
public class TokenService(JwtOptions options)
{
    public string Crear(Usuario usuario)
    {
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = options.Issuer,
            Audience = options.Audience,
            Expires = DateTime.UtcNow.AddHours(options.ExpiraHoras),
            SigningCredentials = new SigningCredentials(options.SigningKey(), SecurityAlgorithms.HmacSha256),
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, usuario.IdUsuario.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, usuario.Email),
                new Claim("rol", usuario.Rol),
            ]),
        };

        return new JsonWebTokenHandler().CreateToken(descriptor);
    }
}
