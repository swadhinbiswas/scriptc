// process.ppid, process.title, process.argv0, process.release and the
// POSIX credential readers. Values that depend on how the program was
// started (paths, ids) print as the relations Node itself guarantees.
console.log(typeof process.ppid, Number.isInteger(process.ppid), process.ppid > 0);
console.log(process.ppid !== process.pid);

// The title starts as argv[0], which is also argv0.
console.log(typeof process.title, process.title === process.argv0);
console.log(typeof process.argv0, process.argv0.length > 0);
process.title = "corpus-title";
console.log(process.title);
process.title = "t2";
console.log(process.title, process.title.length);
// argv0 keeps the original argument after the title changes.
console.log(process.argv0 !== "t2", process.argv0.length > 0);

// process.release names the release behind process.version.
const release = process.release;
console.log(release.name, Object.keys(release));
console.log(release.lts === undefined || release.lts === "Krypton");
const base = `https://nodejs.org/download/release/${process.version}/node-${process.version}`;
console.log(release.sourceUrl === `${base}.tar.gz`);
console.log(release.headersUrl === `${base}-headers.tar.gz`);
console.log(process.release === release);

// The effective ids match the real ones for an unprivileged run, and the
// group list includes the effective group.
const euid = process.geteuid?.() ?? -1;
const egid = process.getegid?.() ?? -1;
console.log(euid === (process.getuid?.() ?? -1), egid === (process.getgid?.() ?? -1));
const groups = process.getgroups?.() ?? [];
console.log(groups.length > 0, groups.includes(egid));
console.log(groups.every((g) => Number.isInteger(g) && g >= 0));
