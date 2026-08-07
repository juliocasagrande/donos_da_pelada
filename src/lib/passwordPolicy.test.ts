import { describe, expect, it } from "vitest";
import { getMasterPasswordIssues, isStrongMasterPassword } from "./passwordPolicy";

describe("isStrongMasterPassword", () => {
  it("rejects documented defaults and weak passwords", () => {
    expect(isStrongMasterPassword("admin123")).toBe(false);
    expect(isStrongMasterPassword("only-lowercase-long")).toBe(false);
  });

  it("accepts a long mixed password", () => {
    expect(isStrongMasterPassword("UmaSenha#Forte2026")).toBe(true);
  });

  it("supports accented letters and reports only unmet requirements", () => {
    expect(isStrongMasterPassword("ÁrvoreSegura#2026")).toBe(true);
    expect(getMasterPasswordIssues("CURTA#12")).toEqual([
      "mínimo de 12 caracteres",
      "uma letra minúscula"
    ]);
  });
});
