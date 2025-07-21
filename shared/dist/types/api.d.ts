export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    metadata?: ResponseMetadata;
}
export interface ApiError {
    code: string;
    message: string;
    details?: any;
}
export interface ResponseMetadata {
    timestamp: number;
    requestId: string;
    version: string;
}
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
    };
}
export interface SearchParams {
    query: string;
    type?: 'address' | 'transaction' | 'block';
    blockchain?: string;
}
export interface WebSocketMessage<T = any> {
    type: WebSocketMessageType;
    data: T;
    timestamp: number;
}
export declare enum WebSocketMessageType {
    TRANSACTION_UPDATE = "TRANSACTION_UPDATE",
    BALANCE_UPDATE = "BALANCE_UPDATE",
    NEW_BLOCK = "NEW_BLOCK",
    PRICE_UPDATE = "PRICE_UPDATE",
    ERROR = "ERROR"
}
//# sourceMappingURL=api.d.ts.map