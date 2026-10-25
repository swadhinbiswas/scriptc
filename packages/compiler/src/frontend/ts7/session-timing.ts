export interface Ts7RequestTiming {
  method: string;
  roundTripMs: number;
  bytesSent: number;
  bytesReceived: number;
  timestamp: number;
  serverTimeMs?: number;
  transportOverheadMs?: number;
}

export interface Ts7TimingTotals {
  requestCount: number;
  roundTripMs: number;
  bytesSent: number;
  bytesReceived: number;
  serverTimeMs: number;
  transportOverheadMs: number;
  nodesMaterialized: number;
  sourceFilesFetched: number;
  nodesFetched: number;
}

export interface Ts7TimingInfo {
  enabled: boolean;
  totals: Ts7TimingTotals;
  recentRequests: Ts7RequestTiming[];
}

export interface Ts7ServerTiming {
  enabled: boolean;
  totals: { requestCount: number; totalProcessingTimeMs: number };
  recentRequests: { method: string; processingTimeMs: number; timestamp: number }[];
}

function emptyTotals(): Ts7TimingTotals {
  return {
    requestCount: 0,
    roundTripMs: 0,
    bytesSent: 0,
    bytesReceived: 0,
    serverTimeMs: 0,
    transportOverheadMs: 0,
    nodesMaterialized: 0,
    sourceFilesFetched: 0,
    nodesFetched: 0,
  };
}

function copyRequest(sample: Ts7RequestTiming): Ts7RequestTiming {
  return {
    method: sample.method,
    roundTripMs: sample.roundTripMs,
    bytesSent: sample.bytesSent,
    bytesReceived: sample.bytesReceived,
    timestamp: sample.timestamp,
  };
}

/** Small bounded request history. Returned measurements own their records,
 * so later requests or a caller modifying a report cannot change totals. */
export class Ts7Timing {
  private totals = emptyTotals();
  private readonly recent: Ts7RequestTiming[] = [];

  constructor(readonly enabled: boolean) {}

  record(
    method: string,
    roundTripMs: number,
    bytesSent: number,
    bytesReceived: number,
    timestamp: number,
  ): void {
    if (!this.enabled) return;
    const totals = this.totals;
    totals.requestCount++;
    totals.roundTripMs += roundTripMs;
    totals.bytesSent += bytesSent;
    totals.bytesReceived += bytesReceived;
    if (this.recent.length === 5) this.recent.shift();
    this.recent.push({ method, roundTripMs, bytesSent, bytesReceived, timestamp });
  }

  materialized(): void {
    if (!this.enabled) return;
    const totals = this.totals;
    totals.nodesMaterialized++;
  }
  fetched(nodes: number): void {
    if (!this.enabled) return;
    const totals = this.totals;
    totals.sourceFilesFetched++;
    totals.nodesFetched += nodes;
  }

  info(server?: Ts7ServerTiming): Ts7TimingInfo {
    const totals = { ...this.totals };
    const recentRequests = this.recent.map((sample) => copyRequest(sample));
    if (this.enabled && server !== undefined) {
      totals.serverTimeMs = server.totals.totalProcessingTimeMs;
      totals.transportOverheadMs = Math.max(0, totals.roundTripMs - totals.serverTimeMs);
      const count = Math.min(recentRequests.length, server.recentRequests.length);
      for (let index = 1; index <= count; index++) {
        const client = recentRequests[recentRequests.length - index]!;
        const sample = server.recentRequests[server.recentRequests.length - index]!;
        if (client.method !== sample.method) continue;
        client.serverTimeMs = sample.processingTimeMs;
        client.transportOverheadMs = Math.max(0, client.roundTripMs - sample.processingTimeMs);
      }
    }
    return { enabled: this.enabled, totals, recentRequests };
  }

  reset(): void {
    this.totals = emptyTotals();
    this.recent.length = 0;
  }
}
