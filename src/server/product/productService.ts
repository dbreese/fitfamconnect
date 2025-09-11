import express, { Router, type Request, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';
import type { IUser } from '../db/user';
import { Gym } from '../db/gym';
import { Product } from '../db/product';
import type { ServerResponse } from '../../shared/ServerResponse';

const router = Router();

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

async function getCurrentUserGym(user: IUser | undefined) {
    if (!user) throw new Error('No user provided');
    const gym = await Gym.findOne({ ownerId: user._id });
    if (!gym) throw new Error('Gym not found for user');
    return gym;
}

// GET /products - get all products for user's gym
router.get(
    '/products',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('productService.GET /products: Request received');
            const gym = await getCurrentUserGym(req.user);

            const products = await Product.find({ gymId: gym._id }).sort({ name: 1 });
            console.log(`productService.GET /products: Found ${products.length} products for gym ${gym._id}`);

            res.status(200).json(ResponseHelper.success(products, 'Products retrieved successfully'));
        } catch (error) {
            console.error('productService.GET /products error:', error);
            res.status(500).json(ResponseHelper.error('Failed to get products', 500));
        }
    }
);

// POST /products - create new product
router.post(
    '/products',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            console.log('productService.POST /products: Request received', req.body);
            const gym = await getCurrentUserGym(req.user);

            const productData = {
                ...req.body,
                gymId: gym._id
            };

            const newProduct = new Product(productData);
            const savedProduct = await newProduct.save();

            console.log(`productService.POST /products: Created product ${savedProduct._id}`);
            res.status(201).json(ResponseHelper.created(savedProduct, 'Product created successfully'));
        } catch (error) {
            console.error('productService.POST /products error:', error);
            res.status(500).json(ResponseHelper.error('Failed to create product', 500));
        }
    }
);

// PUT /products/:id - update product
router.put(
    '/products/:id',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            console.log('productService.PUT /products: Request received', { id, body: req.body });

            const gym = await getCurrentUserGym(req.user);

            // Verify product belongs to user's gym
            const existingProduct = await Product.findOne({ _id: id, gymId: gym._id });
            if (!existingProduct) {
                return res.status(404).json(ResponseHelper.error('Product not found', 404));
            }

            const updatedProduct = await Product.findByIdAndUpdate(id, req.body, {
                new: true,
                runValidators: true
            });

            console.log(`productService.PUT /products: Updated product ${id}`);
            res.status(200).json(ResponseHelper.success(updatedProduct, 'Product updated successfully'));
        } catch (error) {
            console.error('productService.PUT /products error:', error);
            res.status(500).json(ResponseHelper.error('Failed to update product', 500));
        }
    }
);

// DELETE /products/:id - delete product
router.delete(
    '/products/:id',
    authenticateUser,
    authorizeRoles('owner'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            console.log('productService.DELETE /products: Request received', { id });

            const gym = await getCurrentUserGym(req.user);

            // Verify product belongs to user's gym
            const existingProduct = await Product.findOne({ _id: id, gymId: gym._id });
            if (!existingProduct) {
                return res.status(404).json(ResponseHelper.error('Product not found', 404));
            }

            await Product.findByIdAndDelete(id);

            console.log(`productService.DELETE /products: Deleted product ${id}`);
            res.status(200).json(ResponseHelper.success(null, 'Product deleted successfully'));
        } catch (error) {
            console.error('productService.DELETE /products error:', error);
            res.status(500).json(ResponseHelper.error('Failed to delete product', 500));
        }
    }
);

export { router as productRouter };
