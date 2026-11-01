import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyMetaSignature } from "./meta-signature.util";

const SECRET = "app-secret-teste";
const body = Buffer.from(JSON.stringify({ object: "instagram", entry: [{ id: "1784" }] }));
const sign = (b: Buffer, s = SECRET) =>
  "sha256=" + crypto.createHmac("sha256", s).update(b).digest("hex");

describe("verifyMetaSignature", () => {
  it("aceita assinatura válida", () => {
    expect(verifyMetaSignature(body, sign(body), SECRET).valid).toBe(true);
  });

  it("rejeita assinatura de outro secret ou corpo alterado", () => {
    expect(verifyMetaSignature(body, sign(body, "outro"), SECRET).valid).toBe(false);
    expect(verifyMetaSignature(Buffer.from("{}"), sign(body), SECRET).valid).toBe(false);
  });

  it("rejeita header ausente ou malformado", () => {
    expect(verifyMetaSignature(body, undefined, SECRET).valid).toBe(false);
    expect(verifyMetaSignature(body, "sha1=abc", SECRET).valid).toBe(false);
    expect(verifyMetaSignature(undefined, sign(body), SECRET).valid).toBe(false);
  });

  it("sem secret configurado aceita e sinaliza skipped", () => {
    expect(verifyMetaSignature(body, undefined, "")).toEqual({ valid: true, skipped: true });
  });
});
