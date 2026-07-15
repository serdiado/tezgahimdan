// Demo degerlendirme yorumlari. Kategori bazli havuz - urun-seviyesi yorumlar
// urunun kendisinden, magaza-seviyesi yorumlar SATICIDAN bahseder (ikisi ayri
// tablo, ayri soru: "urun nasil" vs "saticiyla alisveris nasil").
//
// Ton: hedef kitle teknolojiyle cok hasir nesir olmayan yerel alicilar - yorumlar
// da oyle, kisa ve gunluk dille. Hepsi olumlu degil (3 yildizlilar da var), aksi
// halde puanlar inandirici olmaz.

// puan -> o puana yakisan yorumlar. Kategori anahtari katalogdaki kategori adiyla ayni.
const URUN_YORUMLARI = {
  Mutfaktan: [
    { puan: 5, yorum: "Tadı tam çocukluğumdaki gibi. Kavanozu açar açmaz kokusu mutfağı sardı." },
    { puan: 5, yorum: "Şekeri az olması çok iyi olmuş, meyvenin tadı bastırılmamış. Haftaya yine alacağım." },
    { puan: 4, yorum: "Lezzeti güzel, elimize sağlık. Kavanoz biraz küçük geldi ama fiyatına göre uygun." },
    { puan: 5, yorum: "Marketten aldıklarımızla kıyaslanmaz. Ev yapımı olduğu ilk kaşıkta belli oluyor." },
    { puan: 4, yorum: "Ailece beğendik. Bir dahakine iki tane alayım dedim, çabuk bitti." },
    { puan: 3, yorum: "Ürün güzel de bana biraz tuzlu geldi. Yine de taze olduğu belli, teşekkürler." },
  ],
  "El Emeği": [
    { puan: 5, yorum: "Emeğe sağlık, işçiliği çok temiz. Fotoğrafta göründüğünden daha güzel." },
    { puan: 5, yorum: "Elde yapıldığı her ilmeğinden belli. Anneme hediye ettim, çok sevindi." },
    { puan: 4, yorum: "Çok güzel olmuş. Rengini biraz daha açık bekliyordum ama yine de memnunum." },
    { puan: 5, yorum: "Bu işi bilen birinin elinden çıktığı belli. Sabır işi, helal olsun." },
    { puan: 4, yorum: "Kaliteli. Salonumuza çok yakıştı, gelen herkes nereden aldığımızı soruyor." },
  ],
  "Giyim Kuşam": [
    { puan: 5, yorum: "Yünü hiç kaşındırmıyor, çocuk memnuniyetle giyiyor. Dikişleri de sağlam." },
    { puan: 5, yorum: "Bedeni tam oldu. Ölçü sorduğunda boşuna sormuyormuş, tam otur' dedi öyle oldu." },
    { puan: 4, yorum: "Güzel örülmüş, sıcacık. Yıkamada biraz çekti ama şeklini korudu." },
    { puan: 4, yorum: "Bebeğime aldım, pamuklu olması çok iyi. Teni hassas, hiç sorun olmadı." },
    { puan: 3, yorum: "İşçilik iyi ama rengi fotoğraftakinden farklıydı. Yine de kullanıyoruz." },
  ],
  "Takı & Aksesuar": [
    { puan: 5, yorum: "Hafif, kulağımı hiç yormuyor. Her gün takıyorum, kimse el yapımı olduğuna inanmıyor." },
    { puan: 5, yorum: "Deseni gerçekten her parçada farklıymış, kendi seçtiğimi aldım. Çok memnunum." },
    { puan: 4, yorum: "Şık durdu. Kordonu biraz uzun geldi, kendim kısalttım, sorun değil." },
    { puan: 5, yorum: "Hediye paketi bile elden yapılmıştı. Bu incelik ayrı güzel." },
    { puan: 4, yorum: "Güzel iş. Fiyatı biraz yüksek gibi ama emeği düşününce hakkını veriyorum." },
  ],
  "Bakım & Kozmetik": [
    { puan: 5, yorum: "Cildimi hiç kurutmadı. Market sabunlarından sonra fark inanılmaz." },
    { puan: 5, yorum: "Kokusu doğal, başımı ağrıtmıyor. Hassas ciltli kızım da rahatlıkla kullanıyor." },
    { puan: 4, yorum: "Güzel ürün, uzun süre dayandı. Kokusu zamanla azaldı ama zaten doğal olduğu için normalmiş." },
    { puan: 5, yorum: "Kendi bahçesinden topladığını söylemişti, kokusundan belli oluyor." },
    { puan: 3, yorum: "İyi ama beklediğim kadar köpürmedi. Satıcı zaten öyle olacağını söylemişti, haklıymış." },
  ],
  "Ev & Dekorasyon": [
    { puan: 5, yorum: "Elimize tam oturuyor, her sabah çayı bununla içiyorum. Fırında rengi farklı çıkmış, daha güzel olmuş." },
    { puan: 5, yorum: "İs yapmıyor gerçekten, duvarı karartmadı. Kokusu da ağır değil." },
    { puan: 4, yorum: "Güzel ve sağlam. Bulaşık makinesine koydum, hiçbir şey olmadı." },
    { puan: 4, yorum: "Sukulentim çok mutlu oldu. Altı delikli olması iyi düşünülmüş." },
    { puan: 5, yorum: "İki tane aldım, ikisi de birbirinden farklı. Elle yapıldığı için öyleymiş, hoşuma gitti." },
  ],
  Diğer: [
    { puan: 5, yorum: "Tohumların hepsi çıktı, tek bir tane bile boş çıkmadı. Ekim tarifi de çok işime yaradı." },
    { puan: 5, yorum: "Sepet çok sağlam, pazarda ağırlık taşıyor hiç esnemiyor. Poşetten kurtulduk." },
    { puan: 4, yorum: "Fide sapasağlam geldi, balkonda hemen tuttu. Suyunu sevmediğini söylemişti, doğruymuş." },
    { puan: 4, yorum: "Kekiğin kokusu bir başka. Dağdan toplandığı belli." },
    { puan: 5, yorum: "Nasıl ekeceğimi tezgahta tek tek anlattı. Bu ilgi için ayrıca teşekkürler." },
  ],
};

