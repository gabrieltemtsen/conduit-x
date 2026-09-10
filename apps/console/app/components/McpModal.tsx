'use client';

import React, { useEffect, useRef } from 'react';
import { Cpu, X } from 'lucide-react';
import { Button } from './ui';

const MCP_CONFIG = `{
  "mcpServers": {
    "conduitx": {
      "command": "node",
      "args": ["services/mcp/dist/index.js"],
      "env": {
        "HEDERA_NETWORK": "testnet"
      }
    }
  }
}`;

export function McpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mcp-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg space-y-4 rounded-lg border border-border-strong bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 id="mcp-modal-title" className="text-sm font-semibold text-foreground">
              Connect ConduitX MCP Server
            </h3>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-muted-foreground transition-colors duration-100 hover:bg-panel-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Paste this configuration into your <code className="font-data text-foreground">claude_desktop_config.json</code> or
          Cursor settings to let Claude or Cursor agents discover and buy blockchain data autonomously.
        </p>

        <pre className="overflow-x-auto rounded-md border border-border bg-panel-sunken p-3.5 font-data text-xs text-foreground">
          {MCP_CONFIG}
        </pre>

        <div className="flex justify-end pt-1">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
