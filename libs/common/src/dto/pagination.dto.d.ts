export declare class PaginationQueryDto {
    page: number;
    pageSize: number;
    keyword?: string;
    get skip(): number;
    get take(): number;
}
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}
