using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OutletApi.Data;
using OutletApi.Dtos;
using OutletApi.Models;

namespace OutletApi.Controllers;

[ApiController]
[Authorize]
[Route("api/tablero")]
public class TableroController(
    CatalogosRepository catalogos,
    VentasRepository ventas,
    StockRepository stock,
    ClientesRepository clientes) : ControllerBase
{
    // GET /api/tablero/catalogos - meses con ventas, sucursales, marcas y fecha de referencia
    [HttpGet("catalogos")]
    public async Task<IActionResult> Catalogos() => Ok(await catalogos.CatalogosAsync());

    // GET /api/tablero/resumen?anio=2026&mes=9&idSucursal=
    [HttpGet("resumen")]
    public async Task<IActionResult> Resumen(int? anio, int? mes, int? idSucursal)
    {
        if (!Periodo.TryCrear(anio, mes, out var periodo))
            return BadRequest(new ErrorResponse(Periodo.MensajeInvalido));
        if (idSucursal is int id && await catalogos.BuscarSucursalAsync(id) is null)
            return NotFound(new ErrorResponse("No existe la sucursal."));

        var actual = await ventas.TotalesSucursalesAsync(periodo, idSucursal);
        var anterior = await ventas.TotalesSucursalesAsync(periodo.Anterior, idSucursal);
        var sucursales = await ventas.FilasSucursalesAsync(periodo, idSucursal);

        return Ok(new ResumenResponse(
            new KpisResumen(
                actual.Ventas, anterior.Ventas,
                actual.Pares, anterior.Pares,
                actual.Tickets, anterior.Tickets,
                actual.Objetivo, actual.Cumplimiento, actual.Estado),
            sucursales
                .Select(s => new SucursalResumen(
                    s.Id, s.Nombre, s.Ciudad, s.Provincia, s.Ventas, s.Objetivo, s.Cumplimiento, s.Estado))
                .ToList(),
            await stock.ConteosAsync(new StockRepository.FiltroStock(null, idSucursal, null, null)),
            await clientes.ConteosAsync(new ClientesRepository.FiltroClientes(null, idSucursal, null)),
            await ventas.VentasPorDiaAsync(periodo, idSucursal)));
    }
}
