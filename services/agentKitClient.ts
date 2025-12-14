import { InputType, SafeBiteResponse, UserPrefs } from '../types';

export interface AgentKitPayload {
  user_prompt: string;
  input_type: InputType;
  prefs: UserPrefs;
  image_base64?: string;
  mime_type?: string;
  barcode?: string;
  raw_text?: string;
}

const normalizeBaseUrl = (url: string) => url.replace(/\/?$/, '');

export async function callAgentKit(payload: AgentKitPayload): Promise<SafeBiteResponse> {
  const baseUrl = import.meta.env.VITE_AGENT_KIT_URL;
  if (!baseUrl) throw new Error('VITE_AGENT_KIT_URL is not configured.');

  const endpoint = `${normalizeBaseUrl(baseUrl)}/run`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Agent Kit request failed: ${res.status} ${message}`);
  }

  const data = (await res.json()) as SafeBiteResponse;
  return data;
}
