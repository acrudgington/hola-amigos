// Run with: npm run content:check
// Validates every file in /content against the schema and teaching rules.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { checkCourse } from "../src/content/schema.ts";

const dir = join(import.meta.dirname, "..", "content");
const read = (p: string) => JSON.parse(readFileSync(join(dir, p), "utf8"));
const lessonFiles = readdirSync(join(dir, "lessons")).filter(f => f.endsWith(".json")).sort().map(f => read(join("lessons", f)));
const conversationFiles = readdirSync(join(dir, "conversations")).filter(f => f.endsWith(".json")).sort().map(f => read(join("conversations", f)));
const issues = checkCourse(read("worlds.json"), lessonFiles, read("surprises.json"), read("units.json"), read("stories.json"), read("chants.json"), conversationFiles);

const errors = issues.filter(i => i.level === "error");
const warnings = issues.filter(i => i.level === "warning");
for (const i of warnings) console.warn(`⚠️  ${i.where}: ${i.message}`);
for (const i of errors) console.error(`❌ ${i.where}: ${i.message}`);
console.log(`\n${lessonFiles.length} lesson files and ${conversationFiles.length} conversation files checked · ${errors.length} errors · ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
