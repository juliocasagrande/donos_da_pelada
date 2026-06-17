import fs from "node:fs";

function readEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(".env", "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")];
      })
  );
}

const env = readEnv();
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = env.SUPABASE_STORAGE_BUCKET || "player-photos";

if (!url || !key) {
  console.error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configurados.");
  process.exit(1);
}

console.log(`Testando Supabase Storage em ${url}`);
console.log(`Bucket configurado: ${bucket}`);
console.log(`Chave carregada: ${key.slice(0, 10)}...${key.slice(-4)}`);

const response = await fetch(`${url}/storage/v1/bucket`, {
  headers: {
    authorization: `Bearer ${key}`,
    apikey: key
  }
});

const text = await response.text();
console.log(`Status: ${response.status}`);
console.log(text.slice(0, 1000));
