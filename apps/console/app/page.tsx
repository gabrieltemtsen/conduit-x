'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
  TrendingUp,
  Wallet,
  Zap
} from 'lucide-react';
import {
  BrokerExecutionResult,
  BrokerStep,
  HCSReceiptMessage,
  ProviderReputation,
  SellerService
} from '@conduitx/types';

export default function ConsoleDashboard() {
  const [services, setServices] = useState<SellerService[]>([]);
  const [reputations, setReputations] = useState<ProviderReputation[]>([]);
  const [receipts, setReceipts] = useState<HCSReceiptMessage[]>([]);
  const [budgetStatus, setBudgetStatus] = useState({ budgetHbar: 2.0, totalSpentHbar: 0, initialBudgetHbar: 2.0 });
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<BrokerExecutionResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'defi-pools' | 'token-risk' | 'wallet-portfolio'>('defi-pools');
  const [customLimit, setCustomLimit] = useState(5);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'data' | 'reputation' | 'receipts' | 'mcp'>('pipeline');
  const [showMcpModal, setShowMcpModal] = useState(false);

  // Initial fetch
  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Run broker procurement
  const runProcurement = async (category = selectedCategory, limit = customLimit) => {
    setLoading(true);
    setActiveTab('pipeline');

    let queryText = 'Top DEX pools by TVL';
    let params: any = { limit };

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

  const getPhaseBadge = (phase: BrokerStep['phase']) => {
    switch (phase) {
      case 'DISCOVER':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">1. Discover</span>;
      case 'SCORE':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">2. Score (HCS)</span>;
      case 'CHALLENGE_402':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">3. 402 Challenge</span>;
      case 'PAY_HEDERA':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">4. Pay Hedera</span>;
      case 'RECORD_HCS':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">5. HCS Receipt</span>;
      case 'DELIVER_DATA':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-500/20 text-green-300 border border-green-500/30">6. Subgraph Data</span>;
      case 'FAILOVER':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-500/20 text-red-300 border border-red-500/30">Failover</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-zinc-700 text-zinc-300">{phase}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-[#f0f4f8] flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-[#0c0e17]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/20 border border-white/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
                Conduit<span className="text-cyan-400">X</span>
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                v1.0 Testnet
              </span>
            </div>
            <p className="text-xs text-zinc-400">Decentralized Data Vending Machine for AI Agents</p>
          </div>
        </div>

        {/* Live Network Indicators */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-zinc-300 font-medium">Hedera Testnet</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
            <span className="text-zinc-300 font-medium">The Graph Subgraph Studio</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-zinc-300 font-medium">x402 Facilitator</span>
          </div>
          <button
            onClick={() => setShowMcpModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-medium transition cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5" />
            Connect MCP
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Agent Budget */}
          <div className="glass-panel p-4 rounded-xl relative overflow-hidden group">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Agent Budget Cap</span>
              <Coins className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{budgetStatus.budgetHbar.toFixed(3)}</span>
              <span className="text-xs font-medium text-cyan-400">HBAR remaining</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(5, (budgetStatus.budgetHbar / budgetStatus.initialBudgetHbar) * 100)}%`
                }}
              ></div>
            </div>
            <span className="text-[11px] text-zinc-500 mt-2 block">
              Spent: {budgetStatus.totalSpentHbar.toFixed(3)} HBAR across queries
            </span>
          </div>

          {/* Card 2: HCS Receipts */}
          <div className="glass-panel p-4 rounded-xl relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">HCS Audit Receipts</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{receipts.length}</span>
              <span className="text-xs font-medium text-emerald-400">Minted on Topic</span>
            </div>
            <a
              href="https://hashscan.io/testnet/topic/0.0.5694210"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-emerald-400 transition mt-3"
            >
              Topic: 0.0.5694210 <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Card 3: Live Graph Sellers */}
          <div className="glass-panel p-4 rounded-xl relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">The Graph Sellers</span>
              <Database className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{services.length || 3}</span>
              <span className="text-xs font-medium text-purple-400">Active Subgraphs</span>
            </div>
            <span className="text-[11px] text-zinc-400 mt-3 block">
              Pools · Token Risk · Portfolio Index
            </span>
          </div>

          {/* Card 4: Avg Round-trip Latency */}
          <div className="glass-panel p-4 rounded-xl relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Settlement Speed</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{activeTask?.latencyMs ? `${activeTask.latencyMs}ms` : '2.8s'}</span>
              <span className="text-xs font-medium text-amber-400">Hedera + Graph</span>
            </div>
            <span className="text-[11px] text-zinc-400 mt-3 block">
              402 Challenge → Transfer → HCS Mint
            </span>
          </div>
        </div>

        {/* Central Split Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Agent Control & Query Workbench (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel-glow p-5 rounded-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                  <h2 className="font-bold text-base text-white">Agent Procurement Studio</h2>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  x402 Autopay
                </span>
              </div>

              {/* Data Query Preset Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">Select Blockchain Dataset</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setSelectedCategory('defi-pools')}
                    className={`p-3 rounded-xl text-left border transition flex items-start justify-between cursor-pointer ${
                      selectedCategory === 'defi-pools'
                        ? 'bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-900/20'
                        : 'bg-zinc-900/50 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-white flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-purple-400" />
                        Uniswap / DEX Pool Analytics
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Top pools by TVL, 24h volume, fee tiers from Uniswap Subgraph.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-purple-300">~0.03 HBAR</span>
                  </button>

                  <button
                    onClick={() => setSelectedCategory('token-risk')}
                    className={`p-3 rounded-xl text-left border transition flex items-start justify-between cursor-pointer ${
                      selectedCategory === 'token-risk'
                        ? 'bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-900/20'
                        : 'bg-zinc-900/50 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        Token Risk & Concentration Radar
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Holder concentration %, liquidity depth & honeypot risk metrics.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-cyan-300">~0.045 HBAR</span>
                  </button>

                  <button
                    onClick={() => setSelectedCategory('wallet-portfolio')}
                    className={`p-3 rounded-xl text-left border transition flex items-start justify-between cursor-pointer ${
                      selectedCategory === 'wallet-portfolio'
                        ? 'bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-900/20'
                        : 'bg-zinc-900/50 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-white flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                        Cross-Protocol Wallet Reader
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Uniswap LP positions, Aave lending/debt & spot balances.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-300">~0.035 HBAR</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Query Limit Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Rows / Token Depth</span>
                  <span className="font-semibold text-white">{customLimit} items</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={customLimit}
                  onChange={(e) => setCustomLimit(Number(e.target.value))}
                  className="w-full accent-cyan-400 bg-zinc-800 rounded-lg cursor-pointer h-1.5"
                />
                <span className="text-[11px] text-zinc-500 block">
                  Price scales dynamically based on query size (per-row cost metering).
                </span>
              </div>

              {/* Action Trigger Button */}
              <button
                disabled={loading || budgetStatus.budgetHbar < 0.05}
                onClick={() => runProcurement()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 disabled:opacity-50 transition cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Agent Executing x402 Procurement...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    Execute Metered Query (x402 Hedera)
                  </>
                )}
              </button>

              <div className="text-[11px] text-zinc-500 text-center flex items-center justify-center gap-2">
                <span>Zero API keys</span> • <span>No accounts</span> • <span>On-chain HCS receipt</span>
              </div>
            </div>

            {/* Provider Reputation Quick Card */}
            <div className="glass-panel p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-400" />
                  Provider Leaderboard (From HCS Trail)
                </span>
                <button
                  onClick={() => setActiveTab('reputation')}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  View full
                </button>
              </div>

              <div className="space-y-2">
                {reputations.map((rep) => (
                  <div key={rep.serviceId} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/40 border border-white/5 text-xs">
                    <div>
                      <span className="font-semibold text-white">{rep.providerName.split('(')[0]}</span>
                      <div className="text-[11px] text-zinc-400">
                        Success: {((rep.successRate || 1) * 100).toFixed(0)}% · Avg Latency: {rep.averageLatencyMs}ms
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {rep.compositeScore}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Execution Feed, Data Display & Tabs (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* View Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'pipeline' ? 'bg-white/10 text-white border border-white/20' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Live Settlement Pipeline
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'data' ? 'bg-white/10 text-white border border-white/20' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-purple-400" />
                Delivered Subgraph Data
              </button>
              <button
                onClick={() => setActiveTab('receipts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'receipts' ? 'bg-white/10 text-white border border-white/20' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                HCS Receipts ({receipts.length})
              </button>
              <button
                onClick={() => setActiveTab('reputation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'reputation' ? 'bg-white/10 text-white border border-white/20' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                Reputation Math
              </button>
            </div>

            {/* Tab 1: Live Settlement Pipeline */}
            {activeTab === 'pipeline' && (
              <div className="glass-panel p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Autonomous Execution Trace
                  </h3>
                  {activeTask?.success && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Settled in {activeTask.latencyMs}ms
                    </span>
                  )}
                </div>

                {/* Stepper Timeline */}
                <div className="space-y-3">
                  {activeTask?.steps && activeTask.steps.length > 0 ? (
                    activeTask.steps.map((step) => (
                      <div
                        key={step.stepIndex}
                        className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1.5 hover:border-white/15 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getPhaseBadge(step.phase)}
                            <span className="font-semibold text-xs text-white">{step.title}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 font-mono break-all">{step.detail}</p>
                        {step.metadata?.receipt?.hashScanUrl && (
                          <a
                            href={step.metadata.receipt.hashScanUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-1 font-semibold"
                          >
                            Verify Transaction on HashScan <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center rounded-xl bg-zinc-900/30 border border-dashed border-white/10 space-y-3">
                      <Terminal className="w-8 h-8 text-zinc-600 mx-auto" />
                      <div className="text-sm font-semibold text-zinc-300">Ready to execute autonomous data procurement</div>
                      <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                        Click &ldquo;Execute Metered Query&rdquo; on the left to watch the agent discover providers, handle 402 challenge terms, pay on Hedera, and log the cryptographic receipt to HCS.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Subgraph Data Viewer */}
            {activeTab === 'data' && (
              <div className="glass-panel p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-400" />
                    Decrypted Subgraph Dataset
                  </h3>
                  {activeTask?.serviceId && (
                    <span className="text-xs text-zinc-400">
                      Source: {activeTask.providerName}
                    </span>
                  )}
                </div>

                {activeTask?.data ? (
                  <pre className="p-4 rounded-xl bg-[#090a0f] border border-white/10 text-xs font-mono text-cyan-300 overflow-x-auto max-h-96">
                    {JSON.stringify(activeTask.data, null, 2)}
                  </pre>
                ) : (
                  <div className="p-8 text-center rounded-xl bg-zinc-900/30 border border-dashed border-white/10 text-xs text-zinc-500">
                    No query executed yet. Run a query from the workbench to view delivered Subgraph Studio records.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Receipts Ledger */}
            {activeTab === 'receipts' && (
              <div className="glass-panel p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white">Immutable HCS Receipt Ledger</h3>
                    <p className="text-xs text-zinc-400">All micro-payments written to Hedera Consensus Service</p>
                  </div>
                  <a
                    href="https://hashscan.io/testnet/topic/0.0.5694210"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold hover:bg-emerald-500/20"
                  >
                    Open Topic in HashScan <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {receipts.length > 0 ? (
                    receipts.map((rcpt) => (
                      <div
                        key={rcpt.receiptId}
                        className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-mono text-zinc-200 font-semibold">{rcpt.receiptId}</div>
                          <div className="text-zinc-400 text-[11px]">
                            {rcpt.providerName} · {rcpt.queryType}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-emerald-400">{rcpt.amountHbar} HBAR</span>
                          <a
                            href={rcpt.hashScanUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400"
                            title="View Transaction"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-zinc-500">
                      No receipts recorded yet on this session.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Reputation Math & Flywheel */}
            {activeTab === 'reputation' && (
              <div className="glass-panel p-5 rounded-2xl space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-white">Deterministic Reputation Flywheel</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    How ConduitX turns past HCS payment receipts into objective routing weights for the next agent:
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 font-mono text-xs text-purple-200">
                  {'Score = 0.35 * (1 / Price) + 0.45 * SuccessRate + 0.20 * Recency - Penalty(Failed)'}
                </div>

                <div className="space-y-3">
                  {reputations.map((rep) => (
                    <div key={rep.serviceId} className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{rep.providerName}</span>
                        <span className="font-mono font-black text-purple-400">{rep.compositeScore}/100</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] text-zinc-400">
                        <div>Success Rate: <span className="text-zinc-200 font-semibold">{((rep.successRate || 1) * 100).toFixed(1)}%</span></div>
                        <div>Avg Latency: <span className="text-zinc-200 font-semibold">{rep.averageLatencyMs}ms</span></div>
                        <div>Total Earned: <span className="text-zinc-200 font-semibold">{rep.totalEarnedHbar} HBAR</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MCP Quickstart Modal */}
      {showMcpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel-glow max-w-lg w-full p-6 rounded-2xl space-y-4 border border-purple-500/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">Connect ConduitX MCP Server</h3>
              </div>
              <button
                onClick={() => setShowMcpModal(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              Paste this configuration into your <code>claude_desktop_config.json</code> or Cursor settings to let Claude or Cursor agents discover and buy blockchain data autonomously:
            </p>

            <pre className="p-3.5 rounded-xl bg-[#08090e] border border-white/10 text-xs font-mono text-cyan-300 overflow-x-auto">
{`{
  "mcpServers": {
    "conduitx": {
      "command": "node",
      "args": ["services/mcp/dist/index.js"],
      "env": {
        "HEDERA_NETWORK": "testnet"
      }
    }
  }
}`}
            </pre>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowMcpModal(false)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-4 px-6 text-center text-xs text-zinc-500">
        ConduitX · ETHOnline 2026 Hackathon · Built for Hedera, The Graph & Bazantic
      </footer>
    </div>
  );
}
