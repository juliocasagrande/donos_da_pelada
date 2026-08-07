import "dotenv/config";

const shouldValidate = Boolean(process.env.RAILWAY_ENVIRONMENT_ID) || process.env.VALIDATE_PRODUCTION_ENV === "1";
if (!shouldValidate) process.exit(0);

const required = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "CRON_SECRET",
  "MERCADOPAGO_ACCESS_TOKEN",
  "NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY",
  "MERCADOPAGO_WEBHOOK_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
];
const missing = required.filter((name) => !process.env[name]?.trim());
const weakSecrets = ["NEXTAUTH_SECRET", "CRON_SECRET", "MERCADOPAGO_WEBHOOK_SECRET"].filter(
  (name) => (process.env[name]?.length ?? 0) < 32
);

if (missing.length || weakSecrets.length) {
  const details = [
    missing.length ? `ausentes: ${missing.join(", ")}` : "",
    weakSecrets.length ? `com menos de 32 caracteres: ${weakSecrets.join(", ")}` : ""
  ].filter(Boolean).join("; ");
  throw new Error(`Variaveis de producao invalidas (${details}).`);
}

const configuredConnectionLimit = process.env.PRISMA_CONNECTION_LIMIT?.trim();
if (configuredConnectionLimit) {
  const connectionLimit = Number(configuredConnectionLimit);
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1) {
    throw new Error("PRISMA_CONNECTION_LIMIT deve ser um numero inteiro maior ou igual a 1.");
  }
}

const pooledUrl = new URL(process.env.DATABASE_URL);
const directUrl = new URL(process.env.DIRECT_URL);
if (!pooledUrl.hostname.includes("-pooler") || directUrl.hostname.includes("-pooler")) {
  throw new Error("DATABASE_URL deve usar o endpoint Neon -pooler e DIRECT_URL deve usar o endpoint direto.");
}
