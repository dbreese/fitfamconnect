import express, { Router, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import type { IUser } from '../db/user';
import { User } from '../db/user';
import type { ServerResponse } from '../../shared/ServerResponse';

const router = Router();

// Helper class for creating server responses
class ResponseHelper {
    static success(data: any, message: string = 'Success'): ServerResponse {
        return { responseCode: 200, body: { message, data } };
    }
    static created(data: any, message: string = 'Created'): ServerResponse {
        return { responseCode: 201, body: { message, data } };
    }
    static error(message: string, code: number = 500): ServerResponse {
        return { responseCode: code, body: { message } };
    }
}

/**
 * GET /users/all
 * Get all users with pagination and filtering (root access only)
 */
router.get(
    '/users/all',
    authenticateUser,
    authorizeRoles('root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('usersService.GET /users/all: Request received', req.query);

            const { page = 1, limit = 50, role, search, active } = req.query as {
                page?: string;
                limit?: string;
                role?: string;
                search?: string;
                active?: string;
            };

            // Build query filters
            const query: any = {};

            if (role) {
                query.roles = role;
            }

            if (active !== undefined) {
                query.isActive = active === 'true';
            }

            if (search) {
                query.$or = [
                    { username: { $regex: search, $options: 'i' } },
                    { fullname: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            // Get users with pagination
            const users = await User.find(query)
                .select('-preferences') // Exclude large preference object
                .sort({ fullname: 1, username: 1 })
                .skip(skip)
                .limit(limitNum);

            // Get total count for pagination
            const totalCount = await User.countDocuments(query);

            const result = {
                users,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limitNum)
                }
            };

            console.log(`usersService.GET /users/all: Found ${users.length} users (${totalCount} total)`);
            res.status(200).json(ResponseHelper.success(result, 'Users retrieved successfully'));
        } catch (error) {
            console.error('usersService.GET /users/all: Error:', error);
            res.status(500).json(ResponseHelper.error('Failed to retrieve users', 500));
        }
    }
);

/**
 * GET /users/:id
 * Get specific user by ID (root access only)
 */
router.get(
    '/users/:id',
    authenticateUser,
    authorizeRoles('root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            console.log('usersService.GET /users/:id: Request received', { id });

            const user = await User.findById(id);

            if (!user) {
                return res.status(404).json(ResponseHelper.error('User not found', 404));
            }

            console.log(`usersService.GET /users/:id: Found user ${user.email}`);
            res.status(200).json(ResponseHelper.success(user, 'User retrieved successfully'));
        } catch (error) {
            console.error('usersService.GET /users/:id: Error:', error);
            res.status(500).json(ResponseHelper.error('Failed to retrieve user', 500));
        }
    }
);

/**
 * POST /users/create
 * Create new user (root access only)
 */
router.post(
    '/users/create',
    authenticateUser,
    authorizeRoles('root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('usersService.POST /users/create: Request received', req.body);

            const userData = req.body;

            // Validate required fields
            if (!userData.remoteId || !userData.username || !userData.email) {
                return res.status(400).json(ResponseHelper.error('remoteId, username, and email are required', 400));
            }

            // Validate roles
            if (userData.roles && Array.isArray(userData.roles)) {
                const validRoles = ['member', 'owner', 'root'];
                const invalidRoles = userData.roles.filter((role: string) => !validRoles.includes(role));
                if (invalidRoles.length > 0) {
                    return res.status(400).json(ResponseHelper.error(`Invalid roles: ${invalidRoles.join(', ')}`, 400));
                }
            }

            // Check for duplicate email
            const existingUser = await User.findOne({ email: userData.email });
            if (existingUser) {
                return res.status(400).json(ResponseHelper.error('User with this email already exists', 400));
            }

            // Check for duplicate remoteId
            const existingRemoteUser = await User.findOne({ remoteId: userData.remoteId });
            if (existingRemoteUser) {
                return res.status(400).json(ResponseHelper.error('User with this remote ID already exists', 400));
            }

            const newUser = new User(userData);
            const savedUser = await newUser.save();

            console.log(`usersService.POST /users/create: Created user ${savedUser.email} with ID ${savedUser._id}`);
            res.status(201).json(ResponseHelper.created(savedUser, 'User created successfully'));
        } catch (error) {
            console.error('usersService.POST /users/create: Error:', error);
            res.status(500).json(ResponseHelper.error('Failed to create user', 500));
        }
    }
);

/**
 * PUT /users/:id
 * Update user (root access only)
 */
