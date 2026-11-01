namespace OutletApi.Models;

// Fila de la tabla usuarios. UsuariosRepository la arma leyendo cada columna a mano.
public class Usuario
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = "";
    public string Apellido { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Rol { get; set; } = Roles.Consulta;
    public int? IdSucursal { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime FechaAlta { get; set; }
}

public static class Roles
{
    public const string Admin = "admin";
    public const string Gerente = "gerente";
    public const string Consulta = "consulta";
}
