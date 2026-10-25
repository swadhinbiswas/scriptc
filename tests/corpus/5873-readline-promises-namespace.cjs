'use strict';
// readline.promises in CommonJS, as a member and as a destructured
// binding, with createInterface(input, output) and createInterface(input,
// output, completer, terminal) forms.
const { PassThrough } = require('node:stream');
const readline = require('node:readline');
const { promises } = require('readline');

async function main() {
  const input = new PassThrough();
  const output = new PassThrough();
  let written = '';
  output.on('data', (chunk) => { written += chunk; });
  const rl = readline.promises.createInterface(input, output);
  const answer = rl.question('name? ');
  input.write('ada\n');
  console.log('answer', await answer, rl.terminal);
  rl.close();
  console.log('written', JSON.stringify(written));
  const input2 = new PassThrough();
  const rl2 = promises.createInterface(input2, undefined, undefined, false);
  const lines = [];
  rl2.on('line', (line) => lines.push(line));
  input2.end('x\ny\n');
  await new Promise((resolve) => {
    rl2.on('close', () => resolve(undefined));
  });
  console.log('lines', lines.join(','), rl2.terminal);
  try {
    readline.createInterface(new PassThrough(), null, 5);
  } catch (e) {
    console.log('completer', e.name, e.code, e.message);
  }
}
main();
