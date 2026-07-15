// Indirilen adaylari GOZLE dogrulamak icin kontak sayfasi (contact sheet) uretir.
// Kullanicinin acik sarti: "kolye urunu icin manzara resmi koyma" - eslesmeyi
// makine garanti edemez (arama motoru "green olives"e zeytin AGACI donduruyor),
// o yuzden her aday tek ekranda gorulup ELLE seciliyor. Secimler secim.js'e yazilir.
//
// kullanim: node kontak-sayfasi.js <gorsel-dizini> [havuz-alt-dizini]
//   ornek : node kontak-sayfasi.js ./gorseller adaylar-commons
// Uretilen HTML'leri tarayicida ac, begendigin adayin sol ustteki numarasini
// secim.js'e isle.

const { writeFile, readdir } = require("node:fs/promises");
const path = require("node:path");
const { TEZGAHLAR } = require("./katalog");

const HEDEF = process.argv[2];
const HAVUZ = process.argv[3] ?? "adaylar-commons";
if (!HEDEF) {
  console.error("kullanim: node kontak-sayfasi.js <gorsel-dizini> [havuz-alt-dizini]");
  process.exit(1);
}

const KACIS = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const kac = (s) => String(s).replace(/[&<>"]/g, (c) => KACIS[c]);

async function main() {
  const adayDizin = path.join(HEDEF, HAVUZ);

  // Gruplar: once tum tezgah fotograflari, sonra kategori kategori urunler.
  const gruplar = new Map();
  gruplar.set("00-tezgahlar", []);
  for (const t of TEZGAHLAR) {
    gruplar.get("00-tezgahlar").push({
      taban: t.dosya.replace(/\.[a-z]+$/, ""),
      etiket: t.magazaAd,
      altEtiket: `tezgah fotografi — arama: ${t.foto}`,
    });
    const grupAdi = t.kategori;
    if (!gruplar.has(grupAdi)) gruplar.set(grupAdi, []);
    for (const u of t.urunler) {
      gruplar.get(grupAdi).push({
        taban: u.dosya.replace(/\.[a-z]+$/, ""),
        etiket: u.baslik,
        altEtiket: `${t.magazaAd} — arama: ${u.foto}`,
      });
    }
  }

  const uretilen = [];
  let grupSira = 0;
  for (const [grupAdi, ogeler] of gruplar) {
    grupSira++;
    const satirlar = [];
    for (const oge of ogeler) {
      const ogeDizin = path.join(adayDizin, oge.taban);
      let adaylar = [];
      try {
        adaylar = (await readdir(ogeDizin)).filter((d) => /^\d+\.(jpg|png|webp|gif)$/.test(d)).sort();
      } catch {
        adaylar = [];
      }
      const kartlar = adaylar
        .map((a) => {
          const rel = `${HAVUZ}/${oge.taban}/${a}`;
          const no = a.split(".")[0];
          return `<figure class="aday"><img src="${kac(rel)}" alt=""><figcaption>${kac(no)}</figcaption></figure>`;
        })
        .join("");
      satirlar.push(
        `<section class="satir">
           <div class="bilgi"><h3>${kac(oge.etiket)}</h3><p>${kac(oge.altEtiket)}</p><code>${kac(oge.taban)}</code></div>
           <div class="adaylar">${kartlar || '<em class="yok">aday yok</em>'}</div>
         </section>`,
      );
    }

    const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>${kac(grupAdi)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; background: #fafafa; color: #171717; }
  h1 { font-size: 20px; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #F0517E; }
  .satir { display: flex; gap: 16px; align-items: center; background: #fff; border: 1px solid #e5e5e5;
           border-radius: 8px; padding: 10px; margin-bottom: 10px; }
  .bilgi { width: 260px; flex: none; }
  .bilgi h3 { margin: 0 0 4px; font-size: 14px; }
  .bilgi p { margin: 0 0 4px; font-size: 11px; color: #737373; }
  .bilgi code { font-size: 10px; color: #a3a3a3; }
  .adaylar { display: flex; gap: 10px; }
  .aday { margin: 0; position: relative; }
  .aday img { width: 190px; height: 190px; object-fit: cover; border-radius: 6px; background: #f5f5f5; display: block; }
  .aday figcaption { position: absolute; top: 4px; left: 4px; background: #F0517E; color: #fff;
                     font-size: 12px; font-weight: 700; width: 20px; height: 20px; border-radius: 4px;
                     display: flex; align-items: center; justify-content: center; }
  .yok { color: #dc2626; font-size: 13px; }
</style></head>
<body><h1>${kac(grupAdi)} (${ogeler.length} öge)</h1>${satirlar.join("")}</body></html>`;

    const dosyaAdi = `kontak-${String(grupSira).padStart(2, "0")}-${grupAdi.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9]+/g, "-")}.html`;
    await writeFile(path.join(HEDEF, dosyaAdi), html);
    uretilen.push(dosyaAdi);
  }
  console.log(uretilen.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
