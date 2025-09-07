import type { IUser } from '../db/user';
import express, { Router, type Request, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Location, type ILocation } from '../db/location';
import { Gym } from '../db/gym';
import { type ServerResponse } from '../../shared/ServerResponse';

export const router = Router();
router.use(express.json());

// GET /locations - Get all locations for the current user's gym
router.get('/locations', authenticateUser, authorizeRoles('user'), async (req: AuthenticatedRequest, res: Response) => {
    console.log('locationService.getLocations: API invoked');
    const user = req.user;

    try {
        const locations = await findLocationsByOwner(user);
        console.log(`locationService.getLocations: Retrieved ${locations.length} locations for user ${user?._id}`);

        const response: ServerResponse = {
            responseCode: 200,
            body: {
                message: 'Locations retrieved successfully',
                data: locations
            }
        };
        res.status(200).json(response);
        console.log('locationService.getLocations: Response sent successfully');
    } catch (error) {
        console.error('locationService.getLocations: Error retrieving locations:', error);
        res.status(500).json({ message: 'Error retrieving locations' });
    }
});

// GET /locations/:id - Get location by ID (if it belongs to user's gym)
router.get(
    '/locations/:id',
    authenticateUser,
    authorizeRoles('user'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(`locationService.getLocation: API invoked with id=${id}`);
        const user = req.user;

        try {
            const location = await findLocationByIdAndOwner(id, user);
            if (!location) {
                console.log(`locationService.getLocation: Location not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Location not found' });
                return;
            }

            console.log(`locationService.getLocation: Retrieved location name="${location.name}" with id=${id}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Location retrieved successfully',
                    data: location
                }
            };
            res.status(200).json(response);
            console.log('locationService.getLocation: Response sent successfully');
        } catch (error) {
            console.error(`locationService.getLocation: Error retrieving location with id=${id}:`, error);
            res.status(500).json({ message: 'Error retrieving location' });
        }
    }
);

// POST /locations - Create new location for user's gym
router.post(
    '/locations',
    authenticateUser,
    authorizeRoles('user'),
    async (req: AuthenticatedRequest, res: Response) => {
        console.log(`locationService.createLocation: API invoked with payload=${JSON.stringify(req.body)}`);
        const user = req.user;
        const locationData = req.body;

        try {
            const newLocation = await createLocationForOwner(user, locationData);
            if (!newLocation) {
                console.log(
                    `locationService.createLocation: Failed to create location - no gym found for user ${user?._id}`
                );
                res.status(404).json({ message: 'No gym found for user' });
                return;
            }

            console.log(
                `locationService.createLocation: Created location name="${newLocation.name}" with id=${newLocation._id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Location created successfully',
                    data: newLocation
                }
            };
            res.status(201).json(response);
            console.log('locationService.createLocation: Response sent successfully');
        } catch (error) {
            console.error(`locationService.createLocation: Error creating location:`, error);
            res.status(500).json({ message: 'Error creating location' });
        }
    }
);

// PUT /locations/:id - Update location (if it belongs to user's gym)
router.put(
    '/locations/:id',
    authenticateUser,
    authorizeRoles('user'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(
            `locationService.updateLocation: API invoked with id=${id} and payload=${JSON.stringify(req.body)}`
        );
        const user = req.user;
        const updateData = req.body;

        try {
            const updatedLocation = await updateLocationByIdAndOwner(id, user, updateData);
            if (!updatedLocation) {
                console.log(`locationService.updateLocation: Location not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Location not found' });
                return;
            }

            console.log(
                `locationService.updateLocation: Updated location name="${updatedLocation.name}" with id=${id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Location updated successfully',
                    data: updatedLocation
                }
            };
            res.status(200).json(response);
            console.log('locationService.updateLocation: Response sent successfully');
        } catch (error) {
            console.error(`locationService.updateLocation: Error updating location with id=${id}:`, error);
            res.status(500).json({ message: 'Error updating location' });
        }
    }
);

// DELETE /locations/:id - Delete location (if it belongs to user's gym)
router.delete(
    '/locations/:id',
    authenticateUser,
    authorizeRoles('user'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(`locationService.deleteLocation: API invoked with id=${id}`);
        const user = req.user;

        try {
            const deletedLocation = await deleteLocationByIdAndOwner(id, user);
            if (!deletedLocation) {
                console.log(`locationService.deleteLocation: Location not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Location not found' });
                return;
            }

            console.log(
                `locationService.deleteLocation: Deleted location name="${deletedLocation.name}" with id=${id}`
            );
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Location deleted successfully',
                    data: deletedLocation
                }
            };
            res.status(200).json(response);
            console.log('locationService.deleteLocation: Response sent successfully');
        } catch (error) {
            console.error(`locationService.deleteLocation: Error deleting location with id=${id}:`, error);
            res.status(500).json({ message: 'Error deleting location' });
        }
    }
);

