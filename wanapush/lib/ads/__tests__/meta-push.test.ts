// Tests unit pour le push Meta Ads (Sprint 2).
// On teste les helpers de mapping (objective, optimization_goal, CTA, billing).
// Le test de pushCampaign() lui-même nécessiterait un mock complet de fetch
// (4 appels Meta successifs) — on le couvre en intégration via QA E2E.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { __pushTesting } from "../meta";

const { mapObjective, mapOptimizationGoal, mapBillingEvent, mapCTA } = __pushTesting;

describe("mapObjective", () => {
  it("maps French keywords correctly (2026 — Trafic site → AWARENESS, seul à supporter destination WEBSITE sans Pixel)", () => {
    assert.equal(mapObjective("Notoriété"), "OUTCOME_AWARENESS");
    // "Trafic" site web → OUTCOME_AWARENESS en 2026 (seuls AWARENESS/LEADS/SALES supportent destination WEBSITE)
    assert.equal(mapObjective("Trafic"), "OUTCOME_AWARENESS");
    assert.equal(mapObjective("Engagement"), "OUTCOME_ENGAGEMENT");
    assert.equal(mapObjective("Lead"), "OUTCOME_LEADS");
    assert.equal(mapObjective("Vente"), "OUTCOME_SALES");
    assert.equal(mapObjective("Conversions"), "OUTCOME_SALES");
    // OUTCOME_TRAFFIC réservé aux destinations conversationnelles (Messenger/WhatsApp/Phone)
    assert.equal(mapObjective("Messagerie"), "OUTCOME_TRAFFIC");
    assert.equal(mapObjective("Appel téléphonique"), "OUTCOME_TRAFFIC");
  });

  it("maps English keywords correctly (2026)", () => {
    assert.equal(mapObjective("Awareness"), "OUTCOME_AWARENESS");
    assert.equal(mapObjective("Traffic"), "OUTCOME_AWARENESS"); // 2026: website traffic → AWARENESS
    assert.equal(mapObjective("Leads"), "OUTCOME_LEADS");
    assert.equal(mapObjective("Sales"), "OUTCOME_SALES");
    assert.equal(mapObjective("App installs"), "OUTCOME_APP_PROMOTION");
    assert.equal(mapObjective("WhatsApp messages"), "OUTCOME_TRAFFIC");
  });

  it("falls back to OUTCOME_AWARENESS for unknown/empty (safest for website destination)", () => {
    assert.equal(mapObjective(undefined), "OUTCOME_AWARENESS");
    assert.equal(mapObjective(""), "OUTCOME_AWARENESS");
    assert.equal(mapObjective("xyzzy"), "OUTCOME_AWARENESS");
  });

  it("is case-insensitive", () => {
    assert.equal(mapObjective("LEADS"), "OUTCOME_LEADS");
    assert.equal(mapObjective("leads"), "OUTCOME_LEADS");
    assert.equal(mapObjective("LeAdS"), "OUTCOME_LEADS");
  });
});

describe("mapOptimizationGoal", () => {
  it("returns REACH for awareness", () => {
    assert.equal(mapOptimizationGoal("OUTCOME_AWARENESS"), "REACH");
  });

  it("returns LINK_CLICKS for traffic", () => {
    assert.equal(mapOptimizationGoal("OUTCOME_TRAFFIC"), "LINK_CLICKS");
  });

  it("returns POST_ENGAGEMENT for OUTCOME_ENGAGEMENT (interactions sociales)", () => {
    // ENGAGEMENT = interactions sociales sur post/page → POST_ENGAGEMENT (universel)
    assert.equal(mapOptimizationGoal("OUTCOME_ENGAGEMENT"), "POST_ENGAGEMENT");
  });

  it("returns OFFSITE_CONVERSIONS for leads and sales", () => {
    assert.equal(mapOptimizationGoal("OUTCOME_LEADS"), "OFFSITE_CONVERSIONS");
    assert.equal(mapOptimizationGoal("OUTCOME_SALES"), "OFFSITE_CONVERSIONS");
  });

  it("returns APP_INSTALLS for app promotion", () => {
    assert.equal(mapOptimizationGoal("OUTCOME_APP_PROMOTION"), "APP_INSTALLS");
  });

  it("falls back to LINK_CLICKS for unknown", () => {
    assert.equal(mapOptimizationGoal("UNKNOWN_OBJECTIVE"), "LINK_CLICKS");
  });
});

describe("mapBillingEvent", () => {
  it("returns LINK_CLICKS for traffic (billed per click)", () => {
    assert.equal(mapBillingEvent("OUTCOME_TRAFFIC"), "LINK_CLICKS");
  });

  it("returns POST_ENGAGEMENT for OUTCOME_ENGAGEMENT and legacy POST_ENGAGEMENT", () => {
    assert.equal(mapBillingEvent("OUTCOME_ENGAGEMENT"), "POST_ENGAGEMENT");
    assert.equal(mapBillingEvent("POST_ENGAGEMENT"), "POST_ENGAGEMENT");
  });

  it("returns IMPRESSIONS as default (awareness, leads, sales)", () => {
    assert.equal(mapBillingEvent("OUTCOME_AWARENESS"), "IMPRESSIONS");
    assert.equal(mapBillingEvent("OUTCOME_LEADS"), "IMPRESSIONS");
    assert.equal(mapBillingEvent("OUTCOME_SALES"), "IMPRESSIONS");
  });
});

