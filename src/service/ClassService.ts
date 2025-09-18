import type { ServerResponse } from '@/shared/ServerResponse';
import type { IClass } from '@/server/db/class';
import { submit } from './NetworkUtil';

export const ClassService = {
    async getMyClasses(): Promise<IClass[] | undefined> {
        console.log("ClassService.getMyClasses: Starting to fetch user's classes");
        return await submit('GET', '/classes')
            .then(async (result) => {
                console.log('ClassService.getMyClasses: Received response', { status: result.status, ok: result.ok });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const classes = response.body.data as IClass[];
                    console.log('ClassService.getMyClasses: Successfully fetched classes', { count: classes?.length });
                    return classes;
                }
                console.log('ClassService.getMyClasses: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('ClassService.getMyClasses: Error fetching classes:', error);
                return Promise.reject('Error fetching classes.');
            });
    },

    async getClassById(id: string): Promise<IClass | undefined> {
        console.log('ClassService.getClassById: Starting to fetch class', { id });
        return await submit('GET', `/classes/${id}`)
            .then(async (result) => {
                console.log('ClassService.getClassById: Received response', {
                    id,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const classItem = response.body.data as IClass;
                    console.log('ClassService.getClassById: Successfully fetched class', {
                        id,
                        className: classItem?.name
                    });
                    return classItem;
                } else if (result.status === 404) {
                    console.log('ClassService.getClassById: Class not found', { id });
                    return undefined;
                }
                console.log('ClassService.getClassById: Response not OK', { id });
                return undefined;
            })
            .catch((error) => {
                console.error('ClassService.getClassById: Error fetching class:', { id, error });
                return Promise.reject('Error fetching class.');
            });
    },

    async createClass(
        classData: Omit<IClass, 'gymId' | 'isActive' | 'createdAt' | 'updatedAt'>
    ): Promise<ServerResponse | undefined> {
        console.log('ClassService.createClass: Starting to create class', { className: classData.name });
        return await submit('POST', '/classes', classData)
            .then(async (result) => {
                console.log('ClassService.createClass: Received response', {
                    className: classData.name,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('ClassService.createClass: Successfully created class', {
                        className: classData.name,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('ClassService.createClass: Response not OK', { className: classData.name });
                return undefined;
            })
            .catch((error) => {
                console.error('ClassService.createClass: Error creating class:', { className: classData.name, error });
                return Promise.reject('Error creating class.');
            });
    },

    async updateClass(id: string, classData: Partial<IClass>): Promise<ServerResponse | undefined> {
        console.log('ClassService.updateClass: Starting to update class', { id, className: classData.name });
        return await submit('PUT', `/classes/${id}`, classData)
            .then(async (result) => {
                console.log('ClassService.updateClass: Received response', {
                    id,
                    className: classData.name,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('ClassService.updateClass: Successfully updated class', {
                        id,
                        className: classData.name,
                        responseCode: response.responseCode
                    });
                    return response;
                } else if (result.status === 404) {
                    console.log('ClassService.updateClass: Class not found', { id });
                    return undefined;
                }
                console.log('ClassService.updateClass: Response not OK', { id, className: classData.name });
                return undefined;
            })
            .catch((error) => {
                console.error('ClassService.updateClass: Error updating class:', {
                    id,
                    className: classData.name,
                    error
                });
                return Promise.reject('Error updating class.');
            });
    },

    async deleteClass(id: string): Promise<ServerResponse | undefined> {
        console.log('ClassService.deleteClass: Starting to delete class', { id });
        return await submit('DELETE', `/classes/${id}`)
            .then(async (result) => {
                console.log('ClassService.deleteClass: Received response', {
                    id,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('ClassService.deleteClass: Successfully deleted class', {
                        id,
                        responseCode: response.responseCode
                    });
                    return response;
                } else if (result.status === 404) {
                    console.log('ClassService.deleteClass: Class not found', { id });
                    return undefined;
                }
                console.log('ClassService.deleteClass: Response not OK', { id });
                return undefined;
            })
            .catch((error) => {
                console.error('ClassService.deleteClass: Error deleting class:', { id, error });
                return Promise.reject('Error deleting class.');
            });
    },

    /**
     * Get available classes for a gym on a specific date with signup status
     */
    async getClassesForDate(gymId: string, date: string) {
        console.log('ClassService.getClassesForDate: Getting classes for', { gymId, date });

        try {
            const response = await submit('GET', `/signups/classes?gymId=${encodeURIComponent(gymId)}&date=${encodeURIComponent(date)}`);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('ClassService.getClassesForDate: Response received', serverResponse);
                return serverResponse.body.data;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('ClassService.getClassesForDate: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to get classes');
            }
        } catch (error) {
            console.error('ClassService.getClassesForDate: Error:', error);
            throw error;
        }
    },

    /**
     * Toggle signup for a class (sign up or cancel)
     */
    async toggleSignup(scheduleId: string, classDate: string, memberId?: string, phone?: string, email?: string, status?: string) {
        console.log('ClassService.toggleSignup: Toggling signup for schedule', { scheduleId, classDate, memberId, phone, email, status });

        try {
            const requestBody: any = { scheduleId, classDate };
            if (memberId) requestBody.memberId = memberId;
            if (phone) requestBody.phone = phone;
            if (email) requestBody.email = email;
            if (status) requestBody.status = status;

            const response = await submit('POST', '/signups/signup', requestBody);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('ClassService.toggleSignup: Response received', serverResponse);
                return serverResponse.body.data;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('ClassService.toggleSignup: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to toggle signup');
            }
        } catch (error) {
            console.error('ClassService.toggleSignup: Error:', error);
            throw error;
        }
    },

    /**
     * Get user's upcoming signups (today and future)
     */
    async getUpcomingSignups() {
        console.log('ClassService.getUpcomingSignups: Getting upcoming signups');

        try {
            const response = await submit('GET', '/signups/upcoming');

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('ClassService.getUpcomingSignups: Response received', serverResponse);
                return serverResponse.body.data;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('ClassService.getUpcomingSignups: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to get upcoming signups');
            }
        } catch (error) {
            console.error('ClassService.getUpcomingSignups: Error:', error);
            throw error;
        }
    }
};
