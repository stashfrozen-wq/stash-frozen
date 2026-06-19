/**
 * Telegram Bot Handlers — re-exports from modular structure.
 *
 * This file is kept for backward compatibility.
 * The actual implementation is now split into:
 *   - telegram/index.ts       (router)
 *   - telegram/sale-flow.ts   (sale wizard)
 *   - telegram/invoice-flow.ts (invoice lookup)
 *   - telegram/stock-flow.ts   (stock query)
 *   - telegram/summary-flow.ts (daily summary)
 *   - telegram/shared.ts       (shared helpers)
 */
export { handleTelegramUpdate } from './telegram/index';
