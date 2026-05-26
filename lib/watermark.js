import fs from 'fs';
import Jimp from 'jimp';

export async function applyWatermark(
  filePath,
  watermarkPath
) {

  const originalBuffer = fs.readFileSync(filePath);

  const image = await Jimp.read(originalBuffer);
  const watermark = await Jimp.read(watermarkPath);

  // resize watermark
  watermark.resize(
    image.bitmap.width / 5,
    Jimp.AUTO
  );

  // opacity
  watermark.opacity(0.5);

  // posisi kanan bawah
  const x =
    image.bitmap.width -
    watermark.bitmap.width -
    20;

  const y =
    image.bitmap.height -
    watermark.bitmap.height -
    20;

  image.composite(watermark, x, y);

  return await image.getBufferAsync(
    Jimp.MIME_JPEG
  );

}