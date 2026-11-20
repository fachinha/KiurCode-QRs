# KiurCode QRs — QRs Dinámicos + Planilla Editable + Analytics en Cloudflare

Aplicación web ultrarrápida para gestionar códigos QR dinámicos como en Google Sheets y visualizar estadísticas de escaneos en tiempo real, diseñada para correr 100% gratis en **Cloudflare Pages + Cloudflare D1**.

---

## Qué incluye esta aplicación

1. **Redirección Instantánea (<20 ms en el Edge de Cloudflare)**:
   - Al escanear `/?k=QR000011` o `/r/QR000011`, Cloudflare responde con una redirección HTTP `302` directa al destino sin pantalla de carga ni demoras de Google Apps Script, registrando el escaneo en segundo plano (`waitUntil`).
   - Compatible también con `fetch` desde tu página actual `https://fachinha.github.io/QRdinamicos/?k=QR000011`.
2. **Planilla Editable tipo Google Sheets (`Planilla Config`)**:
   - Tus **80 códigos QR (`QR000001` al `QR000080`)** y tus **231 escaneos históricos** ya vienen pre-migrados y limpios de caracteres invisibles.
   - Hacé clic en cualquier celda de **Target (Link de Destino)** o **Nombre del Local** para editar. Se guarda solo al presionar `Enter`, `Flecha Abajo` o salir de la celda.
   - Vista previa del QR en cada fila + descarga en **PNG de Alta Resolución** con el código `QR0000XX` impreso debajo.
   - Banner en vivo arriba que te muestra cuál fue el **último QR escaneado** (ideal cuando escaneás un sticker físico vacío como `QR000013` o `QR000045` para saber qué número es y asignarle link en 1 clic).
3. **Dashboard de Analytics (`Analytics`)**:
   - Filtros por **QR / Local** y **Período** (7 días, 30 días, 90 días, 1 año, Todo el tiempo).
   - Tarjetas de KPIs, gráfico diario de **Hits por día**, **Ranking Top 10 por local**, tabla de rendimiento y registro en vivo de la **Hoja Hits** (con botón para borrar escaneos de prueba).

---

## Cómo probarla en tu PC ahora mismo

Ejecutá en la terminal dentro de esta carpeta:

```bash
node server.js
```

Y abrí en tu navegador: **`http://localhost:8788`**

---

## Cómo subirla a Cloudflare (Gratis en 3 pasos)

### Paso 1: Crear la Base de Datos D1 en Cloudflare
1. Entrá a tu panel de [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Workers & Pages** -> **D1 SQL Database**.
2. Hacé clic en **Create Database** y ponéle de nombre `kiurcode-qrs-db`.

### Paso 2: Subir el proyecto a Cloudflare Pages
1. Subí esta carpeta a un repositorio de GitHub (o desplegá con `npx wrangler pages deploy public --project-name kiurcode-qrs`).
2. En Cloudflare Dashboard -> **Workers & Pages** -> **Create** -> pestaña **Pages** -> **Connect to Git** y elegí tu repositorio.
3. En **Build settings**, dejá el comando de build vacío y en **Build output directory** poné: `public`

### Paso 3: Vincular la base de datos D1 (`DB`)
1. Dentro de tu proyecto en Cloudflare Pages, andá a **Settings** -> **Bindings** -> **Add** -> **D1 database**.
2. En **Variable name** escribí exactamente: `DB`
3. Seleccioná `kiurcode-qrs-db` y guardá.
4. ¡Listo! En la primera visita a tu web de Cloudflare, la aplicación **crea sola las tablas y carga automáticamente tus 80 QRs y todo el historial de escaneos de Google Sheets**.
