using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using OutletApi.Data;
using OutletApi.Dtos;
using OutletApi.Models;
using OutletApi.Services;

// Utilidad para la siembra: "dotnet run -- hash <contraseña>" imprime el hash que va en password_hash
if (args is ["hash", var plano])
{
    Console.WriteLine(new PasswordHasher<Usuario>().HashPassword(new Usuario(), plano));
    return;
}

var builder = WebApplication.CreateBuilder(args);

// ---- Base de datos (PostgreSQL con Npgsql: consultas SQL escritas a mano, sin ORM) ----
var connectionString = builder.Configuration.GetConnectionString("Outlet")
    ?? throw new InvalidOperationException("Falta ConnectionStrings:Outlet en la configuración.");
builder.Services.AddSingleton(NpgsqlDataSource.Create(connectionString));
builder.Services.AddScoped<UsuariosRepository>();
builder.Services.AddScoped<CatalogosRepository>();
builder.Services.AddScoped<VentasRepository>();
builder.Services.AddScoped<StockRepository>();
builder.Services.AddScoped<ClientesRepository>();

// ---- Contraseñas: PBKDF2 con HMAC-SHA512, sal aleatoria y 100.000 iteraciones ----
builder.Services.AddSingleton<IPasswordHasher<Usuario>, PasswordHasher<Usuario>>();

// ---- Autenticación con JWT ----
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
if (jwt.Key.Length < 32)
    throw new InvalidOperationException("Jwt:Key tiene que tener al menos 32 caracteres.");
builder.Services.AddSingleton(jwt);
builder.Services.AddSingleton<TokenService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;   // conserva los nombres de los claims ("sub", "email", "rol")
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = jwt.SigningKey(),
            RoleClaimType = "rol",
        };
        // Sin token válido se responde 401 con { message }, igual que el resto de los errores
        o.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(
                    new ErrorResponse("Tu sesión expiró. Volvé a iniciar sesión."));
            },
        };
    });
builder.Services.AddAuthorization();

// AddAuthentication registra Data Protection, pero la API no lo usa (no hay cookies: la sesión es
// el JWT firmado con Jwt:Key). Con el proveedor efímero sus claves quedan en memoria y no se
// escriben en disco, lo que evita el aviso "No XML encryptor configured" al arrancar.
builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider();

builder.Services
    .AddControllers()
    // Si el JSON viene mal formado se responde { message } como el resto de los errores
    .ConfigureApiBehaviorOptions(o => o.InvalidModelStateResponseFactory = _ =>
        new BadRequestObjectResult(new ErrorResponse("Los datos enviados no son válidos.")));

var app = builder.Build();

// Crea la base, las tablas y la siembra de usuarios si todavía no existen
if (app.Configuration.GetValue("Database:InicializarAlArrancar", true))
    await DatabaseInitializer.InicializarAsync(connectionString, app.Logger);

// Cualquier error no controlado (por ejemplo, la base caída) se devuelve como { message }
app.UseExceptionHandler(error => error.Run(async context =>
{
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await context.Response.WriteAsJsonAsync(new ErrorResponse("Ocurrió un error inesperado. Intentá de nuevo."));
}));

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
