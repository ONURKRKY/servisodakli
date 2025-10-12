const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const http = require("http");
const path = require("path");
const { error } = require("console");
const cors = require("cors");
const axios = require("axios");
const WebSocket = require("ws");
const { unescape } = require("querystring");
const { log } = require("@grpc/grpc-js/build/src/logging");

const app = express();

// expressin serverını değil kendi yaratattığımız server ı kullanacağız
const server = http.createServer(app);
///

///BURASI  WEBSOKET SERVER I
// Bir web sayfası hangi origin (kaynak) üzerinden yüklendiyse, sadece aynı origin’deki kaynaklara direkt erişebilir.
// Origin = Protokol + Domain + Port
// Örneğin:
// http://localhost:3000 → origin
// http://127.0.0.1:3000 → farklı origin (IP ≠ localhost)
// http://localhost:4000 → farklı origin (port ≠ 3000)
// https://localhost:3000 → farklı origin (https ≠ http)
// Bu yüzden bir sayfa başka bir domain/port/protokolden gelen veriye direkt erişemez.
// Tarayıcıların güvenlik kuralı olan “Same-Origin Policy” (Aynı Kaynak Politikası) yüzünden vardır.
// örnek olarak www.banka.com/hesap/.../$hesapno  eğer origin olmazsa başka kaynaklardan bizim backend talep atılabilirdi
// Diyelim ki banka siten https://banka.com adresinde.
// Sen yanlışlıkla http://kötüsitexyz.com sitesini açtın.
// Eğer same-origin policy olmasaydı, bu kötü site senin tarayıcından doğrudan https://banka.com/api/hesap çağırabilirdi.
//yani hesap bilgilerini başka siteye gönderirdi
// Bu yüzden tarayıcı diyor ki: “Sadece aynı origin’den gelen isteklere izin var, diğerlerine CORS onayı lazım.”
////
// app.use(cors()); Bu durumda tüm domain/port/protokoller istekte bulunabilir.geliştirme ortamında kullanılır
app.use(cors());

//daha önce http server oluşturmuştuk,aynı server ı websoket bağladık.
//zaten express ile değilde, http ile server yaratılmasının sebebi bu.
// Böylece tek port (3000) üzerinden hem HTTP hem WebSocket çalışıyor
const wss = new WebSocket.Server({ server });

// döviz kurunu almak için apiye istek atan fonksiyon
//Normal function ile tanımlanan fonksiyonlar tamamen hoist edilir,
// yani fonksiyon tanımı kodda aşağıda olsa bile üstte çağrılabilir:
// var ile tanımlanan değişkenler declaration kısmı hoist edilir ama değer ataması edilmez.
// let ve const ile tanımlanan değişkenler hoist edilmez (temporal dead zone hatası verir).
// Fonksiyonun asenkron olduğunu belirtir. Yani içinde await kullanabilirsin
// ve bu fonksiyon her zaman Promise döndürür.
async function getExchangeRate() {
  try {
    //axios.get(url)
    //Axios, HTTP isteği yapmak için kullanılan popüler bir kütüphanedir.
    //.get() metodu GET isteği atar ve bir Promise döndürür.
    const response = await axios.get("https://open.er-api.com/v6/latest/USD");
    // hepsi defined geldiyse
    if (
      response.data &&
      response.data.rates &&
      response.data.rates.TRY !== undefined
    ) {
      return response.data.rates.TRY;
    } else {
      console.error("API beklenen formatta dönmedi");
      return null;
    }
  } catch (error) {
    console.error("api istenen formatta gelmedi");

    //return null; olmasa
    // Hata veya API beklenen formatta değilse fonksiyon undefined döndürür.
    // undefined ile null arasında küçük fark vardır: null “bilerek boş”, undefined “değer yok”.
    return null;
  }
}

// websoket bağlantısı dinleniyor
//on("connection", callback) "connection" olayı, istemci WebSocket’e bağlandığında tetiklenir.
wss.on("connection", (ws) => {
  console.log("yeni dokey bağlantısı kuruldu");
  //istemciden gelen mesaj dinlenir getRate string olarak gönderilmişti
  ws.on("message", async (msg) => {
    //WebSocket üzerinden gelen mesaj (msg) genellikle Buffer veya binary formatında olabilir.
    if (msg.toString() === "getRate") {
      const rate = await getExchangeRate();

      //rate değişkeni truthy ise (yani null, undefined, 0 gibi değilse) bloğun içi çalışır.
      if (rate) {
        //JSON.stringify stringe gönderiyor, çünkü json gönderemeyiz, string olmalı
        //new Date().toLocaleString() JavaScript’te geçerli tarih ve saati,
        // kullanıcının yerel ayarlarına uygun bir formatta string olarak döndürmek için kullanılır.
        ws.send(JSON.stringify({ rate, date: new Date().toLocaleString() }));
      } else {
        ws.send(JSON.stringify({ err: "kur alınmadi" }));
      }
    }
  });
});

