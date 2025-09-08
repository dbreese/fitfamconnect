import type { ServerResponse } from '@/shared/ServerResponse';
import type { ISchedule } from '@/server/db/schedule';
import { submit } from './NetworkUtil';

export const ScheduleService = {
    async getMySchedules(): Promise<ISchedule[] | undefined> {
        console.log("ScheduleService.getMySchedules: Starting to fetch gym's schedules");
        return await submit('GET', '/schedules')
            .then(async (result) => {
                console.log('ScheduleService.getMySchedules: Received response', {
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const schedules = response.body.data as ISchedule[];
                    console.log('ScheduleService.getMySchedules: Successfully fetched schedules', {
                        count: schedules?.length
                    });
                    return schedules;
                }
                console.log('ScheduleService.getMySchedules: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('ScheduleService.getMySchedules: Error fetching schedules:', error);
                return Promise.reject('Error fetching schedules.');
            });
    },

    async getSchedulesByDateRange(startDate: string, endDate: string): Promise<ISchedule[] | undefined> {
        console.log('ScheduleService.getSchedulesByDateRange: Starting to fetch schedules', { startDate, endDate });
        return await submit('GET', `/schedules?startDate=${startDate}&endDate=${endDate}`)
            .then(async (result) => {
                console.log('ScheduleService.getSchedulesByDateRange: Received response', {
                    startDate,
                    endDate,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const schedules = response.body.data as ISchedule[];
                    console.log('ScheduleService.getSchedulesByDateRange: Successfully fetched schedules', {
                        startDate,
                        endDate,
                        count: schedules?.length
                    });
                    return schedules;
                }
                console.log('ScheduleService.getSchedulesByDateRange: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('ScheduleService.getSchedulesByDateRange: Error fetching schedules:', {
                    startDate,
                    endDate,
                    error
                });
                return Promise.reject('Error fetching schedules.');
            });
    },

    async getScheduleById(id: string): Promise<ISchedule | undefined> {
        console.log('ScheduleService.getScheduleById: Starting to fetch schedule', { id });
        return await submit('GET', `/schedules/${id}`)
            .then(async (result) => {
                console.log('ScheduleService.getScheduleById: Received response', {
                    id,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const schedule = response.body.data as ISchedule;
                    console.log('ScheduleService.getScheduleById: Successfully fetched schedule', {
                        id,
                        classId: schedule?.classId
                    });
                    return schedule;
                } else if (result.status === 404) {
                    console.log('ScheduleService.getScheduleById: Schedule not found', { id });
                    return undefined;
                }
                console.log('ScheduleService.getScheduleById: Response not OK', { id });
                return undefined;
            })
            .catch((error) => {
                console.error('ScheduleService.getScheduleById: Error fetching schedule:', { id, error });
                return Promise.reject('Error fetching schedule.');
            });
    },

    async createSchedule(scheduleData: Partial<ISchedule>): Promise<ServerResponse | undefined> {
        console.log('ScheduleService.createSchedule: Starting to create schedule', { classId: scheduleData.classId });
        return await submit('POST', '/schedules', scheduleData)
            .then(async (result) => {
                console.log('ScheduleService.createSchedule: Received response', {
                    classId: scheduleData.classId,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('ScheduleService.createSchedule: Successfully created schedule', {
                        classId: scheduleData.classId,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('ScheduleService.createSchedule: Response not OK', { classId: scheduleData.classId });
                return undefined;
            })
            .catch((error) => {
                console.error('ScheduleService.createSchedule: Error creating schedule:', {
                    classId: scheduleData.classId,
                    error
                });
                return Promise.reject('Error creating schedule.');
            });
    },

    async updateSchedule(id: string, scheduleData: Partial<ISchedule>): Promise<ServerResponse | undefined> {
        console.log('ScheduleService.updateSchedule: Starting to update schedule', {
            id,
            classId: scheduleData.classId
        });
        return await submit('PUT', `/schedules/${id}`, scheduleData)
            .then(async (result) => {
                console.log('ScheduleService.updateSchedule: Received response', {
                    id,
                    classId: scheduleData.classId,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('ScheduleService.updateSchedule: Successfully updated schedule', {
                        id,
                        classId: scheduleData.classId,
                        responseCode: response.responseCode
                    });
                    return response;
                } else if (result.status === 404) {
                    console.log('ScheduleService.updateSchedule: Schedule not found', { id });
                    return undefined;
                }
                console.log('ScheduleService.updateSchedule: Response not OK', { id, classId: scheduleData.classId });
                return undefined;
            })
            .catch((error) => {
                console.error('ScheduleService.updateSchedule: Error updating schedule:', {
                    id,
                    classId: scheduleData.classId,
                    error
                });
                return Promise.reject('Error updating schedule.');
            });
    },

    async deleteSchedule(id: string): Promise<ServerResponse | undefined> {
        console.log('ScheduleService.deleteSchedule: Starting to delete schedule', { id });
        return await submit('DELETE', `/schedules/${id}`)
            .then(async (result) => {
                console.log('ScheduleService.deleteSchedule: Received response', {
                    id,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('ScheduleService.deleteSchedule: Successfully deleted schedule', {
                        id,
                        responseCode: response.responseCode
                    });
                    return response;
                } else if (result.status === 404) {
                    console.log('ScheduleService.deleteSchedule: Schedule not found', { id });
                    return undefined;
                }
                console.log('ScheduleService.deleteSchedule: Response not OK', { id });
                return undefined;
            })
            .catch((error) => {
                console.error('ScheduleService.deleteSchedule: Error deleting schedule:', { id, error });
                return Promise.reject('Error deleting schedule.');
            });
    }
};
