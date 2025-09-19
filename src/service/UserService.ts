import { submit } from './NetworkUtil';
import type { ServerResponse } from '../shared/ServerResponse';
import type { IUser } from '../server/db/user';

export interface IUserWithPagination {
    users: IUser[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface IUserFilters {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    active?: boolean;
}

export class UserService {
    /**
     * Get all users with filtering and pagination (root access only)
     */
    static async getAllUsers(filters: IUserFilters = {}): Promise<IUserWithPagination> {
        console.log('UserService.getAllUsers: Getting users with filters', filters);

        try {
            const queryParams = new URLSearchParams();

            if (filters.page) queryParams.append('page', filters.page.toString());
            if (filters.limit) queryParams.append('limit', filters.limit.toString());
            if (filters.role) queryParams.append('role', filters.role);
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.active !== undefined) queryParams.append('active', filters.active.toString());

            const url = `/users/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            const response = await submit('GET', url);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('UserService.getAllUsers: Response received', serverResponse);
                return serverResponse.body.data as IUserWithPagination;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('UserService.getAllUsers: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to get users');
            }
        } catch (error) {
            console.error('UserService.getAllUsers: Error:', error);
            throw error;
        }
    }

    /**
     * Get specific user by ID (root access only)
     */
    static async getUserById(id: string): Promise<IUser> {
        console.log('UserService.getUserById: Getting user', { id });

        try {
            const response = await submit('GET', `/users/${id}`);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('UserService.getUserById: Response received', serverResponse);
                return serverResponse.body.data as IUser;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('UserService.getUserById: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to get user');
            }
        } catch (error) {
            console.error('UserService.getUserById: Error:', error);
            throw error;
        }
    }

    /**
     * Create new user (root access only)
     */
    static async createUser(userData: Omit<IUser, '_id' | 'createdAt' | 'updatedAt'>): Promise<ServerResponse> {
        console.log('UserService.createUser: Creating user', userData);

        try {
            const response = await submit('POST', '/users/create', userData);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('UserService.createUser: Response received', serverResponse);
                return serverResponse;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('UserService.createUser: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to create user');
            }
        } catch (error) {
            console.error('UserService.createUser: Error:', error);
            throw error;
        }
    }

    /**
     * Update user (root access only)
     */
    static async updateUser(id: string, userData: Partial<IUser>): Promise<ServerResponse> {
        console.log('UserService.updateUser: Updating user', { id, userData });

        try {
            const response = await submit('PUT', `/users/${id}`, userData);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('UserService.updateUser: Response received', serverResponse);
                return serverResponse;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('UserService.updateUser: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to update user');
            }
        } catch (error) {
            console.error('UserService.updateUser: Error:', error);
            throw error;
        }
    }

    /**
     * Delete user from collection (root access only)
     */
    static async deleteUser(id: string): Promise<ServerResponse> {
        console.log('UserService.deleteUser: Deleting user', { id });

        try {
            const response = await submit('DELETE', `/users/${id}`);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('UserService.deleteUser: Response received', serverResponse);
                return serverResponse;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('UserService.deleteUser: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error('UserService.deleteUser: Error:', error);
            throw error;
        }
    }

    /**
     * Update user roles (root access only)
     */
    static async updateUserRoles(id: string, roles: string[]): Promise<ServerResponse> {
        console.log('UserService.updateUserRoles: Updating user roles', { id, roles });

        try {
            const response = await submit('PUT', `/users/${id}/roles`, { roles });

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('UserService.updateUserRoles: Response received', serverResponse);
                return serverResponse;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('UserService.updateUserRoles: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to update user roles');
            }
        } catch (error) {
            console.error('UserService.updateUserRoles: Error:', error);
            throw error;
        }
    }

    /**
     * Activate/deactivate user (root access only)
     */
    static async setUserActive(id: string, isActive: boolean): Promise<ServerResponse> {
        console.log('UserService.setUserActive: Setting user active status', { id, isActive });

        try {
            const response = await submit('PUT', `/users/${id}/activate`, { isActive });

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('UserService.setUserActive: Response received', serverResponse);
                return serverResponse;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('UserService.setUserActive: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to update user status');
            }
        } catch (error) {
            console.error('UserService.setUserActive: Error:', error);
            throw error;
        }
    }

    /**
     * Format user roles for display
     */
    static formatRoles(roles: string[]): string {
        return roles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ');
    }

    /**
     * Get role badge severity for UI
     */
    static getRoleSeverity(roles: string[]): string {
        if (roles.includes('root')) return 'danger';
        if (roles.includes('owner')) return 'warning';
        return 'info';
    }
}
