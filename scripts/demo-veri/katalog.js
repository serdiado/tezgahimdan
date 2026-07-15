// Pilot oncesi DEMO katalogu (2026-07-15). Sadece YEREL dev DB icin - prod'a
// tasinmasi ayri bir karar (bkz. scripts/demo-veri/README.md).
//
// Her tezgah bir kategoriye "ev sahipligi" yapar (kategori basina 2 tezgah);
// urunler o tezgahin kategorisinde kalir - boylece vitrinde kategori filtresi
// gercek bir sonuc dondurur. `foto` alani Openverse arama terimidir, indirme
// script'i (indir.js) bunu kullanir; `dosya` indirilen gorselin sabit adi.

// Not: telefon numaralari 555 555 XX XX bloğundan - Turkiye'de operatore
// tahsis edilmemis test araligi, gercek kimseye denk gelmez.

const TEZGAHLAR = [
  // ---------------------------------------------------------------- Mutfaktan
  {
    kategori: "Mutfaktan",
    saticiAd: "Ayşe Yıldırım",
    email: "ayse.yildirim@demo.tezgahimdan.com",
    telefon: "+905555550101",
    magazaAd: "Ayşe Teyzenin Mutfağı",
    slug: "ayse-teyzenin-mutfagi",
    aciklama:
      "Kırk yıldır Seferihisar'da yaşıyorum, mutfağımda ne varsa hepsi kendi bahçemden. Reçellerimi şekeri az, meyvesi bol yaparım. Kavanozları geri getirene indirim var, boşuna çöpe gitmesin.",
    whatsappNo: "+905555550101",
    tezgahBilgisi: "12 numaralı tezgah, girişten sağda ilk sıra",
    instagramUrl: "https://instagram.com/ayseteyzeninmutfagi",
    foto: "homemade jam jars kitchen",
    dosya: "tezgah-ayse.jpg",
    urunler: [
      {
        baslik: "Mandalina Reçeli (450 g)",
        aciklama:
          "Seferihisar mandalinasından, kabuğu rendelenmiş, şekeri az. Sabah kahvaltısında ekmeğin üstüne sürülünce çocuklar bayılıyor. Cam kavanozda, kapağı vakumlu.",
        fiyat: 120,
        stok: 6,
        foto: "tangerine marmalade jar",
        dosya: "urun-mandalina-receli.jpg",
      },
      {
        baslik: "Ev Yapımı Tarhana (1 kg)",
        aciklama:
          "Domates, biber, soğan ve naneyi kendi bahçemden topluyorum. Güneşte kuruttum, elimle ufaladım. Bir kaşığı bir kişilik çorba eder, kışın vazgeçilmezimiz.",
        fiyat: 180,
        stok: 4,
        foto: "dried tarhana soup powder bowl",
        dosya: "urun-tarhana.jpg",
      },
      {
        baslik: "Kuru Domates (250 g)",
        aciklama:
          "Ağustos güneşinde kuruttuğum salkım domateslerden. Zeytinyağı ve kekikle kavanozlanabilir, makarnaya da çok yakışıyor.",
        fiyat: 95,
        stok: 5,
        foto: "sun dried tomatoes",
        dosya: "urun-kuru-domates.jpg",
      },
    ],
  },
  {
    kategori: "Mutfaktan",
    saticiAd: "Hatice Demirel",
    email: "hatice.demirel@demo.tezgahimdan.com",
    telefon: "+905555550102",
    magazaAd: "Sığacık Kileri",
    slug: "sigacik-kileri",
    aciklama:
      "Sığacık'ta küçük bir zeytinliğimiz var, eşimle birlikte işletiyoruz. Zeytini de zeytinyağını da kendi elimizle hazırlıyoruz, aracı yok. Tadına bakmadan almayın, tezgahta ikram ediyoruz.",
    whatsappNo: "+905555550102",
    tezgahBilgisi: "5 numaralı tezgah, çeşmenin karşısı",
    facebookUrl: "https://facebook.com/sigacikkileri",
    foto: "olive oil bottle rustic",
    dosya: "tezgah-hatice.jpg",
    urunler: [
      {
        baslik: "Soğuk Sıkım Zeytinyağı (1 L)",
        aciklama:
          "Erken hasat, soğuk sıkım. Asitliği düşük, boğazı hafif yakar — iyi zeytinyağının işareti budur. Koyu renk şişede, ışık görmesin diye.",
        fiyat: 450,
        stok: 8,
        foto: "olive oil bottle pouring",
        dosya: "urun-zeytinyagi.jpg",
      },
      {
        baslik: "Kırma Yeşil Zeytin (500 g)",
        aciklama:
          "Taşla kırılmış, limon ve sarımsakla kırk gün suda beklemiş. Tuzu ölçülü, kahvaltıda tek başına yenir.",
        fiyat: 140,
        stok: 6,
        foto: "green olives bowl",
        dosya: "urun-yesil-zeytin.jpg",
      },
      {
        baslik: "Zeytinyağlı Ot Kurabiyesi (300 g)",
        aciklama:
          "Tereyağı yok, tamamen kendi zeytinyağımızla. İçinde dereotu, maydanoz ve biraz kekik var. Çayın yanına birebir.",
        fiyat: 85,
        stok: 10,
        foto: "savory herb cookies biscuits",
        dosya: "urun-ot-kurabiyesi.jpg",
      },
    ],
  },

  // ---------------------------------------------------------------- El Emeği
  {
    kategori: "El Emeği",
    saticiAd: "Nazlı Aksoy",
    email: "nazli.aksoy@demo.tezgahimdan.com",
    telefon: "+905555550201",
    magazaAd: "Nazlı'nın İğne Oyası",
    slug: "nazlinin-igne-oyasi",
    aciklama:
      "İğne oyasını anneannemden öğrendim, otuz yıldır bırakmadım. Bir oyalı yazma iki haftamı alıyor, o yüzden çok sayıda yapamıyorum. Renk seçimi için bana yazın, isteğinize göre örebilirim.",
    whatsappNo: "+905555550201",
    tezgahBilgisi: "A Blok 3, kadın el emeği bölümünün başında",
    instagramUrl: "https://instagram.com/nazlininignesi",
    foto: "turkish needle lace oya handmade",
    dosya: "tezgah-nazli.jpg",
    urunler: [
      {
        baslik: "İğne Oyalı Yazma",
        aciklama:
          "Kenarları tamamen iğne oyası, ipek ipliktendir. Yaklaşık iki haftada bitiyor. Yıkarken elde, soğuk suda yıkayın, oyası bozulmasın.",
        fiyat: 650,
        stok: 2,
        foto: "turkish oya lace scarf edge",
        dosya: "urun-oyali-yazma.jpg",
      },
      {
        baslik: "Dantel Sehpa Örtüsü",
        aciklama:
          "Tığ işi, 60 cm çapında. Beyaz pamuk ipliği. Kolalanınca daha dik durur, isterseniz kolalı teslim edebilirim.",
        fiyat: 380,
        stok: 3,
        foto: "crochet doily lace white",
        dosya: "urun-dantel-ortu.jpg",
      },
      {
        baslik: "Amigurumi Ahtapot",
        aciklama:
          "Bebekler için, gözleri de örgü — plastik parça yok, yutma riski olmasın diye. Makinede yıkanabilir.",
        fiyat: 220,
        stok: 5,
        foto: "amigurumi crochet octopus toy",
        dosya: "urun-amigurumi.jpg",
      },
    ],
  },
  {
    kategori: "El Emeği",
    saticiAd: "Sevgi Korkmaz",
    email: "sevgi.korkmaz@demo.tezgahimdan.com",
    telefon: "+905555550202",
    magazaAd: "Düğüm Düğüm Atölye",
    slug: "dugum-dugum-atolye",
    aciklama:
      "Makrome ve keçe işleri yapıyorum. Kızım üniversitede tasarım okuyor, desenleri birlikte çiziyoruz. İpler doğal pamuk, boyasız.",
    whatsappNo: "+905555550202",
    tezgahBilgisi: "A Blok 4",
    instagramUrl: "https://instagram.com/dugumdugumatolye",
    tiktokUrl: "https://tiktok.com/@dugumdugum",
    foto: "macrame wall hanging handmade",
    dosya: "tezgah-sevgi.jpg",
    urunler: [
      {
        baslik: "Makrome Duvar Süsü (Büyük)",
        aciklama:
          "80 cm boyunda, doğal pamuk ip, boyasız. Askı çubuğu ıhlamur dalından. Salon duvarına ya da yatak başına yakışır.",
        fiyat: 540,
        stok: 2,
        foto: "macrame wall hanging cotton",
        dosya: "urun-makrome-duvar.jpg",
      },
      {
        baslik: "Keçe Bardak Altlığı (6'lı)",
        aciklama:
          "Yün keçeden elde kesildi, kenarları elde dikildi. Altı 6 farklı renk. Sıcak bardak iz bırakmaz.",
        fiyat: 160,
        stok: 7,
        foto: "felt coasters wool colorful",
        dosya: "urun-kece-altlik.jpg",
      },
    ],
  },

  // ------------------------------------------------------------- Giyim Kuşam
  {
    kategori: "Giyim Kuşam",
    saticiAd: "Fatma Şahin",
    email: "fatma.sahin@demo.tezgahimdan.com",
    telefon: "+905555550301",
    magazaAd: "Örgü Sepeti",
    slug: "orgu-sepeti",
    aciklama:
      "Şiş örgü benim için dinlenmek gibi, akşamları televizyon karşısında örüyorum. Yünlerimi Ödemiş'ten alıyorum, hepsi doğal. Beden konusunda çekinmeyin, ölçünüzü söyleyin ayarlarım.",
    whatsappNo: "+905555550301",
    tezgahBilgisi: "18 numaralı tezgah",
    foto: "knitted wool sweater handmade",
    dosya: "tezgah-fatma.jpg",
    urunler: [
      {
        baslik: "El Örgüsü Yün Hırka (M)",
        aciklama:
          "Saf yün, doğal krem rengi, boyasız. Düğmeleri ahşap. Elde yıkanmalı, asılmadan düz kurutulmalı yoksa uzar.",
        fiyat: 890,
        stok: 1,
        foto: "hand knitted wool cardigan",
        dosya: "urun-yun-hirka.jpg",
      },
      {
        baslik: "Yün Atkı",
        aciklama:
          "180 cm uzunluk, çift taraflı örgü — ters yüzü de düzgün görünür. Boynu kaşındırmaz, yumuşak yün seçtim.",
        fiyat: 320,
        stok: 4,
        foto: "knitted wool scarf",
        dosya: "urun-yun-atki.jpg",
      },
      {
        baslik: "Bebek Patiği (0-6 ay)",
        aciklama:
          "Bebek yünü, tüy bırakmaz. Bağcığı yok, ayaktan düşmesin diye lastikli ördüm. Makinede 30 derecede yıkanır.",
        fiyat: 130,
        stok: 8,
        foto: "knitted baby booties",
        dosya: "urun-bebek-patik.jpg",
      },
    ],
  },
  {
    kategori: "Giyim Kuşam",
    saticiAd: "Elif Doğan",
    email: "elif.dogan@demo.tezgahimdan.com",
    telefon: "+905555550302",
    magazaAd: "Minik Adımlar",
    slug: "minik-adimlar",
    aciklama:
      "İki çocuk annesiyim, kendi çocuklarıma diktiğim şeyleri beğenen arkadaşlarım ısrar edince bu işe başladım. Sadece pamuklu kumaş kullanıyorum, bebek tenine sentetik gelmesin.",
    whatsappNo: "+905555550302",
    tezgahBilgisi: "19 numaralı tezgah, Örgü Sepeti'nin yanı",
    instagramUrl: "https://instagram.com/minikadimlar.seferihisar",
    foto: "baby clothes cotton handmade",
    dosya: "tezgah-elif.jpg",
    urunler: [
      {
        baslik: "Pamuklu Bebek Zıbını (3-6 ay)",
        aciklama:
          "%100 pamuk, çıtçıtlı. Dikişleri dışarıda değil içeride kalacak şekilde diktim, bebeği rahatsız etmesin.",
        fiyat: 180,
        stok: 6,
        foto: "baby onesie cotton white",
        dosya: "urun-bebek-zibin.jpg",
      },
      {
        baslik: "Çocuk Mutfak Önlüğü",
        aciklama:
          "3-7 yaş arası. Boyun askısı ayarlanabilir, çocuk büyüdükçe uzuyor. Yıkamada rengi solmaz.",
        fiyat: 210,
        stok: 5,
        foto: "child apron cotton",
        dosya: "urun-cocuk-onluk.jpg",
      },
    ],
  },

  // ---------------------------------------------------------- Takı & Aksesuar
  {
    kategori: "Takı & Aksesuar",
    saticiAd: "Zeynep Arslan",
    email: "zeynep.arslan@demo.tezgahimdan.com",
    telefon: "+905555550401",
    magazaAd: "Zeytin Dalı Takı",
    slug: "zeytin-dali-taki",
    aciklama:
      "Zeytin ağacının budanan dallarını atmaya kıyamadım, takıya çevirmeye başladım. Her parçanın deseni farklı, çünkü her dalın deseni farklı. Ahşabı zeytinyağıyla besliyorum, cila kullanmıyorum.",
    whatsappNo: "+905555550401",
    tezgahBilgisi: "7 numaralı tezgah",
    instagramUrl: "https://instagram.com/zeytindalitaki",
    foto: "olive wood jewelry handmade",
    dosya: "tezgah-zeynep.jpg",
    urunler: [
      {
        baslik: "Zeytin Ağacı Kolye",
        aciklama:
          "Zeytin dalından elde oyuldu, deri kordon. Ahşabın damarı her parçada farklı — fotoğraftakiyle birebir aynı desen olmayabilir, doğal ürün.",
        fiyat: 280,
        stok: 4,
        foto: "wooden pendant necklace handmade",
        dosya: "urun-zeytin-kolye.jpg",
      },
      {
        baslik: "Ahşap Küpe",
        aciklama:
          "Hafif, kulağı yormaz. Çengeli çelik, alerji yapmaz. Suya sokmayın, ahşap kabarır.",
        fiyat: 190,
        stok: 6,
        foto: "wooden earrings handmade",
        dosya: "urun-ahsap-kupe.jpg",
      },
      {
        baslik: "Zeytin Çekirdeği Tespih",
        aciklama:
          "33'lük, zeytin çekirdeğinden. Elde delindi, iple geçirildi. Kullandıkça parlıyor.",
        fiyat: 240,
        stok: 3,
        foto: "prayer beads wooden tasbih",
        dosya: "urun-tespih.jpg",
      },
    ],
  },
  {
    kategori: "Takı & Aksesuar",
    saticiAd: "Meryem Çelik",
    email: "meryem.celik@demo.tezgahimdan.com",
    telefon: "+905555550402",
    magazaAd: "Boncuk Boncuk",
    slug: "boncuk-boncuk",
    aciklama:
      "Boncuk işi ve telkari yapıyorum. Gözlerim eskisi kadar iyi görmüyor ama elim alışkın. İsme özel bileklik de yapıyorum, tezgahta söyleyin haftaya hazır olsun.",
    whatsappNo: "+905555550402",
    tezgahBilgisi: "8 numaralı tezgah",
    foto: "beaded jewelry handmade craft",
    dosya: "tezgah-meryem.jpg",
    urunler: [
      {
        baslik: "Nazar Boncuklu Bileklik",
        aciklama:
          "El yapımı cam nazar boncuğu, ayarlanabilir ip. Her bileğe uyar, çocuk da takabilir.",
        fiyat: 110,
        stok: 12,
        foto: "evil eye bead bracelet",
        dosya: "urun-nazar-bileklik.jpg",
      },
      {
        baslik: "Boncuk İşi Kolye",
        aciklama:
          "Miyuki boncuk, elde dokundu. Yaklaşık üç günde bitiyor. Kapağı çelik.",
        fiyat: 340,
        stok: 3,
        foto: "beaded necklace handmade colorful",
        dosya: "urun-boncuk-kolye.jpg",
      },
    ],
  },

  // -------------------------------------------------------- Bakım & Kozmetik
  {
    kategori: "Bakım & Kozmetik",
    saticiAd: "Gülten Yalçın",
    email: "gulten.yalcin@demo.tezgahimdan.com",
    telefon: "+905555550501",
    magazaAd: "Sabun Kokusu",
    slug: "sabun-kokusu",
    aciklama:
      "Soğuk usul sabun yapıyorum, her kalıp altı hafta dinleniyor — o yüzden aceleye gelmiyor. Palm yağı kullanmıyorum, zeytinyağı ve hindistancevizi yağı yeter. Hassas ciltler için kokusuzunu da yapıyorum.",
    whatsappNo: "+905555550501",
    tezgahBilgisi: "22 numaralı tezgah, çıkışa yakın",
    instagramUrl: "https://instagram.com/sabunkokusu.atolye",
    foto: "handmade soap bars natural",
    dosya: "tezgah-gulten.jpg",
    urunler: [
      {
        baslik: "Zeytinyağlı Sabun (120 g)",
        aciklama:
          "Sadece zeytinyağı, su ve kül suyu. Altı hafta dinlendi. Kokusuz — bebek ve hassas cilt için uygun.",
        fiyat: 90,
        stok: 15,
        foto: "olive oil soap bar",
        dosya: "urun-zeytinyagli-sabun.jpg",
      },
      {
        baslik: "Lavantalı Sabun (120 g)",
        aciklama:
          "Kendi bahçemin lavantasından, uçucu yağı içine kattım. Kokusu sentetik değil, o yüzden zamanla hafifler.",
        fiyat: 100,
        stok: 12,
        foto: "lavender soap bar handmade",
        dosya: "urun-lavanta-sabun.jpg",
      },
      {
        baslik: "Kil Maskesi (100 g)",
        aciklama:
          "Yeşil kil, toz halinde. Suyla karıştırıp yüze sürülür, 10 dakika bekletilir. Yağlı ciltler için.",
        fiyat: 130,
        stok: 8,
        foto: "green clay face mask powder",
        dosya: "urun-kil-maskesi.jpg",
      },
    ],
  },
  {
    kategori: "Bakım & Kozmetik",
    saticiAd: "Emine Kaya",
    email: "emine.kaya@demo.tezgahimdan.com",
    telefon: "+905555550502",
    magazaAd: "Lavanta Bahçesi",
    slug: "lavanta-bahcesi",
    aciklama:
      "Evimizin arkasındaki tarlada lavanta ve biberiye yetiştiriyorum. Kurutup poşetliyorum, yağını da kendim çekiyorum. Kokusu için değil, faydası için kullanın diyorum.",
    whatsappNo: "+905555550502",
    tezgahBilgisi: "23 numaralı tezgah",
    instagramUrl: "https://instagram.com/lavantabahcesi.sef",
    facebookUrl: "https://facebook.com/lavantabahcesiseferihisar",
    foto: "lavender bunch dried flowers",
    dosya: "tezgah-emine.jpg",
    urunler: [
      {
        baslik: "Kuru Lavanta Demeti",
        aciklama:
          "Tarlamdan kesildi, gölgede kurutuldu. Dolaba koyarsanız güve gelmez. Kokusu bir yıl kadar durur.",
        fiyat: 75,
        stok: 14,
        foto: "dried lavender bouquet",
        dosya: "urun-kuru-lavanta.jpg",
      },
      {
        baslik: "Lavanta Kesesi (3'lü)",
        aciklama:
          "Pamuklu keseler, içi kuru lavanta dolu. Çamaşır dolabına, yastık altına. Kokusu azalınca keseyi ovalayın, canlanır.",
        fiyat: 95,
        stok: 10,
        foto: "lavender sachet bags fabric",
        dosya: "urun-lavanta-kese.jpg",
      },
      {
        baslik: "Biberiye Suyu (200 ml)",
        aciklama:
          "Taze biberiyeden damıtıldı, katkısız. Saç diplerine masajla uygulanır. Buzdolabında saklayın.",
        fiyat: 150,
        stok: 6,
        foto: "rosemary water bottle herbal",
        dosya: "urun-biberiye-suyu.jpg",
      },
    ],
  },

  // -------------------------------------------------------- Ev & Dekorasyon
  {
    kategori: "Ev & Dekorasyon",
    saticiAd: "Hüsniye Öztürk",
    email: "husniye.ozturk@demo.tezgahimdan.com",
    telefon: "+905555550601",
    magazaAd: "Toprak & Çamur",
    slug: "toprak-ve-camur",
    aciklama:
      "Çömlekçi çarkında çalışıyorum, her parça elle şekilleniyor — ikisi birebir aynı olmuyor, olmasını da istemiyorum. Sırlarım kurşunsuz, yemek kabında gönül rahatlığıyla kullanın.",
    whatsappNo: "+905555550601",
    tezgahBilgisi: "14 numaralı tezgah",
    instagramUrl: "https://instagram.com/toprakvecamur",
    foto: "handmade ceramic pottery bowls",
    dosya: "tezgah-husniye.jpg",
    urunler: [
      {
        baslik: "Seramik Kase (Orta Boy)",
        aciklama:
          "Çarkta çekildi, kurşunsuz sır. Bulaşık makinesinde yıkanır, mikrodalgaya girer. Çorba ve salata için ideal.",
        fiyat: 260,
        stok: 5,
        foto: "ceramic bowl handmade pottery",
        dosya: "urun-seramik-kase.jpg",
      },
      {
        baslik: "El Yapımı Kupa",
        aciklama:
          "300 ml. Kulbu ele oturacak şekilde şekillendirildi. Her kupanın rengi fırında biraz farklı çıkıyor.",
        fiyat: 190,
        stok: 8,
        foto: "handmade ceramic mug pottery",
        dosya: "urun-seramik-kupa.jpg",
      },
      {
        baslik: "Seramik Saksı (Küçük)",
        aciklama:
          "Sukulent ve kaktüs için, altı delikli. Tabağı dahil. Dışı sırsız bırakıldı, toprak nefes alsın.",
        fiyat: 140,
        stok: 9,
        foto: "small ceramic plant pot succulent",
        dosya: "urun-seramik-saksi.jpg",
      },
    ],
  },
  {
    kategori: "Ev & Dekorasyon",
    saticiAd: "Sultan Aydın",
    email: "sultan.aydin@demo.tezgahimdan.com",
    telefon: "+905555550602",
    magazaAd: "Mum Işığı Atölye",
    slug: "mum-isigi-atolye",
    aciklama:
      "Soya mumu döküyorum, parafin kullanmıyorum — is yapmıyor, içeriyi karartmıyor. Fitiller pamuk. Biten kavanozu getirin, yeniden dolduralım.",
    whatsappNo: "+905555550602",
    tezgahBilgisi: "15 numaralı tezgah",
    instagramUrl: "https://instagram.com/mumisigiatolye",
    tiktokUrl: "https://tiktok.com/@mumisigiatolye",
    foto: "handmade soy candles jars",
    dosya: "tezgah-sultan.jpg",
    urunler: [
      {
        baslik: "Soya Mumu - Bergamot (200 g)",
        aciklama:
          "Soya balmumu, pamuk fitil. Yaklaşık 40 saat yanar. İlk yakışta kenara kadar erimesini bekleyin, sonra düzgün yanar.",
        fiyat: 230,
        stok: 7,
        foto: "soy candle jar lit",
        dosya: "urun-soya-mumu.jpg",
      },
      {
        baslik: "Balmumu Mum (2'li)",
        aciklama:
          "Gerçek arı balmumundan, doğal bal kokulu. Katkı yok, boya yok. Yanarken hafif bal kokar.",
        fiyat: 180,
        stok: 6,
        foto: "beeswax candles natural",
        dosya: "urun-balmumu.jpg",
      },
    ],
  },

  // ------------------------------------------------------------------ Diğer
  {
    kategori: "Diğer",
    saticiAd: "Hacer Polat",
    email: "hacer.polat@demo.tezgahimdan.com",
    telefon: "+905555550701",
    magazaAd: "Tohum Sepeti",
    slug: "tohum-sepeti",
    aciklama:
      "Atalık tohum saklıyorum, ata mirası çeşitler kaybolmasın diye. Sattığım tohumun hepsi kendi bahçemde ürün vermiş, denenmiş. Nasıl ekileceğini tezgahta anlatıyorum, çekinmeyin sorun.",
    whatsappNo: "+905555550701",
    tezgahBilgisi: "30 numaralı tezgah, en sondaki sıra",
    foto: "seed packets garden heirloom",
    dosya: "tezgah-hacer.jpg",
    urunler: [
      {
        baslik: "Atalık Domates Tohumu",
        aciklama:
          "Kendi bahçemden topladığım atalık çeşit. Bir pakette yaklaşık 30 tohum. Şubat-mart'ta fideliğe ekilir. Ekim tarifi paketin arkasında.",
        fiyat: 60,
        stok: 20,
        foto: "tomato seeds packet",
        dosya: "urun-domates-tohumu.jpg",
      },
      {
        baslik: "Fesleğen Fidesi",
        aciklama:
          "Saksıda köklenmiş, hemen balkona çıkabilir. Suyunu sevmez, toprağı kuruyunca sulayın. Kokusu sivrisineği uzak tutar.",
        fiyat: 45,
        stok: 15,
        foto: "basil seedling pot plant",
        dosya: "urun-feslegen-fidesi.jpg",
      },
      {
        baslik: "Kuru Kekik (100 g)",
        aciklama:
          "Dağdan toplandı, gölgede kurutuldu. Sapı ayıklandı, sadece yaprak. Kokusunu koklayın, farkı anlarsınız.",
        fiyat: 70,
        stok: 11,
        foto: "dried oregano thyme herbs",
        dosya: "urun-kuru-kekik.jpg",
      },
    ],
  },
  {
    kategori: "Diğer",
    saticiAd: "Şerife Ünal",
    email: "serife.unal@demo.tezgahimdan.com",
    telefon: "+905555550702",
    magazaAd: "Sepet & Hasır",
    slug: "sepet-ve-hasir",
    aciklama:
      "Hasır örmeyi babamdan öğrendim, o da dedemden. Bu iş artık pek kalmadı, öğretmeye de hazırım — merak eden gelsin. Sazlarımı kendim kesiyorum, kurutması bir ay sürüyor.",
    whatsappNo: "+905555550702",
    tezgahBilgisi: "31 numaralı tezgah",
    facebookUrl: "https://facebook.com/sepetvehasir",
    foto: "wicker basket handmade weaving",
    dosya: "tezgah-serife.jpg",
    urunler: [
      {
        baslik: "Hasır Pazar Sepeti",
        aciklama:
          "Doğal saz, elde örüldü. Kulpları deri. Pazara giderken poşete gerek kalmıyor, 10 kilo kaldırır.",
        fiyat: 420,
        stok: 4,
        foto: "wicker shopping basket handles",
        dosya: "urun-hasir-sepet.jpg",
      },
      {
        baslik: "Hasır Ekmek Sepeti",
        aciklama:
          "Sofra için, yuvarlak. İçine bez serilir. Nemli yerde bırakmayın, saz küflenir.",
        fiyat: 160,
        stok: 7,
        foto: "wicker bread basket round",
        dosya: "urun-ekmek-sepeti.jpg",
      },
    ],
  },
];

