// Checked-dynamic producers stay in dyn storage under an `any` spelling to
// preserve aliases. Static builds support coercive operators natively;
// the dynamic tier retains its island conversions. Strict equality preserves identity.
function answer(): number {
  const value: any = JSON.parse("41");
  return value + 1;
}

const left: any = JSON.parse("20");
const right: any = JSON.parse("22");
const sum: number = left + right;
console.log(answer(), sum);

const n: any = JSON.parse("9");
const difference: number = n - 4;
const product: number = n * 2;
const quotient: number = n / 3;
const remainder: number = n % 4;
const power: number = n ** 2;
console.log(difference, product, quotient, remainder, power);
console.log(n < 10, n <= 9, n > 8, n >= 10);

const text: any = JSON.parse('"left"');
const joined: string = text + "-right";
console.log(joined);

const object: any = JSON.parse('{"value":1}');
const objectText: string = object + "!";
console.log(object === object, object !== object, objectText);
