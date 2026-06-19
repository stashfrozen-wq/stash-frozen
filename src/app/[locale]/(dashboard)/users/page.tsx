'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUsers, deleteUser, createUser, updateUser } from '@/app/actions/users';
import { getDefaultPermissions, ALL_PERMISSIONS } from '@/lib/permissions';
import { UserPlus, Trash2, Shield, Eye, Phone, MapPin, Settings } from 'lucide-react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

interface User {
    id: string;
    username: string;
    name: string | null;
    role: string;
    phone: string | null;
    address: string | null;
    permissions: string[];
    createdAt: Date;
}

const ROLE_COLORS: Record<string, string> = {
    ROOT: 'bg-purple-100 text-purple-700 border-purple-200',
    ADMIN: 'bg-blue-100 text-blue-700 border-blue-200',
    ACCOUNTANT: 'bg-green-100 text-green-700 border-green-200',
    SALESPERSON: 'bg-orange-100 text-orange-700 border-orange-200',
    READ_ONLY: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function UsersPage() {
    const t = useTranslations('Users');
    const locale = useLocale();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [selectedRole, setSelectedRole] = useState('SALESPERSON');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [useCustomPermissions, setUseCustomPermissions] = useState(false);
    const [error, setError] = useState('');

    const fetchUsers = useCallback(async (showLoading = false) => {
        if (showLoading) setIsLoading(true);
        const data = await getUsers();
        setUsers(data as User[]);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchUsers(false);
    }, [fetchUsers]);

    const handleDelete = useCallback(async (id: string) => {
        if (confirm(t('alerts.deleteConfirm'))) {
            const res = await deleteUser(id);
            if (res.success) {
                fetchUsers(true);
            } else {
                alert(res.error);
            }
        }
    }, [t, fetchUsers]);

    const handleDeleteClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const id = e.currentTarget.dataset.id;
        if (id) handleDelete(id);
    }, [handleDelete]);

    const openCreateModal = useCallback(() => {
        setEditingUser(null);
        setSelectedRole('SALESPERSON');
        setSelectedPermissions(getDefaultPermissions('SALESPERSON'));
        setUseCustomPermissions(false);
        setError('');
        setIsModalOpen(true);
    }, []);

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setSelectedRole(user.role);
        setSelectedPermissions(user.permissions.length > 0 ? user.permissions : getDefaultPermissions(user.role));
        setUseCustomPermissions(user.permissions.length > 0);
        setError('');
        setIsModalOpen(true);
    };

    const handleEditClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const id = e.currentTarget.dataset.id;
        if (id) {
            const found = users.find(u => u.id === id);
            if (found) openEditModal(found);
        }
    }, [users]);

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        const formData = new FormData(e.currentTarget);

        // Add permissions to form data
        formData.set('permissions', JSON.stringify(useCustomPermissions ? selectedPermissions : []));

        if (editingUser) {
            const res = await updateUser(editingUser.id, formData);
            if (res.success) {
                setIsModalOpen(false);
                fetchUsers();
            } else {
                setError(res.error || t('alerts.updateFailed'));
            }
        } else {
            const res = await createUser(formData);
            if (res.success) {
                setIsModalOpen(false);
                fetchUsers();
            } else {
                setError(res.error || t('alerts.createFailed'));
            }
        }
    }, [editingUser, fetchUsers, useCustomPermissions, selectedPermissions, t]);

    const togglePermission = (key: string) => {
        setSelectedPermissions(prev =>
            prev.includes(key)
                ? prev.filter(p => p !== key)
                : [...prev, key]
        );
    };

    const handleRoleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setSelectedRole(e.target.value), []);
    const handleCustomPermissionsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setUseCustomPermissions(e.target.checked), []);
    const handleTogglePermissionClick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const key = e.target.dataset.key;
        if (key) togglePermission(key);
    }, []);
    const handleCloseModalClick = useCallback(() => setIsModalOpen(false), []);

    return (
        <div className="space-y-6" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-end mb-8">
                <div>
                    
                    <h1 className="text-3xl font-black">{t('subtitle')}</h1>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                >
                    <UserPlus size={18} />
                    <span className="text-sm">{t('addMember')}</span>
                </button>
            </div>

            {/* Role Legend */}
            <div className="flex flex-wrap gap-3 mb-6">
                {Object.entries(ROLE_COLORS).map(([role, color]) => (
                    <span key={role} className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm ${color}`}>
                        {t(`roles.${role}` as Parameters<typeof t>[0])}
                    </span>
                ))}
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-secondary/30">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">{t('table.employee')}</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">{t('table.contact')}</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">{t('table.role')}</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">{t('table.joined')}</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">{t('table.loading')}</td>
                            </tr>
                        ) : users.map((user) => (
                            <tr key={user.id} className="hover:bg-secondary/20 transition-colors">
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-black shadow-lg ${(() => {
                                            if (user.role === 'ROOT') return 'bg-purple-500 shadow-purple-500/20';
                                            if (user.role === 'ADMIN') return 'bg-blue-500 shadow-blue-500/20';
                                            if (user.role === 'ACCOUNTANT') return 'bg-green-500 shadow-green-500/20';
                                            if (user.role === 'SALESPERSON') return 'bg-orange-500 shadow-orange-500/20';
                                            return 'bg-gray-500 shadow-gray-500/20';
                                        })()}`}>
                                            {(user.name || user.username)[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black tracking-tight">{user.name || t('table.anonymous')}</div>
                                            <div className="text-[10px] font-bold text-muted-foreground/60 font-mono">@{user.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="space-y-1.5">
                                        {user.phone && (
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                                                <Phone size={12} className="opacity-40" /> {user.phone}
                                            </div>
                                        )}
                                        {user.address && (
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                                                <MapPin size={12} className="opacity-40" /> {user.address}
                                            </div>
                                        )}
                                        {!user.phone && !user.address && (
                                            <span className="text-[10px] font-bold text-muted-foreground/40 italic">---</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${ROLE_COLORS[user.role] || ROLE_COLORS.READ_ONLY}`}>
                                        <Shield size={10} />
                                        {t(`roles.${user.role}` as Parameters<typeof t>[0])}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="text-[11px] font-black text-muted-foreground/80">
                                        {new Date(user.createdAt).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-end gap-1">
                                        <Link prefetch={false}
                                            href={`/logs?user=${user.id}`}
                                            className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                            title={t('table.viewActivity')}
                                        >
                                            <Eye size={18} />
                                        </Link>
                                        {user.role !== 'ROOT' && (
                                            <>
                                                <button
                                                    data-id={user.id}
                                                    onClick={handleEditClick}
                                                    className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                    title={t('table.edit')}
                                                >
                                                    <Settings size={18} />
                                                </button>
                                                <button
                                                    data-id={user.id}
                                                    onClick={handleDeleteClick}
                                                    className="p-2.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                    title={t('table.delete')}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-none flex items-center justify-center z-50 p-4">
                    <div className="bg-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 rounded-3xl shadow-2xl border border-border animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col gap-1 mb-8">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{editingUser ? t('modal.editTitle') : t('modal.createTitle')}</div>
                            <h2 className="text-2xl font-black">
                                {editingUser ? editingUser.name : t('addMember')}
                            </h2>
                        </div>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 rtl:mr-1">{t('modal.fullName')}</label>
                                    <input
                                        name="name"
                                        type="text"
                                        defaultValue={editingUser?.name || ''}
                                        className="w-full bg-secondary/30 border border-border rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all"
                                        required
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 rtl:mr-1">{t('modal.username')}</label>
                                    <input
                                        name="username"
                                        type="text"
                                        defaultValue={editingUser?.username || ''}
                                        className="w-full bg-secondary/30 border border-border rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all disabled:opacity-50"
                                        required
                                        placeholder="johndoe"
                                        disabled={!!editingUser}
                                    />
                                </div>
                            </div>

                            {!editingUser && (
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 rtl:mr-1">{t('modal.email')}</label>
                                        <input name="email" type="email" className="w-full bg-secondary/30 border border-border rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all" required placeholder="john@coffee.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 rtl:mr-1">{t('modal.password')}</label>
                                        <input name="password" type="password" className="w-full bg-secondary/30 border border-border rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all" required placeholder="••••••••" minLength={6} />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 rtl:mr-1">{t('modal.phone')}</label>
                                    <input
                                        name="phone"
                                        type="tel"
                                        defaultValue={editingUser?.phone || ''}
                                        className="w-full bg-secondary/30 border border-border rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all"
                                        placeholder="01xxxxxxxxx"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 rtl:mr-1">{t('modal.address')}</label>
                                    <input
                                        name="address"
                                        type="text"
                                        defaultValue={editingUser?.address || ''}
                                        className="w-full bg-secondary/30 border border-border rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all"
                                        placeholder="Cairo, Egypt"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 rtl:mr-1">{t('modal.role')}</label>
                                <select
                                    name="role"
                                    value={selectedRole}
                                    onChange={handleRoleChange}
                                    className="w-full bg-secondary/30 border border-border rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="SALESPERSON">{t('roles.SALESPERSON')}</option>
                                    <option value="ACCOUNTANT">{t('roles.ACCOUNTANT')}</option>
                                    <option value="ADMIN">{t('roles.ADMIN')}</option>
                                    <option value="READ_ONLY">{t('roles.READ_ONLY')}</option>
                                </select>
                                <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60 italic mt-1">{t('modal.rootWarning')}</p>
                            </div>

                            {/* Permissions Section */}
                            <div className="space-y-4 p-6 bg-secondary/20 rounded-2xl border border-border">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-primary">{t('modal.pagePermissions')}</label>
                                    <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={useCustomPermissions}
                                            onChange={handleCustomPermissionsChange}
                                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 transition-all"
                                        />
                                        <span className="opacity-60 group-hover:opacity-100 transition-opacity">{t('modal.customPermissions')}</span>
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {ALL_PERMISSIONS.map(perm => (
                                        <button
                                            type="button"
                                            key={perm.key}
                                            onClick={() => useCustomPermissions && togglePermission(perm.key)}
                                            disabled={!useCustomPermissions}
                                            className={`flex items-center justify-center text-center gap-2 text-[11px] font-bold p-3 rounded-xl cursor-pointer transition-all border ${selectedPermissions.includes(perm.key)
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
                                                } ${!useCustomPermissions ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                                        >
                                            {t(`permissions.${perm.key}` as Parameters<typeof t>[0])}
                                        </button>
                                    ))}
                                </div>
                                {!useCustomPermissions && (
                                    <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60 text-center">{t('modal.defaultPermissions', { role: t(`roles.${selectedRole}` as Parameters<typeof t>[0]) })}</p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={handleCloseModalClick} className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-secondary font-semibold transition-colors">{t('modal.cancel')}</button>
                                <button type="submit" className="flex-1 bg-primary text-primary-foreground px-4 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95">
                                    {editingUser ? t('modal.update') : t('modal.create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
