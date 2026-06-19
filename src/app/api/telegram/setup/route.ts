import { NextResponse } from 'next/server';
import { setupWebhook } from '@/lib/services/telegram';
import { withSecret, apiError } from '@/lib/api/with-auth';

export const dynamic = 'force-dynamic';

async function handleSetup() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
    if (!appUrl) {
        return apiError('APP_URL not configured', 500);
    }

    const protocol = appUrl.startsWith('http') ? '' : 'https://';
    const baseUrl = `${protocol}${appUrl}`;

    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return apiError('TELEGRAM_WEBHOOK_SECRET not configured', 500);
    }

    const webhookUrl = `${baseUrl}/api/telegram/webhook?secret=${webhookSecret}`;

    const success = await setupWebhook(webhookUrl, webhookSecret);

    if (success) {
        return NextResponse.json({
            success: true,
            message: 'Webhook registered successfully',
            url: webhookUrl
        });
    } else {
        return apiError('Failed to register webhook. Check bot token.', 500);
    }
}

export const GET = withSecret(handleSetup);
