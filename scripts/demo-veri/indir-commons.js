// Wikimedia Commons'tan aday gorsel indirir. Openverse (indir.js) denendi ama
// havuzu Flickr agirlikli ve etiketleri gurultulu cikti - "mandalina receli"
// aramasina makarna, "yesil zeytin"e salata geldi (2026-07-15 kontak sayfasi
// dogrulamasi). Commons'in kategorileri kuratorlu, ozellikle Turkiye'ye ozgu
// terimlerde (tarhana, oya) gercek karsiligi var.
//
// Sorgular oge basina ELLE ayarlandi - genel terim (ör. "green olives") agac/
// bahce fotografi getiriyor, "table olives bowl" meyveyi getiriyor. Yine de son
// karar GOZLE dogrulama (montaj.js kontak sayfasi) - bu script sadece aday sunar.

const { mkdir, writeFile, readFile } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const HEDEF = process.argv[2];
if (!HEDEF) {
  console.error("kullanim: node indir-commons.js <hedef-dizin>");
  process.exit(1);
}

// taban dosya adi -> Commons arama sorgusu (elle ayarlandi)
const SORGULAR = {
  // --- tezgah fotograflari (saticinin isini temsil eden gorsel)
  "tezgah-ayse": "homemade jam jars preserves",
  "tezgah-hatice": "olive oil bottle",
  "tezgah-nazli": "oya needle lace turkish",
  "tezgah-sevgi": "macrame",
  "tezgah-fatma": "knitting wool yarn needles",
  "tezgah-elif": "baby clothes cotton",
  "tezgah-zeynep": "wooden necklace pendant",
  "tezgah-meryem": "beaded jewellery handmade",
  "tezgah-gulten": "handmade soap bars",
  "tezgah-emine": "lavender bunch flowers",
  // Commons aramasi tum kelimeleri AND'ler - 4 kelimelik sorgular 0 sonuc
  // donduruyordu (ör. "pottery bowls handmade ceramic"). Kisa tutuldu.
  "tezgah-husniye": "pottery bowls",
  "tezgah-sultan": "candles jar",
  "tezgah-hacer": "seeds seed packet",
  "tezgah-serife": "wicker baskets",

  // --- Mutfaktan
  "urun-mandalina-receli": "homemade jam jar marmalade",
  "urun-tarhana": "tarhana",
  "urun-kuru-domates": "sun dried tomatoes",
  "urun-zeytinyagi": "olive oil bottle",
  "urun-yesil-zeytin": "table olives bowl",
  "urun-ot-kurabiyesi": "crackers biscuits savoury",

  // --- El Emegi
  "urun-oyali-yazma": "oya lace",
  "urun-dantel-ortu": "crochet doily",
  "urun-amigurumi": "amigurumi",
  "urun-makrome-duvar": "macrame",
  "urun-kece-altlik": "felt coaster",

  // --- Giyim Kusam
  "urun-yun-hirka": "knitted cardigan wool",
  "urun-yun-atki": "knitted scarf wool",
  "urun-bebek-patik": "knitted baby booties",
  "urun-bebek-zibin": "baby bodysuit onesie",
  "urun-cocuk-onluk": "child apron",

  // --- Taki & Aksesuar
  "urun-zeytin-kolye": "wooden pendant necklace",
  "urun-ahsap-kupe": "wooden earrings",
  "urun-tespih": "prayer beads tasbih",
  "urun-nazar-bileklik": "nazar bead",
  "urun-boncuk-kolye": "beaded necklace",

  // --- Bakim & Kozmetik
  "urun-zeytinyagli-sabun": "olive oil soap bar",
  "urun-lavanta-sabun": "lavender soap",
  "urun-kil-maskesi": "clay mask",
  "urun-kuru-lavanta": "dried lavender bunch",
  "urun-lavanta-kese": "lavender sachet",
  "urun-biberiye-suyu": "rosemary bottle herbal",

  // --- Ev & Dekorasyon
  "urun-seramik-kase": "ceramic bowl handmade",
  "urun-seramik-kupa": "ceramic mug handmade",
  "urun-seramik-saksi": "ceramic flower pot small",
  "urun-soya-mumu": "scented candle jar",
  "urun-balmumu": "beeswax candles",

  // --- Diger
  "urun-domates-tohumu": "tomato seeds",
  "urun-feslegen-fidesi": "basil plant pot",
  "urun-kuru-kekik": "dried oregano herbs",
  "urun-hasir-sepet": "wicker basket handles",
  "urun-ekmek-sepeti": "bread basket wicker",
};

const ADAY_SAYISI = 6;
const MAX_BOYUT = 5 * 1024 * 1024;
const UA = "tezgahimdan-demo-seed/1.0 (yerel demo verisi; iletisim: serdiado09@gmail.com)";

function turTespit(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  const g = buf.toString("ascii", 0, 6);
  if (g === "GIF87a" || g === "GIF89a") return "gif";
  return null;
}

const uyu = (ms) => new Promise((r) => setTimeout(r, ms));

