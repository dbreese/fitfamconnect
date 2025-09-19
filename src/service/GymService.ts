import { submit } from './NetworkUtil';
import type { ServerResponse } from '../shared/ServerResponse';
import type { IGym } from '../server/db/gym';

export interface IOwner {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export interface IGymWithOwner extends IGym {
    owner?: IOwner;
}

export class GymService {
    /**
     * Get all gyms (root access only)
     */
    static async getAllGyms(): Promise<IGymWithOwner[]> {
        console.log('GymService.getAllGyms: Getting all gyms');

        try {
            const response = await submit('GET', '/gym/all');

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('GymService.getAllGyms: Response received', serverResponse);
                return serverResponse.body.data as IGymWithOwner[];
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('GymService.getAllGyms: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to get gyms');
            }
        } catch (error) {
            console.error('GymService.getAllGyms: Error:', error);
            throw error;
        }
    }

    /**
     * Create new gym (root access only)
     */
    static async createGym(gymData: Omit<IGym, '_id' | 'createdAt' | 'updatedAt'>): Promise<ServerResponse> {
        console.log('GymService.createGym: Creating gym', gymData);

        try {
            const response = await submit('POST', '/gym/create', gymData);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('GymService.createGym: Response received', serverResponse);
                return serverResponse;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('GymService.createGym: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to create gym');
            }
        } catch (error) {
            console.error('GymService.createGym: Error:', error);
            throw error;
        }
    }

    /**
     * Update gym (root access only)
     */
    static async updateGym(id: string, gymData: Partial<IGym>): Promise<ServerResponse> {
        console.log('GymService.updateGym: Updating gym', { id, gymData });

        try {
            const response = await submit('PUT', `/gym/${id}`, gymData);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('GymService.updateGym: Response received', serverResponse);
                return serverResponse;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('GymService.updateGym: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to update gym');
            }
        } catch (error) {
            console.error('GymService.updateGym: Error:', error);
            throw error;
        }
    }

    /**
     * Delete gym (root access only)
     */
    static async deleteGym(id: string): Promise<ServerResponse> {
        console.log('GymService.deleteGym: Deleting gym', { id });

        try {
            const response = await submit('DELETE', `/gym/${id}`);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('GymService.deleteGym: Response received', serverResponse);
                return serverResponse;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('GymService.deleteGym: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to delete gym');
            }
        } catch (error) {
            console.error('GymService.deleteGym: Error:', error);
            throw error;
        }
    }

    /**
     * Get all owners for selection (root access only)
     */
    static async getOwners(): Promise<IOwner[]> {
        console.log('GymService.getOwners: Getting all owners');

        try {
            const response = await submit('GET', '/gym/users/owners');

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('GymService.getOwners: Response received', serverResponse);
                return serverResponse.body.data as IOwner[];
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('GymService.getOwners: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to get owners');
            }
        } catch (error) {
            console.error('GymService.getOwners: Error:', error);
            throw error;
        }
    }
}
