import { describe, it, expect, afterEach } from "vitest";
import crypto from "crypto";
import { encryptSecret, decryptSecret } from "./crypto.util";

const ORIGINAL_KEY = process.env.ENCRYPTION_KEY;

describe("crypto.util", () => {
  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = ORIGINAL_KEY;
  });

  it("faz roundtrip com chave hex", () => {
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
    const enc = encryptSecret("IGQV-token-123");
    expect(enc.startsWith("enc:v1:")).toBe(true);
    expect(enc).not.toContain("IGQV-token-123");
    expect(decryptSecret(enc)).toBe("IGQV-token-123");
  });

  it("faz roundtrip com chave base64 e IV aleatório", () => {
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
    const a = encryptSecret("segredo");
    const b = encryptSecret("segredo");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("segredo");
    expect(decryptSecret(b)).toBe("segredo");
  });

  it("devolve texto puro legado sem alterar", () => {
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
    expect(decryptSecret("EAAB-legacy-token")).toBe("EAAB-legacy-token");
    expect(decryptSecret(null)).toBeNull();
    expect(decryptSecret(undefined)).toBeNull();
  });

  it("sem ENCRYPTION_KEY mantém texto puro", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(encryptSecret("plain")).toBe("plain");
    expect(decryptSecret("plain")).toBe("plain");
  });

  it("falha ao decifrar com tag adulterada", () => {
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
    const enc = encryptSecret("abc");
    const parts = enc.split(":");
    parts[4] = Buffer.from("xyz").toString("base64");
    expect(() => decryptSecret(parts.join(":"))).toThrow();
  });
});
