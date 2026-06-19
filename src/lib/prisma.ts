import { PrismaClient } from '../generated/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

let prisma: PrismaClient | null = null;

const getPrisma = () => {
    if (prisma) return prisma;

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        statement_timeout: 15000,
        idle_in_transaction_session_timeout: 30000,
    });

    pool.on('error', (err) => {
        console.error('[prisma] Unexpected pool error:', err.message);
    });

    const adapter = new PrismaPg(pool);

    prisma = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    return prisma;
}

const RETRIABLE_ERROR_CODES = new Set(['P1001', 'P2024', 'P2034']);
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 200;

function getRetryDelay(attempt: number): number {
    // eslint-disable-next-line sonarjs/pseudo-random -- jitter for retry backoff, not security-sensitive
    const jitter = Math.random() * 100;
    return BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (error: unknown) {
            lastError = error;
            const code = (error as { code?: string })?.code;
            if (code && RETRIABLE_ERROR_CODES.has(code) && attempt < MAX_RETRIES) {
                const delay = getRetryDelay(attempt);
                console.warn(`[prisma] Retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES}) for code ${code}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

export default getPrisma;
