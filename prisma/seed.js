const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  // Pazarlar artik sadece admin panelinden (/admin/pazarlar) elle olusturulur -
  // her biri belediyeyle yapilan gercek bir anlasmayi temsil eder, bu yuzden
  // burada otomatik/varsayilan pazar tohumlanmiyor.

  // Baslangic kategorileri (2026-07-11 karari). Bilincli DIZILIM sirasi (sira):
  // alfabetik degil, kullanici-tanimli sira. Vitrin/panel/admin bu siraya uyar.
  // "Diger" catch-all en sonda. Isimler kullaniciya gorunur -> duzgun Turkce.
  const kategoriler = [
    { ad: "Mutfaktan", sira: 1 },
    { ad: "El Emeği", sira: 2 },
    { ad: "Giyim Kuşam", sira: 3 },
    { ad: "Takı & Aksesuar", sira: 4 },
    { ad: "Bakım & Kozmetik", sira: 5 },
    { ad: "Ev & Dekorasyon", sira: 6 },
    { ad: "Diğer", sira: 7 },
  ];
  for (const { ad, sira } of kategoriler) {
    const mevcut = await prisma.kategori.findFirst({ where: { ad } });
    if (!mevcut) {
      await prisma.kategori.create({ data: { ad, sira } });
      console.log("Olusturuldu: Kategori ->", ad);
    } else {
      // Isim zaten varsa sadece sirayi guncelle (siralama tohumdan gelsin).
      await prisma.kategori.update({ where: { id: mevcut.id }, data: { sira } });
      console.log("Guncellendi (sira): Kategori ->", ad);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
