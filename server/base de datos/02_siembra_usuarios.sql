-- Outlet de Zapatillas - Siembra de usuarios para el login
--
-- Cuentas de prueba (solo para desarrollo):
--   admin@outlet.com    / Admin1234     rol admin
--   gerente@outlet.com  / Gerente1234   rol gerente
--
-- password_hash NO es la contraseña: es el hash generado con PasswordHasher<T>
-- de ASP.NET Core Identity (PBKDF2 - HMAC-SHA512 - sal aleatoria - 100.000
-- iteraciones). Es el mismo algoritmo que usa el registro, así que el login
-- funciona igual que con un usuario creado desde la aplicación.
--
-- Para agregar otro usuario, generar su hash con:
--   cd server/OutletApi && dotnet run -- hash <contraseña>
--
-- ON CONFLICT evita duplicar las cuentas si el script se ejecuta de nuevo.
-- El gerente queda sin sucursal hasta que se carguen las sucursales.

INSERT INTO usuarios (nombre, apellido, email, password_hash, rol) VALUES
    ('Admin',   'Outlet', 'admin@outlet.com',
     'AQAAAAIAAYagAAAAECFYTUiWVPcpBEy5oOBHt7GxRisTYImylFC4EQogtdjFJ+eGxELAjcpt1NkHd9qqUA==', 'admin'),
    ('Gerente', 'Centro', 'gerente@outlet.com',
     'AQAAAAIAAYagAAAAEE0TzLLnMPGcFrK0/lKM8ZNzExfjL+ePHEiPPT+4WnSNvyiCkLUAa8ZNJt+Hjb0G1g==', 'gerente')
ON CONFLICT (email) DO NOTHING;
