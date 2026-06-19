declare module 'csv-writer' {
    interface CsvHeader { id: string; title: string; }
    interface CsvStringifier { getHeaderString(): string; stringifyRecords(records: Record<string, unknown>[]): string; }
    export function createObjectCsvWriter(params: { path: string; header: CsvHeader[] }): { writeRecords(records: Record<string, unknown>[]): Promise<void> };
    export function createObjectCsvStringifier(params: { header: CsvHeader[] }): CsvStringifier;
}
