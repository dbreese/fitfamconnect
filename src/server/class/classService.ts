import type { IUser } from '../db/user';
import express, { Router, type Request, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import { Class, type IClass } from '../db/class';
import { Gym } from '../db/gym';
import { type ServerResponse } from '../../shared/ServerResponse';

export const router = Router();
router.use(express.json());

// GET /classes - Get all classes for the current user's gym
router.get('/classes', authenticateUser, authorizeRoles('owner'), async (req: AuthenticatedRequest, res: Response) => {
    console.log('classService.getClasses: API invoked');
    const user = req.user;

    try {
        const classes = await findClassesByOwner(user);
        console.log(`classService.getClasses: Retrieved ${classes.length} classes for user ${user?._id}`);

        const response: ServerResponse = {
            responseCode: 200,
            body: {
                message: 'Classes retrieved successfully',
                data: classes
            }
        };
        res.status(200).json(response);
        console.log('classService.getClasses: Response sent successfully');
    } catch (error) {
        console.error('classService.getClasses: Error retrieving classes:', error);
        res.status(500).json({ message: 'Error retrieving classes' });
    }
});

// GET /classes/:id - Get class by ID (if it belongs to user's gym)
router.get(
    '/classes/:id',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(`classService.getClass: API invoked with id=${id}`);
        const user = req.user;

        try {
            const classItem = await findClassByIdAndOwner(id, user);
            if (!classItem) {
                console.log(`classService.getClass: Class not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Class not found' });
                return;
            }

            console.log(`classService.getClass: Retrieved class name="${classItem.name}" with id=${id}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Class retrieved successfully',
                    data: classItem
                }
            };
            res.status(200).json(response);
            console.log('classService.getClass: Response sent successfully');
        } catch (error) {
            console.error(`classService.getClass: Error retrieving class with id=${id}:`, error);
            res.status(500).json({ message: 'Error retrieving class' });
        }
    }
);

// POST /classes - Create new class for user's gym
router.post('/classes', authenticateUser, authorizeRoles('owner'), async (req: AuthenticatedRequest, res: Response) => {
    console.log(`classService.createClass: API invoked with payload=${JSON.stringify(req.body)}`);
    const user = req.user;
    const classData = req.body;

    try {
        const newClass = await createClassForOwner(user, classData);
        if (!newClass) {
            console.log(`classService.createClass: Failed to create class - no gym found for user ${user?._id}`);
            res.status(404).json({ message: 'No gym found for user' });
            return;
        }

        console.log(`classService.createClass: Created class name="${newClass.name}" with id=${newClass._id}`);
        const response: ServerResponse = {
            responseCode: 200,
            body: {
                message: 'Class created successfully',
                data: newClass
            }
        };
        res.status(201).json(response);
        console.log('classService.createClass: Response sent successfully');
    } catch (error) {
        console.error(`classService.createClass: Error creating class:`, error);
        res.status(500).json({ message: 'Error creating class' });
    }
});

// PUT /classes/:id - Update class (if it belongs to user's gym)
router.put(
    '/classes/:id',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(`classService.updateClass: API invoked with id=${id} and payload=${JSON.stringify(req.body)}`);
        const user = req.user;
        const updateData = req.body;

        try {
            const updatedClass = await updateClassByIdAndOwner(id, user, updateData);
            if (!updatedClass) {
                console.log(`classService.updateClass: Class not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Class not found' });
                return;
            }

            console.log(`classService.updateClass: Updated class name="${updatedClass.name}" with id=${id}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Class updated successfully',
                    data: updatedClass
                }
            };
            res.status(200).json(response);
            console.log('classService.updateClass: Response sent successfully');
        } catch (error) {
            console.error(`classService.updateClass: Error updating class with id=${id}:`, error);
            res.status(500).json({ message: 'Error updating class' });
        }
    }
);

// DELETE /classes/:id - Delete class (if it belongs to user's gym)
router.delete(
    '/classes/:id',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        console.log(`classService.deleteClass: API invoked with id=${id}`);
        const user = req.user;

        try {
            const deletedClass = await deleteClassByIdAndOwner(id, user);
            if (!deletedClass) {
                console.log(`classService.deleteClass: Class not found or access denied for id=${id}`);
                res.status(404).json({ message: 'Class not found' });
                return;
            }

            console.log(`classService.deleteClass: Deleted class name="${deletedClass.name}" with id=${id}`);
            const response: ServerResponse = {
                responseCode: 200,
                body: {
                    message: 'Class deleted successfully',
                    data: deletedClass
                }
            };
            res.status(200).json(response);
            console.log('classService.deleteClass: Response sent successfully');
        } catch (error) {
            console.error(`classService.deleteClass: Error deleting class with id=${id}:`, error);
            res.status(500).json({ message: 'Error deleting class' });
        }
    }
);

