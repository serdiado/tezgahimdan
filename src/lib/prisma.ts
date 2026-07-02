import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// P2002 (unique constraint ihlali) tespiti BILEREK instanceof ile yapilmiyor:
// dev'de hot-reload sonrasi globalThis'teki singleton, ESKI modul orneginin
// hata siniflarini firlatir ve yeni import edilen sinifla instanceof eslesmez
// (rezervasyon yaris testinde canli olarak yakalandi - 500'e dusuyordu).
// Yapisal kontrol her iki durumda da calisir.
export function p2002Mi(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

// Ihlal edilen unique hedefini (kolon listesi ya da index adi) metin olarak
// dondurur; hangi kisitin patladigini ayirt etmek icin.
export function p2002Hedefi(err: unknown): string {
  if (typeof err !== "object" || err === null) return "";
  const meta = (err as { meta?: { target?: unknown } }).meta;
  return JSON.stringify(meta?.target ?? "");
}
