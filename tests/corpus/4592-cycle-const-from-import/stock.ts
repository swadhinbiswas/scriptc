import { summary } from "./report.ts";

export const BASE = 41;
try {
  console.log("early summary", summary());
} catch (error) {
  console.log("early summary failed", error instanceof ReferenceError, (error as Error).message);
}
