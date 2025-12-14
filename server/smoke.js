// Minimal smoke test for SafeBite API (requires API running on PORT)
// Usage: node server/smoke.js

const API = process.env.API_BASE || `http://localhost:${process.env.PORT || 8000}`;

async function main() {
  const runResp = await fetch(`${API}/api/agent/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input_type: 'barcode', barcode: '0123456789' })
  });
  if (!runResp.ok) {
    console.error('Run failed', await runResp.text());
    process.exit(1);
  }
  const { session_id } = await runResp.json();
  console.log('Session:', session_id);

  const res = await fetch(`${API}/api/agent/stream?session_id=${session_id}`);
  if (!res.ok || !res.body) {
    console.error('Stream failed', res.status);
    process.exit(1);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let finalSeen = false;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    process.stdout.write(chunk);
    if (chunk.includes('event: final')) finalSeen = true;
  }
  if (!finalSeen) {
    console.error('Final event not seen');
    process.exit(1);
  }
  console.log('\nSmoke test passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
