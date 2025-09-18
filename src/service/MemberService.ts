import { submit } from './NetworkUtil';
import type { ServerResponse } from '@/shared/ServerResponse';

export class MemberService {
    /**
     * Update the user's member profile
     * @param updates - Object containing phone, address, and/or pinCode to update
     * @returns Promise<ServerResponse | undefined>
     */
    static async updateProfile(updates: {
        phone?: string;
        address?: {
            street?: string;
            city?: string;
            state?: string;
            zipCode?: string;
            country?: string;
        };
        pinCode?: string | null;
    }): Promise<ServerResponse | undefined> {
        try {
            const result = await submit('PUT', '/member', updates);
            return await result.json();
        } catch (error) {
            console.error('MemberService.updateProfile error:', error);
            return undefined;
        }
    }

    /**
     * Get the current user's member profile information
     * @returns Promise<ServerResponse | undefined>
     */
    static async getProfile(): Promise<ServerResponse | undefined> {
        try {
            const result = await submit('GET', '/member/profile');
            return await result.json();
        } catch (error) {
            console.error('MemberService.getProfile error:', error);
            return undefined;
        }
    }
}
