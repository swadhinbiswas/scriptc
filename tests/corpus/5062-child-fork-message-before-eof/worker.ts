process.send?.({ value: 1 });
process.send?.({ value: 2 }, (error) => {
  if (error) throw error;
  process.disconnect();
});