/**
 * Find all locations for the user's gym
 */
async function findLocationsByOwner(user: IUser | undefined): Promise<ILocation[]> {
    if (!user) {
        console.log('locationService.findLocationsByOwner: No user provided');
        return [];
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`locationService.findLocationsByOwner: No gym found for user ${user._id}`);
        return [];
    }

    console.log(`locationService.findLocationsByOwner: Looking for locations in gym ${gym._id} for user ${user._id}`);
    const locations = await Location.find({ gymId: gym._id, isActive: true }).sort({ name: 1 });

    console.log(`locationService.findLocationsByOwner: Found ${locations.length} locations for gym ${gym.name}`);
    return locations;
}

/**
 * Find location by ID if it belongs to user's gym
 */
async function findLocationByIdAndOwner(locationId: string, user: IUser | undefined): Promise<ILocation | null> {
    if (!user) {
        console.log('locationService.findLocationByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`locationService.findLocationByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    console.log(`locationService.findLocationByIdAndOwner: Looking for location ${locationId} in gym ${gym._id}`);
    const location = await Location.findOne({ _id: locationId, gymId: gym._id, isActive: true });

    if (location) {
        console.log(`locationService.findLocationByIdAndOwner: Found location "${location.name}"`);
    } else {
        console.log(`locationService.findLocationByIdAndOwner: Location not found or doesn't belong to user's gym`);
    }

    return location;
}

/**
 * Create new location for user's gym
 */
async function createLocationForOwner(
    user: IUser | undefined,
    locationData: Partial<ILocation>
): Promise<ILocation | null> {
    if (!user) {
        console.log('locationService.createLocationForOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`locationService.createLocationForOwner: No gym found for user ${user._id}`);
        return null;
    }

    console.log(`locationService.createLocationForOwner: Creating location for gym ${gym._id}`);

    // Remove sensitive fields and set gymId
    const { gymId, isActive, createdAt, updatedAt, ...safeLocationData } = locationData;
    const newLocationData = {
        ...safeLocationData,
        gymId: gym._id,
        isActive: true
    };

    const newLocation = new Location(newLocationData);
    const savedLocation = await newLocation.save();

    console.log(
        `locationService.createLocationForOwner: Created location "${savedLocation.name}" with id ${savedLocation._id}`
    );
    return savedLocation;
}

/**
 * Update location by ID if it belongs to user's gym
 */
async function updateLocationByIdAndOwner(
    locationId: string,
    user: IUser | undefined,
    updateData: Partial<ILocation>
): Promise<ILocation | null> {
    if (!user) {
        console.log('locationService.updateLocationByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`locationService.updateLocationByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    // Verify location belongs to user's gym
    const location = await Location.findOne({ _id: locationId, gymId: gym._id, isActive: true });
    if (!location) {
        console.log(
            `locationService.updateLocationByIdAndOwner: Location ${locationId} not found or doesn't belong to user's gym`
        );
        return null;
    }

    console.log(`locationService.updateLocationByIdAndOwner: Updating location ${locationId} for gym ${gym._id}`);

    // Remove fields that shouldn't be updated
    const { gymId, isActive, createdAt, updatedAt, ...safeUpdateData } = updateData;

    const updatedLocation = await Location.findByIdAndUpdate(locationId, safeUpdateData, {
        new: true,
        runValidators: true
    });

    if (updatedLocation) {
        console.log(
            `locationService.updateLocationByIdAndOwner: Successfully updated location "${updatedLocation.name}"`
        );
    }

    return updatedLocation;
}

/**
 * Delete location by ID if it belongs to user's gym (soft delete)
 */
async function deleteLocationByIdAndOwner(locationId: string, user: IUser | undefined): Promise<ILocation | null> {
    if (!user) {
        console.log('locationService.deleteLocationByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`locationService.deleteLocationByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    // Verify location belongs to user's gym
    const location = await Location.findOne({ _id: locationId, gymId: gym._id, isActive: true });
    if (!location) {
        console.log(
            `locationService.deleteLocationByIdAndOwner: Location ${locationId} not found or doesn't belong to user's gym`
        );
        return null;
    }

    console.log(`locationService.deleteLocationByIdAndOwner: Soft deleting location ${locationId} for gym ${gym._id}`);

    // Soft delete by setting isActive to false
    const deletedLocation = await Location.findByIdAndUpdate(locationId, { isActive: false }, { new: true });

    if (deletedLocation) {
        console.log(
            `locationService.deleteLocationByIdAndOwner: Successfully deleted location "${deletedLocation.name}"`
        );
    }

    return deletedLocation;
}
