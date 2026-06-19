/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import getPrisma from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getErrorMessage } from '@/lib/utils/errors';

export async function getUsers() {
    const prisma = getPrisma();
    return prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            username: true,
            name: true,
            role: true,
            phone: true,
            address: true,
            permissions: true,
            createdAt: true,
        }
    });
}

export async function deleteUser(id: string) {
    const prisma = getPrisma();
    const supabase = await createAdminClient();

    // 1. Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
        return { error: authError.message };
    }

    // 2. Delete from public table
    await prisma.user.delete({
        where: { id }
    });

    revalidatePath('/users');
    return { success: true };
}

export async function createUser(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const username = formData.get('username') as string;
    const role = formData.get('role') as any;
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string | null;
    const address = formData.get('address') as string | null;
    const permissionsJson = formData.get('permissions') as string;

    let permissions: string[] = [];
    try {
        permissions = JSON.parse(permissionsJson || '[]');
    } catch {
        permissions = [];
    }

    const supabase = await createAdminClient();

    // 1. Create in Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (authError || !user) {
        return { error: authError?.message || 'Failed to create user' };
    }

    // 2. Create in public table
    const prisma = getPrisma();
    await prisma.user.create({
        data: {
            id: user.id,
            username,
            // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- sentinel value; Supabase Auth manages actual auth
            password: 'EXTERNAL_AUTH', // Password is managed by Supabase Auth
            role,
            name,
            phone: phone || null,
            address: address || null,
            permissions,
        }
    });

    revalidatePath('/users');
    return { success: true };
}

export async function updateUser(id: string, formData: FormData) {
    const role = formData.get('role') as any;
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string | null;
    const address = formData.get('address') as string | null;
    const permissionsJson = formData.get('permissions') as string;

    let permissions: string[] = [];
    try {
        permissions = JSON.parse(permissionsJson || '[]');
    } catch {
        permissions = [];
    }

    const prisma = getPrisma();

    try {
        await prisma.user.update({
            where: { id },
            data: {
                role,
                name,
                phone: phone || null,
                address: address || null,
                permissions,
            }
        });

        revalidatePath('/users');
        return { success: true };
    } catch (err: any) {
        return { error: getErrorMessage(err, 'Failed to update user') };
    }
}
