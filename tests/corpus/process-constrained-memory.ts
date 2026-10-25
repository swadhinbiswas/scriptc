// process.constrainedMemory() is libuv's uv_get_constrained_memory: on Linux
// the smaller of memory.max and memory.high of the process's own cgroup
// (named by /proc/self/cgroup), UINT64_MAX when both are "max", and 0 where
// there is no cgroup; 0 elsewhere. It is printed exactly, so Node and the
// native binary must read the same cgroup. availableMemory() changes with
// usage, so only its bound is checked: under a constraint no larger than the
// machine it is the constraint minus the cgroup's usage.
import { totalmem } from "node:os";

const constrained = process.constrainedMemory();
console.log("constrained:", constrained);
console.log("constrained is a number:", typeof constrained === "number" && constrained >= 0);
const available = process.availableMemory();
const bound = constrained > 0 && constrained <= totalmem() ? constrained : totalmem();
console.log("available within bound:", available >= 0 && available <= bound);
