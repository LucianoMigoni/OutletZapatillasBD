using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OutletApi.Data;
using OutletApi.Dtos;
using OutletApi.Models;

namespace OutletApi.Controllers;

[ApiController]
[Authorize]
[Route("api/clientes")]
public class ClientesController(ClientesRepository clientes) : ControllerBase
{
    // GET /api/clientes?busqueda&idSucursal&estado&pagina&porPagina
    [HttpGet]
    public async Task<IActionResult> Listar(string? busqueda, int? idSucursal, string? estado, int? pagina, int? porPagina)
    {
        if (!string.IsNullOrEmpty(estado) && !Valores.EstadosCliente.Contains(estado))
            return BadRequest(new ErrorResponse("El estado no es válido."));

        var paginacion = Paginacion.Crear(pagina, porPagina);
        var filtro = new ClientesRepository.FiltroClientes(
            busqueda, idSucursal, string.IsNullOrEmpty(estado) ? null : estado);

        var (items, total) = await clientes.ListarAsync(filtro, paginacion);
        // Las tarjetas de estado muestran cuántos hay de cada uno con los demás filtros aplicados
        var conteos = await clientes.ConteosAsync(filtro with { Estado = null });

        return Ok(new ClientesResponse(items, total, paginacion.Pagina, paginacion.PorPagina, conteos));
    }
}