// Demo alicilar - rezervasyon/degerlendirme gecmisi bunlara baglanir. Telefon =
// alici kimligi (PLAN.md SS5), ama panele girebilmeleri icin email+sifre de var.
const ALICILAR = [
  { ad: "Merve Şen", email: "merve.sen@demo.tezgahimdan.com", telefon: "+905555559001" },
  { ad: "Deniz Kılıç", email: "deniz.kilic@demo.tezgahimdan.com", telefon: "+905555559002" },
  { ad: "Burcu Taş", email: "burcu.tas@demo.tezgahimdan.com", telefon: "+905555559003" },
  { ad: "Ali Rıza Güneş", email: "ali.gunes@demo.tezgahimdan.com", telefon: "+905555559004" },
  { ad: "Selin Barut", email: "selin.barut@demo.tezgahimdan.com", telefon: "+905555559005" },
  { ad: "Onur Ateş", email: "onur.ates@demo.tezgahimdan.com", telefon: "+905555559006" },
  { ad: "Pınar Yavuz", email: "pinar.yavuz@demo.tezgahimdan.com", telefon: "+905555559007" },
  { ad: "Kerem Tunç", email: "kerem.tunc@demo.tezgahimdan.com", telefon: "+905555559008" },
  { ad: "Ceren Akın", email: "ceren.akin@demo.tezgahimdan.com", telefon: "+905555559009" },
  { ad: "Mustafa Er", email: "mustafa.er@demo.tezgahimdan.com", telefon: "+905555559010" },
];

module.exports = { TEZGAHLAR, ALICILAR };