/**
 * Find all classes for the user's gym
 */
async function findClassesByOwner(user: IUser | undefined): Promise<IClass[]> {
    if (!user) {
        console.log('classService.findClassesByOwner: No user provided');
        return [];
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`classService.findClassesByOwner: No gym found for user ${user._id}`);
        return [];
    }

    console.log(`classService.findClassesByOwner: Looking for classes in gym ${gym._id} for user ${user._id}`);
    const classes = await Class.find({ gymId: gym._id, isActive: true }).sort({ name: 1 });

    console.log(`classService.findClassesByOwner: Found ${classes.length} classes for gym ${gym.name}`);
    return classes;
}

/**
 * Find class by ID if it belongs to user's gym
 */
async function findClassByIdAndOwner(classId: string, user: IUser | undefined): Promise<IClass | null> {
    if (!user) {
        console.log('classService.findClassByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`classService.findClassByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    console.log(`classService.findClassByIdAndOwner: Looking for class ${classId} in gym ${gym._id}`);
    const classItem = await Class.findOne({ _id: classId, gymId: gym._id, isActive: true });

    if (classItem) {
        console.log(`classService.findClassByIdAndOwner: Found class "${classItem.name}"`);
    } else {
        console.log(`classService.findClassByIdAndOwner: Class not found or doesn't belong to user's gym`);
    }

    return classItem;
}

/**
 * Create new class for user's gym
 */
async function createClassForOwner(user: IUser | undefined, classData: Partial<IClass>): Promise<IClass | null> {
    if (!user) {
        console.log('classService.createClassForOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`classService.createClassForOwner: No gym found for user ${user._id}`);
        return null;
    }

    console.log(`classService.createClassForOwner: Creating class for gym ${gym._id}`);

    // Remove sensitive fields and set gymId
    const { gymId, isActive, createdAt, updatedAt, ...safeClassData } = classData;
    const newClassData = {
        ...safeClassData,
        gymId: gym._id,
        isActive: true
    };

    const newClass = new Class(newClassData);
    const savedClass = await newClass.save();

    console.log(`classService.createClassForOwner: Created class "${savedClass.name}" with id ${savedClass._id}`);
    return savedClass;
}

/**
 * Update class by ID if it belongs to user's gym
 */
async function updateClassByIdAndOwner(
    classId: string,
    user: IUser | undefined,
    updateData: Partial<IClass>
): Promise<IClass | null> {
    if (!user) {
        console.log('classService.updateClassByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`classService.updateClassByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    // Verify class belongs to user's gym
    const classItem = await Class.findOne({ _id: classId, gymId: gym._id, isActive: true });
    if (!classItem) {
        console.log(`classService.updateClassByIdAndOwner: Class ${classId} not found or doesn't belong to user's gym`);
        return null;
    }

    console.log(`classService.updateClassByIdAndOwner: Updating class ${classId} for gym ${gym._id}`);

    // Remove fields that shouldn't be updated
    const { gymId, isActive, createdAt, updatedAt, ...safeUpdateData } = updateData;

    const updatedClass = await Class.findByIdAndUpdate(classId, safeUpdateData, { new: true, runValidators: true });

    if (updatedClass) {
        console.log(`classService.updateClassByIdAndOwner: Successfully updated class "${updatedClass.name}"`);
    }

    return updatedClass;
}

/**
 * Delete class by ID if it belongs to user's gym (soft delete)
 */
async function deleteClassByIdAndOwner(classId: string, user: IUser | undefined): Promise<IClass | null> {
    if (!user) {
        console.log('classService.deleteClassByIdAndOwner: No user provided');
        return null;
    }

    // First find the user's gym
    const gym = await Gym.findOne({ ownerId: user._id, isActive: true });
    if (!gym) {
        console.log(`classService.deleteClassByIdAndOwner: No gym found for user ${user._id}`);
        return null;
    }

    // Verify class belongs to user's gym
    const classItem = await Class.findOne({ _id: classId, gymId: gym._id, isActive: true });
    if (!classItem) {
        console.log(`classService.deleteClassByIdAndOwner: Class ${classId} not found or doesn't belong to user's gym`);
        return null;
    }

    console.log(`classService.deleteClassByIdAndOwner: Soft deleting class ${classId} for gym ${gym._id}`);

    // Soft delete by setting isActive to false
    const deletedClass = await Class.findByIdAndUpdate(classId, { isActive: false }, { new: true });

    if (deletedClass) {
        console.log(`classService.deleteClassByIdAndOwner: Successfully deleted class "${deletedClass.name}"`);
    }

    return deletedClass;
}
