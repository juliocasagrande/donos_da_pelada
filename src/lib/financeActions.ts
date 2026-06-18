"use server";

import { revalidatePath } from "next/cache";
import { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw : "";
}

function parseAmount(raw: string) {
  return Number(raw.replace(",", "."));
}

export async function setMonthlyFee(year: number, month: number, formData: FormData) {
  const admin = await requireAdmin();
  const amount = parseAmount(value(formData, "amount"));
  if (!Number.isFinite(amount) || amount < 0) return;

  await prisma.monthlyFeeConfig.upsert({
    where: { year_month: { year, month } },
    update: { amount },
    create: { year, month, amount }
  });

  await logAudit(admin, "MONTHLY_FEE_UPDATED", { type: "MonthlyFeeConfig", id: `${year}-${month}` }, { amount });
  revalidatePath("/financeiro");
}

export async function setPlayerPaymentStatus(playerId: string, year: number, month: number, alreadyPaid: boolean) {
  const admin = await requireAdmin();

  if (alreadyPaid) {
    await prisma.monthlyPayment.deleteMany({ where: { playerId, year, month } });
    await logAudit(admin, "PAYMENT_UNMARKED", { type: "Player", id: playerId }, { year, month });
  } else {
    const feeConfig = await prisma.monthlyFeeConfig.findUnique({ where: { year_month: { year, month } } });
    const amount = feeConfig?.amount ?? 0;
    await prisma.monthlyPayment.upsert({
      where: { playerId_year_month: { playerId, year, month } },
      update: { amount, paidAt: new Date() },
      create: { playerId, year, month, amount }
    });
    await logAudit(admin, "PAYMENT_MARKED", { type: "Player", id: playerId }, { year, month, amount });
  }

  revalidatePath("/financeiro");
}

export async function createTransaction(formData: FormData) {
  const admin = await requireAdmin();
  const description = value(formData, "description").trim();
  const amount = parseAmount(value(formData, "amount"));
  const type = value(formData, "type") === "EXPENSE" ? TransactionType.EXPENSE : TransactionType.INCOME;
  const rawDate = value(formData, "date");

  if (!description || !Number.isFinite(amount) || amount <= 0 || !rawDate) return;

  const transaction = await prisma.transaction.create({
    data: {
      description,
      amount,
      type,
      date: new Date(`${rawDate}T12:00:00-03:00`),
      createdByUserId: admin.id
    }
  });

  await logAudit(admin, "TRANSACTION_CREATED", { type: "Transaction", id: transaction.id }, { description, amount, type });
  revalidatePath("/financeiro");
}

export async function deleteTransaction(transactionId: string) {
  const admin = await requireAdmin();
  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) return;

  await prisma.transaction.delete({ where: { id: transactionId } });
  await logAudit(
    admin,
    "TRANSACTION_DELETED",
    { type: "Transaction", id: transactionId },
    { description: transaction.description, amount: transaction.amount }
  );
  revalidatePath("/financeiro");
}
