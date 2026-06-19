'use client';

import { useState, useCallback } from 'react';
import { login } from '@/app/actions/auth';
import { useFormStatus } from 'react-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

function SubmitButton() {
    const { pending } = useFormStatus();
    const t = useTranslations('Login');

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full h-11 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors focus:ring-4 focus:ring-primary/20 flex items-center justify-center disabled:opacity-70"
        >
            {pending ? <Loader2 className="animate-spin" /> : t('submit')}
        </button>
    );
}

export default function LoginPage() {
    const t = useTranslations('Login');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function clientAction(formData: FormData) {
        const res = await login(formData);
        if (res?.error) {
            setError(res.error);
        }
    }

    const togglePassword = useCallback(() => setShowPassword(prev => !prev), []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            ☕
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
                        <p className="text-muted-foreground mt-2">{t('description')}</p>
                    </div>

                    <form action={clientAction} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                                <span>⚠️</span>
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">{t('emailLabel')}</label>
                            <input
                                name="email"
                                type="email"
                                required
                                className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground/50"
                                placeholder={t('emailPlaceholder')}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-foreground">{t('passwordLabel')}</label>
                                <a href="#" className="text-xs text-primary hover:underline font-medium">{t('forgotPassword')}</a>
                            </div>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full pl-4 pr-11 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground/50"
                                    placeholder={t('passwordPlaceholder')}
                                />
                                <button
                                    type="button"
                                    onClick={togglePassword}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded-md p-1"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <SubmitButton />
                    </form>
                </div>
                <div className="bg-secondary/50 p-4 text-center text-sm text-muted-foreground border-t border-border">
                    {t('noAccount')} <span className="text-primary font-medium hover:underline cursor-pointer">{t('contactAdmin')}</span>
                </div>
            </div>
        </div>
    );
}