async function ara(sorgu, onbellekDizin) {
  const anahtar = crypto.createHash("sha1").update(`commons:${sorgu}`).digest("hex").slice(0, 16);
  const yol = path.join(onbellekDizin, `${anahtar}.json`);
  if (existsSync(yol)) return JSON.parse(await readFile(yol, "utf8"));

  const url =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: `filetype:bitmap ${sorgu}`,
      gsrnamespace: "6",
      gsrlimit: "16",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "900", // tam boy yerine 900px kucuk hal - 5MB sinirinin altinda kalir
      format: "json",
    });
  const cevap = await fetch(url, { headers: { "User-Agent": UA } });
  if (!cevap.ok) throw new Error(`arama basarisiz (${cevap.status})`);
  const veri = await cevap.json();
  await writeFile(yol, JSON.stringify(veri));
  await uyu(400);
  return veri;
}

// Wikimedia upload sunucusu ard arda hizli isteklerde 429 donuyor (ilk turda 32
// oge bu yuzden bos kaldi, hatalar sessizce yutuluyordu). Artik indirmeler
// arasinda bekleme var ve basarisizlik sebebi loglaniyor.
async function indir(url, gunluk) {
  await uyu(250);
  try {
    const cevap = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
    if (!cevap.ok) {
      gunluk.push(`${cevap.status}`);
      if (cevap.status === 429) await uyu(3000); // throttle: biraz geri cekil
      return null;
    }
    const buf = Buffer.from(await cevap.arrayBuffer());
    if (buf.length > MAX_BOYUT || buf.length < 5000) {
      gunluk.push(`boyut:${buf.length}`);
      return null;
    }
    const uzanti = turTespit(buf);
    if (!uzanti) {
      gunluk.push("tur-taninmadi");
      return null;
    }
    return { buf, uzanti };
  } catch (err) {
    gunluk.push(err.name);
    return null;
  }
}

async function main() {
  const adayDizin = path.join(HEDEF, "adaylar-commons");
  const onbellekDizin = path.join(HEDEF, "commons-onbellek");
  await mkdir(adayDizin, { recursive: true });
  await mkdir(onbellekDizin, { recursive: true });

  // Onceki turun kaynakcasini koru - atlanan ogelerin lisans/atif kaydi
  // silinmesin (yoksa her tekrar calistirma kaynakcayi budar).
  const kaynakcaYolu = path.join(HEDEF, "kaynakca-commons.json");
  const kaynakca = existsSync(kaynakcaYolu) ? JSON.parse(await readFile(kaynakcaYolu, "utf8")) : {};
  const girdiler = Object.entries(SORGULAR);
  let sira = 0;

  for (const [taban, sorgu] of girdiler) {
    sira++;
    const ogeDizin = path.join(adayDizin, taban);
    await mkdir(ogeDizin, { recursive: true });

    // Zaten yeterli adayi olan ogeyi atla - sorgu duzeltip tekrar calistirmak
    // tum havuzu bastan indirmesin (aramalar onbellekli ama indirmeler degil).
    const { readdir } = require("node:fs/promises");
    const mevcut = (await readdir(ogeDizin)).filter((d) => /^\d+\.(jpg|png|webp|gif)$/.test(d));
    if (mevcut.length >= ADAY_SAYISI) {
      console.log(`  [${sira}/${girdiler.length}] ${taban}: atlandi (${mevcut.length} aday zaten var)`);
      continue;
    }

    let sayfalar;
    try {
      const veri = await ara(sorgu, onbellekDizin);
      sayfalar = Object.values(veri.query?.pages ?? {});
      // Commons "index" alani arama siralamasini korur - Object.values sirasi
      // garanti degil, aramanin alaka sirasina geri don.
      sayfalar.sort((a, b) => (a.index ?? 999) - (b.index ?? 999));
    } catch (err) {
      console.log(`  [${sira}/${girdiler.length}] ${taban}: ARAMA HATASI - ${err.message}`);
      kaynakca[taban] = { sorgu, adaylar: [] };
      continue;
    }

    const inenler = [];
    const gunluk = [];
    for (const sayfa of sayfalar) {
      if (inenler.length >= ADAY_SAYISI) break;
      const bilgi = sayfa.imageinfo?.[0];
      if (!bilgi) continue;
      const indirilen = await indir(bilgi.thumburl ?? bilgi.url, gunluk);
      if (!indirilen) continue;
      const adayAdi = `${inenler.length}.${indirilen.uzanti}`;
      await writeFile(path.join(ogeDizin, adayAdi), indirilen.buf);
      inenler.push({
        aday: adayAdi,
        baslik: sayfa.title,
        lisans: bilgi.extmetadata?.LicenseShortName?.value ?? "?",
        yaratici: (bilgi.extmetadata?.Artist?.value ?? "?").replace(/<[^>]+>/g, "").trim(),
        kaynak: bilgi.descriptionurl,
      });
    }
    kaynakca[taban] = { sorgu, adaylar: inenler };
    const hataOzeti = gunluk.length ? `  (atlanan: ${gunluk.join(",")})` : "";
    console.log(`  [${sira}/${girdiler.length}] ${taban}: ${inenler.length} aday${hataOzeti}`);
  }

  await writeFile(kaynakcaYolu, JSON.stringify(kaynakca, null, 2));
  const eksik = Object.entries(kaynakca).filter(([, v]) => v.adaylar.length === 0);
  console.log(`\nBitti. EKSIK (${eksik.length}): ${eksik.map(([k]) => k).join(", ") || "yok"}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
