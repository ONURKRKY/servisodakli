// node ile grpc kullanabilmek için kütüphane
const grpc = require("@grpc/grpc-js");

//proto dosyasını json dönüştürmek için gerekli
const protoLoader = require("@grpc/proto-loader");

//proto payment dosyasını javascripte dönüşütürüyor
//.proto dosyalarını (Protocol Buffers tanımlarını) Node.js tarafında kullanabilmek için gerekli kütüphane.
//  Çünkü gRPC, servis ve mesaj tanımlarını .proto dosyasında tutuyor.
const packageDef = protoLoader.loadSync("payment.proto", {});

//javascript e dönüşütürlen proto dosyası ile grpc objesi oluşturuldu
const grpcObj = grpc.loadPackageDefinition(packageDef);

//proto dosyasında paket tanımlanmıştı, kullanılan değişkenlere ulaşacak
//payment.proto dosyasında tanımlanmış olan package payment; satırındaki payment paketine ulaşılıyor.
const paymentPackage = grpcObj.payment;

const server = new grpc.Server();

//server a servisi ekliyoruz
server.addService(paymentPackage.PaymentService.service, {
  // burada RPC metodlarını tanımlıyoruz

  //call istemciden gelen bilgileri taşıyan nesne, callback istemciye dönecekleri hesaplayan fonksiyon
 CalculatePayments: (call, callback) => {
    const { principal, interest, months } = call.request;

    if (!principal || !interest || !months) {
        return callback(new Error("tüm alanlar gerekli"));
    }

    // Yıllık faiz oranını aylık orana çevir (örn: %12 -> 0.01)
    const monthlyInterestRate = interest / 100 / 12;

    // Aylık Anapara miktarını hesapla
    const monthlyPrincipal = principal / months;

    let payments = [];
    let totalPayments = 0; // Bu değişken totalPayment (ana yanıttaki) değerini tutar
    let remainingPrincipal = principal; // Kalan anapara takibi için

    for (let m = 1; m <= months; m++) {
        // Faiz miktarı: Kalan anapara üzerinden aylık faiz hesaplanır
        const interestAmount = remainingPrincipal * monthlyInterestRate;

        // Aylık toplam ödeme (Faiz + Anapara)
        const total = monthlyPrincipal + interestAmount;

        // Kalan anapara güncellenir
        remainingPrincipal -= monthlyPrincipal;

        // Aylık toplamlar eklenerek son toplam ödeme çıkıyor
        totalPayments += total;
        
        // payments array'e veriyi ekler
        payments.push({
            month: m,
            principal: monthlyPrincipal, // Aylık anapara ödemesi
            interestAmount: interestAmount, // Aylık faiz ödemesi
            totalPayment: total, // Aylık toplam ödeme (Önceki hatayı düzeltir)
        });
    }

    // hesaplanan değerler cliente gönderilecek
    callback(null, {
        payments: payments,
        totalPayment: totalPayments, // <-- Bu, index.html'deki data.totalPayment'ı doldurur
    });
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
