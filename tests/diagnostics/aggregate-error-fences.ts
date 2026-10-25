// AggregateError keeps its errors list in a runtime slot beyond the
// Error layout, so subclasses fence like DOMException's.
class ValidationErrors extends AggregateError {
  constructor(errors: Error[]) {
    super(errors, "validation failed");
  }
}
console.log(new ValidationErrors([new Error("x")]).errors.length);
