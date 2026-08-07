import "dotenv/config";
import { getMasterPasswordIssues } from "../src/lib/passwordPolicy";

const issues = getMasterPasswordIssues(process.env.MASTER_ADMIN_PASSWORD);

if (issues.length) {
  console.error(`MASTER_ADMIN_PASSWORD inválida. Requisitos pendentes: ${issues.join(", ")}.`);
  process.exitCode = 1;
} else {
  console.log("MASTER_ADMIN_PASSWORD atende à política de segurança.");
}
