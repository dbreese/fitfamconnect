import express, { Router, type Request, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Location, type ILocation } from '../db/location';
import { type ServerResponse } from '../../shared/ServerResponse';

export const router = Router();
router.use(express.json());

// GET /locations - Get all locations
router.get('/locations', authenticateUser, authorizeRoles('user'), async (req: AuthenticatedRequest, res: Response) => {
    console.log('locationService.getAll: API invoked');
    try {
        const locations = await Location.find();
        console.log(`locationService.getAll: Retrieved ${locations.length} locations`);

        const response: ServerResponse = {
            responseCode: 200,
            body: {
                message: 'Locations retrieved successfully',
                data: locations
            }
        };
        res.status(200).json(response);
        console.log('locationService.getAll: Response sent successfully');
    } catch (error) {
        console.error('locationService.getAll: Error retrieving locations:', error);
        res.status(500).json({ message: 'Error retrieving locations' });
    }
});

// GET /locations/:id - Get location by ID
router.get(
    '/locations/:id',
    authenticateUser,
    authorizeRoles('user'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(`locationService.getById: API invoked with id=${id}`);

        try {
            const location = await Location.findById(id);
            if (!location) {
                console.log(`locationService.getById: Location not found with id=${id}`);
                res.status(404).json({ message: 'Location not found' });
                return;
            }

            console.log(`locationService.getById: Retrieved location name="${location.name}" with id=${id}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Location retrieved successfully',
                    data: location
                }
            };
            res.status(200).json(response);
            console.log('locationService.getById: Response sent successfully');
        } catch (error) {
            console.error(`locationService.getById: Error retrieving location with id=${id}:`, error);
            res.status(500).json({ message: 'Error retrieving location' });
        }
    }
);

// POST /locations - Create new location
router.post(
    '/locations',
    authenticateUser,
    authorizeRoles('user'),
    async (req: AuthenticatedRequest, res: Response) => {
        console.log(`locationService.create: API invoked with payload=${JSON.stringify(req.body)}`);
        const locationData = req.body;

        try {
            const newLocation = new Location(locationData);
            const savedLocation = await newLocation.save();
            console.log(
                `locationService.create: Created location name="${savedLocation.name}" with id=${savedLocation._id}`
            );

            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Location created successfully',
                    data: savedLocation
                }
            };
            res.status(201).json(response);
            console.log('locationService.create: Response sent successfully');
        } catch (error) {
            console.error(`locationService.create: Error creating location name="${locationData.name}":`, error);
            res.status(500).json({ message: 'Error creating location' });
        }
    }
);

// PUT /locations/:id - Update location
router.put(
    '/locations/:id',
    authenticateUser,
    authorizeRoles('user'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(`locationService.update: API invoked with id=${id} and payload=${JSON.stringify(req.body)}`);
        const updateData = req.body;

        try {
            const updatedLocation = await Location.findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true
            });

            if (!updatedLocation) {
                console.log(`locationService.update: Location not found with id=${id}`);
                res.status(404).json({ message: 'Location not found' });
                return;
            }

            console.log(`locationService.update: Updated location name="${updatedLocation.name}" with id=${id}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Location updated successfully',
                    data: updatedLocation
                }
            };
            res.status(200).json(response);
            console.log('locationService.update: Response sent successfully');
        } catch (error) {
            console.error(`locationService.update: Error updating location with id=${id}:`, error);
            res.status(500).json({ message: 'Error updating location' });
        }
    }
);

// DELETE /locations/:id - Delete location
router.delete(
    '/locations/:id',
    authenticateUser,
    authorizeRoles('user'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(`locationService.delete: API invoked with id=${id}`);

        try {
            const deletedLocation = await Location.findByIdAndDelete(id);

            if (!deletedLocation) {
                console.log(`locationService.delete: Location not found with id=${id}`);
                res.status(404).json({ message: 'Location not found' });
                return;
            }

            console.log(`locationService.delete: Deleted location name="${deletedLocation.name}" with id=${id}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Location deleted successfully',
                    data: deletedLocation
                }
            };
            res.status(200).json(response);
            console.log('locationService.delete: Response sent successfully');
        } catch (error) {
            console.error(`locationService.delete: Error deleting location with id=${id}:`, error);
            res.status(500).json({ message: 'Error deleting location' });
        }
    }
);
