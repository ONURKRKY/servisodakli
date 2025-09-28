const express= require("express");
const grpc= require("@grpc/grpc-js");
const protoLoader=require("@grpc/proto-loader")
const http=require("http")


const app= express();

// expressin serverını değil kendi yaratattığımız server ı kullanacağız
const server =http.createServer(app);
