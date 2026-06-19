import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate } from '@/lib/services/telegram-handlers';
import { withWebhookSecret } from '@/lib/api/with-auth';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

async function handleWebhook(req: NextRequest) {
    try {
        const update = await req.json();

        await handleTelegramUpdate(update);

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Webhook processing error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' });
    }
}

export const POST = withWebhookSecret(handleWebhook);
