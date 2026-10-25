// DEP0182: a GCM decipher created without authTagLength warns when
// setAuthTag receives a tag shorter than 16 bytes. The warning is reported
// on the next tick and at most once per process; specifying authTagLength
// or passing a 16-byte tag does not warn. The program re-runs itself and prints the child's output with
// process ids normalized. A plain warning is emitted first so that the
// one-time trace hint belongs to it.
"use strict";
const { spawnSync } = require("child_process");
const crypto = require("crypto");

if (process.argv[2] === "child") {
  process.emitWarning("first warning");
  const key = Buffer.alloc(16, 1);
  const iv = Buffer.alloc(12, 2);
  const cipher = crypto.createCipheriv("aes-128-gcm", key, iv, { authTagLength: 8 });
  const ciphertext = Buffer.concat([cipher.update("short tag"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const decipher = crypto.createDecipheriv("aes-128-gcm", key, iv);
  decipher.setAuthTag(tag);
  console.log(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString());
  const second = crypto.createDecipheriv("aes-128-gcm", key, iv);
  second.setAuthTag(tag.subarray(0, 4));
  const specified = crypto.createDecipheriv("aes-128-gcm", key, iv, { authTagLength: 8 });
  specified.setAuthTag(tag);
  crypto.createDecipheriv("aes-128-gcm", key, iv).setAuthTag(Buffer.alloc(16));
  console.log("end of turn");
} else {
  const child = spawnSync(process.execPath, [process.argv[1], "child"], { encoding: "utf8" });
  console.log(`status: ${child.status}`);
  console.log(child.stdout);
  console.log(child.stderr.replace(/\(node:\d+\)/g, "(node:<pid>)"));
}
