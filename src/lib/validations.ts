import { z } from "zod";

export const positions = ["GOLEIRO", "DEFESA", "MEIA", "ATAQUE"] as const;
export const membershipStatuses = ["MENSALISTA", "CONVIDADO"] as const;

export const playerSchema = z.object({
  nickname: z.string().min(2, "Informe o apelido do jogador."),
  photoUrl: z.string().url().optional().or(z.literal("")),
  position: z.enum(positions),
  membershipStatus: z.enum(membershipStatuses).default("MENSALISTA"),
  rating: z.coerce.number().min(0).max(5)
});

export const passwordRequirements = [
  { id: "length", label: "Pelo menos 8 caracteres", test: (value: string) => value.length >= 8 },
  { id: "letter", label: "Pelo menos uma letra", test: (value: string) => /[a-zA-Z]/.test(value) },
  { id: "number", label: "Pelo menos um numero", test: (value: string) => /[0-9]/.test(value) },
  { id: "special", label: "Pelo menos um caractere especial", test: (value: string) => /[^a-zA-Z0-9]/.test(value) }
] as const;

export const passwordSchema = z
  .string()
  .refine((value) => passwordRequirements.every((requirement) => requirement.test(value)), {
    message: "A senha precisa ter pelo menos 8 caracteres, com letras, numeros e caracteres especiais."
  });

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().toLowerCase().email("Informe um e-mail valido."),
  password: passwordSchema
});

export const surfaces = ["SOCIETY", "CAMPO", "QUADRA"] as const;
export const matchKinds = ["PELADA", "AMISTOSO"] as const;

export const matchSchema = z.object({
  title: z.string().min(2, "Informe um nome para a pelada."),
  date: z.coerce.date(),
  kind: z.enum(matchKinds).default("PELADA"),
  surface: z.enum(surfaces).default("SOCIETY"),
  location: z.string().optional(),
  opponentName: z.string().optional()
});

export const drawSchema = z.object({
  numberOfTeams: z.coerce.number().int().min(2),
  desiredPlayersPerTeam: z.coerce.number().int().min(1)
});
