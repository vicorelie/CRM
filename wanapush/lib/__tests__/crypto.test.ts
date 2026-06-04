import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

// La clé test doit être posée AVANT l'import de crypto, sinon getKey() throw.
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ??
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// import dynamique après init ENV
let crypto: typeof import("../crypto");

before(async () => {
  crypto = await import("../crypto");
});

describe("crypto — encrypt/decrypt", () => {
  it("round-trips une string ASCII basique", () => {
    const original = "hello-world";
    const ct = crypto.encrypt(original);
    assert.equal(crypto.decrypt(ct), original);
  });

  it("round-trips une string UTF-8 avec emojis et accents", () => {
    const original = "Bonjour 👋 — voici un token CAPI 🤫 spécial";
    assert.equal(crypto.decrypt(crypto.encrypt(original)), original);
  });

  it("round-trips une string vide", () => {
    assert.equal(crypto.decrypt(crypto.encrypt("")), "");
  });

  it("round-trips un token long (1000 caractères)", () => {
    const original = "X".repeat(1000);
    assert.equal(crypto.decrypt(crypto.encrypt(original)), original);
  });

  it("produit un ciphertext différent à chaque appel (IV aléatoire)", () => {
    const a = crypto.encrypt("same-input");
    const b = crypto.encrypt("same-input");
    assert.notEqual(a, b);
    // Mais les deux se déchiffrent vers la même valeur
    assert.equal(crypto.decrypt(a), "same-input");
    assert.equal(crypto.decrypt(b), "same-input");
  });

  it("rejette un ciphertext altéré (tag GCM invalide)", () => {
    const ct = crypto.encrypt("secret-data");
    // Flip un bit au milieu — l'auth tag GCM doit détecter et refuser
    const buf = Buffer.from(ct, "base64");
    buf[buf.length - 1] ^= 0xff;
    const corrupted = buf.toString("base64");
    assert.throws(() => crypto.decrypt(corrupted));
  });

  it("rejette un ciphertext tronqué", () => {
    const ct = crypto.encrypt("secret-data");
    const truncated = ct.slice(0, 20);
    assert.throws(() => crypto.decrypt(truncated));
  });
});

describe("crypto — encryptJson/decryptJson", () => {
  it("round-trip d'un objet structuré", () => {
    const obj = {
      accessToken: "ya29.abc",
      refreshToken: "1//xyz",
      expiresAt: 1234567890,
      scopes: ["read", "write"],
    };
    const ct = crypto.encryptJson(obj);
    const recovered = crypto.decryptJson<typeof obj>(ct);
    assert.deepEqual(recovered, obj);
  });

  it("round-trip d'un null", () => {
    assert.equal(crypto.decryptJson<null>(crypto.encryptJson(null)), null);
  });

  it("round-trip d'un nombre", () => {
    assert.equal(crypto.decryptJson<number>(crypto.encryptJson(42)), 42);
  });
});
