using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OutletApi.Data;
using OutletApi.Dtos;
using OutletApi.Models;

namespace OutletApi.Controllers;

// Drill down de ventas (sucursal › marca › modelo › detalle) y listado de "Detalle de ventas"
[ApiController]
[Authorize]
[Route("api/ventas")]
public class VentasController(CatalogosRepository catalogos, VentasRepository ventas) : ControllerBase
{
    private const string SinSucursal = "No existe la sucursal.";

    // Nivel 1 - GET /api/ventas/sucursales?anio&mes
    [HttpGet("sucursales")]
    public async Task<IActionResult> PorSucursal(int? anio, int? mes)
    {
        if (!Periodo.TryCrear(anio, mes, out var periodo))
            return BadRequest(new ErrorResponse(Periodo.MensajeInvalido));

        return Ok(new VentasPorSucursalResponse(
            await ventas.FilasSucursalesAsync(periodo),
            await ventas.TotalesSucursalesAsync(periodo)));
    }

    // Nivel 2 - GET /api/ventas/sucursales/{idSucursal}/marcas?anio&mes
    [HttpGet("sucursales/{idSucursal:int}/marcas")]
    public async Task<IActionResult> PorMarca(int idSucursal, int? anio, int? mes)
    {
        if (!Periodo.TryCrear(anio, mes, out var periodo))
            return BadRequest(new ErrorResponse(Periodo.MensajeInvalido));

        var sucursal = (await ventas.FilasSucursalesAsync(periodo, idSucursal)).FirstOrDefault();
        if (sucursal is null) return NotFound(new ErrorResponse(SinSucursal));

        return Ok(new VentasPorMarcaResponse(sucursal, await ventas.VentasPorMarcaAsync(idSucursal, periodo)));
    }

    // Nivel 3 - GET /api/ventas/sucursales/{idSucursal}/marcas/{idMarca}/modelos?anio&mes
    [HttpGet("sucursales/{idSucursal:int}/marcas/{idMarca:int}/modelos")]
    public async Task<IActionResult> PorModelo(int idSucursal, int idMarca, int? anio, int? mes)
    {
        if (!Periodo.TryCrear(anio, mes, out var periodo))
            return BadRequest(new ErrorResponse(Periodo.MensajeInvalido));

        var sucursal = await catalogos.BuscarSucursalAsync(idSucursal);
        if (sucursal is null) return NotFound(new ErrorResponse(SinSucursal));
        var marca = await catalogos.BuscarMarcaAsync(idMarca);
        if (marca is null) return NotFound(new ErrorResponse("No existe la marca."));

        return Ok(new VentasPorModeloResponse(
            sucursal, marca, await ventas.VentasPorModeloAsync(idSucursal, idMarca, periodo)));
    }

    // Nivel 4 - GET /api/ventas/sucursales/{idSucursal}/productos/{idProducto}?anio&mes&pagina&porPagina
    [HttpGet("sucursales/{idSucursal:int}/productos/{idProducto:int}")]
    public async Task<IActionResult> DetalleModelo(
        int idSucursal, int idProducto, int? anio, int? mes, int? pagina, int? porPagina)
    {
        if (!Periodo.TryCrear(anio, mes, out var periodo))
            return BadRequest(new ErrorResponse(Periodo.MensajeInvalido));

        var sucursal = await catalogos.BuscarSucursalAsync(idSucursal);
        if (sucursal is null) return NotFound(new ErrorResponse(SinSucursal));
        var encontrado = await ventas.BuscarProductoAsync(idProducto);
        if (encontrado is null) return NotFound(new ErrorResponse("No existe el producto."));
        var (producto, marca) = encontrado.Value;

        var paginacion = Paginacion.Crear(pagina, porPagina, porDefecto: 8);
        var (resumen, talles, lineas) = await ventas.DetalleModeloAsync(idSucursal, idProducto, periodo, paginacion);

        return Ok(new DetalleModeloResponse(
            sucursal, marca, producto, resumen, talles,
            new ListaPaginada<LineaVenta>(lineas, resumen.Lineas, paginacion.Pagina, paginacion.PorPagina)));
    }

    // Detalle de ventas - GET /api/ventas?desde&hasta&idSucursal&medioPago&busqueda&orden&pagina&porPagina
    [HttpGet]
    public async Task<IActionResult> Listar(
        DateOnly? desde, DateOnly? hasta, int? idSucursal, string? medioPago, string? busqueda,
        string? orden, int? pagina, int? porPagina)
    {
        if (desde is not null && hasta is not null && desde > hasta)
            return BadRequest(new ErrorResponse("La fecha 'desde' no puede ser posterior a 'hasta'."));
        if (!string.IsNullOrEmpty(medioPago) && !Valores.MediosPago.Contains(medioPago))
            return BadRequest(new ErrorResponse("El medio de pago no es válido."));
        orden = string.IsNullOrEmpty(orden) ? "fecha_desc" : orden;
        if (!VentasRepository.OrdenesVentas.ContainsKey(orden))
            return BadRequest(new ErrorResponse("El orden no es válido."));

        var paginacion = Paginacion.Crear(pagina, porPagina);
        var filtro = new VentasRepository.FiltroVentas(
            desde, hasta, idSucursal, string.IsNullOrEmpty(medioPago) ? null : medioPago, busqueda, orden);
        var (items, totales) = await ventas.ListarVentasAsync(filtro, paginacion);

        return Ok(new VentasResponse(items, totales.Ventas, paginacion.Pagina, paginacion.PorPagina, totales));
    }
}
