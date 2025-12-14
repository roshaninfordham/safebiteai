// SafeBite Agent Runner (Node side)
// Orchestrates agent runs, streams steps, and normalizes SafeBiteResponse.

import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;
const starterPackUrl = process.env.STARTER_PACK_URL;

const sessions = new Map();
const foodkeeperPath = path.join(process.cwd(), "server", "data", "foodkeeper.json");
const foodkeeper = JSON.parse(fs.readFileSync(foodkeeperPath, "utf-8"));

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function createSession(sessionId) {
  sessions.set(sessionId, { events: [], final: null, error: null, subscribers: [] });
}

function pushEvent(sessionId, event) {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.events.push(event);
  session.subscribers.forEach((fn) => fn(event));
}

export function subscribe(sessionId, fn) {
  const session = sessions.get(sessionId);
  if (!session) return () => {};
  session.subscribers.push(fn);
  return () => {
    session.subscribers = session.subscribers.filter((f) => f !== fn);
  };
}

export function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

async function fetchOpenFoodFacts(barcode) {
  try {
    const resp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    if (!resp.ok) return { found: false };
    const data = await resp.json();
    if (!data.product) return { found: false };
    return {
      found: true,
      product_name: data.product.product_name || "Unknown product",
      ingredients_text: data.product.ingredients_text || "",
      allergens_tags: data.product.allergens_tags || [],
      categories: data.product.categories || "",
    };
  } catch (e) {
    return { error: "openfoodfacts_error" };
  }
}

async function fetchOpenFDARecalls(query) {
  try {
    const apiKey = process.env.OPENFDA_API_KEY;
    const url = new URL("https://api.fda.gov/food/enforcement.json");
    url.searchParams.set("search", `product_description:${query}`);
    url.searchParams.set("limit", "1");
    if (apiKey) url.searchParams.set("api_key", apiKey);
    const resp = await fetch(url);
    if (!resp.ok) return { has_recall: false };
    const data = await resp.json();
    const result = data.results && data.results[0];
    if (!result) return { has_recall: false };
    return {
      has_recall: true,
      details: result.reason_for_recall || "Recall found",
    };
  } catch (e) {
    return { error: "openfda_error", has_recall: false };
  }
}

function lookupFoodKeeper(nameOrCategory) {
  const lower = (nameOrCategory || "").toLowerCase();
  const match = foodkeeper.items.find((item) => lower.includes(item.category) || lower.includes(item.name.toLowerCase()));
  return match || null;
}

function sustainabilityScore(category = "") {
  const c = category.toLowerCase();
  if (c.includes("beef") || c.includes("lamb")) return { score: 25, flag: "High impact" };
  if (c.includes("pork") || c.includes("cheese")) return { score: 45, flag: "Medium-high" };
  if (c.includes("chicken") || c.includes("poultry") || c.includes("egg")) return { score: 65, flag: "Medium" };
  if (c.includes("plant") || c.includes("vegetable") || c.includes("fruit") || c.includes("grain") || c.includes("bean")) return { score: 90, flag: "Low" };
  return { score: 55, flag: "Medium" };
}

function computeSafety({ recall, allergens, foodkeeperHit }) {
  let score = 100;
  if (recall?.has_recall) score -= 40;
  if (allergens && allergens.length > 0) score -= 20;
  if (foodkeeperHit && foodkeeperHit.notes.toLowerCase().includes("risk")) score -= 10;
  score = Math.max(0, Math.min(100, score));
  let flag = "Low risk";
  if (score < 40) flag = "Unsafe";
  else if (score < 70) flag = "Caution";
  return { score, flag };
}

async function summarizeWithGemini(text, langHint = "English") {
  if (!ai) return `Summary unavailable (no API key). Input: ${text.slice(0, 120)}`;
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text }] }],
      config: { maxOutputTokens: 180, temperature: 0.4 },
    });
    return res.text?.trim() || text.slice(0, 160);
  } catch (e) {
    return `Summary unavailable. Input: ${text.slice(0, 120)}`;
  }
}

