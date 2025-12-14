import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// In a real monorepo, the key would be server-side. For this demo, we use the env var directly.
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const GEMINI_MODEL_FAST = 'gemini-2.5-flash'; // Good for general reasoning
export const GEMINI_MODEL_REASONING = 'gemini-2.5-flash'; // Using flash for speed in this demo
