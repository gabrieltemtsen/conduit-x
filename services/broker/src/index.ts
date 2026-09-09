import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { BrokerTask } from '@conduitx/types';
import { globalBroker } from './broker-engine';

const app: express.Express = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 4005);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ACTIVE',
    service: 'conduitx-broker-agent',
    budgetStatus: globalBroker.getBudgetStatus()
  });
});

// SSE Live Stream Endpoint for Console
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const unsubscribe = globalBroker.onEvent((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  // Keep-alive ping
  const interval = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(interval);
    unsubscribe();
  });
});

// Execute Query / Task Endpoint
app.post('/execute', async (req, res) => {
  const task: BrokerTask = {
    taskId: req.body?.taskId || `task_${crypto.randomBytes(6).toString('hex')}`,
    category: req.body?.category || 'defi-pools',
    query: req.body?.query || 'Top DEX pools by TVL',
    params: req.body?.params || { limit: 5 },
    maxBudgetHbar: Number(req.body?.maxBudgetHbar || 2.0),
    allowFailover: req.body?.allowFailover ?? true
  };

  try {
    const result = await globalBroker.executeTask(task);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Reset / Set Budget Endpoint
app.post('/budget', (req, res) => {
  const budget = Number(req.body?.budgetHbar || 2.0);
  globalBroker.resetBudget(budget);
  res.json({ success: true, budgetStatus: globalBroker.getBudgetStatus() });
});

// Get current budget status
app.get('/budget', (req, res) => {
  res.json(globalBroker.getBudgetStatus());
});

export { app as brokerApp };
export * from './broker-engine';

if (process.env.STANDALONE === 'true' || (process.argv[1] && process.argv[1].endsWith('broker/src/index.ts'))) {
  app.listen(PORT, () => {
    console.log(`[broker] Running on http://localhost:${PORT}`);
  });
}