wss.on("close", () => {
  console.log("web soket bağlantısı kapandı");
});

//////BURASI GRPC SERVERI

//proto payment dosyasını javascripte dönüşütürüyor, paymentserver dosyasında aynısı tanımlandı
const packageDef = protoLoader.loadSync("payment.proto", {});

//javascript e dönüşütürlen proto dosyası ile grpc objesi oluşturuldu paymentserver dosyasında aynısı tanımlandı
const grpcObj = grpc.loadPackageDefinition(packageDef);

//proto dosyasında payment adında paket tanımlanmıştı, kullanılan değişkenlere ulaşacak paymentserver dosyasında aynısı tanımlandı
const paymentPackage = grpcObj.payment;

//Burada bir gRPC client nesnesi oluşturuluyor:
//bu client
const client = new paymentPackage.PaymentService(
  "localhost:50052",
  grpc.credentials.createInsecure()
);

// res.send("Merhaba") → direkt metin gönderir.
// res.json({ ad: "Onur" }) → JSON gönderir.
// res.sendFile("index.html") → dosyanın içeriğini gönderir.
//yani server(3000 portunda çalışıyor) ./.  talebi geldiğinde index.hetml dosyasını karşıya gönderir.

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

//Burada Express.js ile bir GET endpoint tanımlıyorsun.
//calculate adresine query parametreleri ile (URL’nin sonuna ?principal=...&interest=...&months=... şeklinde) istek atıldığında çalışacak.
app.get("/calculate", (req, res) => {
  const principal = Number(req.query.principal);
  const interest = Number(req.query.interest);
  const months = Number(req.query.months);

  // tüm değerler girilmediğinde cliente  hata mesajı atacak
  if (!principal || !interest || !months) {
    return res.status(400).json({ error: "tüm değerleri girin" });
  }

  //grpc servisine istek gönderiliyor, hata sönüşü error da, cevap responsa ile geliyor
  client.CalculatePayments({ principal, interest, months }, (err, response) => {
    // grpc tarafından error dönerse
    if (err) {
      console.error("grpc hatası", err);
      //frontend tarafına hata mesajı gönderiyor
      return res.json({ error: err.message });
    }

    //grpc den gelen mesajı consolda görmek için
    console.log("grpc in responsu:", response);

    // eğer dönen değerde ,yani response da(içinde array ve bir değer olacak) hata varsa
    if (!response || !response.payments) {
      //frontend tarafına hata mesajı gönderiyor, res ve red express istek ve cevap değerleri
      return res.json({ error: "ödeme tablosu alınamadı" });
    }

    //hiçbir sıkıntı yoksa frontend tarafına res mesajı gönderiyor
    //json nesnesi göndermek için res.json() kullanılır
    res.json(response);
  });
});

///////////soap hesaplama end pointi

app.get("/soap-calculate", async (req, res) => {
  //query ile dönen  bir JSON string değil, doğrudan JavaScript objesidir.
  // req.query, Express’in otomatik oluşturduğu JavaScript objesidir. JSON metni değildir,
  //  bu yüzden JSON.parse() yapmana gerek yoktur.
  //json bir formattır ve string yüründedir
  //JSON (JavaScript Object Notation), javascript objesi yapmak için const data = JSON.parse(jsonString); kullanılır
  const principal = Number(req.query.principal);
  const totalAmount = Number(req.query.totalAmount);

  if (!principal || !totalAmount) {
    // return kullanılmazsa alt satırlar işlemeye devam eder, aşağıdaki satırlarda herşey normalmiş gib değer göndermeye çalışır
    //Express’in res.json() metodu, JavaScript objesini alır
    // ve otomatik olarak:// JSON string’e çevirir,
    // Content-Type: application/json başlığı ekler,
    // HTTP cevabı olarak gönderir
    return res.json({ error: "anapara ve toplam değer gerekli" });
  }

  try {
    //soap servis urlsi//
    // WSDL (Web Services Description Language) bir SOAP servisinin “ne iş yaptığını” ve “nasıl kullanılacağını” anlatan tanım dosyasıdır.
    // Genelde .wsdl uzantılı XML formatında olur.


    //İlk /wsdl → servis endpoint’inin adıdır (örneğin /calculator, /bank, /wsdl olabilir).
    // İkinci ?wsdl → bu endpoint’in WSDL dosyasını istediğini belirtir.
    // Yani "endpoint?wsdl" aslında bir sorgu parametresidir (query string).
    const url = "http://localhost:8000/wsdl?wsdl";

    
  } catch (error) {}
});

// Küçük/orta ölçekli basit uygulamalarda → app.listen yeterlidir.
// Eğer WebSocket, gRPC Gateway, birden fazla protokol gibi şeyler ekleyeceksen → server.listen kullanırsın.

server.listen(3000, () => {
  console.log("3000 partunda çalışıyor");
});
