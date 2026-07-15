// secim.js'teki gozle dogrulanmis adaylari, gecici scratchpad havuzundan
// projedeki kalici "varsayilan" klasorune kopyalar. Scratchpad oturumla birlikte
// yok olur; seed'in calismaya devam etmesi icin secilenler projede durmali.
//
// kullanim: node secimleri-kopyala.js <scratchpad-gorsel-dizini>

const { readdir, mkdir, copyFile, writeFile, readFile } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const path = require("node:path");
const { SECIMLER } = require("./secim");

const KAYNAK_KOK = process.argv[2];
if (!KAYNAK_KOK) {
  console.error("kullanim: node secimleri-kopyala.js <scratchpad-gorsel-dizini>");
  process.exit(1);
}

const HEDEF = path.join(__dirname, "fotograflar", "varsayilan");

async function main() {
  await mkdir(HEDEF, { recursive: true });
  const kaynakca = existsSync(path.join(KAYNAK_KOK, "kaynakca-commons.json"))
    ? JSON.parse(await readFile(path.join(KAYNAK_KOK, "kaynakca-commons.json"), "utf8"))
    : {};

  const atif = {};
  let kopyalanan = 0;
  const hatalar = [];

  for (const [hedefTaban, { havuz, aday }] of Object.entries(SECIMLER)) {
    const havuzDizin = path.join(KAYNAK_KOK, "adaylar-commons", havuz);
    let dosyalar;
    try {
      dosyalar = (await readdir(havuzDizin)).filter((d) => /^\d+\.(jpg|png|webp|gif)$/.test(d)).sort();
    } catch {
      hatalar.push(`${hedefTaban}: havuz dizini yok (${havuz})`);
      continue;
    }
    const secilen = dosyalar.find((d) => d.startsWith(`${aday}.`));
    if (!secilen) {
      hatalar.push(`${hedefTaban}: ${havuz} havuzunda ${aday} numarali aday yok`);
      continue;
    }
    const uzanti = secilen.split(".").pop();
    await copyFile(path.join(havuzDizin, secilen), path.join(HEDEF, `${hedefTaban}.${uzanti}`));
    kopyalanan++;

    // Atif kaydi: Commons gorsellerinin cogu CC-BY-SA - yerel demo icin bile
    // kaynagi kayit altinda tut (ileride prod'a tasima karari verilirse gerekli).
    const bilgi = kaynakca[havuz]?.adaylar?.find((a) => a.aday === secilen);
    if (bilgi) {
      atif[`${hedefTaban}.${uzanti}`] = {
        commonsBaslik: bilgi.baslik,
        lisans: bilgi.lisans,
        yaratici: bilgi.yaratici,
        kaynak: bilgi.kaynak,
      };
    }
  }

  await writeFile(path.join(HEDEF, "ATIF.json"), JSON.stringify(atif, null, 2));
  console.log(`${kopyalanan}/${Object.keys(SECIMLER).length} secim kopyalandi -> ${HEDEF}`);
  if (hatalar.length) {
    console.log("\nHATALAR:");
    hatalar.forEach((h) => console.log("  -", h));
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
