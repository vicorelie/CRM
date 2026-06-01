// Tests unit pour lib/capi/enrich.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { enrichUserData, parseCookies, __testing } from "../enrich";

describe("parseCookies", () => {
  it("parses standard cookie header", () => {
    const cookies = parseCookies("_fbp=fb.1.123.456; _fbc=fb.1.789.abc; session=xyz");
    assert.equal(cookies.get("_fbp"), "fb.1.123.456");
    assert.equal(cookies.get("_fbc"), "fb.1.789.abc");
    assert.equal(cookies.get("session"), "xyz");
  });

  it("returns empty map for null/empty", () => {
    assert.equal(parseCookies(null).size, 0);
    assert.equal(parseCookies("").size, 0);
  });

  it("ignores malformed parts", () => {
    const cookies = parseCookies("ok=1; no-equal; =empty-key; ok2=2");
    assert.equal(cookies.get("ok"), "1");
    assert.equal(cookies.get("ok2"), "2");
    assert.equal(cookies.size, 2);
  });
});

describe("firstIp (via __testing)", () => {
  const { firstIp } = __testing;

  it("returns first IP from comma-separated list", () => {
    assert.equal(firstIp("203.0.113.42, 10.0.0.1"), "203.0.113.42");
  });

  it("filters private IPs (10.0.0.0/8)", () => {
    assert.equal(firstIp("10.0.0.1"), undefined);
  });

  it("filters private IPs (192.168.0.0/16)", () => {
    assert.equal(firstIp("192.168.1.1"), undefined);
  });

  it("filters private IPs (172.16.0.0/12)", () => {
    assert.equal(firstIp("172.16.0.1"), undefined);
    assert.equal(firstIp("172.31.255.255"), undefined);
  });

  it("does NOT filter 172.32+ (out of private range)", () => {
    assert.equal(firstIp("172.32.0.1"), "172.32.0.1");
  });

  it("filters localhost", () => {
    assert.equal(firstIp("127.0.0.1"), undefined);
    assert.equal(firstIp("::1"), undefined);
  });
});

describe("fbcFromFbclid (via __testing)", () => {
  const { fbcFromFbclid } = __testing;

  it("constructs valid fbc from fbclid param", () => {
    const fbc = fbcFromFbclid("https://example.com/?fbclid=IwAR0abc123", 1700000000000);
    assert.equal(fbc, "fb.1.1700000000000.IwAR0abc123");
  });

  it("returns undefined when no fbclid", () => {
    assert.equal(fbcFromFbclid("https://example.com/", 1700000000000), undefined);
  });

  it("returns undefined for malformed URL", () => {
    assert.equal(fbcFromFbclid("not-a-url", 1700000000000), undefined);
  });
});

describe("enrichUserData", () => {
  it("extracts IP from X-Forwarded-For", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.42, 10.0.0.1" });
    const out = enrichUserData(undefined, headers);
    assert.equal(out.client_ip_address, "203.0.113.42");
  });

  it("falls back to X-Real-IP", () => {
    const headers = new Headers({ "x-real-ip": "203.0.113.99" });
    const out = enrichUserData(undefined, headers);
    assert.equal(out.client_ip_address, "203.0.113.99");
  });

  it("falls back to CF-Connecting-IP (Cloudflare)", () => {
    const headers = new Headers({ "cf-connecting-ip": "198.51.100.1" });
    const out = enrichUserData(undefined, headers);
    assert.equal(out.client_ip_address, "198.51.100.1");
  });

  it("extracts User-Agent", () => {
    const headers = new Headers({ "user-agent": "Mozilla/5.0 Chrome/120" });
    const out = enrichUserData(undefined, headers);
    assert.equal(out.client_user_agent, "Mozilla/5.0 Chrome/120");
  });

  it("extracts _fbp and _fbc cookies", () => {
    const headers = new Headers({
      cookie: "_fbp=fb.1.1700000.123; _fbc=fb.1.1700000.IwAR0xyz",
    });
    const out = enrichUserData(undefined, headers);
    assert.equal(out.fbp, "fb.1.1700000.123");
    assert.equal(out.fbc, "fb.1.1700000.IwAR0xyz");
  });

  it("builds fbc from fbclid URL param when cookie absent", () => {
    const headers = new Headers();
    const out = enrichUserData(undefined, headers, "https://example.com/?fbclid=IwAR0abc", 1700000000000);
    assert.equal(out.fbc, "fb.1.1700000000000.IwAR0abc");
  });

  it("preserves client-supplied values (no override)", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4" });
    const out = enrichUserData({ client_ip_address: "9.9.9.9" }, headers);
    assert.equal(out.client_ip_address, "9.9.9.9");
  });

  it("merges email + server-enriched fields", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.1",
      "user-agent": "Mozilla/5.0",
      cookie: "_fbp=fb.1.x.y",
    });
    const out = enrichUserData({ em: "john@doe.com" }, headers);
    assert.equal(out.em, "john@doe.com"); // intact
    assert.equal(out.client_ip_address, "203.0.113.1");
    assert.equal(out.client_user_agent, "Mozilla/5.0");
    assert.equal(out.fbp, "fb.1.x.y");
  });

  it("handles plain object headers (not just Headers instances)", () => {
    const headers = {
      "X-Forwarded-For": "203.0.113.5",
      "User-Agent": "Bot/1.0",
    };
    const out = enrichUserData(undefined, headers);
    assert.equal(out.client_ip_address, "203.0.113.5");
    assert.equal(out.client_user_agent, "Bot/1.0");
  });
});
