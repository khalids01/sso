import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory = fileURLToPath(new URL("../dist/react", import.meta.url));

mkdirSync(outputDirectory, { recursive: true });
copyFileSync(`${packageRoot}/src/react/styles.css`, `${outputDirectory}/styles.css`);
