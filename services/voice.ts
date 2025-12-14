// Optional ElevenLabs voice playback helper
// Requires VITE_ELEVENLABS_API_KEY and VITE_ELEVENLABS_VOICE_ID

const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID;

export async function playVoice(text: string): Promise<void> {
  if (!API_KEY || !VOICE_ID) throw new Error('Voice not configured');
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.4, similarity_boost: 0.7 }
    })
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Voice synthesis failed: ${msg}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await audio.play();
}

export function voiceAvailable(): boolean {
  return Boolean(API_KEY && VOICE_ID);
}
