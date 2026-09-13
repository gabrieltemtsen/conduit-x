'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Play,
  RefreshCw,
  ShieldCheck,
  Terminal,
  TrendingUp,
  Wallet
} from 'lucide-react';
import {
  BrokerExecutionResult,
  BrokerStep,
  HCSReceiptMessage,
  ProviderReputation,
  SellerService
} from '@conduitx/types';
import { Panel, PanelHeader, Stat, Button, StatusDot, EmptyState } from './components/ui';
import { McpModal } from './components/McpModal';

const HCS_TOPIC_ID = '0.0.5694210';

const DATASETS = [
  {
    id: 'defi-pools' as const,
    icon: TrendingUp,
    name: 'DEX Pool Analytics',
    description: 'Top pools by TVL, 24h volume, fee tiers from the Uniswap subgraph.',
    priceHbar: '~0.030'
  },
  {
    id: 'token-risk' as const,
    icon: ShieldCheck,
    name: 'Token Risk Radar',
    description: 'Holder concentration, liquidity depth, honeypot risk metrics.',
    priceHbar: '~0.045'
  },
  {
    id: 'wallet-portfolio' as const,
    icon: Wallet,
    name: 'Cross-Protocol Wallet Reader',
    description: 'LP positions, Aave debt, and spot balances for one address.',
    priceHbar: '~0.035'
  }
];

const TABS = [
  { id: 'pipeline' as const, icon: Layers, label: 'Settlement Pipeline' },
  { id: 'data' as const, icon: Database, label: 'Delivered Data' },
  { id: 'receipts' as const, icon: ShieldCheck, label: 'HCS Receipts' },
  { id: 'reputation' as const, icon: TrendingUp, label: 'Reputation' }
];

function phaseLabel(phase: BrokerStep['phase']): string {
  switch (phase) {
    case 'DISCOVER':
      return 'Discover';
    case 'SCORE':
      return 'Score';
    case 'CHALLENGE_402':
      return '402 Challenge';
    case 'PAY_HEDERA':
      return 'Pay';
    case 'RECORD_HCS':
      return 'HCS Receipt';
    case 'DELIVER_DATA':
      return 'Deliver';
    case 'FAILOVER':
      return 'Failover';
    default:
      return phase;
  }
}

