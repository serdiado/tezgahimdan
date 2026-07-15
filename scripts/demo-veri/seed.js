// Pilot oncesi DEMO verisi - SADECE YEREL dev DB icin.
//
//   node scripts/demo-veri/seed.js            -> kurar (demo verisi varsa reddeder)
//   node scripts/demo-veri/seed.js --sifirla  -> once mevcut demo verisini siler, sonra kurar
//
// NEDEN AYRI SCRIPT (prisma/seed.js degil): prisma/seed.js her ortamda calisan
// "kurulus" tohumu (kategoriler). Bu ise sahte icerik - prod'a ASLA girmemeli,
// o yuzden package.json'daki prisma.seed kancasina BAGLANMADI, elle calistirilir.
//
// "Hicbir kayit kalici silinmez" kurali UYGULAMA icin gecerli; bu script yerel
// dev DB'sindeki KENDI urettigi demo kayitlarini temizler (--sifirla). Silme
// kapsami email domaini (@demo.tezgahimdan.com) ile sinirli - gercek kayitlara
// dokunmaz.

const { PrismaClient } = require("../../src/generated/prisma");
const bcrypt = require("bcrypt");
const { randomUUID } = require("node:crypto");
const { readdir, mkdir, copyFile, unlink, readFile, stat } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const path = require("node:path");
const { TEZGAHLAR, ALICILAR } = require("./katalog");
const { URUN_YORUMLARI, MAGAZA_YORUMLARI } = require("./yorumlar");

const prisma = new PrismaClient();

const DEMO_DOMAIN = "@demo.tezgahimdan.com";
const DEMO_SIFRE = "demo1234";
const FOTO_DIZIN = path.join(__dirname, "fotograflar");
const FOTO_VARSAYILAN = path.join(FOTO_DIZIN, "varsayilan");
const URUN_UPLOAD = path.join(__dirname, "..", "..", "public", "uploads", "urunler");
const KROKI_UPLOAD = path.join(__dirname, "..", "..", "public", "uploads", "magaza-kroki");
const SIFIRLA = process.argv.includes("--sifirla");

