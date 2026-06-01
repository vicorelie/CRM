// Tests unit pour lib/capi/pixel-script.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPixelSnippet, injectPixelIntoHtml, snippetVersion, __testing } from "../pixel-script";

const BASE_CONFIG = {
  pixelId: "1234567890",
  slug: "test-site",
  events: ["PageView", "Lead", "ViewContent"],
  consentRequired: false,
};

describe("assertSafeSlug", () => {
  it("accepts valid slugs", () => {
    assert.doesNotThrow(() => __testing.assertSafeSlug("my-site-123"));
    assert.doesNotThrow(() => __testing.assertSafeSlug("a"));
    assert.doesNotThrow(() => __testing.assertSafeSlug("ABC_xyz"));
  });

  it("rejects HTML-injection attempts", () => {
    assert.throws(() => __testing.assertSafeSlug("a<script>"), /non sûr/);
    assert.throws(() => __testing.assertSafeSlug("a'b"), /non sûr/);
    assert.throws(() => __testing.assertSafeSlug('a"b'), /non sûr/);
    assert.throws(() => __testing.assertSafeSlug("a b"), /non sûr/);
  });

  it("rejects empty or too long", () => {
    assert.throws(() => __testing.assertSafeSlug(""), /non sûr/);
    assert.throws(() => __testing.assertSafeSlug("a".repeat(201)), /non sûr/);
  });
});

describe("assertSafePixelId", () => {
  it("accepts numeric IDs 6-30 chars", () => {
    assert.doesNotThrow(() => __testing.assertSafePixelId("123456"));
    assert.doesNotThrow(() => __testing.assertSafePixelId("1234567890"));
  });

  it("rejects non-numeric", () => {
    assert.throws(() => __testing.assertSafePixelId("123abc"), /non sûr/);
    assert.throws(() => __testing.assertSafePixelId("1234'); alert('xss"), /non sûr/);
  });

  it("rejects too short", () => {
    assert.throws(() => __testing.assertSafePixelId("12345"), /non sûr/);
  });
});

describe("buildPixelSnippet", () => {
  it("includes pixelId and slug correctly escaped", () => {
    const snippet = buildPixelSnippet(BASE_CONFIG);
    assert.ok(snippet.includes('"1234567890"'), "pixelId présent en JS string");
    assert.ok(snippet.includes('"test-site"'), "slug présent en JS string");
  });

  it("includes events JSON array", () => {
    const snippet = buildPixelSnippet(BASE_CONFIG);
    assert.ok(snippet.includes('["PageView","Lead","ViewContent"]'));
  });

  it("includes Meta Pixel base code", () => {
    const snippet = buildPixelSnippet(BASE_CONFIG);
    assert.ok(snippet.includes("connect.facebook.net/en_US/fbevents.js"));
    assert.ok(snippet.includes("fbq('init',"));
  });

  it("includes bridge wpTrack function", () => {
    const snippet = buildPixelSnippet(BASE_CONFIG);
    assert.ok(snippet.includes("window.wpTrack"));
    assert.ok(snippet.includes('"/api/capi"'));
  });

  it("sets consented=true when consentRequired=false (phase test)", () => {
    const snippet = buildPixelSnippet({ ...BASE_CONFIG, consentRequired: false });
    assert.ok(snippet.includes("consented: true"));
  });

  it("sets consented=false when consentRequired=true (phase prod EU)", () => {
    const snippet = buildPixelSnippet({ ...BASE_CONFIG, consentRequired: true });
    assert.ok(snippet.includes("consented: false"));
    assert.ok(snippet.includes("consentRequired: true"));
  });

  it("includes noscript fallback pixel", () => {
    const snippet = buildPixelSnippet(BASE_CONFIG);
    assert.ok(snippet.includes("<noscript>"));
    assert.ok(snippet.includes("facebook.com/tr?id=1234567890"));
  });

  it("includes auto-Lead form hook", () => {
    const snippet = buildPixelSnippet(BASE_CONFIG);
    assert.ok(snippet.includes("autoLead"));
    assert.ok(snippet.includes("input[type=email]"));
    assert.ok(snippet.includes("input[type=tel]"));
  });

  it("throws on unsafe inputs", () => {
    assert.throws(() => buildPixelSnippet({ ...BASE_CONFIG, pixelId: "abc" }));
    assert.throws(() => buildPixelSnippet({ ...BASE_CONFIG, slug: "<script>" }));
  });
});

describe("injectPixelIntoHtml", () => {
  const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <title>Test</title>
  <meta charset="UTF-8">
</head>
<body>
  <h1>Hello</h1>
</body>
</html>`;

  it("injects snippet before </head>", () => {
    const out = injectPixelIntoHtml(SAMPLE_HTML, BASE_CONFIG);
    const headIdx = out.indexOf("</head>");
    const snippetIdx = out.indexOf("WanaPush Pixel");
    assert.ok(headIdx > 0);
    assert.ok(snippetIdx > 0 && snippetIdx < headIdx, "snippet doit être avant </head>");
  });

  it("falls back to </body> if no </head>", () => {
    const noHead = "<html><body>Bare</body></html>";
    const out = injectPixelIntoHtml(noHead, BASE_CONFIG);
    const bodyIdx = out.indexOf("</body>");
    const snippetIdx = out.indexOf("WanaPush Pixel");
    assert.ok(snippetIdx > 0 && snippetIdx < bodyIdx);
  });

  it("appends if neither </head> nor </body>", () => {
    const malformed = "<html><h1>Bare</h1>";
    const out = injectPixelIntoHtml(malformed, BASE_CONFIG);
    assert.ok(out.includes("WanaPush Pixel"));
  });

  it("replaces existing snippet when re-injecting (idempotent)", () => {
    const once = injectPixelIntoHtml(SAMPLE_HTML, BASE_CONFIG);
    const twice = injectPixelIntoHtml(once, { ...BASE_CONFIG, pixelId: "9999999999" });
    // Le nouveau snippet doit être présent
    assert.ok(twice.includes("9999999999"));
    // L'ancien doit être enlevé
    assert.equal(twice.includes("1234567890"), false);
    // Pas de duplication des marqueurs
    const matches = twice.match(/WanaPush Pixel \+ CAPI bridge/g);
    assert.equal(matches?.length, 1);
  });

  it("preserves the rest of the HTML untouched", () => {
    const out = injectPixelIntoHtml(SAMPLE_HTML, BASE_CONFIG);
    assert.ok(out.includes("<h1>Hello</h1>"));
    assert.ok(out.includes('lang="fr"'));
    assert.ok(out.includes('<meta charset="UTF-8">'));
  });

  it("uses different endpoint if specified", () => {
    const out = buildPixelSnippet({ ...BASE_CONFIG, capiEndpoint: "/custom/capi" });
    assert.ok(out.includes('"/custom/capi"'));
  });
});

describe("snippetVersion", () => {
  it("is deterministic for same config", () => {
    const v1 = snippetVersion(BASE_CONFIG);
    const v2 = snippetVersion(BASE_CONFIG);
    assert.equal(v1, v2);
    assert.equal(v1.length, 12);
  });

  it("differs when config changes", () => {
    const v1 = snippetVersion(BASE_CONFIG);
    const v2 = snippetVersion({ ...BASE_CONFIG, pixelId: "9999999999" });
    assert.notEqual(v1, v2);
  });
});
