namespace OutletApi.Dtos;

// Respuestas de los endpoints del tablero. El formato de cada una está en docs/contrato-api.md:
// ASP.NET las serializa en camelCase, los decimal como números y DateOnly como "2026-09-29".

// ---- Comunes ----

public record Referencia(int Id, string Nombre);

public record ListaPaginada<T>(IReadOnlyList<T> Items, int Total, int Pagina, int PorPagina);

public record ConteoStock(int Critico, int Atencion, int Normal);

public record ConteoClientes(int Activo, int EnRiesgo, int Inactivo);

// ---- GET /api/tablero/catalogos ----

public record PeriodoDto(int Anio, int Mes);

public record SucursalDto(int Id, string Nombre, string Ciudad, string Provincia);

public record CatalogosResponse(
    DateOnly FechaReferencia,
    IReadOnlyList<PeriodoDto> Periodos,
    IReadOnlyList<SucursalDto> Sucursales,
    IReadOnlyList<Referencia> Marcas);

// ---- Ventas de cada sucursal en un mes (resumen, nivel 1 y encabezado del nivel 2) ----

public record FilaSucursal(
    int Id, string Nombre, string Ciudad, string Provincia,
    decimal Ventas, int Tickets, int Pares,
    decimal? Objetivo, decimal? Cumplimiento, string? Estado);

public record TotalesSucursales(
    decimal Ventas, int Tickets, int Pares,
    decimal? Objetivo, decimal? Cumplimiento, string? Estado);

// ---- GET /api/tablero/resumen ----

public record KpisResumen(
    decimal Ventas, decimal VentasAnterior,
    int Pares, int ParesAnterior,
    int Tickets, int TicketsAnterior,
    decimal? Objetivo, decimal? Cumplimiento, string? Estado);

public record SucursalResumen(
    int Id, string Nombre, string Ciudad, string Provincia,
    decimal Ventas, decimal? Objetivo, decimal? Cumplimiento, string? Estado);

public record VentaDelDia(DateOnly Fecha, decimal Ventas, int Tickets);

public record ResumenResponse(
    KpisResumen Kpis,
    IReadOnlyList<SucursalResumen> Sucursales,
    ConteoStock Stock,
    ConteoClientes Clientes,
    IReadOnlyList<VentaDelDia> VentasPorDia);

// ---- Drill down ----

public record VentasPorSucursalResponse(IReadOnlyList<FilaSucursal> Items, TotalesSucursales Totales);

public record VentaMarca(int Id, string Nombre, decimal Ventas, int Pares, decimal VentasAnterior);

public record VentasPorMarcaResponse(FilaSucursal Sucursal, IReadOnlyList<VentaMarca> Items);

public record VentaModelo(
    int Id, string Modelo, string Sku, string Categoria, decimal PrecioOutlet,
    int Pares, decimal Ventas, int Stock, string EstadoStock);

public record VentasPorModeloResponse(Referencia Sucursal, Referencia Marca, IReadOnlyList<VentaModelo> Items);

public record ProductoDetalle(int Id, string Modelo, string Sku, decimal PrecioLista, decimal PrecioOutlet);

public record ResumenModelo(int Lineas, int Pares, decimal Ventas);

public record TalleVendido(decimal Talle, int Pares);

public record LineaVenta(
    int IdDetalle, DateTime Fecha, string Numero, string Cliente,
    decimal Talle, int Cantidad, decimal PrecioUnitario, decimal Subtotal, string MedioPago);

public record DetalleModeloResponse(
    Referencia Sucursal,
    Referencia Marca,
    ProductoDetalle Producto,
    ResumenModelo Resumen,
    IReadOnlyList<TalleVendido> ParesPorTalle,
    ListaPaginada<LineaVenta> Lineas);

// ---- GET /api/stock ----

public record FilaStock(
    int IdStock, int IdProducto, string Sku, string Modelo, string Marca, string Sucursal,
    decimal Talle, int Cantidad, int StockMinimo, string Estado);

public record StockResponse(IReadOnlyList<FilaStock> Items, int Total, int Pagina, int PorPagina, ConteoStock Conteos);

// ---- GET /api/clientes ----

public record FilaCliente(
    int Id, string Nombre, string Apellido, string? Dni, string? Email, string? SucursalHabitual,
    int Compras12Meses, decimal TotalGastado, DateOnly? UltimaCompra, int? Dias, string Estado);

public record ClientesResponse(
    IReadOnlyList<FilaCliente> Items, int Total, int Pagina, int PorPagina, ConteoClientes Conteos);

// ---- GET /api/ventas ----

public record FilaVenta(
    int Id, string Numero, DateTime Fecha, string Sucursal, string Cliente,
    string Producto, int OtrosProductos, int Pares, string MedioPago, decimal Total);

public record TotalesVentas(int Ventas, int Pares, decimal Importe);

public record VentasResponse(
    IReadOnlyList<FilaVenta> Items, int Total, int Pagina, int PorPagina, TotalesVentas Totales);
