import { submit } from './NetworkUtil';
import type { ServerResponse } from '@/shared/ServerResponse';

export class CoachService {
    static async getCoaches() {
        const response = await submit('GET', '/coaches');
        const result = (await response.json()) as ServerResponse;
        return result.body.data;
    }

    static async searchMembers(query: string) {
        const url = `/coaches/search-members?q=${encodeURIComponent(query || '')}`;
        const response = await submit('GET', url);
        const result = (await response.json()) as ServerResponse;
        return result.body.data;
    }

    static async setCoach(memberId: string) {
        const response = await submit('POST', '/coaches/set', { memberId });
        const result = (await response.json()) as ServerResponse;
        return result.body.data;
    }

    static async unsetCoach(memberId: string) {
        const response = await submit('POST', '/coaches/unset', { memberId });
        const result = (await response.json()) as ServerResponse;
        return result.body.data;
    }
}
