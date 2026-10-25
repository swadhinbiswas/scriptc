// ProgramLifetime is a class marker: anywhere but a class's implements
// clause it would promise nothing, so the build reports it.
import type { ProgramLifetime } from "@scriptc/types";

interface Marked extends ProgramLifetime {
  id: number;
}

type Lifetime = ProgramLifetime;

class Plain {
  id = 2;
}

const marked: Marked = { id: 1 };
console.log(marked.id, new Plain().id);
