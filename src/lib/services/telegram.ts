/* eslint-disable @typescript-eslint/no-explicit-any */
import TelegramBot from 'node-telegram-bot-api';
import { logger } from '@/lib/utils/logger';

const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;

// Only initialize if token exists (webhook mode — no polling)
const bot = token ? new TelegramBot(token, { polling: false }) : null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BotResult = any | null | boolean;

async function withBot<T extends BotResult>(
    fn: (b: TelegramBot) => Promise<T>,
    fallback: T = null as T
): Promise<T> {
    if (!bot) return fallback;
    try {
        return await fn(bot);
    } catch (error) {
        logger.error('Telegram bot error:', error);
        return fallback;
    }
}

// ─── Existing Backup Function ───────────────────────────────────────────────

export const sendBackup = async (fileBuffer: Buffer, fileName: string, caption: string) => {
    if (!bot || !channelId) return;
    try {
        await bot.sendDocument(channelId, fileBuffer, { caption }, { filename: fileName });
    } catch (error) {
        logger.error('Telegram Backup Error:', error);
    }
};

// ─── Bot Messaging Helpers ──────────────────────────────────────────────────

export type InlineButton = {
    text: string;
    callback_data: string;
};

export type InlineKeyboard = InlineButton[][];

export async function sendMessage(
    chatId: number | string,
    text: string,
    keyboard?: InlineKeyboard
): Promise<any> {
    return withBot((b) => b.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
    }));
}

export async function editMessage(
    chatId: number | string,
    messageId: number,
    text: string,
    keyboard?: InlineKeyboard
): Promise<any> {
    return withBot((b) => b.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
    }));
}

export async function answerCallback(
    callbackQueryId: string,
    text?: string
): Promise<any> {
    return withBot((b) => b.answerCallbackQuery(callbackQueryId, { text }));
}

export async function sendDocument(
    chatId: number | string,
    fileBuffer: Buffer,
    fileName: string,
    caption?: string
): Promise<any> {
    return withBot((b) => b.sendDocument(chatId, fileBuffer, {
        caption,
        parse_mode: 'HTML',
    }, {
        filename: fileName,
        contentType: 'application/pdf',
    }));
}

export async function deleteMessage(
    chatId: number | string,
    messageId: number
): Promise<boolean> {
    return withBot(async (b) => {
        await b.deleteMessage(chatId, messageId);
        return true;
    }, false);
}

// ─── Keyboard Builder Helpers ───────────────────────────────────────────────

export function btn(text: string, callbackData: string): InlineButton {
    return { text, callback_data: callbackData };
}

export function mainMenuKeyboard(): InlineKeyboard {
    return [
        [btn('🛒 بيع سريع', 'menu:sale'), btn('📋 بحث فاتورة', 'menu:invoice')],
        [btn('📦 المخزون', 'menu:stock'), btn('📊 ملخص اليوم', 'menu:today')],
        [btn('⚙️ الإعدادات', 'menu:settings')],
    ];
}

export function navRow(options: { back?: string; cancel?: boolean; home?: boolean }): InlineButton[] {
    const row: InlineButton[] = [];
    if (options.back) row.push(btn('↩️ رجوع', options.back));
    if (options.cancel) row.push(btn('❌ إلغاء', 'cancel'));
    if (options.home) row.push(btn('🏠 القائمة', 'menu:main'));
    return row;
}

// ─── Webhook Setup ──────────────────────────────────────────────────────────

export async function setupWebhook(webhookUrl: string, secret: string): Promise<boolean> {
    return withBot(async (b) => {
        await b.setWebHook(webhookUrl, { secret_token: secret } as any);
        return true;
    }, false);
}

export async function getWebhookInfo(): Promise<any> {
    return withBot((b) => b.getWebHookInfo());
}