router.put(
    '/users/:id',
    authenticateUser,
    authorizeRoles('root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            console.log('usersService.PUT /users/:id: Request received', { id, updateData });

            // Validate roles if being updated
            if (updateData.roles && Array.isArray(updateData.roles)) {
                const validRoles = ['member', 'owner', 'root'];
                const invalidRoles = updateData.roles.filter((role: string) => !validRoles.includes(role));
                if (invalidRoles.length > 0) {
                    return res.status(400).json(ResponseHelper.error(`Invalid roles: ${invalidRoles.join(', ')}`, 400));
                }

                if (updateData.roles.length === 0) {
                    return res.status(400).json(ResponseHelper.error('User must have at least one role', 400));
                }
            }

            // Check for duplicate email if being updated
            if (updateData.email) {
                const existingUser = await User.findOne({
                    email: updateData.email,
                    _id: { $ne: id }
                });
                if (existingUser) {
                    return res.status(400).json(ResponseHelper.error('User with this email already exists', 400));
                }
            }

            // Remove fields that shouldn't be updated
            const { remoteId, createdAt, updatedAt, ...safeUpdateData } = updateData;

            const updatedUser = await User.findByIdAndUpdate(id, safeUpdateData, {
                new: true,
                runValidators: true
            });

            if (!updatedUser) {
                return res.status(404).json(ResponseHelper.error('User not found', 404));
            }

            console.log(`usersService.PUT /users/:id: Updated user ${updatedUser.email}`);
            res.status(200).json(ResponseHelper.success(updatedUser, 'User updated successfully'));
        } catch (error) {
            console.error('usersService.PUT /users/:id: Error:', error);
            res.status(500).json(ResponseHelper.error('Failed to update user', 500));
        }
    }
);

/**
 * DELETE /users/:id
 * Delete user from collection (root access only)
 */
router.delete(
    '/users/:id',
    authenticateUser,
    authorizeRoles('root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            console.log('usersService.DELETE /users/:id: Request received', { id });

            // Prevent self-deletion
            if (req.user?._id === id) {
                return res.status(400).json(ResponseHelper.error('Cannot delete your own user account', 400));
            }

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json(ResponseHelper.error('User not found', 404));
            }

            // Hard delete user from collection
            await User.findByIdAndDelete(id);

            console.log(`usersService.DELETE /users/:id: Deleted user ${user.email} from collection`);
            res.status(200).json(ResponseHelper.success({}, 'User deleted successfully'));
        } catch (error) {
            console.error('usersService.DELETE /users/:id: Error:', error);
            res.status(500).json(ResponseHelper.error('Failed to delete user', 500));
        }
    }
);

/**
 * PUT /users/:id/roles
 * Update user roles (root access only)
 */
router.put(
    '/users/:id/roles',
    authenticateUser,
    authorizeRoles('root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { roles } = req.body;
            console.log('usersService.PUT /users/:id/roles: Request received', { id, roles });

            if (!Array.isArray(roles) || roles.length === 0) {
                return res.status(400).json(ResponseHelper.error('Roles must be a non-empty array', 400));
            }

            const validRoles = ['member', 'owner', 'root'];
            const invalidRoles = roles.filter((role: string) => !validRoles.includes(role));
            if (invalidRoles.length > 0) {
                return res.status(400).json(ResponseHelper.error(`Invalid roles: ${invalidRoles.join(', ')}`, 400));
            }

            // Prevent removing root role from self
            if (req.user?._id === id && !roles.includes('root')) {
                return res.status(400).json(ResponseHelper.error('Cannot remove root role from your own account', 400));
            }

            const updatedUser = await User.findByIdAndUpdate(
                id,
                { roles },
                { new: true, runValidators: true }
            );

            if (!updatedUser) {
                return res.status(404).json(ResponseHelper.error('User not found', 404));
            }

            console.log(`usersService.PUT /users/:id/roles: Updated roles for user ${updatedUser.email} to [${roles.join(', ')}]`);
            res.status(200).json(ResponseHelper.success(updatedUser, 'User roles updated successfully'));
        } catch (error) {
            console.error('usersService.PUT /users/:id/roles: Error:', error);
            res.status(500).json(ResponseHelper.error('Failed to update user roles', 500));
        }
    }
);

/**
 * PUT /users/:id/activate
 * Activate/deactivate user (root access only)
 */
router.put(
    '/users/:id/activate',
    authenticateUser,
    authorizeRoles('root'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { isActive } = req.body;
            console.log('usersService.PUT /users/:id/activate: Request received', { id, isActive });

            if (typeof isActive !== 'boolean') {
                return res.status(400).json(ResponseHelper.error('isActive must be a boolean value', 400));
            }

            // Prevent self-deactivation
            if (req.user?._id === id && !isActive) {
                return res.status(400).json(ResponseHelper.error('Cannot deactivate your own account', 400));
            }

            const updatedUser = await User.findByIdAndUpdate(
                id,
                { isActive },
                { new: true, runValidators: true }
            );

            if (!updatedUser) {
                return res.status(404).json(ResponseHelper.error('User not found', 404));
            }

            console.log(`usersService.PUT /users/:id/activate: ${isActive ? 'Activated' : 'Deactivated'} user ${updatedUser.email}`);
            res.status(200).json(ResponseHelper.success(updatedUser, `User ${isActive ? 'activated' : 'deactivated'} successfully`));
        } catch (error) {
            console.error('usersService.PUT /users/:id/activate: Error:', error);
            res.status(500).json(ResponseHelper.error('Failed to update user status', 500));
        }
    }
);

export { router as usersRouter };
