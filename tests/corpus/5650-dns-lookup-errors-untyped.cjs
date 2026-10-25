// An untyped lookup callback receives only the error after a failure,
// as Node calls it, with the error's code, errno, syscall and hostname.
const dns = require("node:dns");

dns.lookup("no-such-host.invalid", (...args) => {
  const [err] = args;
  console.log(args.length, err.code, err.errno, err.syscall, err.hostname);
  dns.lookup("no-such-host.invalid", { all: true }, (...args2) => {
    console.log(args2.length, args2[0].message);
    dns.lookupService("127.0.0.1", 65000, (...args3) => {
      console.log(args3.length, args3[0], typeof args3[1], args3[2]);
    });
  });
});
