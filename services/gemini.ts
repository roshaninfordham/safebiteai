import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// Vite exposes env vars with VITE_ prefix; keep client creation here for demo purposes only.
export const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const GEMINI_MODEL_FAST = 'gemini-2.5-flash'; // Good for general reasoning
export const GEMINI_MODEL_REASONING = 'gemini-2.5-flash'; // Using flash for speed in this demo
