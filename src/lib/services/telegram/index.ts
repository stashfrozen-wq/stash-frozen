/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Telegram Bot Router
 *
 * Processes incoming Telegram updates (messages + callback queries)
 * and routes them to the appropriate flow handler module.
 */

import { sendMessage, answerCallback, btn, mainMenuKeyboard } from '../telegram';
import { getState, clearState } from '../telegram-state';
import { logger } from '@/lib/utils/logger';

import { startSaleWizard, handleSaleTextInput, handleSaleCallback } from './sale-flow';
import { startInvoiceLookup, handleInvoiceTextInput, handleInvoiceCallback } from './invoice-flow';
import { startStockQuery, handleStockCallback, handleStockTextInput } from './stock-flow';
import { sendTodaySummary, handleTodayCallback } from './summary-flow';

export async function handleTelegramUpdate(update: any): Promise<void> {
    try {
        if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
        } else if (update.message?.text) {
            await handleTextMessage(update.message);
        }
    } catch (error) {
        logger.error('Telegram handler error:', error);
        const chatId = update.callback_query?.message?.chat?.id || update.message?.chat?.id;
        if (chatId) {
            await sendMessage(chatId, '❌ حدث خطأ في الاتصال\n\nلم نتمكن من إتمام العملية. يرجى المحاولة مرة أخرى.', [
                [btn('🔄 إعادة المحاولة', 'menu:main'), btn('🏠 القائمة', 'menu:main')],
            ]);
        }
    }
}

async function handleTextMessage(message: any): Promise<void> {
    const chatId = message.chat.id;
    const text = (message.text || '').trim();

    if (text === '/start' || text === '/menu') {
        clearState(chatId);
        await sendMainMenu(chatId);
        return;
    }

    const state = getState(chatId);
    if (state) {
        switch (state.flow) {
            case 'sale':
                await handleSaleTextInput(chatId, text, state);
                return;
            case 'invoice_search':
                await handleInvoiceTextInput(chatId, text);
                return;
            case 'stock_search':
                await handleStockTextInput(chatId, text);
                return;
        }
    }

    await sendMainMenu(chatId);
}

async function handleCallbackQuery(query: any): Promise<void> {
    const chatId = query.message.chat.id;
    const data = query.data;

    await answerCallback(query.id);

    const [action, ...rest] = data.split(':');
    const value = rest.join(':');

    switch (action) {
        case 'menu':
            await handleMenuAction(chatId, value);
            break;
        case 'cancel':
            clearState(chatId);
            await sendMainMenu(chatId);
            break;
        case 'sale':
            await handleSaleCallback(chatId, value);
            break;
        case 'inv':
            await handleInvoiceCallback(chatId, value);
            break;
        case 'stk':
            await handleStockCallback(chatId, value);
            break;
        case 'today':
            await handleTodayCallback(chatId, value);
            break;
        default:
            await sendMainMenu(chatId);
    }
}

async function sendMainMenu(chatId: number): Promise<void> {
    await sendMessage(
        chatId,
        '🏪 <b>STASH — نقطة البيع</b>\n\nمرحباً! اختر من القائمة:',
        mainMenuKeyboard()
    );
}

async function handleMenuAction(chatId: number, action: string): Promise<void> {
    switch (action) {
        case 'main':
            clearState(chatId);
            await sendMainMenu(chatId);
            break;
        case 'sale':
            await startSaleWizard(chatId);
            break;
        case 'invoice':
            await startInvoiceLookup(chatId);
            break;
        case 'stock':
            await startStockQuery(chatId);
            break;
        case 'today':
            await sendTodaySummary(chatId);
            break;
        case 'settings':
            await sendMessage(chatId, '⚙️ <b>الإعدادات</b>\n\nقريباً...', [
                [btn('🏠 القائمة', 'menu:main')],
            ]);
            break;
    }
}
