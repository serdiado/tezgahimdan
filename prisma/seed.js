const { PrismaClient } = require("../src/generated/prisma");
const VARSAYILAN_PAZAR = require("./varsayilan-pazar.json");

const prisma = new PrismaClient();

async function main() {
  // Henuz bir Pazar yonetim ekrani yok; Magaza.pazarId zorunlu oldugu icin
  // PLAN.md'deki ornege (Seferihisar, Carsamba 20:00) gore tek bir varsayilan
  // pazar tohumluyoruz. Idempotent: ad'a gore var olani bulur, yoksa olusturur.
  // Ayni varsayilan, magaza ilk kez olusturulurken de kullanilir (bkz. src/lib/magaza.ts).
  let pazar = await prisma.pazar.findFirst({ where: { ad: VARSAYILAN_PAZAR.ad } });
  if (!pazar) {
    pazar = await prisma.pazar.create({
      data: { ...VARSAYILAN_PAZAR, sifirlamaSaati: new Date(VARSAYILAN_PAZAR.sifirlamaSaati) },
    });
    console.log("Olusturuldu: Pazar ->", pazar.ad);
  } else {
    console.log("Zaten var: Pazar ->", pazar.ad);
  }

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
