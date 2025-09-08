declare const __API_SERVER__: string;

// Clerk global declarations
declare global {
    interface Window {
        Clerk?: {
            load: () => Promise<void>;
            user: any;
            session: any;
        };
    }
}
