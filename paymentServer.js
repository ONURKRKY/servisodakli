
// node ile grpc kullanabilmek için kütüphane
const grpc=require("@grpc/grpc-js");

//proto dosyasını json dönüştürmek için gerekli
const protoLoader=require("@grpc/proto-loader");

//proto payment dosyasını javascripte dönüşütürüyor
const packageDef=protoLoader.loadSync('payment.proto',{});

//javascript e dönüşütürlen proto dosyası ile grpc objesi oluşturuldu
const grpcObj=grpc.loadPackageDefinition(packageDef);


//proto dosyasında paket tanımlanmıştı
const paymentPackage=grpcObj.payment;

const server=new grpc.Server();