export const SessionUtils = {
    async getToken(): Promise<string | null | undefined> {
        try {
            return window.Clerk?.session?.getToken();
        } catch (error) {
            console.error('Could not get token.', error);
            return undefined;
        }
    }
};

// global reactive user
import { reactive } from 'vue';
export const user = reactive<Record<string, any>>({});
