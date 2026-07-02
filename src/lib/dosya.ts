// Istemcinin gonderdigi `File.type` (Content-Type) sahte olabilir - burada gercek
// dosya baytlarini (magic number) kontrol ederek iddia edilen turle eslesip
// eslesmedigini dogrularis. Sadece MIME header'a guvenmek, uzantisi .jpg olan
// rastgele bir dosyanin public/uploads altina yazilip sunulmasina izin verirdi.
export function gercekDosyaTuruDogrula(buffer: Buffer, iddiaEdilenMime: string): boolean {
  if (buffer.length < 12) return false;

  switch (iddiaEdilenMime) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case "image/gif":
      return buffer.toString("ascii", 0, 6) === "GIF87a" || buffer.toString("ascii", 0, 6) === "GIF89a";
    case "image/webp":
      return (
        buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP"
      );
    default:
      return false;
  }
}
