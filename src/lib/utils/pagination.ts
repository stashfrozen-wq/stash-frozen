export function calcSkip(page: number, limit: number): number {
    return (page - 1) * limit;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        total: number;
        pages: number;
        current: number;
    };
}

export function buildPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
): PaginatedResult<T> {
    return {
        data,
        pagination: {
            total,
            pages: Math.ceil(total / limit),
            current: page,
        },
    };
}
