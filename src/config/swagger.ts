import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import swaggerUi from "swagger-ui-express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple paths to find swagger.yaml
// Development: /project/src/config -> /project/swagger.yaml
// Production: /app/dist/config -> /app/swagger.yaml
const possiblePaths = [
  resolve(__dirname, "../../swagger.yaml"), // Development (from src/config)
  resolve(__dirname, "../../../swagger.yaml"), // Production (from dist/src/config)
  resolve(process.cwd(), "swagger.yaml"), // From project root
];

let swaggerFilePath = "";
for (const path of possiblePaths) {
  if (existsSync(path)) {
    swaggerFilePath = path;
    break;
  }
}

if (!swaggerFilePath) {
  throw new Error(
    `swagger.yaml not found. Tried paths: ${possiblePaths.join(", ")}`,
  );
}

// Load swagger.yaml file
const swaggerDocument = yaml.load(
  readFileSync(swaggerFilePath, "utf8"),
) as swaggerUi.JsonObject;

export { swaggerUi, swaggerDocument };
