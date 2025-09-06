import type { ServerResponse } from '@/shared/ServerResponse';
import type { ILocation } from '@/server/db/location';
import { submit } from './NetworkUtil';

export const LocationService = {
    async getAll(): Promise<ILocation[] | undefined> {
        console.log('LocationService.getAll: Starting to fetch all locations');
        return await submit('GET', `/locations`)
            .then(async (result) => {
                console.log('LocationService.getAll: Received response', { status: result.status, ok: result.ok });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const locations = response.body.data as ILocation[];
                    console.log('LocationService.getAll: Successfully fetched locations', { count: locations?.length });
                    return locations;
                }
                console.log('LocationService.getAll: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('LocationService.getAll: Error fetching locations:', error);
                return Promise.reject('Error fetching locations.');
            });
    },

    async getById(id: string): Promise<ILocation | undefined> {
        console.log('LocationService.getById: Starting to fetch location', { id });
        return await submit('GET', `/locations/${id}`)
            .then(async (result) => {
                console.log('LocationService.getById: Received response', { id, status: result.status, ok: result.ok });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const location = response.body.data as ILocation;
                    console.log('LocationService.getById: Successfully fetched location', {
                        id,
                        locationName: location?.name
                    });
                    return location;
                }
                console.log('LocationService.getById: Response not OK', { id });
                return undefined;
            })
            .catch((error) => {
                console.error('LocationService.getById: Error fetching location:', { id, error });
                return Promise.reject('Error fetching location.');
            });
    },

    async create(location: Omit<ILocation, 'createdAt' | 'updatedAt'>): Promise<ServerResponse | undefined> {
        console.log('LocationService.create: Starting to create location', { locationName: location.name });
        return await submit('POST', '/locations', location)
            .then(async (result) => {
                console.log('LocationService.create: Received response', {
                    locationName: location.name,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('LocationService.create: Successfully created location', {
                        locationName: location.name,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('LocationService.create: Response not OK', { locationName: location.name });
                return undefined;
            })
            .catch((error) => {
                console.error('LocationService.create: Error creating location:', {
                    locationName: location.name,
                    error
                });
                return Promise.reject('Error creating location.');
            });
    },

    async update(id: string, location: Partial<ILocation>): Promise<ServerResponse | undefined> {
        console.log('LocationService.update: Starting to update location', { id, locationName: location.name });
        return await submit('PUT', `/locations/${id}`, location)
            .then(async (result) => {
                console.log('LocationService.update: Received response', {
                    id,
                    locationName: location.name,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('LocationService.update: Successfully updated location', {
                        id,
                        locationName: location.name,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('LocationService.update: Response not OK', { id, locationName: location.name });
                return undefined;
            })
            .catch((error) => {
                console.error('LocationService.update: Error updating location:', {
                    id,
                    locationName: location.name,
                    error
                });
                return Promise.reject('Error updating location.');
            });
    },

    async delete(id: string): Promise<ServerResponse | undefined> {
        console.log('LocationService.delete: Starting to delete location', { id });
        return await submit('DELETE', `/locations/${id}`)
            .then(async (result) => {
                console.log('LocationService.delete: Received response', { id, status: result.status, ok: result.ok });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('LocationService.delete: Successfully deleted location', {
                        id,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('LocationService.delete: Response not OK', { id });
                return undefined;
            })
            .catch((error) => {
                console.error('LocationService.delete: Error deleting location:', { id, error });
                return Promise.reject('Error deleting location.');
            });
    }
};
