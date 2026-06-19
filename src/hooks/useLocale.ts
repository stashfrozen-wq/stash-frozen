'use client';

import { useLocale as useNextLocale } from 'next-intl';

export function useLocale() {
    const locale = useNextLocale();
    const isRtl = locale === 'ar';
    return { locale, isRtl };
}
