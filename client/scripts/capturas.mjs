// Saca las capturas de todas las pantallas para el documento de la entrega (docs/img/entrega2).
//
// Uso: con el front corriendo (npm run dev), ejecutar en otra terminal: npm run capturas
// La primera vez hay que instalar el navegador: npx playwright install chromium
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SALIDA = path.join(RAIZ, "docs", "img", "entrega2");
const BASE = process.env.CAPTURAS_URL ?? "http://localhost:5173";
const EMAIL = process.env.CAPTURAS_EMAIL ?? "admin@outlet.com";
const PASSWORD = process.env.CAPTURAS_PASSWORD ?? "Admin1234";

await mkdir(SALIDA, { recursive: true });
// Navegador en castellano: los campos de fecha se muestran como dd/mm/aaaa
const browser = await chromium.launch({
  args: ["--lang=es-AR"],
  env: { ...process.env, LANG: "es_AR.UTF-8" },
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  locale: "es-AR",
});

// Espera a que la pantalla termine de pedir sus datos a la API
async function esperarDatos(tituloAnterior = null) {
  await page.waitForFunction(
    (anterior) => {
      const titulo = document.querySelector(".page-title")?.textContent;
      const cargando = document.querySelector(".estado-carga, .recargando, .spinner-page");
      return titulo && titulo !== anterior && !cargando;
    },
    tituloAnterior,
    { timeout: 30_000 },
  );
}

async function capturar(nombre, { completa = true } = {}) {
  await page.mouse.move(0, 0);
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`), fullPage: completa });
  console.log(`✓ ${nombre}.png`);
}

// Hace clic en el primer elemento del drill down y espera el nivel siguiente
async function bajarUnNivel() {
  const titulo = await page.textContent(".page-title");
  await page.click(".tabla tbody tr:first-child .link-fila");
  await esperarDatos(titulo);
}

// ---- Acceso ----
await page.goto(`${BASE}/login`);
await page.waitForSelector(".auth-form");
await capturar("01-login");

await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', "incorrecta123");
await page.click('button[type="submit"]');
await page.waitForSelector(".alert");
await capturar("02-login-error");

await page.goto(`${BASE}/registro`);
await page.waitForSelector(".auth-form");
await capturar("03-registro");

await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL("**/resumen");

// ---- Resumen ----
await esperarDatos();
await capturar("04-resumen");

const grafico = page.locator(".card", { has: page.locator(".grafico") });
await grafico.scrollIntoViewIfNeeded();
const columnas = page.locator(".grafico-hit");
await columnas.nth(Math.floor((await columnas.count()) * 0.6)).hover();
await page.waitForSelector(".grafico-tooltip");
await grafico.screenshot({ path: path.join(SALIDA, "05-resumen-grafico.png") });
console.log("✓ 05-resumen-grafico.png");

// ---- Drill down: sucursal › marca › modelo › detalle ----
await page.goto(`${BASE}/ventas`);
await esperarDatos();
await capturar("06-nivel1-sucursales");
await bajarUnNivel();
await capturar("07-nivel2-marcas");
await bajarUnNivel();
await capturar("08-nivel3-modelos");
await bajarUnNivel();
await capturar("09-nivel4-detalle");

// ---- Tablas ----
for (const [ruta, nombre] of [
  ["/stock", "10-stock"],
  ["/clientes", "11-clientes"],
  ["/detalle-ventas", "12-detalle-ventas"],
]) {
  await page.goto(`${BASE}${ruta}`);
  await esperarDatos();
  await capturar(nombre);
}

await browser.close();
console.log(`Capturas guardadas en ${path.relative(process.cwd(), SALIDA)}`);
