// ServerResponse end callbacks and 'finish': writableFinished reads false
// right after end() and true from the finish point; end(cb) callbacks run
// before the 'finish' listeners while the socket is still attached; a
// second end(cb) before the finish joins the same callback list. A request
// read to 'end' closes before its response; an unread one closes after.
import { createServer, request, type IncomingMessage, type ServerResponse } from "node:http";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

const handlers: Handler[] = [
  (req, res) => {
    req.on("data", () => {});
    req.on("end", () => {
      res.end("ok", () => {
        console.log("end callback", res.writableFinished, res.socket !== null);
      });
      console.log("after end", res.writableEnded, res.writableFinished);
    });
  },
  (req, res) => {
    res.end("ok");
    res.end(() => {
      console.log("second end callback", res.writableFinished, res.socket !== null);
    });
    console.log("after end", res.writableEnded, res.writableFinished);
  },
  (req, res) => {
    res.write("a");
    res.end(() => {
      console.log("empty end callback", res.writableFinished, res.socket !== null);
    });
  },
];

function exchange(index: number): Promise<void> {
  return new Promise<void>((done) => {
    const server = createServer((req, res) => {
      res.on("finish", () => {
        console.log("finish listener", res.writableFinished, res.socket === null);
      });
      res.on("close", () => {
        console.log("response close");
      });
      req.on("close", () => {
        console.log("request close");
      });
      handlers[index]!(req, res);
    });
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      const outbound = request({ port, method: "POST", agent: false }, (response) => {
        response.resume();
        response.on("end", () => {
          setTimeout(() => {
            server.close();
            done();
          }, 20);
        });
      });
      outbound.end("ping");
    });
  });
}

async function main(): Promise<void> {
  for (let i = 0; i < handlers.length; i++) {
    console.log("exchange", i);
    await exchange(i);
  }
}
main();
