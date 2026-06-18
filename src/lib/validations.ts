import { z } from "zod";

export const positions = ["GOLEIRO", "DEFESA", "MEIA", "ATAQUE"] as const;
export const membershipStatuses = ["MENSALISTA", "CONVIDADO"] as const;

export const playerSchema = z.object({
  name: z.string().min(2, "Informe o nome do jogador."),
  nickname: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  position: z.enum(positions),
  membershipStatus: z.enum(membershipStatuses).default("MENSALISTA"),
  rating: z.coerce.number().min(0).max(5)
});

export const adminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional().or(z.literal("")),
  active: z.coerce.boolean().optional()
});

export const surfaces = ["SOCIETY", "CAMPO", "QUADRA"] as const;

export const matchSchema = z.object({
  title: z.string().min(2, "Informe um nome para a pelada."),
  date: z.coerce.date(),
  surface: z.enum(surfaces).default("SOCIETY"),
  location: z.string().optional()
});

export const drawSchema = z.object({
  numberOfTeams: z.coerce.number().int().min(2),
  desiredPlayersPerTeam: z.coerce.number().int().min(1)
});
