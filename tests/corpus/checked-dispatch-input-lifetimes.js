function run() {
  let owner;
  const events = [];
  owner = {
    get value() { events.push("get"); owner = { value: "new" }; return "old"; },
    method(value) { events.push(this.label); return value; },
    label: "receiver",
  };
  console.log(owner.value, owner.value);
  owner = {
    label: "before",
    get method() {
      events.push("prepare");
      return function(value) { events.push(this.label); return value; };
    },
  };
  function replace() { events.push("argument"); owner = { label: "after" }; return "result"; }
  console.log(owner.method(replace()), owner.label);
  let callback = function(value) { return "first:" + value; };
  function swap() { callback = function(value) { return "second:" + value; }; return "arg"; }
  console.log(callback(swap()), callback("next"));
  const stable = { method(value) { return value; } };
  const item = JSON.parse('{"name":"saved"}');
  console.log(stable.method(item).name, stable.method(...[item]).name);
  try { stable.method((() => { throw new Error("stop"); })()); }
  catch (error) { console.log(error.message); }
  let document = JSON.parse('{"value":"initial"}');
  document.toJSON = function() { document = JSON.parse('{"value":"updated"}'); return "encoded"; };
  console.log(JSON.stringify(document), document.value);
  const revived = JSON.parse('[true,false,null]', function(key, value) {
    if (key === "0") return false;
    return value;
  });
  console.log(JSON.stringify(revived), JSON.stringify([true, false, null]));
  console.log(events.join("|"));
}
run();
