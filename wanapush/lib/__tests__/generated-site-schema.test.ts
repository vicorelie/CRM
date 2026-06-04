import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSiteBrief, parseSiteMeta, SiteBriefSchema, SiteMetaSchema } from "../generated-site-schema";

describe("parseSiteBrief", () => {
  it("parse un brief complet", () => {
    const brief = parseSiteBrief({
      brandName: "Acme",
      sector: "tech",
      type: "LANDING",
      primaryColor: "#ff0000",
      secondaryColor: "#00ff00",
      framework: "react",
    });
    assert.equal(brief.brandName, "Acme");
    assert.equal(brief.sector, "tech");
    assert.equal(brief.framework, "react");
  });

  it("retourne un objet vide si null/undefined", () => {
    assert.deepEqual(parseSiteBrief(null), {});
    assert.deepEqual(parseSiteBrief(undefined), {});
  });

  it("retourne un objet vide si le Json est cassé (string, number)", () => {
    assert.deepEqual(parseSiteBrief("not an object"), {});
    assert.deepEqual(parseSiteBrief(42), {});
  });

  it("préserve les champs custom via passthrough", () => {
    const brief = parseSiteBrief({
      brandName: "Acme",
      customField: "custom-value",
      extraData: { nested: true },
    });
    assert.equal(brief.brandName, "Acme");
    // passthrough conserve les champs non déclarés
    assert.equal((brief as Record<string, unknown>).customField, "custom-value");
  });

  it("filtre les champs au mauvais type", () => {
    // SiteBriefSchema attend `brandName: string` — un number doit faire échouer
    // le parse et fallback sur {}.
    const result = parseSiteBrief({ brandName: 12345 });
    assert.deepEqual(result, {});
  });
});

describe("parseSiteMeta", () => {
  it("parse un meta complet", () => {
    const meta = parseSiteMeta({
      framework: "react",
      reactFiles: { "App.tsx": "<div>hi</div>" },
      designProfile: "modern",
      siteSlug: "acme",
      previewUrl: "https://wanapush.com/preview/acme/",
    });
    assert.equal(meta.framework, "react");
    assert.deepEqual(meta.reactFiles, { "App.tsx": "<div>hi</div>" });
    assert.equal(meta.siteSlug, "acme");
  });

  it("accepte siteSlug = null (nullish)", () => {
    const meta = parseSiteMeta({ framework: "html", siteSlug: null });
    assert.equal(meta.siteSlug, null);
  });

  it("retourne un objet vide pour les inputs invalides", () => {
    assert.deepEqual(parseSiteMeta(null), {});
    assert.deepEqual(parseSiteMeta(undefined), {});
    assert.deepEqual(parseSiteMeta(42), {});
  });

  it("retourne un objet vide si reactFiles est un array (mauvais type)", () => {
    // Le schema attend Record<string, string>, pas un array
    const result = parseSiteMeta({
      framework: "react",
      reactFiles: ["file1.tsx", "file2.tsx"],
    });
    assert.deepEqual(result, {});
  });
});

describe("schemas Zod exportés", () => {
  it("SiteBriefSchema accepte tous champs optionnels", () => {
    const result = SiteBriefSchema.safeParse({});
    assert.equal(result.success, true);
  });

  it("SiteMetaSchema accepte tous champs optionnels", () => {
    const result = SiteMetaSchema.safeParse({});
    assert.equal(result.success, true);
  });
});
