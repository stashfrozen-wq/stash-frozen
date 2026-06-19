export function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

interface PrismaUniqueConstraintError {
    code: 'P2002';
    meta: { target: string | string[] };
}

export function isPrismaUniqueConstraintError(error: unknown): error is PrismaUniqueConstraintError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
    );
}

export function isPrismaRecordNotFoundError(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2025'
    );
}
