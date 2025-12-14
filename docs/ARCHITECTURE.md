# SafeBite Architecture (Phase 1)

## Overview
SafeBite is a food safety & sustainability agentic app that pairs a Vite/React frontend with a Node/Express gateway and the Google Agent Starter Pack agent backend. Gemini provides reasoning; open data sources provide facts. A single API contract serves the frontend: `/api/agent/run` for submission and `/api/agent/stream` (SSE) for live agent steps and final results.

## ASCII Diagram
```
+----------------------+           +-----------------------+          +-------------------------+
|   Vite/React UI      |  HTTPS    |   Node/Express API    |  HTTP    | Agent Starter Pack (Py) |
| - Inputs: text/img    |--------->| - /api/agent/run      |--------->| - ReAct tools (Gemini)  |
| - Timeline (SSE)     |  SSE <----| - /api/agent/stream   |  SSE <---| - Tools: OFF, openFDA   |
| - Voice & Avatar     |           | - Proxies/normalizes  |          |   FoodKeeper, news      |
+----------+-----------+           +-----------+-----------+          +-----------+-------------+
           ^                                   |                                 |
           |                                   |                                 |
           |                           +-------v------+                +---------v---------+
           |                           |  Data Sources |                | Gemini (reasoning)|
           |                           | - OpenFoodFacts|               | (multimodal, plan)|
           |                           | - openFDA      |               +-------------------+
           |                           | - FoodKeeper   |
           |                           | - Google Search|
           |                           +----------------+
```

## Responsibilities by Layer
- Frontend (Vite/React)
  - Collects multimodal inputs (text, image upload, barcode, recipe; voice optional)
  - Opens SSE to render agent timeline (pending/running/completed/error)
  - Shows final SafeBiteResponse (scores, flags, explanations, next steps, alternatives)
  - Triggers optional ElevenLabs voice playback and Anam avatar iframe when flagged

- Node/Express Gateway (in-repo)
  - Exposes stable contract: POST `/api/agent/run`, GET `/api/agent/stream?session_id=...`
  - Streams AgentStep events and final SafeBiteResponse via SSE
  - Proxies to Agent Starter Pack Python service (configurable STARTER_PACK_URL) or uses mock when unavailable
  - Normalizes schema, handles CORS, rate limiting, and error boundaries

- Agent Starter Pack (Python)
  - Hosts the SafeBite agent (Gemini brain)
  - Implements ReAct-style tool calls
  - Emits structured JSON and step traces

- Tools / Data
  - OpenFoodFacts: barcode → product, ingredients, allergens
  - openFDA recalls: recall status/details
  - FoodKeeper (bundled JSON): storage/spoilage guidance
  - News/outbreaks: Gemini search/grounding
  - Sustainability heuristic: category-based scoring

## API Contract (frontend-facing)
- POST `/api/agent/run`
  - Body: `{ input_type, raw_text?, image_base64?, mime_type?, barcode?, recipe?, prefs? }`
  - Returns: `{ session_id }`

- GET `/api/agent/stream?session_id=...`
  - SSE events:
    - `event: step`  data: `AgentStep`
    - `event: final` data: `SafeBiteResponse`
    - `event: error` data: `{ message }`

- SafeBiteResponse (fields)
  - `session_id`
  - `product_name`
  - `ingredient_list: string[]`
  - `allergen_risk: string`
  - `safety_score: number (0-100)` and `safety_flag: Safe|Caution|Unsafe`
  - `sustainability_score: number (0-100)` and `sustainability_flag`
  - `explanation_short`, `explanation_detailed`
  - `alternatives[]`, `next_steps[]`, `sources[]`
  - `trace?: AgentStep[]`

- AgentStep
  - `id`, `label`, `status (pending|running|completed|error)`, `timestamp`, `details?`

## Scoring Logic (planned)
- Safety score: start 100, subtract for recalls, allergen matches, spoilage risk; clamp 0–100; flags based on thresholds.
- Sustainability: category heuristic (beef/lamb low, plant-based high).

## Language & Voice
- Language: auto-detect via Gemini; respond in detected language.
- Voice: optional ElevenLabs WebSocket; playback on final output.
- Avatar: Anam iframe shown on onboarding or risky outcomes.

## Config & Env (planned)
- Frontend: `VITE_GEMINI_API_KEY` (for any client-side fallback), `VITE_AGENT_KIT_URL` (backend base), `VITE_AVATAR_IFRAME_URL`, `VITE_ELEVENLABS_AGENT_ID`.
- Backend: `API_KEY` (Gemini), `STARTER_PACK_URL` (Python agent base), `OPENFDA_API_KEY` (optional), `PORT`, `ALLOW_ORIGINS`.

## Phase Boundaries
- Phase 1 (this doc): Architecture & contracts defined; no new backend logic implemented yet.
- Next phases: implement Node gateway (SSE), hook Agent Starter Pack, wire tools, update frontend to consume the SSE stream, add voice/avatar toggles, harden error paths.
