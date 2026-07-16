import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// We need to dynamically import the handlers because they use ES modules
import analyzeGeometryHandler from './api/analyze-geometry.js';
import analyzeGeometryV2Handler from './api/analyze-geometry-v2.js';
import solveHandler from './api/solve.js';
import checkoutHandler from './api/checkout.js';
import webhookHandler from './api/webhook.js';

const app = express();

// Enable CORS for all routes (so Vite dev server on port 8080 can communicate with port 3000)
app.use(cors());

// Parse JSON bodies with a larger limit for image Base64 uploads
app.use(express.json({ limit: '50mb' }));

app.post('/api/analyze-geometry', async (req, res) => {
  try {
    await analyzeGeometryHandler(req, res);
  } catch (error) {
    console.error('Error in /api/analyze-geometry:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
});

// Kernel mode (mới, chạy song song — engine tất định, không để LLM tự sinh toạ độ).
app.post('/api/analyze-geometry-v2', async (req, res) => {
  try {
    await analyzeGeometryV2Handler(req, res);
  } catch (error) {
    console.error('Error in /api/analyze-geometry-v2:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
});

app.post('/api/solve', async (req, res) => {
  try {
    await solveHandler(req, res);
  } catch (error) {
    console.error('Error in /api/solve:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
});

app.post('/api/checkout', async (req, res) => {
  try {
    await checkoutHandler(req, res);
  } catch (error) {
    console.error('Error in /api/checkout:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
});

app.post('/api/webhook', async (req, res) => {
  try {
    await webhookHandler(req, res);
  } catch (error) {
    console.error('Error in /api/webhook:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Vercel Local API Mock Server running at http://localhost:${PORT}`);
  console.log(`- Ready to receive requests for /api/analyze-geometry`);
  console.log(`- Ready to receive requests for /api/solve`);
  console.log(`- Ready to receive requests for /api/checkout`);
  console.log(`- Ready to receive requests for /api/webhook`);
});
