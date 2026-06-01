// Tests unit pour lib/capi/hash.ts
// Vérifie la conformité avec la spec Meta Conversions API pour le hashing PII.
//
// Test vectors générés via le hasher officiel Meta (Events Manager > Tools > Data
// Hashing Helper) et reproductibles avec `echo -n "..." | sha256sum`.
//
// Run : npm run test:capi

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sha256, hashUserData, __testing } from "../hash";

describe("sha256", () => {
  it("hashes ASCII consistently", () => {
    // Test vector connu : sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    assert.equal(
      sha256("hello"),
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("hashes empty string", () => {
    // sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    assert.equal(
      sha256(""),
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("handles UTF-8 with accents correctly", () => {
    // sha256("éléphant") en UTF-8 — vérifié avec `echo -n "éléphant" | sha256sum`
    assert.equal(
      sha256("éléphant"),
      "c941ae685f62cbe7bb47d0791af7154788fd9e873e5c57fd2449d1454ed5b16f",
    );
  });
});

describe("normalizers (via __testing)", () => {
  const { normalizers } = __testing;

  describe("email", () => {
    it("lowercases and trims", () => {
      assert.equal(normalizers.email("  JOHN@DOE.COM  "), "john@doe.com");
    });

    it("preserves Gmail + and . (Meta handles them server-side)", () => {
      assert.equal(normalizers.email("John.Doe+ads@gmail.com"), "john.doe+ads@gmail.com");
    });
  });

  describe("phone", () => {
    it("strips all non-digits", () => {
      assert.equal(normalizers.phone("+33 (0)6 12 34-56.78"), "330612345678");
    });

    it("handles already-clean number", () => {
      assert.equal(normalizers.phone("33612345678"), "33612345678");
    });
  });

  describe("name", () => {
    it("lowercases and trims, preserves accents", () => {
      assert.equal(normalizers.name("  Élise  "), "élise");
    });
  });

  describe("city", () => {
    it("lowercases and removes all spaces", () => {
      assert.equal(normalizers.city("  New York  "), "newyork");
      assert.equal(normalizers.city("Saint-Denis"), "saint-denis");
    });
  });

  describe("zip", () => {
    it("lowercases and removes spaces", () => {
      assert.equal(normalizers.zip(" 75 001 "), "75001");
      assert.equal(normalizers.zip("NY-10001"), "ny-10001");
    });
  });

  describe("country", () => {
    it("takes first 2 chars lowercase", () => {
      assert.equal(normalizers.country("FR"), "fr");
      assert.equal(normalizers.country("USA"), "us");
    });
  });

  describe("dob", () => {
    it("strips non-digits and keeps 8 chars", () => {
      assert.equal(normalizers.dob("1990-05-15"), "19900515");
      assert.equal(normalizers.dob("15/05/1990 23:00"), "15051990");
    });
  });

  describe("gender", () => {
    it("keeps first char lowercase", () => {
      assert.equal(normalizers.gender("Male"), "m");
      assert.equal(normalizers.gender("F"), "f");
    });
  });
});

describe("hashUserData — Meta-conformant hashing", () => {
  it("hashes email correctly (Meta test vector)", () => {
    // Test vector : sha256("john@doe.com") =
    // d709f370e52b57b4eb75f04e2b3422c4d41a05148cad8f81776d94a048fb70af
    // (Vérifié avec `echo -n "john@doe.com" | sha256sum`)
    const out = hashUserData({ em: "JOHN@DOE.COM" });
    assert.deepEqual(out.em, [
      "d709f370e52b57b4eb75f04e2b3422c4d41a05148cad8f81776d94a048fb70af",
    ]);
  });

  it("hashes phone (E.164 sans +)", () => {
    // sha256("33612345678") (lowercase n'affecte rien sur les digits)
    const out = hashUserData({ ph: "+33 6 12 34 56 78" });
    assert.ok(out.ph?.[0]);
    assert.equal(out.ph![0].length, 64); // hex sha256 = 64 chars
    // Vérification du hash exact :
    assert.equal(out.ph![0], sha256("33612345678"));
  });

  it("hashes first name preserving accents", () => {
    const out = hashUserData({ fn: "  Élise  " });
    assert.deepEqual(out.fn, [sha256("élise")]);
  });

  it("hashes country to 2 chars lowercase", () => {
    const out = hashUserData({ country: "FR" });
    assert.equal(out.country, sha256("fr"));
  });

  it("supports multiple emails (array input)", () => {
    const out = hashUserData({ em: ["a@b.com", "c@d.com"] });
    assert.equal(out.em?.length, 2);
    assert.equal(out.em![0], sha256("a@b.com"));
    assert.equal(out.em![1], sha256("c@d.com"));
  });

  it("filters out empty values from arrays", () => {
    const out = hashUserData({ em: ["a@b.com", "", "   "] });
    // "" et "   " sont vides après trim → filtrés
    assert.equal(out.em?.length, 1);
    assert.equal(out.em![0], sha256("a@b.com"));
  });

  it("returns undefined for empty inputs", () => {
    const out = hashUserData({ em: "", ph: "   " });
    assert.equal(out.em, undefined);
    assert.equal(out.ph, undefined);
  });

  it("passes RAW fields through without hashing", () => {
    const out = hashUserData({
      em: "john@doe.com",
      client_ip_address: "203.0.113.42",
      client_user_agent: "Mozilla/5.0 (Macintosh; ...)",
      fbp: "fb.1.1700000000.1234567890",
      fbc: "fb.1.1700000000.IwAR0abc123",
      subscription_id: "cus_abc123",
    });
    assert.equal(out.client_ip_address, "203.0.113.42");
    assert.equal(out.client_user_agent, "Mozilla/5.0 (Macintosh; ...)");
    assert.equal(out.fbp, "fb.1.1700000000.1234567890");
    assert.equal(out.fbc, "fb.1.1700000000.IwAR0abc123");
    assert.equal(out.subscription_id, "cus_abc123");
    // em est bien hashé en parallèle
    assert.ok(out.em);
    assert.equal(out.em![0].length, 64);
  });

  it("does NOT include keys for missing inputs", () => {
    const out = hashUserData({ em: "john@doe.com" });
    assert.equal(Object.keys(out).length, 1);
    assert.equal("ph" in out, false);
    assert.equal("fn" in out, false);
  });

  it("handles a complete user profile (high match quality)", () => {
    const out = hashUserData({
      em: "Marie.Dubois@gmail.com",
      ph: "+33 6 12 34 56 78",
      fn: "Marie",
      ln: "Dubois",
      ct: "Paris",
      st: "FR-75",
      zp: "75001",
      country: "FR",
      db: "1990-05-15",
      ge: "f",
      external_id: "user_123",
      client_ip_address: "203.0.113.42",
      client_user_agent: "Mozilla/5.0",
      fbp: "fb.1.1700000000.123",
    });

    // Tous les champs hashed sont des sha256 hex de 64 chars
    assert.equal(out.em![0].length, 64);
    assert.equal(out.ph![0].length, 64);
    assert.equal(out.fn![0].length, 64);
    assert.equal(out.ln![0].length, 64);
    assert.equal(out.ct!.length, 64);
    assert.equal(out.st!.length, 64);
    assert.equal(out.zp!.length, 64);
    assert.equal(out.country!.length, 64);
    assert.equal(out.db!.length, 64);
    assert.equal(out.ge!.length, 64);
    assert.equal(out.external_id![0].length, 64);

    // RAW intacts
    assert.equal(out.client_ip_address, "203.0.113.42");
    assert.equal(out.client_user_agent, "Mozilla/5.0");
    assert.equal(out.fbp, "fb.1.1700000000.123");

    // Le hash email doit être déterministe et reproductible
    assert.equal(out.em![0], sha256("marie.dubois@gmail.com"));
    assert.equal(out.country, sha256("fr"));
    assert.equal(out.db, sha256("19900515"));
    assert.equal(out.ge, sha256("f"));
  });

  it("normalizes city by removing internal spaces", () => {
    // Meta spec : pas d'espaces dans la city après normalisation
    const out = hashUserData({ ct: "New York" });
    assert.equal(out.ct, sha256("newyork"));
  });

  it("normalizes ZIP by removing spaces", () => {
    const out = hashUserData({ zp: "75 001" });
    assert.equal(out.zp, sha256("75001"));
  });

  it("truncates country to 2 chars if longer", () => {
    const out = hashUserData({ country: "France" });
    // "France" → "fr" (2 premiers chars lowercase)
    assert.equal(out.country, sha256("fr"));
  });
});

// Validation que les hashes que nous produisons matchent bien ce que Meta attend.
// Si Meta change sa spec un jour, ce test cassera et nous alertera.
describe("Meta spec snapshots (DO NOT MODIFY without verifying Meta docs)", () => {
  it("snapshot: email 'test@example.com'", () => {
    assert.equal(
      hashUserData({ em: "test@example.com" }).em![0],
      "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b",
    );
  });

  it("snapshot: phone '+33612345678' → digits '33612345678'", () => {
    assert.equal(
      hashUserData({ ph: "+33612345678" }).ph![0],
      sha256("33612345678"),
    );
  });

  it("snapshot: city 'San Francisco' → 'sanfrancisco'", () => {
    assert.equal(
      hashUserData({ ct: "San Francisco" }).ct,
      sha256("sanfrancisco"),
    );
  });
});