describe("mapCTA", () => {
  it("recognizes French CTAs", () => {
    assert.equal(mapCTA("En savoir plus"), "LEARN_MORE");
    assert.equal(mapCTA("Acheter maintenant"), "SHOP_NOW");
    assert.equal(mapCTA("Achetez"), "SHOP_NOW");
    assert.equal(mapCTA("S'inscrire"), "SUBSCRIBE");
    assert.equal(mapCTA("Nous contacter"), "CONTACT_US");
    assert.equal(mapCTA("Réserver"), "BOOK_TRAVEL");
    assert.equal(mapCTA("Télécharger"), "DOWNLOAD");
    assert.equal(mapCTA("Appeler"), "CALL_NOW");
    assert.equal(mapCTA("Postuler"), "APPLY_NOW");
    assert.equal(mapCTA("Faire un don"), "DONATE");
    assert.equal(mapCTA("Demander un devis"), "GET_QUOTE");
    assert.equal(mapCTA("Commencer"), "GET_STARTED");
    assert.equal(mapCTA("Voir la vidéo"), "WATCH_MORE");
  });

  it("recognizes English CTAs", () => {
    assert.equal(mapCTA("Learn more"), "LEARN_MORE");
    assert.equal(mapCTA("Shop now"), "SHOP_NOW");
    assert.equal(mapCTA("Sign up"), "SUBSCRIBE");
    assert.equal(mapCTA("Contact us"), "CONTACT_US");
    assert.equal(mapCTA("Book now"), "BOOK_TRAVEL");
    assert.equal(mapCTA("Download"), "DOWNLOAD");
    assert.equal(mapCTA("Call now"), "CALL_NOW");
    assert.equal(mapCTA("Apply now"), "APPLY_NOW");
    assert.equal(mapCTA("Get a quote"), "GET_QUOTE");
    assert.equal(mapCTA("Get started"), "GET_STARTED");
    assert.equal(mapCTA("Watch"), "WATCH_MORE");
  });

  it("falls back to LEARN_MORE for empty/unknown", () => {
    assert.equal(mapCTA(undefined), "LEARN_MORE");
    assert.equal(mapCTA(""), "LEARN_MORE");
    assert.equal(mapCTA("   "), "LEARN_MORE");
    assert.equal(mapCTA("xyzzy"), "LEARN_MORE");
  });

  it("is case-insensitive", () => {
    assert.equal(mapCTA("ACHETER"), "SHOP_NOW");
    assert.equal(mapCTA("Acheter"), "SHOP_NOW");
    assert.equal(mapCTA("acheter"), "SHOP_NOW");
  });
});

describe("Integration sanity checks", () => {
  it("Leads objective → conversions optimization → impressions billing (coherent for lead-gen)", () => {
    const obj = mapObjective("Leads");
    assert.equal(obj, "OUTCOME_LEADS");
    assert.equal(mapOptimizationGoal(obj), "OFFSITE_CONVERSIONS");
    assert.equal(mapBillingEvent(obj), "IMPRESSIONS");
  });

  it("Website traffic (Trafic) → AWARENESS objective + REACH optim + IMPRESSIONS billing (2026, destination WEBSITE OK)", () => {
    // Site web en 2026 : OUTCOME_AWARENESS est le seul objectif universel à accepter destination_type=WEBSITE
    // sans nécessiter un Pixel (LEADS/SALES en demandent un)
    const obj = mapObjective("Trafic");
    assert.equal(obj, "OUTCOME_AWARENESS");
    assert.equal(mapOptimizationGoal(obj), "REACH");
    assert.equal(mapBillingEvent(obj), "IMPRESSIONS");
  });

  it("Messaging traffic (WhatsApp/Messenger) → OUTCOME_TRAFFIC (conversationnel)", () => {
    const obj = mapObjective("Messagerie WhatsApp");
    assert.equal(obj, "OUTCOME_TRAFFIC");
    assert.equal(mapOptimizationGoal(obj), "LINK_CLICKS");
    assert.equal(mapBillingEvent(obj), "LINK_CLICKS");
  });

  it("Engagement (post likes) → OUTCOME_ENGAGEMENT + POST_ENGAGEMENT optim + POST_ENGAGEMENT billing", () => {
    const obj = mapObjective("Engagement");
    assert.equal(obj, "OUTCOME_ENGAGEMENT");
    assert.equal(mapOptimizationGoal(obj), "POST_ENGAGEMENT");
    assert.equal(mapBillingEvent(obj), "POST_ENGAGEMENT");
  });

  it("Awareness → reach + impressions (cheapest CPM)", () => {
    const obj = mapObjective("Notoriété");
    assert.equal(obj, "OUTCOME_AWARENESS");
    assert.equal(mapOptimizationGoal(obj), "REACH");
    assert.equal(mapBillingEvent(obj), "IMPRESSIONS");
  });
});
