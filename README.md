# WebP Converter API with SSE

## Deskripsi

API ini menyediakan dua endpoint utama: 

1. `/convert`: Menerima file gambar dan mengonversinya menjadi format WebP.
2. `/sse`: Endpoint Server-Sent Events (SSE) untuk memberikan info tentang total file yang telah dikonversi dan ukuran total yang telah dikonversi.

## Instalasi

1. Instal Deno dari https://deno.land/
2. Clone repo ini.
3. Jalankan `deno run --allow-net --allow-read --allow-write app.ts`.

## Modul yang Digunakan
- (OAK middleware)[https://deno.land/x/oak@v12.6.1/mod.ts]
- (CORS)[https://deno.land/x/cors@v1.2.2]
- (deno_webp_converter)[https://deno.land/x/deno_webp_converter@0.0.4]


## Penggunaan

### Convert Endpoint
- Kirim file sebagai `multipart/form-data` ke `/convert`.
- Header `X-Original-File-Size` disarankan.

### SSE Endpoint
- Sambungkan ke `/sse` untuk mendapatkan info setiap 5 detik.

## Lisensi

MIT License
```

## Dokumentasi API

### Endpoint: `/convert`

#### Metode: `POST`

##### Headers:

- `Content-Type: multipart/form-data`
- `X-Original-File-Size: (ukuran file asli dalam byte) [Opsional]`

##### Request Body:

- Field `file`: File gambar untuk dikonversi.

##### Response:

- Status Code: `200`
- Content-Type: `image/webp`
- File dikembalikan sebagai attachment.

##### Error:

- Status Code: `400` jika tidak ada file.
- Status Code: `500` jika terjadi error server.

---

### Endpoint: `/sse`

#### Metode: `GET`

##### Response:

- Server-Sent Event stream memberikan informasi `totalFilesConverted` dan `totalSizeConverted` setiap 5 detik.

##### Error:

- Status Code: `500` jika terjadi error server.

### Middleware: `checkOrigin`

Fungsi ini memeriksa header `Origin` dan memblokir permintaan dari origin yang tidak terdaftar di array `ALLOWED_ORIGINS`.

---

## Catatan Tambahan

- Data jumlah file dan ukuran file yang telah dikonversi disimpan di `data.json`.