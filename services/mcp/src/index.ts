import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { DEFAULT_SERVICES, computeProviderReputations } from '@conduitx/registry';
import { globalBroker } from '@conduitx/broker';
import crypto from 'node:crypto';

const server = new Server(
  {
    name: 'conduitx-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Define MCP Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'discover_data_services',
        description: 'Discover available decentralized data sellers on ConduitX (DEX Pools, Token Risk, Wallet Portfolios) with live pricing and provider status.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['defi-pools', 'token-risk', 'wallet-portfolio'],
              description: 'Optional category filter for data services'
            }
          }
        }
      },
      {
        name: 'get_provider_reputation',
        description: 'Query HCS on-chain receipt history to evaluate provider reliability, success rates, latency, and composite reputation scores.',
        inputSchema: {
          type: 'object',
          properties: {
            serviceId: {
              type: 'string',
              description: 'Optional ID of a specific service (e.g. seller-pools, seller-risk, seller-portfolio)'
            }
          }
        }
      },
      {
        name: 'execute_metered_query',
        description: 'Autonomous micro-payment data query: discovers provider, settles payment via x402 on Hedera, logs cryptographic HCS receipt, and delivers Subgraph Studio data.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['defi-pools', 'token-risk', 'wallet-portfolio'],
              description: 'The category of on-chain data to procure'
            },
            query: {
              type: 'string',
              description: 'Description of the data query (e.g. "Top DEX pools by TVL" or "Risk audit for WETH and PEPE")'
            },
            params: {
              type: 'object',
              description: 'Query parameters (e.g. { limit: 5 } or { symbols: ["USDC", "LINK"] } or { walletAddress: "0x..." })'
            },
            maxBudgetHbar: {
              type: 'number',
              description: 'Maximum HBAR budget allocated for this query (e.g. 0.5)'
            }
          },
          required: ['category', 'query']
        }
      },
      {
        name: 'get_budget_ledger',
        description: 'Check the AI agent current remaining budget, total spent, and micro-payment ledger.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'discover_data_services') {
      const category = (args as any)?.category;
      const services = category
        ? DEFAULT_SERVICES.filter((s) => s.category === category)
        : DEFAULT_SERVICES;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ count: services.length, services }, null, 2)
          }
        ]
      };
    }

    if (name === 'get_provider_reputation') {
      const serviceId = (args as any)?.serviceId;
      const reputations = await computeProviderReputations();
      const filtered = serviceId ? reputations.filter((r) => r.serviceId === serviceId) : reputations;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ reputations: filtered }, null, 2)
          }
        ]
      };
    }

    if (name === 'execute_metered_query') {
      const category = (args as any)?.category || 'defi-pools';
      const query = (args as any)?.query || 'Data query';
      const params = (args as any)?.params || {};
      const maxBudgetHbar = Number((args as any)?.maxBudgetHbar || 1.0);

      const taskId = `mcp_${crypto.randomBytes(6).toString('hex')}`;
      const result = await globalBroker.executeTask({
        taskId,
        category,
        query,
        params,
        maxBudgetHbar,
        allowFailover: true
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }

    if (name === 'get_budget_ledger') {
      const status = globalBroker.getBudgetStatus();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status, null, 2)
          }
        ]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Tool error: ${err.message}`
        }
      ]
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[ConduitX MCP] Server running on stdio');
}

run().catch((err) => {
  console.error('[ConduitX MCP] Fatal error:', err);
  process.exit(1);
});
