// Chunks delivered by net, http, dgram and child_process are Buffers, so
// string concatenation and template literals decode them as UTF-8.
import { spawn } from "node:child_process";
import * as dgram from "node:dgram";
import * as http from "node:http";
import * as net from "node:net";

function netStep(next: () => void): void {
  const server = net.createServer((socket) => {
    socket.on("data", (chunk: Buffer) => socket.end("net echo: " + chunk));
  });
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address() as net.AddressInfo;
    const client = net.connect(port, "127.0.0.1", () => client.write("héllo"));
    let got = "";
    client.on("data", (chunk: Buffer) => {
      got += chunk;
    });
    client.on("close", () => {
      console.log(got);
      server.close(next);
    });
  });
}

function httpStep(next: () => void): void {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk;
    });
    req.on("end", () => res.end(`http echo: ${body}`));
  });
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address() as net.AddressInfo;
    const req = http.request({ port, host: "127.0.0.1", method: "POST" }, (res) => {
      let got = "";
      res.on("data", (chunk: Buffer) => {
        got += chunk;
      });
      res.on("end", () => {
        console.log(got);
        server.close(next);
      });
    });
    req.end("wörld");
  });
}

function dgramStep(next: () => void): void {
  const socket = dgram.createSocket("udp4");
  socket.on("message", (message: Buffer) => {
    console.log(`dgram: ${message}`);
    socket.close(next);
  });
  socket.bind(0, "127.0.0.1", () => {
    socket.send("datagram", socket.address().port, "127.0.0.1");
  });
}

function childStep(): void {
  const child = spawn("sh", ["-c", "printf 'from child'"]);
  let out = "";
  child.stdout!.on("data", (chunk: Buffer) => {
    out += chunk;
  });
  child.on("close", () => console.log("child: " + out));
}

netStep(() => httpStep(() => dgramStep(childStep)));
