// new URLSearchParams(init) treats only undefined as an empty init. A null
// init takes the string branch like other primitives, so "null" parses as
// one key with an empty value.
'use strict';
const fromJson = (text) => JSON.parse(text);
const show = (label, init) => {
  const params = new URLSearchParams(init);
  console.log(label, JSON.stringify(params.toString()), params.size, params.has('null'));
};
show('null', fromJson('null'));
show('nested null', fromJson('{"init":null}').init);
show('undefined', fromJson('{}').init);
show('number', fromJson('5'));
show('boolean', fromJson('false'));
show('string', fromJson('"a=1&null"'));
show('object', fromJson('{"null":"x"}'));
