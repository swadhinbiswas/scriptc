// fs.readFile's options.buffer accepts a function or an ArrayBufferView;
// any other value other than undefined throws ERR_INVALID_ARG_TYPE
// synchronously, before the path is validated and before the callback
// could run. An undefined buffer reads normally.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const file = path.join(os.tmpdir(), `scr-5277-${process.pid}.txt`);
fs.writeFileSync(file, 'hello');
const show = (label, fn) => {
  try {
    fn();
    console.log(label, 'accepted');
  } catch (e) {
    console.log(label, e.name, e.code, e.message);
  }
};
const never = () => console.log('callback ran');
show('number', () => fs.readFile(file, { buffer: 5 }, never));
show('string', () => fs.readFile(file, { encoding: 'utf8', buffer: 'abc' }, never));
show('null', () => fs.readFile(file, { buffer: null }, never));
show('object', () => fs.readFile(file, { buffer: {} }, never));
show('bad path first', () => fs.readFile(42.5, { buffer: true }, never));
fs.readFile(file, { encoding: 'utf8', buffer: undefined }, (err, data) => {
  console.log('undefined buffer', err, data);
  fs.unlinkSync(file);
});
