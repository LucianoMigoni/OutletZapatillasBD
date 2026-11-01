namespace OutletApi.Models;

// Mes que pide el tablero (?anio=2026&mes=9). Las consultas filtran ventas.fecha en [Desde, Hasta)
public record Periodo(int Anio, int Mes)
{
    public const string MensajeInvalido = "Indicá un año y un mes válidos.";

    public DateTime Desde => new(Anio, Mes, 1);
    public DateTime Hasta => Desde.AddMonths(1);
    public Periodo Anterior => Mes == 1 ? new Periodo(Anio - 1, 12) : new Periodo(Anio, Mes - 1);

    public static bool TryCrear(int? anio, int? mes, out Periodo periodo)
    {
        periodo = new Periodo(anio ?? 0, mes ?? 0);
        return anio is >= 2000 and <= 2100 && mes is >= 1 and <= 12;
    }
}

// Página pedida de una tabla (?pagina=1&porPagina=10): desde 1, con 100 filas como máximo
public record Paginacion(int Pagina, int PorPagina)
{
    public int Offset => (Pagina - 1) * PorPagina;

    public static Paginacion Crear(int? pagina, int? porPagina, int porDefecto = 10) =>
        new(Math.Max(1, pagina ?? 1), Math.Clamp(porPagina ?? porDefecto, 1, 100));
}

// Valores posibles de los semáforos y de ventas.medio_pago (los mismos CHECK y funciones de la base)
public static class Valores
{
    public static readonly string[] EstadosStock = ["critico", "atencion", "normal"];
    public static readonly string[] EstadosCliente = ["activo", "en_riesgo", "inactivo"];
    public static readonly string[] MediosPago = ["efectivo", "debito", "credito", "transferencia", "billetera"];
}
