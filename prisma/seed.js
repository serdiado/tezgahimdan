const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  // Pazarlar artik sadece admin panelinden (/admin/pazarlar) elle olusturulur -
  // her biri belediyeyle yapilan gercek bir anlasmayi temsil eder, bu yuzden
  // burada otomatik/varsayilan pazar tohumlanmiyor.

  // PLAN.md SS1'deki ornek urun turlerine gore baslangic kategorileri.
  const kategoriAdlari = ["Taki", "Orgu", "Recel", "Diger"];
  for (const ad of kategoriAdlari) {
    const mevcut = await prisma.kategori.findFirst({ where: { ad } });
    if (!mevcut) {
      await prisma.kategori.create({ data: { ad } });
      console.log("Olusturuldu: Kategori ->", ad);
    } else {
      console.log("Zaten var: Kategori ->", ad);
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
