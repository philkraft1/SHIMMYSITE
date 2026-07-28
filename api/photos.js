/**
 * Validate and decode guest experience photo uploads (jpeg/png/webp).
 */

const MAX_PHOTOS = 4;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB per image

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function sniffMime(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // RIFF....WEBP
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function decodeBase64Payload(raw) {
  let mimeHint = null;
  let b64 = String(raw || "").trim();
  const dataUrl = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(b64);
  if (dataUrl) {
    mimeHint = dataUrl[1].toLowerCase();
    b64 = dataUrl[2];
  }
  b64 = b64.replace(/\s+/g, "");
  if (!b64) throw Object.assign(new Error("Photo data is empty."), { code: "PHOTO_INVALID" });
  let buf;
  try {
    buf = Buffer.from(b64, "base64");
  } catch (_) {
    throw Object.assign(new Error("Photo data is not valid base64."), {
      code: "PHOTO_INVALID",
    });
  }
  if (!buf.length) {
    throw Object.assign(new Error("Photo data is empty."), { code: "PHOTO_INVALID" });
  }
  return { buf, mimeHint };
}

/**
 * Normalize an array of photo inputs into { mime, data: Buffer }[].
 * Accepts [{ mime, data }] or [{ mimeType, data }] with base64 / data-URL strings.
 */
function normalizePhotos(input) {
  if (input == null || input === "") return [];
  if (!Array.isArray(input)) {
    throw Object.assign(new Error("Photos must be sent as an array."), {
      code: "PHOTO_INVALID",
    });
  }
  if (input.length > MAX_PHOTOS) {
    throw Object.assign(
      new Error(`You can upload at most ${MAX_PHOTOS} photos.`),
      { code: "PHOTO_LIMIT" }
    );
  }

  return input.map((item, i) => {
    if (!item || typeof item !== "object") {
      throw Object.assign(new Error(`Photo ${i + 1} is invalid.`), {
        code: "PHOTO_INVALID",
      });
    }
    const claimed = String(item.mime || item.mimeType || item.type || "")
      .trim()
      .toLowerCase();
    const { buf, mimeHint } = decodeBase64Payload(item.data || item.base64 || "");
    if (buf.length > MAX_BYTES) {
      throw Object.assign(
        new Error(
          `Photo ${i + 1} is too large (max ${Math.round(MAX_BYTES / (1024 * 1024))}MB each).`
        ),
        { code: "PHOTO_TOO_LARGE" }
      );
    }
    const sniffed = sniffMime(buf);
    if (!sniffed || !ALLOWED_MIME.has(sniffed)) {
      throw Object.assign(
        new Error(`Photo ${i + 1} must be a JPEG, PNG, or WebP image.`),
        { code: "PHOTO_TYPE" }
      );
    }
    if (claimed && claimed !== sniffed && claimed !== "image/jpg") {
      // Allow image/jpg as alias for jpeg; otherwise require claim match sniff.
      if (!(claimed === "image/jpg" && sniffed === "image/jpeg")) {
        if (ALLOWED_MIME.has(claimed) && claimed !== sniffed) {
          throw Object.assign(
            new Error(`Photo ${i + 1} type does not match its contents.`),
            { code: "PHOTO_TYPE" }
          );
        }
      }
    }
    if (mimeHint && mimeHint !== sniffed) {
      if (!(mimeHint === "image/jpg" && sniffed === "image/jpeg")) {
        throw Object.assign(
          new Error(`Photo ${i + 1} type does not match its contents.`),
          { code: "PHOTO_TYPE" }
        );
      }
    }
    return { mime: sniffed, data: buf };
  });
}

module.exports = {
  MAX_PHOTOS,
  MAX_BYTES,
  ALLOWED_MIME,
  normalizePhotos,
  sniffMime,
};
