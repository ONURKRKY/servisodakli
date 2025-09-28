// node ile grpc kullanabilmek için kütüphane
const grpc = require("@grpc/grpc-js");

//proto dosyasını json dönüştürmek için gerekli
const protoLoader = require("@grpc/proto-loader");

//proto payment dosyasını javascripte dönüşütürüyor
const packageDef = protoLoader.loadSync("payment.proto", {});

//javascript e dönüşütürlen proto dosyası ile grpc objesi oluşturuldu
const grpcObj = grpc.loadPackageDefinition(packageDef);

//proto dosyasında paket tanımlanmıştı, kullanılan değişkenlere ulaşacak
const paymentPackage = grpcObj.payment;

const server = new grpc.Server();

server.addService(paymentPackage.PaymentService.service, {
  // burada RPC metodlarını tanımlıyoruz

  //call istemciden gelen bilgileri taşıyan nesne, callback istemciye dönecekleri hesaplayan fonksiyon
  CalculatePayments: (call, callback) => {
    // clientdan gelen değişkenler alındı
    // dikkat   http +json =express(req.body)  tcp+protobuf=grpc (call.request)
    const { principal, interest, months } = call.request;

    // istemciye call back ile erro gönderiliyor
    if (!principal || !interest || !months) {
      return callback(new Error("tüm alanlar gerekli"));
    }

    //hesaplamalar yapılıyor ve callback ile dönülüyor

    // aylık faiz oranı
    const monthlyInterestRate = interest / 100 / 12;

    //aylık anapara miktarı
    const monthlyPrincipal = principal / months;

    //ödeme planı array olacak
    let payments = [];

    //toplam ödenecek para
    let totalPayments = 0;

    //her ay için ödeme
    for (let m = 1; m <= months; m++) {
      //kalan anapar üstünden aylık faiz
      const interestAmount =
        principal - monthlyInterestRate * (m - 1) * monthlyInterestRate;

      //içindeki ay için ödenecek toplam para
      const total = monthlyPrincipal + interestAmount;

      //aylık toplamlar eklenerek son toplam ödeme çıkıyor
      totalPayments += total;

      //çıkan değerleri arraya atıyoruz
      payments.push({
        month: m,
        principal: monthlyPrincipal,
        interestAmount: interestAmount,
      });
    }

    //hesaplanan değerler cliente gönderilecek, değer json gönderildi
    // fakat proto ile tasışnacak, bu nedenle proto dosyasında
    //kullanılan tüm değişkenleri tanımladık,sonrra tekrar json a cevrilecek
    //proto  byte seviyesinde veri taşımak için bir format
    callback(null, { payments, totalPayments });
  },
});



//server sunuma başlıyor
server.bindAsync(
  "0.0.0.0:50052",
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log("gRPC Payment Server 50052 portunda çalışıyor");
  }
);
