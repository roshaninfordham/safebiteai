// Minimal mock Agent Starter Pack-compatible backend for local testing
// Not for production use.

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '6mb' }));

app.post('/run', (req, res) => {
  const { user_prompt, input_type, prefs, raw_text, barcode, image_base64, mime_type } = req.body || {};
  // Basic mock response; replace with real Agent Starter Pack output in production.
  const now = new Date().toISOString();
  const product = raw_text || user_prompt || barcode || 'Unknown item';

  const response = {
    session_id: `mock-${Math.random().toString(36).slice(2, 8)}`,
    product_name: product.slice(0, 50),
    ingredient_list: ['water', 'salt', 'spices'],
    allergen_risk: 'Contains mock data only. Replace with real backend analysis.',
    safety_score: 78,
    safety_flag: 'Low risk',
    sustainability_score: 65,
    sustainability_flag: 'Moderate impact',
    explanation_short: `Mock assessment for ${product}.`,
    explanation_detailed: `This is a mock response generated locally at ${now}.`,
    alternatives: [
      { name: 'Alt A', why: 'Lower salt', taste_similarity: '8/10' },
      { name: 'Alt B', why: 'Organic option', taste_similarity: '7/10' }
    ],
    next_steps: [
      'Verify ingredients on label.',
      'Consult your dietician for personal restrictions.'
    ],
    sources: [
      { title: 'Mock source 1', uri: 'https://example.com/mock1' },
      { title: 'Mock source 2', uri: 'https://example.com/mock2' }
    ]
  };

  res.json(response);
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Mock Agent Kit backend listening on http://localhost:${port}`);
});
