using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OutletApi.Data;
using OutletApi.Dtos;
using OutletApi.Models;

namespace OutletApi.Controllers;

[ApiController]
[Authorize]
[Route("api/stock")]
public class StockController(StockRepository stock) : ControllerBase
{
    // GET /api/stock?busqueda&idSucursal&idMarca&estado&pagina&porPagina
    [HttpGet]
    public async Task<IActionResult> Listar(
        string? busqueda, int? idSucursal, int? idMarca, string? estado, int? pagina, int? porPagina)
    {
        if (!string.IsNullOrEmpty(estado) && !Valores.EstadosStock.Contains(estado))
            return BadRequest(new ErrorResponse("El estado no es válido."));

        var paginacion = Paginacion.Crear(pagina, porPagina);
        var filtro = new StockRepository.FiltroStock(
            busqueda, idSucursal, idMarca, string.IsNullOrEmpty(estado) ? null : estado);

        var (items, total) = await stock.ListarAsync(filtro, paginacion);
        // Los botones de estado muestran cuántas hay de cada uno con los demás filtros aplicados
        var conteos = await stock.ConteosAsync(filtro with { Estado = null });

        return Ok(new StockResponse(items, total, paginacion.Pagina, paginacion.PorPagina, conteos));
    }
}