// Magaza-seviyesi: urunu degil SATICIYI/alisveris deneyimini anlatir.
const MAGAZA_YORUMLARI = [
  { puan: 5, yorum: "Tezgahını bulmak kolay, tarif ettiği gibiymiş. Ürünü ayırıp beklemiş, çok ilgili." },
  { puan: 5, yorum: "Rezervasyonu görür görmez WhatsApp'tan yazdı. Gittiğimde hazırdı, hiç beklemedim." },
  { puan: 5, yorum: "Güler yüzlü, işini seven bir insan. Sorduğum her şeyi sabırla anlattı." },
  { puan: 4, yorum: "Ürünleri güzel, alışveriş sorunsuzdu. Tezgahı biraz kalabalıktı, biraz bekledim." },
  { puan: 5, yorum: "İkinci alışverişim. Aynı özeni gördüm, bu yüzden takibe aldım." },
  { puan: 4, yorum: "Memnun kaldık. Ürün açıklamasında ne yazıyorsa o çıkıyor, abartı yok." },
  { puan: 5, yorum: "Tadına baktırmadan satmıyor, bu güveni veriyor. Tavsiye ederim." },
  { puan: 5, yorum: "Pazara gidemediğim hafta haber verdi, ürünü haftaya sakladı. Ellerine sağlık." },
  { puan: 4, yorum: "İyi bir tezgah. Fiyatlar emeğe göre gayet makul." },
  { puan: 3, yorum: "Ürün güzeldi ama tezgahı geç kurmuş, biraz aradım. Kendisi de kusura bakma dedi." },
];

module.exports = { URUN_YORUMLARI, MAGAZA_YORUMLARI };
