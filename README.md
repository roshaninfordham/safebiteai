<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Vz_tswgnCpRL2jsG3mEXh_fHZmO3cJHF

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and set:
   - `VITE_GEMINI_API_KEY` to your Gemini (AI Studio) API key
   - `VITE_AGENT_KIT_URL` should point to the Node API gateway (default `http://localhost:8000`)
   - Optional voice: `VITE_ELEVENLABS_API_KEY`, `VITE_ELEVENLABS_VOICE_ID`
   - Backend envs (for Node API): `API_KEY` (Gemini server-side), optional `STARTER_PACK_URL` (Python Agent Starter Pack), optional `OPENFDA_API_KEY`, optional `ALLOW_ORIGINS="http://localhost:5173"`
3. Start the API gateway (SSE + data tools):
   `npm run api`
4. In another terminal, start the frontend:
   `npm run dev`

## Docker / Cloud Run (API gateway)

Build and run the API-only container (frontend still runs with `npm run dev` pointing to it):

1. Build: `docker build -t safebite-api .`
2. Run: `docker run -p 8000:8000 -e API_KEY=YOUR_GEMINI_KEY safebite-api`
   - Optional: `-e STARTER_PACK_URL=https://your-starter-pack-host` to proxy to the Python backend.
   - Optional: `-e OPENFDA_API_KEY=...` and `-e ALLOW_ORIGINS="http://localhost:5173"`.
3. Point the UI to it: set `VITE_AGENT_KIT_URL=http://localhost:8000` and run `npm run dev` locally.

Cloud Run (example):
- `gcloud builds submit --tag gcr.io/PROJECT_ID/safebite-api`
- `gcloud run deploy safebite-api --image gcr.io/PROJECT_ID/safebite-api --platform managed --allow-unauthenticated --set-env-vars API_KEY=YOUR_GEMINI_KEY`
- Add `STARTER_PACK_URL` if you want the Node gateway to proxy to the Python Agent Starter Pack.

## Use with Google Agent Starter Pack

The frontend can route requests to an Agent Starter Pack backend if you have one running (for example, from `uvx agent-starter-pack create`).

Default: the Node gateway in this repo is the primary backend. If you have a Python Agent Starter Pack instance, you can point it behind the gateway later (STARTER_PACK_URL), otherwise use the built-in Node runner.

1. Start the Node gateway: `npm run api` (port 8000 by default).
2. Ensure `VITE_AGENT_KIT_URL=http://localhost:8000` in `.env.local`.
3. Start the frontend: `npm run dev` and use the UI.

### Backend expectations

- Endpoint: `POST /run`
- Suggested request payload (you can adapt on the backend):
   ```json
   {
      "user_prompt": "original text input",
      "input_type": "text | image | barcode | recipe",
      "prefs": {"user_language":"English","diet_restriction":"gluten-free","location":"New York, USA"},
      "raw_text": "text input or recipe",
      "barcode": "0123456789",
      "image_base64": "...",
      "mime_type": "image/png"
   }
   ```
- Response: JSON matching the `SafeBiteResponse` shape defined in `types.ts`.

This lets you keep the SafeBite UI while swapping the reasoning stack for an Agent Starter Pack / ADK-powered backend.

### Quick curl smoke
1) Start the API gateway (`npm run api`).
2) `curl -s -X POST http://localhost:8000/api/agent/run -H "Content-Type: application/json" -d '{"input_type":"barcode","barcode":"0123456789"}'`
   → returns `{ "session_id": "..." }`
3) `curl -N http://localhost:8000/api/agent/stream?session_id=<id>`
   → streams `event: step` updates followed by `event: final` SafeBiteResponse.

## Architecture (Phase 1)

- Frontend: Vite/React UI with multimodal inputs, timeline, results, optional voice + avatar.
- Backend gateway (to be implemented next): Node/Express exposing `/api/agent/run` and `/api/agent/stream` (SSE), proxying to Agent Starter Pack (Python) or local mock.
- Agent backend: Agent Starter Pack (Gemini brain) with tools (OpenFoodFacts, openFDA, FoodKeeper, news/grounding, sustainability heuristic).
- Contract: `POST /api/agent/run` → `{ session_id }`; `GET /api/agent/stream?session_id=...` streams AgentStep events and final SafeBiteResponse.

See the detailed ASCII diagram and contracts in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
