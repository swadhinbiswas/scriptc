// Optional element reads (`arr[i]` of `T | undefined` elements) lower to
// helpers that now lend the element their array keeps alive: paged lookups
// borrow, and reads followed by removals still own what they keep.

class Link {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

class Pages {
  pages: (Link[] | undefined)[] = [];
  get(id: number): Link {
    let link = this.pages[id >> 3]?.[id & 7];
    if (link === undefined) {
      let page = this.pages[id >> 3];
      if (page === undefined) {
        page = [];
        this.pages[id >> 3] = page;
      }
      link = new Link("l" + id);
      page[id & 7] = link;
    }
    return link;
  }
}

function first(links: Link[]): string {
  const head = links[0];
  return head === undefined ? "none" : head.name;
}

const shared: Link[] = [new Link("x"), new Link("y")];
function readThenClear(): string {
  const kept = shared[1];
  shared.length = 0;
  let churn = 0;
  for (let i = 0; i < 100; i++) churn += new Link("c" + i).name.length;
  return (kept === undefined ? "-" : kept.name) + churn;
}

const pages = new Pages();
const seen: string[] = [];
for (let i = 0; i < 40; i++) seen.push(pages.get((i * 7) % 19).name);
console.log(seen.join(" "));
console.log(first([]), first([new Link("a")]), readThenClear(), shared.length);
