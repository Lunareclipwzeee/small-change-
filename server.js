const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;
const KEY = process.env.ANTHROPIC_API_KEY;
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.get('/', (req, res) => {
  res.json({ status: 'SmallChange API running', key_loaded: KEY ? 'YES' : 'NO' });
});
app.post('/api/analyze', async (req, res) => {
  if (!KEY) return res.status(500).json({ error: 'API key not set' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KEY.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.listen(PORT, () => console.log(`Running on ${PORT} | Key: ${KEY ? 'YES' : 'NO'}`));
