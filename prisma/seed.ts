import { PrismaClient, UserRole, PlayerPosition, PeladaRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PELADA_NAME = "Minha Pelada";
const DEFAULT_PELADA_SLUG = "minha-pelada";

async function main() {
  const name = process.env.MASTER_ADMIN_NAME || "Administrador Master";
  const email = process.env.MASTER_ADMIN_EMAIL || "admin@donodapelada.com";
  const password = process.env.MASTER_ADMIN_PASSWORD;

  if (!password || password.length < 6) {
    throw new Error(
      "Defina MASTER_ADMIN_PASSWORD (minimo 6 caracteres) no .env antes de rodar o seed."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const masterUser = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: UserRole.MASTER,
      active: true,
      onboarded: true
    },
    create: {
      name,
      email,
      passwordHash,
      role: UserRole.MASTER,
      active: true,
      onboarded: true
    }
  });

  const pelada = await prisma.pelada.upsert({
    where: { slug: DEFAULT_PELADA_SLUG },
    update: {},
    create: { name: DEFAULT_PELADA_NAME, slug: DEFAULT_PELADA_SLUG, createdByUserId: masterUser.id }
  });

  await prisma.peladaMembership.upsert({
    where: { userId_peladaId: { userId: masterUser.id, peladaId: pelada.id } },
    update: {},
    create: { userId: masterUser.id, peladaId: pelada.id, role: PeladaRole.PRESIDENTE }
  });

  if (process.env.SEED_SAMPLE_PLAYERS === "true") {
    const samples = [
      ["Carlos", PlayerPosition.GOLEIRO, 8],
      ["Joao", PlayerPosition.DEFESA, 6],
      ["Pedro", PlayerPosition.DEFESA, 8],
      ["Lucas", PlayerPosition.MEIA, 10],
      ["Rafael", PlayerPosition.MEIA, 8],
      ["Bruno", PlayerPosition.ATAQUE, 10],
      ["Andre", PlayerPosition.ATAQUE, 6],
      ["Marcos", PlayerPosition.DEFESA, 4],
      ["Felipe", PlayerPosition.MEIA, 6],
      ["Diego", PlayerPosition.ATAQUE, 8],
      ["Thiago", PlayerPosition.GOLEIRO, 6]
    ] as const;

    for (const [playerName, position, rating] of samples) {
      const existing = await prisma.player.findFirst({ where: { nickname: playerName, peladaId: pelada.id } });
      if (!existing) {
        await prisma.player.create({
          data: { nickname: playerName, position, rating, peladaId: pelada.id }
        });
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
