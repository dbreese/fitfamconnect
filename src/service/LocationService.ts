import type { ServerResponse } from '@/shared/ServerResponse';
import type { ILocation } from '@/server/db/location';
import { submit } from './NetworkUtil';

export const LocationService = {
    async getMyLocations(): Promise<ILocation[] | undefined> {
        console.log("LocationService.getMyLocations: Starting to fetch user's locations");
        return await submit('GET', '/locations')
            .then(async (result) => {
                console.log('LocationService.getMyLocations: Received response', {
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const locations = response.body.data as ILocation[];
                    console.log('LocationService.getMyLocations: Successfully fetched locations', {
                        count: locations?.length
                    });
                    return locations;
                }
                console.log('LocationService.getMyLocations: Response not OK');
                return undefined;
            })
            .catch((error) => {
                console.error('LocationService.getMyLocations: Error fetching locations:', error);
                return Promise.reject('Error fetching locations.');
            });
    },

    async getLocationById(id: string): Promise<ILocation | undefined> {
        console.log('LocationService.getLocationById: Starting to fetch location', { id });
        return await submit('GET', `/locations/${id}`)
            .then(async (result) => {
                console.log('LocationService.getLocationById: Received response', {
                    id,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    const location = response.body.data as ILocation;
                    console.log('LocationService.getLocationById: Successfully fetched location', {
                        id,
                        locationName: location?.name
                    });
                    return location;
                } else if (result.status === 404) {
                    console.log('LocationService.getLocationById: Location not found', { id });
                    return undefined;
                }
                console.log('LocationService.getLocationById: Response not OK', { id });
                return undefined;
            })
            .catch((error) => {
                console.error('LocationService.getLocationById: Error fetching location:', { id, error });
                return Promise.reject('Error fetching location.');
            });
    },

    async createLocation(
        locationData: Omit<ILocation, 'gymId' | 'isActive' | 'createdAt' | 'updatedAt'>
    ): Promise<ServerResponse | undefined> {
        console.log('LocationService.createLocation: Starting to create location', { locationName: locationData.name });
        return await submit('POST', '/locations', locationData)
            .then(async (result) => {
                console.log('LocationService.createLocation: Received response', {
                    locationName: locationData.name,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('LocationService.createLocation: Successfully created location', {
                        locationName: locationData.name,
                        responseCode: response.responseCode
                    });
                    return response;
                }
                console.log('LocationService.createLocation: Response not OK', { locationName: locationData.name });
                return undefined;
            })
            .catch((error) => {
                console.error('LocationService.createLocation: Error creating location:', {
                    locationName: locationData.name,
                    error
                });
                return Promise.reject('Error creating location.');
            });
    },

    async updateLocation(id: string, locationData: Partial<ILocation>): Promise<ServerResponse | undefined> {
        console.log('LocationService.updateLocation: Starting to update location', {
            id,
            locationName: locationData.name
        });
        return await submit('PUT', `/locations/${id}`, locationData)
            .then(async (result) => {
                console.log('LocationService.updateLocation: Received response', {
                    id,
                    locationName: locationData.name,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('LocationService.updateLocation: Successfully updated location', {
                        id,
                        locationName: locationData.name,
                        responseCode: response.responseCode
                    });
                    return response;
                } else if (result.status === 404) {
                    console.log('LocationService.updateLocation: Location not found', { id });
                    return undefined;
                }
                console.log('LocationService.updateLocation: Response not OK', { id, locationName: locationData.name });
                return undefined;
            })
            .catch((error) => {
                console.error('LocationService.updateLocation: Error updating location:', {
                    id,
                    locationName: locationData.name,
                    error
                });
                return Promise.reject('Error updating location.');
            });
    },

    async deleteLocation(id: string): Promise<ServerResponse | undefined> {
        console.log('LocationService.deleteLocation: Starting to delete location', { id });
        return await submit('DELETE', `/locations/${id}`)
            .then(async (result) => {
                console.log('LocationService.deleteLocation: Received response', {
                    id,
                    status: result.status,
                    ok: result.ok
                });
                if (result.ok) {
                    const json = await result.json();
                    const response = json as ServerResponse;
                    console.log('LocationService.deleteLocation: Successfully deleted location', {
                        id,
                        responseCode: response.responseCode
                    });
                    return response;
                } else if (result.status === 404) {
                    console.log('LocationService.deleteLocation: Location not found', { id });
                    return undefined;
                }
                console.log('LocationService.deleteLocation: Response not OK', { id });
                return undefined;
            })
            .catch((error) => {
                console.error('LocationService.deleteLocation: Error deleting location:', { id, error });
                return Promise.reject('Error deleting location.');
            });
    }
};
