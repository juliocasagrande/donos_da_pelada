-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('MENSALISTA', 'CONVIDADO');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'MENSALISTA';
