export interface User {
    id: string;
    email: string;
    username: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    isMfaEnabled: boolean;
    lastLoginAt?: Date;
}
export interface UserRegistrationRequest {
    email: string;
    username: string;
    password: string;
}
export interface UserLoginRequest {
    username: string;
    password: string;
    mfaCode?: string;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
export interface AuthResponse {
    user: User;
    tokens: AuthTokens;
}
export interface MfaSetupResponse {
    secret: string;
    qrCode: string;
}
export interface PasswordResetRequest {
    email: string;
}
export interface PasswordResetConfirmation {
    token: string;
    newPassword: string;
}
//# sourceMappingURL=user.d.ts.map