// ---------------------------------------------------------------------------
// Deterministik rastgelelik: ayni seed -> ayni demo. Boylece "hangi urunde kac
// yorum vardi" gibi sorular tekrar kurulumda degismez (Math.random olsaydi her
// calistirma farkli cikardi, hata ayiklamasi zorlasirdi).
// ---------------------------------------------------------------------------
function rastgeleUretici(tohum) {
  let a = tohum >>> 0;
  return function () {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = rastgeleUretici(20260715);
const aralik = (min, max) => min + Math.floor(rnd() * (max - min + 1));
const sec = (dizi) => dizi[Math.floor(rnd() * dizi.length)];

// ---------------------------------------------------------------------------
// pazar-haftasi.ts'teki sonrakiSifirlamaTarihi'nin JS karsiligi. TS modulu
// dogrudan require edilemedigi icin (path alias + tip derlemesi) ayni algoritma
// burada tekrarlandi - degisirse IKISI de guncellenmeli.
// ---------------------------------------------------------------------------
const GUN_INDEKSI = { PazarGunu: 0, Pazartesi: 1, Sali: 2, Carsamba: 3, Persembe: 4, Cuma: 5, Cumartesi: 6 };
const INTL_GUNLER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function sonrakiSifirlamaTarihi(pazar, simdi = new Date()) {
  const parcalar = new Intl.DateTimeFormat("en-US", {
    timeZone: pazar.saatDilimi || "Europe/Istanbul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  }).formatToParts(simdi);
  const p = Object.fromEntries(parcalar.filter((x) => x.type !== "literal").map((x) => [x.type, x.value]));
  const yerelGun = INTL_GUNLER.indexOf(p.weekday);
  const hedefGun = GUN_INDEKSI[pazar.sifirlamaGunu];
  const sifirlamaDakikasi = pazar.sifirlamaSaati.getUTCHours() * 60 + pazar.sifirlamaSaati.getUTCMinutes();
  const suankiDakika = Number(p.hour) * 60 + Number(p.minute);
  let kalanGun = (hedefGun - yerelGun + 7) % 7;
  if (kalanGun === 0 && suankiDakika >= sifirlamaDakikasi) kalanGun = 7;
  return new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + kalanGun));
}

const gunEkle = (tarih, gun) =>
  new Date(Date.UTC(tarih.getUTCFullYear(), tarih.getUTCMonth(), tarih.getUTCDate() + gun));

// ---------------------------------------------------------------------------
// rezervasyon.ts ile AYNI alfabe/desen - kod pazarda sozlu soylenecegi icin
// karistirilabilir karakterler (0/O, 1/I) yok.
// ---------------------------------------------------------------------------
const KOD_ALFABESI = "ABCDEFGHJKMNPRSTUVYZ23456789";
const kullanilanKodlar = new Set();
function rezervKoduUret() {
  for (;;) {
    let govde = "";
    for (let i = 0; i < 6; i++) govde += KOD_ALFABESI[Math.floor(rnd() * KOD_ALFABESI.length)];
    const kod = `TZ-${govde}`;
    if (!kullanilanKodlar.has(kod)) {
      kullanilanKodlar.add(kod);
      return kod;
    }
  }
}

// ---------------------------------------------------------------------------
// Fotograf cozumleme: once kullanicinin koydugu dosya, yoksa gozle dogrulanmis
// varsayilan. Ikisi de yoksa null (cagiran taraf rapor eder).
//
// Tur tespiti UZANTIYA DEGIL dosyanin baytlarina bakar - uygulamanin kendi
// savunmasiyla ayni ilke (bkz. src/lib/dosya.ts gercekDosyaTuruDogrula).
// Gerekce: kullanicidan ".jpe" uzantili gercek bir JPEG geldi; uzanti listesine
// guvenen eski surum onu sessizce ATLIYOR, urun fotografsiz kaliyordu. Hedef
// dosya adini zaten biz uretiyoruz (uuid.<uzanti>), o yuzden kaynagin uzantisi
// hic onemli degil - icerigi onemli.
// ---------------------------------------------------------------------------
const MAX_BOYUT_BYTE = 5 * 1024 * 1024; // urun-sabitleri.ts ile AYNI sinir

function gercekTur(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  const g = buf.toString("ascii", 0, 6);
  if (g === "GIF87a" || g === "GIF89a") return "gif";
  return null;
}

// Reddedilen dosyalari sebebiyle birlikte biriktirir - sessiz atlama YOK.
const fotografUyarilari = [];

async function dizinHaritasi(dizin, etiket) {
  const harita = new Map();
  if (!existsSync(dizin)) return harita;
  for (const dosya of await readdir(dizin)) {
    const tamYol = path.join(dizin, dosya);
    if ((await stat(tamYol)).isDirectory()) continue;
    if (dosya === "LISTE.md" || dosya === "ATIF.json") continue;

    const nokta = dosya.lastIndexOf(".");
    const taban = nokta < 0 ? dosya : dosya.slice(0, nokta);

    const buf = await readFile(tamYol);
    const uzanti = gercekTur(buf);
    if (!uzanti) {
      fotografUyarilari.push(`${etiket}/${dosya}: taninmayan gorsel turu (jpg/png/webp/gif degil) - ATLANDI`);
      continue;
    }
    // Uygulamanin 5MB sinirini seed de uygulamali: aksi halde demo, gercek bir
    // saticinin ASLA yukleyemeyecegi bir veri uretir (ve VPS'te bosuna yer/CPU yer).
    if (buf.length > MAX_BOYUT_BYTE) {
      fotografUyarilari.push(
        `${etiket}/${dosya}: ${(buf.length / 1048576).toFixed(1)}MB - uygulamanin 5MB sinirinin USTUNDE, ATLANDI`,
      );
      continue;
    }
    harita.set(taban, { yol: tamYol, uzanti });
  }
  return harita;
}

let kullaniciFotolari, varsayilanFotolari;
function fotografBul(taban) {
  return kullaniciFotolari.get(taban) ?? varsayilanFotolari.get(taban) ?? null;
}

// Fotografi upload dizinine RASTGELE adla kopyalar (urun.ts/magaza-kroki.ts ile
// ayni desen: orijinal dosya adina asla guvenilmez) ve web yolunu doner.
async function fotografYukle(taban, hedefDizin, webOnEki) {
  const foto = fotografBul(taban);
  if (!foto) return null;
  const dosyaAdi = `${randomUUID()}.${foto.uzanti}`;
  await copyFile(foto.yol, path.join(hedefDizin, dosyaAdi));
  return `${webOnEki}/${dosyaAdi}`;
}

// ---------------------------------------------------------------------------
// Temizlik (--sifirla): SADECE demo domainli kullanicilara bagli kayitlar.
// FK sirasi onemli - yapraklardan koke dogru.
// ---------------------------------------------------------------------------
async function demoVeriyiSil() {
  const demoKullanicilar = await prisma.kullanici.findMany({
    where: { email: { endsWith: DEMO_DOMAIN } },
    select: { id: true },
  });
  const kullaniciIdler = demoKullanicilar.map((k) => k.id);
  if (kullaniciIdler.length === 0) {
    console.log("Silinecek demo verisi yok.");
    return;
  }

  const magazalar = await prisma.magaza.findMany({
    where: { sahipId: { in: kullaniciIdler } },
    select: { id: true },
  });
  const magazaIdler = magazalar.map((m) => m.id);
  const urunler = await prisma.urun.findMany({
    where: { magazaId: { in: magazaIdler } },
    select: { id: true, fotograflar: true },
  });
  const urunIdler = urunler.map((u) => u.id);

  // Diskteki fotograflari da temizle: DB satirini silmek dosyayi silmez, her
  // --sifirla turu bir onceki turun fotograflarini yetim birakirdi (ilk denemede
  // 2 turda 118 dosya / 35 referans cikti). SADECE silinen demo kayitlarinin
  // isaret ettigi dosyalar silinir - baska kayitlarin dosyalarina dokunulmaz.
  const silinecekYollar = [
    ...urunler.flatMap((u) => u.fotograflar),
    ...(await prisma.magaza.findMany({
      where: { id: { in: magazaIdler }, krokiFotoUrl: { not: null } },
      select: { krokiFotoUrl: true },
    })).map((m) => m.krokiFotoUrl),
  ];
  let silinenDosya = 0;
  for (const yol of silinecekYollar) {
    // yol: "/uploads/<altDizin>/<dosya>" -> public/ altindaki gercek dosya
    const tamYol = path.join(__dirname, "..", "..", "public", yol.replace(/^\//, ""));
    try {
      await unlink(tamYol);
      silinenDosya++;
    } catch {
      /* dosya zaten yoksa sorun degil */
    }
  }
  const rezervasyonlar = await prisma.rezervasyon.findMany({
    where: { urunId: { in: urunIdler } },
    select: { id: true },
  });

  await prisma.degerlendirme.deleteMany({ where: { urunId: { in: urunIdler } } });
  await prisma.magazaDegerlendirme.deleteMany({ where: { magazaId: { in: magazaIdler } } });
  await prisma.urunFavori.deleteMany({ where: { urunId: { in: urunIdler } } });
  await prisma.magazaTakip.deleteMany({ where: { magazaId: { in: magazaIdler } } });
  await prisma.bildirim.deleteMany({ where: { OR: [{ urunId: { in: urunIdler } }, { kullaniciId: { in: kullaniciIdler } }] } });
  await prisma.sikayet.deleteMany({ where: { OR: [{ hedefUrunId: { in: urunIdler } }, { hedefMagazaId: { in: magazaIdler } }, { sikayetciId: { in: kullaniciIdler } }] } });
  // DurumGecmisi tek bir tabloya bagli degil (varlikTuru+varlikId) - hem demo
  // kullanicinin yaptigi kayitlari hem demo varliklara ait olanlari temizle.
  await prisma.durumGecmisi.deleteMany({
    where: {
      OR: [
        { kullaniciId: { in: kullaniciIdler } },
        { varlikId: { in: [...urunIdler, ...magazaIdler, ...rezervasyonlar.map((r) => r.id)] } },
      ],
    },
  });
  await prisma.rezervasyon.deleteMany({ where: { urunId: { in: urunIdler } } });
  await prisma.urun.deleteMany({ where: { magazaId: { in: magazaIdler } } });
  await prisma.magaza.deleteMany({ where: { id: { in: magazaIdler } } });
  await prisma.duyuru.deleteMany({ where: { olusturanId: { in: kullaniciIdler } } });
  await prisma.kullanici.deleteMany({ where: { id: { in: kullaniciIdler } } });

  console.log(`Silindi: ${kullaniciIdler.length} kullanici, ${magazaIdler.length} magaza, ${urunIdler.length} urun, ${silinenDosya} fotograf dosyasi ve bagli kayitlar.`);
}

// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Tezgahimdan demo verisi ===\n");

  // --- On kosullar
  const pazar = await prisma.pazar.findFirst({ where: { aktifMi: true } });
  if (!pazar) throw new Error("Aktif Pazar yok - once /admin/pazarlar'dan bir pazar olustur.");

  const kategoriler = await prisma.kategori.findMany({ where: { silindiMi: false } });
  const kategoriHaritasi = new Map(kategoriler.map((k) => [k.ad, k.id]));
  for (const t of TEZGAHLAR) {
    if (!kategoriHaritasi.has(t.kategori)) {
      throw new Error(`Kategori bulunamadi: "${t.kategori}" - once "pnpm exec prisma db seed" calistir.`);
    }
  }

  // Motorun kapasite matematigi bu ayarlari okur; demo kuyrugunu kurarken AYNI
  // degerleri kullanmak icin burada da find-or-create (platform-ayarlari.ts deseni).
  const ayarlar = await prisma.platformAyarlari.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });

  const mevcutDemo = await prisma.kullanici.count({ where: { email: { endsWith: DEMO_DOMAIN } } });
  if (mevcutDemo > 0) {
    if (!SIFIRLA) {
      console.error(`HATA: ${mevcutDemo} demo kullanici zaten var. Yeniden kurmak icin: --sifirla`);
      process.exitCode = 1;
      return;
    }
    await demoVeriyiSil();
  }

  // --- Fotograflar
  kullaniciFotolari = await dizinHaritasi(FOTO_DIZIN, "fotograflar");
  varsayilanFotolari = await dizinHaritasi(FOTO_VARSAYILAN, "varsayilan");
  await mkdir(URUN_UPLOAD, { recursive: true });
  await mkdir(KROKI_UPLOAD, { recursive: true });

  if (fotografUyarilari.length) {
    console.log("\nFOTOGRAF UYARILARI:");
    for (const u of fotografUyarilari) console.log(`  ! ${u}`);
  }

  const eksikFotolar = [];
  for (const t of TEZGAHLAR) {
    const tabanT = t.dosya.replace(/\.[a-z]+$/, "");
    if (!fotografBul(tabanT)) eksikFotolar.push(tabanT);
    for (const u of t.urunler) {
      const tabanU = u.dosya.replace(/\.[a-z]+$/, "");
      if (!fotografBul(tabanU)) eksikFotolar.push(tabanU);
    }
  }
  console.log(`Fotograf: ${kullaniciFotolari.size} kullanici + ${varsayilanFotolari.size} varsayilan`);
  if (eksikFotolar.length) {
    console.log(`  UYARI: ${eksikFotolar.length} fotograf eksik -> ilgili urun FOTOGRAFSIZ olusturulur`);
    console.log(`  ${eksikFotolar.join(", ")}`);
  }

  // --- Pazar haftalari: acik kuyruk = sonraki sifirlama, gecmis = onceki haftalar
  const buHafta = sonrakiSifirlamaTarihi(pazar);
  const gecmisHaftalar = [gunEkle(buHafta, -21), gunEkle(buHafta, -14), gunEkle(buHafta, -7)];
  console.log(`\nAcik kuyruk haftasi : ${buHafta.toISOString().slice(0, 10)}`);
  console.log(`Gecmis haftalar     : ${gecmisHaftalar.map((h) => h.toISOString().slice(0, 10)).join(", ")}`);
  console.log(`Kapasite ayarlari   : maxYedek=${ayarlar.maxYedek}, guvenilirlikEsigi=${ayarlar.guvenilirlikEsigi}\n`);

  const sifreHash = await bcrypt.hash(DEMO_SIFRE, 10);

  // --- Alicilar
  const alicilar = [];
  for (const a of ALICILAR) {
    alicilar.push(
      await prisma.kullanici.create({
        data: { ad: a.ad, email: a.email, telefon: a.telefon, sifreHash, rol: "alici" },
      }),
    );
  }
  console.log(`${alicilar.length} alici olusturuldu.`);

  // --- Saticilar + tezgahlar + urunler
  let urunSayaci = 0;
  const tumUrunler = []; // { urun, magaza, kategoriAd }

  for (const t of TEZGAHLAR) {
    const satici = await prisma.kullanici.create({
      data: { ad: t.saticiAd, email: t.email, telefon: t.telefon, sifreHash, rol: "satici" },
    });

    const krokiUrl = await fotografYukle(t.dosya.replace(/\.[a-z]+$/, ""), KROKI_UPLOAD, "/uploads/magaza-kroki");

    const magaza = await prisma.magaza.create({
      data: {
        sahipId: satici.id,
        ad: t.magazaAd,
        slug: t.slug,
        aciklama: t.aciklama,
        whatsappNo: t.whatsappNo,
        tezgahBilgisi: t.tezgahBilgisi,
        krokiFotoUrl: krokiUrl,
        instagramUrl: t.instagramUrl ?? null,
        facebookUrl: t.facebookUrl ?? null,
        tiktokUrl: t.tiktokUrl ?? null,
        pazarId: pazar.id,
      },
    });
    await prisma.durumGecmisi.create({
      data: { kullaniciId: satici.id, varlikTuru: "Magaza", varlikId: magaza.id, olay: "magaza_olusturuldu" },
    });

    for (const u of t.urunler) {
      // Gecmis satis sayisi: motor satildiSayisi'ni HAFTA FILTRESIZ sayar ve
      // kalanBirim = stokAdedi - satildiSayisi. Yani gecmis satislar stogu KALICI
      // dusurur; satildiSayisi >= stokAdedi olursa urun "satildi"ya gecip vitrinden
      // kalkardi. Bu yuzden stok, katalogdaki "vitrinde gorunsun istedigim kalan"
      // uzerine satis sayisi EKLENEREK yazilir (kalanBirim = katalog.stok olur).
      const satisSayisi = aralik(0, 3);
      const fotoUrl = await fotografYukle(u.dosya.replace(/\.[a-z]+$/, ""), URUN_UPLOAD, "/uploads/urunler");

      const urun = await prisma.urun.create({
        data: {
          magazaId: magaza.id,
          kategoriId: kategoriHaritasi.get(t.kategori),
          baslik: u.baslik,
          aciklama: u.aciklama,
          fiyat: u.fiyat,
          stokAdedi: u.stok + satisSayisi,
          fotograflar: fotoUrl ? [fotoUrl] : [],
          durum: "sergide",
        },
      });
      urunSayaci++;
      tumUrunler.push({ urun, magaza, kategoriAd: t.kategori, kalanBirim: u.stok, satisSayisi });
    }
  }
  console.log(`${TEZGAHLAR.length} satici + tezgah, ${urunSayaci} urun olusturuldu.`);

  // --- Gecmis: satildi / gelmedi / iptal
  // magazaAlicilari: hangi alici hangi magazadan GERCEKTEN satin aldi -
  // magaza degerlendirmesi bu kumeye gore verilir (motor kurali: magazadan
  // satildi kaydi olmayan magazayi degerlendiremez).
  const magazaAlicilari = new Map(); // magazaId -> Set(aliciId)
  const urunAlicilari = new Map(); // urunId -> [aliciId] (satildi olanlar)
  let satildiSayaci = 0, gelmediSayaci = 0, iptalSayaci = 0;

  for (const { urun, magaza, satisSayisi } of tumUrunler) {
    if (satisSayisi === 0) continue;
    // Ayni alici ayni urunu iki kez almasin - karistirip bastan al.
    const havuz = [...alicilar].sort(() => rnd() - 0.5).slice(0, satisSayisi);

    for (let i = 0; i < havuz.length; i++) {
      const alici = havuz[i];
      const hafta = gecmisHaftalar[i % gecmisHaftalar.length];
      // aktifOlmaZamani: pazar baslangicindan once aktif olmus (gercek akista
      // rezervasyon pazardan onceki gunlerde yapilir).
      const aktifOlma = new Date(hafta.getTime() - 2 * 24 * 60 * 60 * 1000);

      const rez = await prisma.rezervasyon.create({
        data: {
          urunId: urun.id, aliciId: alici.id, tip: "aktif", siraNo: 1,
          durum: "satildi", rezervKodu: rezervKoduUret(), pazarHaftasi: hafta,
          aktifOlmaZamani: aktifOlma, createdAt: aktifOlma,
        },
      });
      await prisma.durumGecmisi.create({
        data: { kullaniciId: alici.id, varlikTuru: "Rezervasyon", varlikId: rez.id, olay: "rezervasyon_sonuclandi:satildi" },
      });
      satildiSayaci++;

      if (!magazaAlicilari.has(magaza.id)) magazaAlicilari.set(magaza.id, new Set());
      magazaAlicilari.get(magaza.id).add(alici.id);
      if (!urunAlicilari.has(urun.id)) urunAlicilari.set(urun.id, []);
      urunAlicilari.get(urun.id).push(alici.id);
    }
  }

  // Birkac "gelmedi" ve "iptal" - gecmis gercekci gorunsun. Guvenilirlik esigi
  // (ust uste 3 gelmedi -> yasak) TETIKLENMEZ: alici basina en fazla 1 gelmedi
  // veriyoruz, ayrica hepsi farkli alicilara dagitiliyor.
  const gelmediAdaylari = tumUrunler.filter((x) => x.satisSayisi > 0).slice(0, 6);
  for (let i = 0; i < gelmediAdaylari.length; i++) {
    const { urun } = gelmediAdaylari[i];
    const alici = alicilar[i % alicilar.length];
    if (urunAlicilari.get(urun.id)?.includes(alici.id)) continue; // ayni urunde zaten kaydi var
    const hafta = gecmisHaftalar[i % gecmisHaftalar.length];
    const rez = await prisma.rezervasyon.create({
      data: {
        urunId: urun.id, aliciId: alici.id, tip: "aktif", siraNo: 2,
        durum: i % 2 === 0 ? "gelmedi" : "iptal",
        rezervKodu: rezervKoduUret(), pazarHaftasi: hafta,
        aktifOlmaZamani: new Date(hafta.getTime() - 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(hafta.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.durumGecmisi.create({
      data: {
        kullaniciId: alici.id, varlikTuru: "Rezervasyon", varlikId: rez.id,
        olay: i % 2 === 0 ? "rezervasyon_sonuclandi:gelmedi" : "rezervasyon_iptal",
      },
    });
    if (i % 2 === 0) gelmediSayaci++;
    else iptalSayaci++;
  }
  console.log(`Gecmis: ${satildiSayaci} satildi, ${gelmediSayaci} gelmedi, ${iptalSayaci} iptal.`);

  // --- Urun degerlendirmeleri (SADECE satin alandan - degerlendirme.ts kurali)
  let urunYorumSayaci = 0;
  for (const { urun, kategoriAd } of tumUrunler) {
    const alanlar = urunAlicilari.get(urun.id) ?? [];
    const havuz = URUN_YORUMLARI[kategoriAd];
    const kullanilan = new Set();
    for (const aliciId of alanlar) {
      if (rnd() > 0.7) continue; // herkes yorum birakmaz
      let secim = sec(havuz);
      let deneme = 0;
      while (kullanilan.has(secim.yorum) && deneme++ < 10) secim = sec(havuz);
      if (kullanilan.has(secim.yorum)) continue; // ayni urunde ayni yorum tekrarlanmasin
      kullanilan.add(secim.yorum);
      await prisma.degerlendirme.create({
        data: { kullaniciId: aliciId, urunId: urun.id, puan: secim.puan, yorum: secim.yorum },
      });
      urunYorumSayaci++;
    }
  }

  // --- Magaza degerlendirmeleri (SADECE o magazadan satin alandan)
  let magazaYorumSayaci = 0;
  for (const [magazaId, aliciSet] of magazaAlicilari) {
    const kullanilan = new Set();
    for (const aliciId of aliciSet) {
      if (rnd() > 0.75) continue;
      let secim = sec(MAGAZA_YORUMLARI);
      let deneme = 0;
      while (kullanilan.has(secim.yorum) && deneme++ < 10) secim = sec(MAGAZA_YORUMLARI);
      if (kullanilan.has(secim.yorum)) continue;
      kullanilan.add(secim.yorum);
      await prisma.magazaDegerlendirme.create({
        data: { kullaniciId: aliciId, magazaId, puan: secim.puan, yorum: secim.yorum },
      });
      magazaYorumSayaci++;
    }
  }
  console.log(`Degerlendirme: ${urunYorumSayaci} urun yorumu, ${magazaYorumSayaci} tezgah yorumu.`);

  // --- Begeni / favori / takip
  let begeniSayaci = 0, takipSayaci = 0, magazaTakipSayaci = 0;
  for (const { urun } of tumUrunler) {
    for (const alici of alicilar) {
      const begeni = rnd() < 0.28;
      const takip = rnd() < 0.12;
      if (!begeni && !takip) continue;
      // UrunFavori: begeni ve takip AYNI satirda iki bagimsiz bayrak.
      await prisma.urunFavori.create({
        data: { kullaniciId: alici.id, urunId: urun.id, begeniMi: begeni, takipMi: takip },
      });
      if (begeni) begeniSayaci++;
      if (takip) takipSayaci++;
    }
  }
  for (const [magazaId, aliciSet] of magazaAlicilari) {
    for (const aliciId of aliciSet) {
      if (rnd() > 0.5) continue;
      await prisma.magazaTakip.create({ data: { kullaniciId: aliciId, magazaId, takipMi: true } });
      magazaTakipSayaci++;
    }
  }
  console.log(`Etkilesim: ${begeniSayaci} begeni, ${takipSayaci} urun takibi, ${magazaTakipSayaci} tezgah takibi.`);

  // --- Acik kuyruk (bu hafta): motorun kural setiyle BIREBIR
  //     aktif siraNo = 1..kalanBirim, yedek siraNo = 1..maxYedek,
  //     doldu esigi = kalanBirim + maxYedek  (bkz. rezervasyon.ts rezervasyonOlustur)
  let aktifSayaci = 0, yedekSayaci = 0, dolduSayaci = 0;

  // Bir urunun kuyruguna `hedef` kadar alici dizer. Motorun atama sirasi birebir:
  // once aktif slotlar (1..kalanBirim), dolunca yedek (1..maxYedek), o da dolunca dur.
  async function kuyrukKur(urun, kalanBirim, hedef) {
    const kuyruk = [...alicilar].sort(() => rnd() - 0.5).slice(0, Math.min(hedef, alicilar.length));
    let aktif = 0, yedek = 0;
    for (const alici of kuyruk) {
      let tip, siraNo;
      if (aktif < kalanBirim) {
        tip = "aktif";
        siraNo = ++aktif;
      } else if (yedek < ayarlar.maxYedek) {
        tip = "yedek";
        siraNo = ++yedek;
      } else break; // kuyruk dolu
      const rez = await prisma.rezervasyon.create({
        data: {
          urunId: urun.id, aliciId: alici.id, tip, siraNo, durum: "bekliyor",
          rezervKodu: rezervKoduUret(), pazarHaftasi: buHafta,
          aktifOlmaZamani: tip === "aktif" ? new Date() : null,
        },
      });
      await prisma.durumGecmisi.create({
        data: { kullaniciId: alici.id, varlikTuru: "Rezervasyon", varlikId: rez.id, olay: `rezervasyon_olusturuldu:${tip}:${siraNo}` },
      });
      if (tip === "aktif") aktifSayaci++;
      else yedekSayaci++;
    }
    if (aktif + yedek >= kalanBirim + ayarlar.maxYedek) {
      await prisma.urun.update({ where: { id: urun.id }, data: { durum: "doldu" } });
      await prisma.durumGecmisi.create({ data: { varlikTuru: "Urun", varlikId: urun.id, olay: "urun_doldu" } });
      dolduSayaci++;
    }
  }

  // VITRIN SENARYOLARI: yedek kuyrugu bu platformun ayirt edici ozelligi
  // ("aldim/ben almistim" karmasasini bitiren sey) - rastgele dagilima birakilirsa
  // demo'da hic gorunmeyebiliyor (ilk kurulumda 18 aktife karsi 1 yedek cikti).
  // Bu yuzden birkac urunun kuyrugu BILEREK doldurulur. baslik -> hedef kuyruk boyu.
  const VITRIN_SENARYOLARI = {
    "El Örgüsü Yün Hırka (M)": { hedef: 6, not: "kuyruk tamamen dolu -> urun 'doldu'" }, // kalan 1 + 5 yedek
    "Makrome Duvar Süsü (Büyük)": { hedef: 5, not: "2 aktif + 3 yedek" },
    "İğne Oyalı Yazma": { hedef: 4, not: "2 aktif + 2 yedek" },
  };
  const senaryoUrunIdler = new Set();
  for (const kayit of tumUrunler) {
    const senaryo = VITRIN_SENARYOLARI[kayit.urun.baslik];
    if (!senaryo) continue;
    await kuyrukKur(kayit.urun, kayit.kalanBirim, senaryo.hedef);
    senaryoUrunIdler.add(kayit.urun.id);
  }

  // Kalan urunler: seyrek ve kucuk kuyruklar.
  for (const { urun, kalanBirim } of tumUrunler) {
    if (senaryoUrunIdler.has(urun.id)) continue;
    if (rnd() > 0.45) continue; // her urunde kuyruk olmasin
    await kuyrukKur(urun, kalanBirim, aralik(1, 3));
  }
  console.log(`Acik kuyruk: ${aktifSayaci} aktif, ${yedekSayaci} yedek, ${dolduSayaci} urun "doldu".`);

  // --- Ozet
  console.log("\n=== Ozet ===");
  console.log(`Tezgah  : ${await prisma.magaza.count()}`);
  console.log(`Urun    : ${await prisma.urun.count()}`);
  console.log(`Alici   : ${alicilar.length}`);
  console.log(`\nGiris bilgileri (hepsi ayni sifre):`);
  console.log(`  Satici ornek : ${TEZGAHLAR[0].email}  /  ${DEMO_SIFRE}`);
  console.log(`  Alici ornek  : ${ALICILAR[0].email}  /  ${DEMO_SIFRE}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
