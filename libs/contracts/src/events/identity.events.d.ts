export declare const IdentityEvents: {
    readonly UserRegistered: "identity.user.registered";
    readonly UserDeleted: "identity.user.deleted";
    readonly UserStatusChanged: "identity.user.status_changed";
    readonly UserLoggedIn: "identity.user.logged_in";
};
export interface UserRegisteredPayload {
    userId: string;
    email?: string | null;
    phone?: string | null;
}
export interface UserDeletedPayload {
    userId: string;
}
export interface UserStatusChangedPayload {
    userId: string;
    status: string;
}
export interface UserLoggedInPayload {
    userId: string;
    ip?: string | null;
    userAgent?: string | null;
}
