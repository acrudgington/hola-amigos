// Writes the review copies of the privacy notice (legal/*.md) from
// src/legal/privacyNotice.ts. Run after changing the notice: npm run legal:export
// (a unit test fails if the copies are out of date).
import { writeFileSync } from "node:fs";
import { legalFiles } from "../src/legal/files.ts";

for (const [path, text] of Object.entries(legalFiles())) {
  writeFileSync(path, text);
  console.log(`wrote ${path}`);
}
