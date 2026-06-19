type PerfLog = {
    action: string;
    durationMs: number;
    queryCount?: number;
    requestId?: string;
};

const PERF_TRACE_ENABLED = process.env.PERF_TRACE === 'true' && process.env.NODE_ENV === 'development';

export async function traceAction<T>(
    action: string,
    fn: () => Promise<T>,
    opts?: { queryCount?: number; requestId?: string }
): Promise<T> {
    if (!PERF_TRACE_ENABLED) return fn();

    const start = performance.now();
    try {
        const result = await fn();
        const durationMs = Math.round(performance.now() - start);
        const log: PerfLog = { action, durationMs, ...opts };
        console.log(`[perf] ${JSON.stringify(log)}`);
        return result;
    } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        const log: PerfLog = { action, durationMs, ...opts };
        console.error(`[perf] ${JSON.stringify(log)} error=${error instanceof Error ? error.message : 'unknown'}`);
        throw error;
    }
}
