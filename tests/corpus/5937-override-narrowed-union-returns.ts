// An override may narrow its base method's return type to part of the
// base's union (`Meta` for `Meta | undefined`, `number` for
// `number | undefined`, a subclass of a union arm). Calls through the base
// type return the narrowed value, and calls through the overriding class
// see its declared type.
class Meta {
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
}
class TaggedMeta extends Meta {
  tag(): string {
    return `#${this.name}`;
  }
}
abstract class Host {
  metadata(_key: string): Meta | undefined {
    return undefined;
  }
  size(): number | undefined {
    return undefined;
  }
  value(): string | number | null {
    return null;
  }
  abstract tagged(): TaggedMeta | undefined;
}
class FileHost extends Host {
  metadata(key: string): Meta {
    return new Meta(key);
  }
  size(): number {
    return 3;
  }
  value(): string | number {
    return this.size() > 2 ? "big" : 1;
  }
  tagged(): TaggedMeta {
    return new TaggedMeta("t");
  }
}
class CachedHost extends FileHost {
  metadata(key: string): TaggedMeta {
    return new TaggedMeta(key.toUpperCase());
  }
  size(): number {
    return super.size() * 2;
  }
}
class EmptyHost extends Host {
  tagged(): TaggedMeta | undefined {
    return undefined;
  }
}
abstract class NamedHost extends Host {
  abstract metadata(key: string): Meta;
}
class DirHost extends NamedHost {
  metadata(key: string): Meta {
    return new Meta(`dir:${key}`);
  }
  tagged(): TaggedMeta {
    return new TaggedMeta("d");
  }
}
const hosts: Host[] = [new FileHost(), new CachedHost(), new EmptyHost(), new DirHost()];
for (const host of hosts) {
  console.log(host.metadata("a")?.name, host.size(), host.value(), host.tagged()?.tag());
}
const file = new FileHost();
console.log(file.metadata("b").name.length, file.size() + 1, file.tagged().tag());
const cached = new CachedHost();
console.log(cached.metadata("c").tag(), cached.size() * 10, typeof cached.value());
const pick = (h: FileHost): Meta => h.metadata("d");
console.log(pick(cached).name, pick(file) instanceof TaggedMeta);
const none = new EmptyHost().tagged();
console.log(none, [none].length);
const named: NamedHost = new DirHost();
console.log(named.metadata("e").name, named.metadata("e") instanceof Meta);