export async function startAgentRun(sessionId, payload) {
  createSession(sessionId);
  const emit = (id, label, status = "running", details) => {
    pushEvent(sessionId, {
      id,
      label,
      status,
      timestamp: new Date().toISOString(),
      details,
    });
  };

  const prefs = payload.prefs || { user_language: "English", diet_restriction: "none", location: "" };
  emit("intent", "Understanding request", "running");
  await delay(100);
  emit("intent", "Understanding request", "completed");

  // If an external Agent Starter Pack backend is configured, proxy and return final.
  if (starterPackUrl) {
    emit("proxy", "Proxying to Agent Starter Pack", "running");
    try {
      const resp = await fetch(`${starterPackUrl}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`Starter Pack error ${resp.status}`);
      const data = await resp.json();
      const session = sessions.get(sessionId);
      if (session) {
        session.final = data;
        session.subscribers.forEach((fn) => fn({ type: "final", data }));
      }
      emit("proxy", "Starter Pack response received", "completed");
      return;
    } catch (e) {
      emit("proxy", "Starter Pack proxy failed, falling back to local runner", "error", String(e));
      // Fall through to local runner
    }
  }

  let productName = payload.raw_text || payload.barcode || "Food item";
  let off = null;
  let recall = null;
  let fk = null;

  if (payload.barcode) {
    emit("barcode", "Looking up barcode", "running");
    off = await fetchOpenFoodFacts(payload.barcode);
    if (off?.found) {
      productName = off.product_name;
      fk = lookupFoodKeeper(off.categories || off.product_name);
      emit("barcode", "Barcode lookup complete", "completed");
    } else {
      emit("barcode", "Barcode not found", "error");
    }
  }

  emit("recall", "Checking recalls", "running");
  recall = await fetchOpenFDARecalls(productName || "food");
  emit("recall", recall?.has_recall ? "Recall detected" : "No recalls found", recall?.has_recall ? "completed" : "completed");

  emit("spoilage", "Checking storage guidance", "running");
  if (!fk) fk = lookupFoodKeeper(productName || "");
  emit("spoilage", fk ? "Storage guidance found" : "No storage guidance", fk ? "completed" : "completed");

  emit("sustainability", "Scoring sustainability", "running");
  const sust = sustainabilityScore(off?.categories || productName || "");
  emit("sustainability", "Sustainability scored", "completed");

  const allergens = off?.allergens_tags || [];
  const safety = computeSafety({ recall, allergens, foodkeeperHit: fk });

  emit("reasoning", "Summarizing with Gemini", "running");
  const explanation_short = await summarizeWithGemini(
    `Product: ${productName}. Recall: ${recall?.has_recall ? recall.details : "none"}. Allergens: ${allergens.join(",") || "none"}. Storage: ${fk?.notes || "n/a"}.`,
    prefs.user_language || "English"
  );
  emit("reasoning", "Summary ready", "completed");

  const response = {
    session_id: sessionId,
    product_name: productName,
    ingredient_list: (off?.ingredients_text || "").split(/,|;/).map((s) => s.trim()).filter(Boolean),
    allergen_risk: allergens.length ? `Potential allergens: ${allergens.join(", ")}` : "No common allergens detected in data.",
    safety_score: safety.score,
    safety_flag: safety.flag,
    sustainability_score: sust.score,
    sustainability_flag: sust.flag,
    explanation_short,
    explanation_detailed: fk?.notes || "Keep refrigerated if perishable; follow standard food safety practices.",
    alternatives: safety.flag === "Unsafe" || safety.flag === "Caution" ? [
      { name: "Plant-based alternative", why: "Lower risk and impact", taste_similarity: "7/10" },
      { name: "Local fresh produce", why: "Fewer recalls; shorter supply chain", taste_similarity: "6/10" }
    ] : [],
    next_steps: [
      recall?.has_recall ? "Do not consume; check recall details." : "Inspect packaging and consume within safe dates.",
      fk ? `Follow storage: ${fk.fridge_days} days in fridge; ${fk.freezer_months} months frozen.` : "Keep refrigerated if perishable.",
    ],
    sources: [
      ...(off?.found ? [{ title: "OpenFoodFacts", uri: `https://world.openfoodfacts.org/product/${payload.barcode}` }] : []),
      { title: "openFDA", uri: "https://open.fda.gov/apis/food/recall/" }
    ],
    trace: [],
  };

  const session = sessions.get(sessionId);
  if (session) {
    session.final = response;
    session.subscribers.forEach((fn) => fn({ type: "final", data: response }));
  }
}
