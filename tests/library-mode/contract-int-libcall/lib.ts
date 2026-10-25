// Integer-slot attestation over a program whose library calls take
// non-scalar arguments: Buffer.alloc lowers to buffer.brand over a bytes
// value, and String.fromCharCode to a call over an array. The slot check
// summarizes which globals every call may write, reading each argument's
// IR type; the native compiler must produce the same sidecar as Node.

export const scratch = Buffer.alloc(8);
export const letter = String.fromCharCode(65);

export interface Model {
  readonly phase: number;
}

export type Msg = { readonly kind: "next" } | { readonly kind: "reset" };

export function init(): Model {
  return { phase: 0 };
}

export function update(model: Model, msg: Msg): Model {
  switch (msg.kind) {
    case "next":
      return { phase: model.phase >= 0 && model.phase < 3 ? Math.trunc(model.phase + 1) : 0 };
    case "reset":
      return { phase: 0 };
  }
}
