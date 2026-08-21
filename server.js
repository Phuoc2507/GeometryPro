// PHẢI đứng ĐẦU TIÊN: nạp .env.local trước khi các handler (import bên dưới) đọc process.env.
import './load-env.js';
import express from 'express';
import cors from 'cors';
import { pathToFileURL } from 'url';

// We need to dynamically import the handlers because they use ES modules
import analyzeGeometryHandler from './api/analyze-geometry.js';
import analyzeGeometryV2Handler from './api/analyze-geometry-v2.js';
import modifyGeometryHandler from './api/modify-geometry.js';
import solveHandler from './api/solve.js';
import checkoutHandler from './api/checkout.js';
import webhookHandler from './api/webhook.js';
import analyzeAdvanceHandler from './api/analyze-advance.js';
import adminHandler from './api/admin.js';
import adminRedrawHandler from './api/admin-redraw.js';
import referralHandler from './api/referral.js';
import payoutAccountHandler from './api/payout-account.js';
import withdrawHandler from './api/withdraw.js';
import shareHandler from './api/share.js';
import ogHandler from './api/og.js';
import sitemapHandler from './api/sitemap.js';

export function createApp() {
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

app.post('/api/analyze-advance', async (req, res) => {
  try {
    await analyzeAdvanceHandler(req, res);
  } catch (error) {
    console.error('Error in /api/analyze-advance:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
});

app.post('/api/modify-geometry', async (req, res) => {
  try {
    await modifyGeometryHandler(req, res);
  } catch (error) {
    console.error('Error in /api/modify-geometry:', error);
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

app.post('/api/admin', async (req, res) => {
  try {
    await adminHandler(req, res);
  } catch (error) {
    console.error('Error in /api/admin:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
});

app.post('/api/admin-redraw', async (req, res) => {
  try {
    await adminRedrawHandler(req, res);
  } catch (error) {
    console.error('Error in /api/admin-redraw:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
});

app.get('/api/referral', async (req, res) => {
  try {
    await referralHandler(req, res);
  } catch (error) {
    console.error('Error in /api/referral:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
});

app.post('/api/payout-account', async (req, res) => {
  try {
    await payoutAccountHandler(req, res);
  } catch (error) {
    console.error('Error in /api/payout-account:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
});

// Link chia sẻ có thẻ OG riêng. Trên Vercel hai đường này do rewrite trong vercel.json
// trỏ vào /api/share và /api/og (id tới dưới dạng query thật); ở local phải tự nhét
// tham số tuyến vào req.query cho khớp.
// Express 5 định nghĩa `query` là getter trên prototype ⇒ gán thẳng sẽ ném TypeError.
// Định nghĩa một thuộc tính riêng trên chính instance để che getter đó.
function withQueryId(req, id) {
  Object.defineProperty(req, 'query', {
    value: { ...req.query, id },
    configurable: true,
    enumerable: true,
  });
}

app.get('/s/:id', async (req, res) => {
  withQueryId(req, req.params.id);
  try {
    await shareHandler(req, res);
  } catch (error) {
    console.error('Error in /s/:id:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
});

// Sitemap động (index + trang con). Trên Vercel do rewrite trong vercel.json trỏ vào
// /api/sitemap; mount ở đây để chạy local giống hệt production.
function mountSitemap(route, queryFor) {
  app.get(route, async (req, res) => {
    Object.defineProperty(req, 'query', {
      value: { ...req.query, ...queryFor(req) },
      configurable: true,
      enumerable: true,
    });
    try {
      await sitemapHandler(req, res);
    } catch (error) {
      console.error(`Error in ${route}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Internal Server Error' });
      }
    }
  });
}

mountSitemap('/sitemap.xml', () => ({ kind: 'index' }));
mountSitemap('/sitemap-pages.xml', () => ({ kind: 'pages' }));
mountSitemap('/sitemap-shares-:page.xml', (req) => ({
  kind: 'shares',
  page: String(req.params.page || '1').replace(/\.xml$/i, ''),
}));

app.get('/og/s/:id.png', async (req, res) => {
  withQueryId(req, String(req.params.id || '').replace(/\.png$/i, ''));
  try {
    await ogHandler(req, res);
  } catch (error) {
    console.error('Error in /og/s/:id.png:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
});

app.post('/api/withdraw', async (req, res) => {
  try {
    await withdrawHandler(req, res);
  } catch (error) {
    console.error('Error in /api/withdraw:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
});

return app;
}

const PORT = 3000;
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
const app = createApp();
app.listen(PORT, () => {
  console.log(`✅ Vercel Local API Mock Server running at http://localhost:${PORT}`);
  console.log(`- Ready to receive requests for /api/analyze-geometry`);
  console.log(`- Ready to receive requests for /api/modify-geometry`);
  console.log(`- Ready to receive requests for /api/solve`);
  console.log(`- Ready to receive requests for /api/checkout`);
  console.log(`- Ready to receive requests for /api/webhook`);
});
}
