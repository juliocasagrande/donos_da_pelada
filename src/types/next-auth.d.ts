import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "MASTER" | "ADMIN" | "PLAYER";
      onboarded: boolean;
      active: boolean;
    };
  }

  interface User {
    role?: "MASTER" | "ADMIN" | "PLAYER";
    onboarded?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "MASTER" | "ADMIN" | "PLAYER";
    onboarded?: boolean;
    active?: boolean;
    userRefreshedAt?: number;
  }
}
