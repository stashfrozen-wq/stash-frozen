'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function getCurrentUser() {
    const { getCurrentUser } = await import('@/lib/auth/session');
    return getCurrentUser();
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
}

export async function login(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return { error: error.message };
    }

    redirect('/dashboard');
}
