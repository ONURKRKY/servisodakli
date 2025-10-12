const express = require("express");
const soap = require("soap");

//body-parser, bir Express.js eklentisidir (middleware).
// Görevi:
// İstemciden (örneğin tarayıcıdan veya başka bir API’den)
//  gelen request body içindeki veriyi JSON, text, ya da form formatında okuyup req.body içine koymak.
// Yani normalde Express, POST veya PUT isteklerinde gelen “body”’yi otomatik çözümlemez.
// body-parser bunu senin için yapar.
const bodyParser = require("body-parser");

const app = express();

// Bu middleware, tüm gelen isteklerin gövdesini (body) ham (raw) veri olarak alır,
// ve bunu req.body içine bir Buffer nesnesi olarak yerleştirir.
// bodyParser.raw()
// body-parser’ın “ham veri” yakalayıcısıdır.
// Veriyi string veya JSON olarak değil, binary (Buffer) olarak saklar.
// Bu, genelde şu tür isteklerde kullanılır:
// SOAP (XML body gönderir)
// Binary dosya yüklemeleri
// Özel protokoller (örneğin imzalanmış içerikler)
// bodyParser.json({ type: 'application/json' })
// derken sadece application/json türündeki istekleri işler.
// type: function() { return true; }
// dediğinde, bu fonksiyon her zaman true döndürür → yani:
// “Content-Type ne olursa olsun (JSON, XML, text vs), gelen body’yi raw olarak oku.”

app.use(
  bodyParser.raw({
    type: function () {
      return true;
    },
    limit: "5mb",
  })
);

// soap servisleri tanımlanıyor
//hiyeraji
// Service (InterestService)
//     └─ Port (InterestPort)
//          └─ Operation (CalculateInterest)
// InterestService: Servisin adı (örneğin bir bankanın faiz hesaplama servisi).
// InterestPort: Bu servisin bir giriş noktası veya “arayüzü”. SOAP’ta bir servis birden fazla port’a sahip olabilir.
// Örneğin, biri HTTP üzerinden, diğeri HTTPS üzerinden erişim için.
// CalculateInterest: Bu port’a ait işlem (operation). Yani fonksiyon veya metod.

const service = {
  InterestService: {
    InterestPort: {
      CalculateInterest: function (args) {
        
        // app.js den gelen değerler yakalandı
        const principal = args.principal;
        const totalAmount = args.totalAmount;

        //hesaplama yapılıyor
        const interest = totalAmount - principal;

        //değer javascipt objesi olarak dönüyor
        return { interest: interest };
      },
    },
  },
};


//readFileSync dosyayı okur.Dosya tamamen okunana kadar Node.js başka hiçbir iş yapamaz.

const xml=require("fs").readFileSync("interest.wsdl","utf-8");



// Express sunucusu 8000 portunda dinliyor.
// soap.listen ile /wsdl endpoint’i üzerinden SOAP servisi açılıyor.
// Artık istemciler http://localhost:8000/wsdl?wsdl adresinden WSDL dosyasını alabilir ve servis fonksiyonunu çağırabilir.
app.listen(8000,function () {


//   "/wsdl"
// SOAP servisini hangi URL yolundan ulaşılır hale getireceğin.
// Örnek: http://localhost:8000/wsdl → bu adrese gelen SOAP istekleri buraya yönlendirilir.
// ?wsdl eklenirse WSDL dosyası döndürülür: http://localhost:8000/wsdl?wsdl.
//Gelen SOAP isteklerini service nesnesine yönlendirir.,yukarıda oluşturuldu
//xml (WSDL) ile istemcilere servis sözleşmesini sunar.

  soap.listen(app,"/wsdl",service,xml);

  console.log("soap server 8000 portunda dinliyor");
  
})