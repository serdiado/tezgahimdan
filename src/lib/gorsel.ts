// Istemci tarafi gorsel isleme: EXIF yon duzeltmesi + kucultme/sikistirma.
// Telefondan gelen buyuk ve/veya yan-donmus (EXIF) fotograflar sunucuya
// gonderilmeden once normalize edilir - mobil veride hiz + "yan/ters foto" tuzagi
// cozulur. Cikti HER ZAMAN JPEG'dir (iPhone HEIC dahil: Safari HEIC'i decode
// edebildiginden canvas re-encode ile jpeg'e cevrilir). Yalnizca tarayicida
// calisir (createImageBitmap / canvas).
export const MAX_KENAR = 1600;
export const JPEG_KALITE = 0.82;

export async function gorseliIsle(file: File): Promise<File> {
  // 1) Tercih edilen yol: createImageBitmap EXIF yonunu uygular + decode eder.
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const jpeg = await bitmaptenJpeg(bitmap);
      if (jpeg) return jpeg;
    } finally {
      bitmap.close?.();
    }
  } catch {
    // createImageBitmap ya da imageOrientation desteklenmiyor olabilir (eski Safari).
  }

  // 2) Fallback: <img> ile yukle (modern tarayici EXIF'i img render'ina uygular).
  try {
    const jpeg = await imgFallback(file);
    if (jpeg) return jpeg;
  } catch {
    // yok say
  }

  // 3) Son care: orijinali dondur. Sunucu magic-number ile yine dogrular; desteksiz
  //    tur (or. decode edilemeyen HEIC) ise "desteklenmeyen dosya turu" ile reddeder.
  return file;
}

async function bitmaptenJpeg(bitmap: ImageBitmap): Promise<File | null> {
  const { width, height } = olcekle(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvasJpeg(canvas);
}

async function imgFallback(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await yukleImg(url);
    const { width, height } = olcekle(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);
    return canvasJpeg(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// En uzun kenar MAX_KENAR'i asiyorsa oranli kucult; asmiyorsa oldugu gibi birak
// (buyutme yok).
function olcekle(w: number, h: number): { width: number; height: number } {
  const uzun = Math.max(w, h);
  if (uzun <= MAX_KENAR) return { width: w, height: h };
  const oran = MAX_KENAR / uzun;
  return { width: Math.round(w * oran), height: Math.round(h * oran) };
}

function canvasJpeg(canvas: HTMLCanvasElement): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : null),
      "image/jpeg",
      JPEG_KALITE,
    );
  });
}

function yukleImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
