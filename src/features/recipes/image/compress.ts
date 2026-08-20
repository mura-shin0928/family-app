import {
  IMAGE_HARD_LIMIT_BYTES,
  IMAGE_TARGET_BYTES,
  SUPPORTED_IMAGE_MIME_TYPES,
} from "../schema";

// 実測で決めた暫定値（詳細はプラン参照）。iPhone/Android実機での検証結果を
// 受けて確定させる前提の値であり、確定後にこのコメントは更新する。
// 解像度より先にqualityを落とす方針: 文字の輪郭は縮小より中程度のquality低下の
// 方が保たれやすいという仮説によるが、これも実測で覆る可能性がある。
const LADDER: { maxEdge: number; quality: number }[] = [
  { maxEdge: 1600, quality: 0.85 },
  { maxEdge: 1600, quality: 0.72 },
  { maxEdge: 1600, quality: 0.6 },
  { maxEdge: 1200, quality: 0.72 },
  { maxEdge: 1000, quality: 0.7 },
];

const OUTPUT_MIME_TYPE = "image/jpeg";

export type CompressResult =
  | {
      kind: "ok";
      blob: Blob;
      mimeType: string;
      width: number;
      height: number;
      step: number;
    }
  | { kind: "passthrough"; blob: Blob; mimeType: string }
  | { kind: "unsupported" }
  | { kind: "too-large"; bytes: number };

type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

// EXIF回転をここで明示的に指定する。省略すると環境によって回転情報が
// 無視され、横倒しの写真がそのままGeminiへ送られて認識精度が落ちる。
async function decodeViaImageBitmap(file: File): Promise<Decoded | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  } catch {
    return null;
  }
}

// HEIC等、createImageBitmapがデコードできない環境向けのフォールバック。
// <img>で描画すればブラウザの回転情報が適用済みの状態で読める。
async function decodeViaImageElement(file: File): Promise<Decoded | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = objectUrl;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch {
    URL.revokeObjectURL(objectUrl);
    return null;
  }
}

function scaledSize(width: number, height: number, maxEdge: number) {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge) return { width, height };
  const scale = maxEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), OUTPUT_MIME_TYPE, quality);
  });
}

function logStep(
  step: number,
  width: number,
  height: number,
  quality: number,
  bytes: number,
) {
  if (process.env.NODE_ENV === "production") return;
  // 画素・base64は出力しない。サイズと寸法だけを圧縮パラメータ調整のために残す。
  console.debug("[recipe-image] compress step", {
    step,
    width,
    height,
    quality,
    bytes,
  });
}

// 画像を選択直後にクライアント側で圧縮する。原寸のcanvasは一切作らず、
// 縮小後の寸法のcanvas1枚だけを使い回してqualityのラダーを試す
// （モバイルブラウザでのメモリ負荷を抑えるため）。
export async function compressImage(file: File): Promise<CompressResult> {
  const decoded =
    (await decodeViaImageBitmap(file)) ?? (await decodeViaImageElement(file));

  if (!decoded) {
    // デコードできなかった。対応MIMEかつハード上限以下なら原本をそのまま送り、
    // Gemini側のデコードに任せる（主にHEIC/HEIFの受け皿）。
    const mimeType = file.type;
    const isSupported = (
      SUPPORTED_IMAGE_MIME_TYPES as readonly string[]
    ).includes(mimeType);
    if (!isSupported) return { kind: "unsupported" };
    if (file.size > IMAGE_HARD_LIMIT_BYTES) {
      return { kind: "too-large", bytes: file.size };
    }
    return { kind: "passthrough", blob: file, mimeType };
  }

  const { source, width, height, cleanup } = decoded;

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return { kind: "unsupported" };

    let lastBlob: Blob | null = null;
    let lastDims = { width, height };

    for (let step = 0; step < LADDER.length; step++) {
      const { maxEdge, quality } = LADDER[step];
      const dims = scaledSize(width, height, maxEdge);

      if (canvas.width !== dims.width || canvas.height !== dims.height) {
        canvas.width = dims.width;
        canvas.height = dims.height;
        ctx.drawImage(source, 0, 0, dims.width, dims.height);
        lastDims = dims;
      }

      const blob = await canvasToBlob(canvas, quality);
      if (!blob) continue;
      lastBlob = blob;
      logStep(step, dims.width, dims.height, quality, blob.size);

      if (blob.size <= IMAGE_TARGET_BYTES) {
        return {
          kind: "ok",
          blob,
          mimeType: OUTPUT_MIME_TYPE,
          width: dims.width,
          height: dims.height,
          step,
        };
      }
    }

    if (lastBlob && lastBlob.size <= IMAGE_HARD_LIMIT_BYTES) {
      return {
        kind: "ok",
        blob: lastBlob,
        mimeType: OUTPUT_MIME_TYPE,
        width: lastDims.width,
        height: lastDims.height,
        step: LADDER.length - 1,
      };
    }

    return { kind: "too-large", bytes: lastBlob?.size ?? file.size };
  } finally {
    cleanup();
  }
}