export default function ConsoleDashboard() {
  const [services, setServices] = useState<SellerService[]>([]);
  const [reputations, setReputations] = useState<ProviderReputation[]>([]);
  const [receipts, setReceipts] = useState<HCSReceiptMessage[]>([]);
  const [budgetStatus, setBudgetStatus] = useState({ budgetHbar: 2.0, totalSpentHbar: 0, initialBudgetHbar: 2.0 });
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<BrokerExecutionResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'defi-pools' | 'token-risk' | 'wallet-portfolio'>('defi-pools');
  const [customLimit, setCustomLimit] = useState(5);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'data' | 'reputation' | 'receipts'>('pipeline');
  const [showMcpModal, setShowMcpModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [svcRes, repRes, rcptRes, bgtRes] = await Promise.all([
        fetch('/api/services').then((r) => r.json()),
        fetch('/api/reputation').then((r) => r.json()),
        fetch('/api/receipts').then((r) => r.json()),
        fetch('/api/broker').then((r) => r.json())
      ]);

      if (svcRes.services) setServices(svcRes.services);
      if (repRes.reputations) setReputations(repRes.reputations);
      if (rcptRes.receipts) setReceipts(rcptRes.receipts);
      if (bgtRes.budgetHbar !== undefined) setBudgetStatus(bgtRes);
    } catch (err) {
      console.error('Failed to load console data:', err);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      if (!ignore) {
        await fetchData();
      }
    };
    void init();
    const interval = setInterval(fetchData, 8000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [fetchData]);

  const runProcurement = async (category = selectedCategory, limit = customLimit) => {
    setLoading(true);
    setActiveTab('pipeline');

    let queryText = 'Top DEX pools by TVL';
    let params: Record<string, unknown> = { limit };

    if (category === 'token-risk') {
      queryText = 'Token security audit & top holder concentration';
      params = { symbols: ['USDC', 'WETH', 'LINK', 'UNI', 'PEPE'].slice(0, limit) };
    } else if (category === 'wallet-portfolio') {
      queryText = 'Cross-protocol wallet balance & debt reader';
      params = { walletAddress: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' };
    }

    try {
      const res = await fetch('/api/broker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          query: queryText,
          params,
          maxBudgetHbar: 1.0,
          allowFailover: true
        })
      });

      const result: BrokerExecutionResult = await res.json();
      setActiveTask(result);
      if (result.budgetRemainingHbar !== undefined) {
        setBudgetStatus((prev) => ({
          ...prev,
          budgetHbar: result.budgetRemainingHbar,
          totalSpentHbar: Number((prev.totalSpentHbar + (result.paidHbar || 0)).toFixed(4))
        }));
      }
      fetchData();
    } catch (err) {
      console.error('Procurement error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border-strong bg-panel font-data text-sm font-bold text-primary">
            X
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">ConduitX</span>
              <span className="rounded border border-border px-1.5 py-0.5 font-data text-[10px] font-medium text-muted-foreground">
                v1.0 testnet
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Agent data vending machine</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusDot tone="success" label="Hedera Testnet" />
          <StatusDot tone="success" label="Subgraph Studio" />
          <StatusDot tone="success" label="x402 Facilitator" />
          <Button variant="secondary" onClick={() => setShowMcpModal(true)}>
            <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
            Connect MCP
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 p-5">
        {/* Metrics row */}
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-panel">
            <Stat
              label="Agent Budget"
              value={budgetStatus.budgetHbar.toFixed(3)}
              unit="HBAR left"
              detail={`Spent ${budgetStatus.totalSpentHbar.toFixed(3)} HBAR`}
            />
          </div>
          <div className="bg-panel">
            <Stat
              label="HCS Receipts"
              value={String(receipts.length)}
              unit="minted"
              detail={
                <a
                  href={`https://hashscan.io/testnet/topic/${HCS_TOPIC_ID}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground transition-colors duration-100 hover:text-primary"
                >
                  Topic {HCS_TOPIC_ID} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              }
            />
          </div>
          <div className="bg-panel">
            <Stat
              label="Graph Sellers"
              value={String(services.length || 3)}
              unit="active"
              detail="Pools · Risk · Portfolio"
            />
          </div>
          <div className="bg-panel">
            <Stat
              label="Settlement Speed"
              value={activeTask?.latencyMs ? String(activeTask.latencyMs) : '2.8k'}
              unit="ms"
              detail="402 → Pay → HCS mint"
            />
          </div>
        </div>

        {/* Main split */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Left: procurement workbench */}
          <div className="space-y-4 lg:col-span-5">
            <Panel>
              <PanelHeader
                icon={Terminal}
                title="Procurement Studio"
                right={<span className="font-data text-[10px] text-muted-foreground">x402 autopay</span>}
              />
              <div className="space-y-4 p-4">
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-muted-foreground">Dataset</span>
                  <div className="space-y-1.5">
                    {DATASETS.map((ds) => {
                      const selected = selectedCategory === ds.id;
                      return (
                        <button
                          key={ds.id}
                          onClick={() => setSelectedCategory(ds.id)}
                          aria-pressed={selected}
                          className={`flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            selected
                              ? 'border-primary/50 bg-primary/10'
                              : 'border-border bg-panel-sunken hover:border-border-strong'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <ds.icon
                              className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`}
                              aria-hidden="true"
                            />
                            <div>
                              <div className="text-xs font-semibold text-foreground">{ds.name}</div>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">{ds.description}</p>
                            </div>
                          </div>
                          <span className="font-data whitespace-nowrap text-[11px] text-muted-foreground">
                            {ds.priceHbar} HBAR
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-[11px]">
                    <label htmlFor="row-limit" className="text-muted-foreground">
                      Rows / token depth
                    </label>
                    <span className="font-data font-medium text-foreground">{customLimit} items</span>
                  </div>
                  <input
                    id="row-limit"
                    type="range"
                    min="2"
                    max="10"
                    value={customLimit}
                    onChange={(e) => setCustomLimit(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer accent-primary"
                  />
                  <span className="block text-[11px] text-muted-foreground">
                    Price scales with query size (per-row cost metering).
                  </span>
                </div>

                <Button
                  variant="primary"
                  disabled={loading || budgetStatus.budgetHbar < 0.05}
                  onClick={() => runProcurement()}
                  className="w-full py-2.5"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Executing x402 procurement…
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      Execute metered query
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground">
                  <span>Zero API keys</span>
                  <span aria-hidden="true">·</span>
                  <span>No accounts</span>
                  <span aria-hidden="true">·</span>
                  <span>On-chain receipt</span>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                icon={Activity}
                title="Provider Leaderboard"
                right={
                  <button
                    onClick={() => setActiveTab('reputation')}
                    className="rounded text-[11px] font-medium text-primary transition-colors duration-100 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    View full
                  </button>
                }
              />
              <div className="space-y-2 p-3">
                {reputations.length > 0 ? (
                  reputations.map((rep) => (
                    <div
                      key={rep.serviceId}
                      className="flex items-center justify-between rounded-md border border-border bg-panel-sunken px-3 py-2"
                    >
                      <div>
                        <div className="text-xs font-semibold text-foreground">{rep.providerName.split('(')[0]}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {((rep.successRate || 1) * 100).toFixed(0)}% success · {rep.averageLatencyMs}ms avg
                        </div>
                      </div>
                      <span className="font-data text-xs font-semibold text-primary">{rep.compositeScore}/100</span>
                    </div>
                  ))
                ) : (
                  <p className="px-1 py-2 text-[11px] text-muted-foreground">No reputation data recorded yet.</p>
                )}
              </div>
            </Panel>
          </div>

          {/* Right: execution feed & data views */}
          <div className="space-y-3 lg:col-span-7">
            <div
              role="tablist"
              aria-label="Console views"
              className="flex flex-wrap items-center gap-1 border-b border-border pb-2"
            >
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      active ? 'bg-panel-hover text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {tab.label}
                    {tab.id === 'receipts' && receipts.length > 0 && (
                      <span className="font-data text-[10px] text-muted-foreground">({receipts.length})</span>
                    )}
                  </button>
                );
              })}
            </div>

            {activeTab === 'pipeline' && (
              <Panel>
                <PanelHeader
                  icon={Activity}
                  title="Execution Trace"
                  right={
                    activeTask?.success && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Settled in {activeTask.latencyMs}ms
                      </span>
                    )
                  }
                />
                <div className="p-4">
                  {activeTask?.steps && activeTask.steps.length > 0 ? (
                    <ol className="space-y-4">
                      {activeTask.steps.map((step) => {
                        const isFailover = step.phase === 'FAILOVER';
                        return (
                          <li
                            key={step.stepIndex}
                            className={`flex gap-3 border-l-2 pl-3 ${
                              isFailover ? 'border-danger' : 'border-border-strong'
                            }`}
                          >
                            <span className="font-data mt-0.5 shrink-0 text-[11px] text-muted-foreground">
                              {String(step.stepIndex + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                                <div className="flex items-baseline gap-2">
                                  <span
                                    className={`text-[10px] font-semibold uppercase tracking-wide ${
                                      isFailover ? 'text-danger' : 'text-primary'
                                    }`}
                                  >
                                    {phaseLabel(step.phase)}
                                  </span>
                                  <span className="text-xs font-medium text-foreground">{step.title}</span>
                                </div>
                                <span className="font-data text-[10px] text-muted-foreground">
                                  {new Date(step.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="font-data break-all text-xs text-muted-foreground">{step.detail}</p>
                              {step.metadata?.receipt?.hashScanUrl && (
                                <a
                                  href={step.metadata.receipt.hashScanUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors duration-100 hover:text-primary/80"
                                >
                                  Verify on HashScan <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <EmptyState
                      icon={Terminal}
                      title="Ready to execute autonomous data procurement"
                      description='Click "Execute metered query" on the left to watch the agent discover providers, handle the 402 challenge, pay on Hedera, and log the cryptographic receipt to HCS.'
                    />
                  )}
                </div>
              </Panel>
            )}

            {activeTab === 'data' && (
              <Panel>
                <PanelHeader
                  icon={Database}
                  title="Delivered Subgraph Data"
                  right={
                    activeTask?.serviceId && (
                      <span className="text-[11px] text-muted-foreground">Source: {activeTask.providerName}</span>
                    )
                  }
                />
                <div className="p-4">
                  {activeTask?.data ? (
                    <pre className="font-data max-h-96 overflow-x-auto rounded-md border border-border bg-panel-sunken p-4 text-xs text-foreground">
                      {JSON.stringify(activeTask.data, null, 2)}
                    </pre>
                  ) : (
                    <EmptyState
                      icon={Database}
                      title="No query executed yet"
                      description="Run a query from the workbench to view delivered Subgraph Studio records."
                    />
                  )}
                </div>
              </Panel>
            )}

            {activeTab === 'receipts' && (
              <Panel>
                <PanelHeader
                  icon={ShieldCheck}
                  title="Immutable HCS Receipt Ledger"
                  right={
                    <a
                      href={`https://hashscan.io/testnet/topic/${HCS_TOPIC_ID}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] font-medium text-primary transition-colors duration-100 hover:text-primary/80"
                    >
                      Open topic <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  }
                />
                <div className="max-h-96 space-y-2 overflow-y-auto p-3">
                  {receipts.length > 0 ? (
                    receipts.map((rcpt) => (
                      <div
                        key={rcpt.receiptId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-panel-sunken px-3 py-2.5"
                      >
                        <div>
                          <div className="font-data text-xs font-semibold text-foreground">{rcpt.receiptId}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {rcpt.providerName} · {rcpt.queryType}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-data text-xs font-semibold text-success">{rcpt.amountHbar} HBAR</span>
                          <a
                            href={rcpt.hashScanUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`View transaction ${rcpt.receiptId} on HashScan`}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors duration-100 hover:bg-panel-hover hover:text-primary"
                          >
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={ShieldCheck}
                      title="No receipts recorded yet"
                      description="Completed x402 settlements publish a cryptographic receipt to this HCS topic."
                    />
                  )}
                </div>
              </Panel>
            )}

            {activeTab === 'reputation' && (
              <Panel>
                <PanelHeader icon={TrendingUp} title="Deterministic Reputation Flywheel" />
                <div className="space-y-4 p-4">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    How ConduitX turns past HCS payment receipts into objective routing weights for the next agent:
                  </p>
                  <div className="font-data rounded-md border border-border bg-panel-sunken px-3.5 py-3 text-xs text-foreground">
                    Score = 0.35 · (1 / Price) + 0.45 · SuccessRate + 0.20 · Recency − Penalty(Failed)
                  </div>
                  <div className="space-y-2">
                    {reputations.length > 0 ? (
                      reputations.map((rep) => (
                        <div key={rep.serviceId} className="space-y-2 rounded-md border border-border bg-panel-sunken p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">{rep.providerName}</span>
                            <span className="font-data font-semibold text-primary">{rep.compositeScore}/100</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                            <div>
                              Success: <span className="font-data text-foreground">{((rep.successRate || 1) * 100).toFixed(1)}%</span>
                            </div>
                            <div>
                              Latency: <span className="font-data text-foreground">{rep.averageLatencyMs}ms</span>
                            </div>
                            <div>
                              Earned: <span className="font-data text-foreground">{rep.totalEarnedHbar} HBAR</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="px-1 py-2 text-[11px] text-muted-foreground">No reputation data recorded yet.</p>
                    )}
                  </div>
                </div>
              </Panel>
            )}
          </div>
        </div>
      </main>

      <McpModal open={showMcpModal} onClose={() => setShowMcpModal(false)} />

      <footer className="border-t border-border px-5 py-4 text-center text-[11px] text-muted-foreground">
        ConduitX · Decentralized Autonomous Agent Data Vending Machine · Powered by Hedera, The Graph &amp; x402
      </footer>
    </div>
  );
}
