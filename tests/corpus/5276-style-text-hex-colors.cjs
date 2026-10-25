// util.styleText hex colors: '#RGB' and '#RRGGBB' formats open a 24-bit
// foreground sequence (38;2;r;g;b) and close with 39, alone or mixed with
// named formats; nested closes reopen the color. Other '#' strings throw
// ERR_INVALID_ARG_VALUE, before or after the stream check.
'use strict';
const { styleText } = require('node:util');
const show = (label, fn) => {
  try {
    console.log(label, JSON.stringify(fn()));
  } catch (e) {
    console.log(label, e.name, e.code, e.message);
  }
};
const raw = { validateStream: false };
show('six', () => styleText('#ff8000', 'orange', raw));
show('three', () => styleText('#0Fa', 'mint', raw));
show('upper', () => styleText('#ABCDEF', 'x', raw));
show('mixed', () => styleText(['bold', '#00f', 'underline'], 'text', raw));
show('nested close', () => styleText('#123456', 'a\u001b[39mb\u001b[39m', raw));
show('named after hex', () => styleText(['#abc', 'red'], 'a\u001b[39mb', raw));
show('bad digits', () => styleText('#zz0', 'bad', raw));
show('bad length', () => styleText('#12345', 'bad', raw));
show('bare hash', () => styleText('#', 'bad', raw));
show('bad in array', () => styleText(['red', '#1234567'], 'bad', raw));
show('bad then unknown', () => styleText(['#12', 'nope'], 'bad', raw));
show('unknown after hex', () => styleText(['#123', 'nope'], 'bad', raw));
show('validated stream', () => styleText('#123', 'plain'));
show('validated bad', () => styleText('#xyz', 'plain'));
