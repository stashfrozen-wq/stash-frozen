import { getErrorMessage } from './errors';

export const logger = {
    error(context: string, error: unknown): void {
        console.error(context, getErrorMessage(error, 'unknown'));
    },
    warn(context: string, message: string): void {
        console.warn(context, message);
    },
};

export async function safeLogActivity(
    action: string,
    details?: string,
    userId?: string,
    status?: boolean,
    reason?: string
): Promise<void> {
    try {
        const { logActivity } = await import('@/app/actions/audit');
        await logActivity(action, details, userId, status, reason);
    } catch (error) {
        logger.error('Audit log failed:', error);
    }
}
