// SafeBite API client: talks to Node/Express gateway
// Provides run + SSE stream helpers for the frontend.

import { AgentStep, InputType, SafeBiteResponse, UserPrefs } from '../types';

const API_BASE = import.meta.env.VITE_AGENT_KIT_URL || '';

export interface RunPayload {
  input_type: InputType;
  raw_text?: string;
  image_base64?: string;
  mime_type?: string;
  barcode?: string;
  recipe?: string;
  prefs?: UserPrefs;
}

export async function startRun(payload: RunPayload): Promise<string> {
  const res = await fetch(`${API_BASE}/api/agent/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`startRun failed: ${res.status} ${msg}`);
  }
  const data = await res.json();
  return data.session_id as string;
}

interface StreamOptions {
  onStep: (step: AgentStep) => void;
  onFinal: (resp: SafeBiteResponse) => void;
  onError: (err: string) => void;
}

export function streamRun(sessionId: string, opts: StreamOptions): () => void {
  const es = new EventSource(`${API_BASE}/api/agent/stream?session_id=${sessionId}`);
  es.addEventListener('step', (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data);
      opts.onStep(data);
    } catch (err) {
      opts.onError('Failed to parse step event');
    }
  });
  es.addEventListener('final', (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data) as SafeBiteResponse;
      opts.onFinal(data);
      es.close();
    } catch (err) {
      opts.onError('Failed to parse final event');
    }
  });
  es.addEventListener('error', () => {
    opts.onError('Stream error');
    es.close();
  });
  return () => es.close();
}
