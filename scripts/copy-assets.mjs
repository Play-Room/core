import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const copies = [
  { source: resolve("src/locales"), destination: resolve("dist/locales") }
];

for (const { source, destination } of copies) {
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
}