import { Application, Router, Context } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { convert } from "https://deno.land/x/deno_webp_converter/mod.ts";
import * as path from "https://deno.land/std@0.107.0/path/mod.ts";

const ALLOWED_ORIGINS = [
  // isi dengan origin yang diperbolehkan akses API
];
const PORT = 8000;

const app = new Application();
const router = new Router();
let totalFilesConverted = 0;
let totalSizeConverted = 0; // dalam byte

const DATA_PATH = "./data.json";

// Fungsi untuk memuat dan menyimpan data

async function loadData() {
  try {
    const data = JSON.parse(await Deno.readTextFile("data.json"));
    if (data) {
      totalFilesConverted = data.totalFilesConverted || 0;
      totalSizeConverted = data.totalSizeConverted || 0;
    }
  } catch (error) {
    console.error("Could not load data:", error);
  }
}

// Fungsi untuk menyimpan data ke file JSON

async function saveData() {
  const data = {
    totalFilesConverted,
    totalSizeConverted,
  };
  await Deno.writeTextFile("data.json", JSON.stringify(data));
}

// Muat data yang sudah ada
await loadData();

// Middleware untuk memeriksa asal permintaan

const checkOrigin = async (context: Context, next: Function) => {
  const origin = context.request.headers.get("Origin");
  if (ALLOWED_ORIGINS.includes(origin || "")) {
    await next();
  } else {
    context.response.status = 403;
    context.response.body = "Forbidden";
  }
};

// Membuat folder temp jika belum ada

const tempDir = path.join(Deno.cwd(), "./temp");
if (!(await Deno.stat(tempDir).catch(() => null))) {
  await Deno.mkdir(tempDir);
}

// Rute untuk konversi gambar ke format webp

router.post("/convert", async (context) => {
  let tempFile: string;
  let outputFile: string;
  const originalFileSize = parseInt(
    context.request.headers.get("X-Original-File-Size") || "0"
  );
  try {
    const file = await context.request.body({ type: "form-data" });
    const formData = await file.value.read();

    if (!formData.files || formData.files.length === 0) {
      context.response.status = 400;
      context.response.body = "No valid file uploaded!";
      return;
    }

    const imageFile = formData.files[0];
    const content = await Deno.readFile(imageFile.filename);
    const fileSize = content.byteLength; // Mendapatkan ukuran file dalam bytes

    tempFile = path.join(tempDir, imageFile.originalName);
    await Deno.writeFile(tempFile, content);

    outputFile = path.join(
      tempDir,
      path.basename(
        imageFile.originalName,
        path.extname(imageFile.originalName)
      ) + ".webp"
    );

    await convert(tempFile, outputFile, "-q 80");

    context.response.headers.set(
      "Content-Disposition",
      `attachment; filename=${path.basename(outputFile)}`
    );
    context.response.body = await Deno.readFile(outputFile);
    context.response.headers.set("Content-Type", "image/webp");

    totalFilesConverted++;
    totalSizeConverted += originalFileSize > 0 ? originalFileSize : fileSize; // Gunakan ukuran asli jika ada
    saveData();
  } catch (error) {
    console.error("Error:", error);
    context.response.status = 500;
    context.response.body = `Internal Server Error: ${error.message}`;
  } finally {
    // Cleanup
    if (tempFile) await Deno.remove(tempFile).catch(() => {});
    if (outputFile) await Deno.remove(outputFile).catch(() => {});
  }
});

// Rute untuk SSE
router.get("/sse", async (ctx: Context) => {
  try {
    // Set required headers for SSE
    ctx.response.headers.set("Content-Type", "text/event-stream");
    ctx.response.headers.set("Connection", "keep-alive");

    const target = ctx.sendEvents();

    target.dispatchMessage({ totalFilesConverted, totalSizeConverted });

    // Update data setiap 5 detik
    const interval = setInterval(() => {
      target.dispatchMessage({ totalFilesConverted, totalSizeConverted });
    }, 5000);

    target.addEventListener("close", () => {
      clearInterval(interval);
    });
  } catch (error) {
    console.error("Error:", error);
    ctx.response.status = 500;
    ctx.response.body = `Internal Server Error: ${error.message}`;
  }
});

app.use(checkOrigin);
app.use(oakCors());

app.use(router.routes());
app.use(router.allowedMethods());

console.log(`Server running on http://localhost:${PORT}/`);
await app.listen({ port: PORT });
