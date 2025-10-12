// api/callback.js
export default function handler(req, res) {
  res.status(200).send(`
    <html>
      <head>
        <title>Menfess Sumatra - Callback</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { 
            font-family: Arial, sans-serif; 
            background: #0a0a0f; 
            color: white; 
            text-align: center; 
            padding: 50px;
          }
          a {
            color: #ff3ea5;
            text-decoration: none;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>🎉 Callback Berhasil</h1>
        <p>Twitter API Callback diterima oleh <b>Menfess Sumatra</b>.</p>
        <p>Jika kamu melihat halaman ini secara langsung, artinya proses login atau koneksi API sudah berjalan.</p>
        <p><a href="/">Kembali ke Halaman Utama</a></p>
      </body>
    </html>
  `);
}
