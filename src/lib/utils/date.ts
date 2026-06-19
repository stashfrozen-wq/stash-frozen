export interface DateRange {
    startDate?: string;
    endDate?: string;
}

export function startOfDay(date: Date | string): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function endOfDay(date: Date | string): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

export function buildDateRangeFilter(
    startDate?: string,
    endDate?: string
): { gte?: Date; lte?: Date } {
    const filter: { gte?: Date; lte?: Date } = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) filter.lte = endOfDay(endDate);
    return filter;
}

export type Period = 'day' | 'week' | 'month' | '2months' | '6months' | 'all';

export function getStartDateForPeriod(period: Period): Date | undefined {
    const now = new Date();
    switch (period) {
        case 'day':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case 'week':
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'month':
            return new Date(now.getFullYear(), now.getMonth(), 1);
        case '2months':
            return new Date(now.getFullYear(), now.getMonth() - 2, 1);
        case '6months':
            return new Date(now.getFullYear(), now.getMonth() - 6, 1);
        case 'all':
        default:
            return undefined;
    }
}
