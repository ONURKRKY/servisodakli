const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const http = require("http");
const path = require("path");
const { error } = require("console");

const app = express();

// expressin serverını değil kendi yaratattığımız server ı kullanacağız
const server = http.createServer(app);

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
if(!principal || !interest || !  months){
    return res.status(400).json({error:"tüm değerleri girin"})
}

//grpc servisine istek gönderiliyor, hata sönüşü error da, cevap responsa ile geliyor
client.CalculatePayments({principal,interest, months},(err,response)=>{

 // grpc tarafından error dönerse   
if(err){
    console.error("grpc hatası",err);
    //frontend tarafına hata mesajı gönderiyor
    return res.json({error:err.message})
}


//grpc den gelen mesajı consolda görmek için
console.log("grpc in responsu:", response);

// eğer dönen değerde ,yani response da(içinde array ve bir değer olacak) hata varsa
if(!response || !response.payments){
     //frontend tarafına hata mesajı gönderiyor, res ve red express istek ve cevap değerleri
    return res.json({error:"ödeme tablosu alınamadı"})
}


//hiçbir sıkıntı yoksa frontend tarafına res mesajı gönderiyor
res.json(response);

});

});

server.listen(3000,()=>{console.log("3000 partunda çalışıyor");
})