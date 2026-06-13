import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { onboardingRouter } from './routes/onboarding.js';
import { agentRouter } from './routes/agent.js';
import { aguiRouter } from './routes/agui.js';
import { reportingRouter } from './routes/reporting.js';
import { connectRedis } from './redis/client.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/onboarding', onboardingRouter);
app.use('/api/agent', agentRouter);
app.use('/api/agui', aguiRouter);
app.use('/api/reporting', reportingRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
  try {
    await connectRedis();
    console.log('[redis] Connected to Redis');
    app.listen(PORT, () => {
      console.log(`[server] Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[server] Failed to connect to Redis:', err);
    // Start server anyway for development
    app.listen(PORT, () => {
      console.log(`[server] Backend running on http://localhost:${PORT} (no Redis)`);
    });
  }
}

start();
