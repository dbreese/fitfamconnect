import { submit } from './NetworkUtil';
import type { ServerResponse } from '@/shared/ServerResponse';

export class ProductService {
    /**
     * Get all products for the current user's gym
     */
    static async getMyProducts() {
        console.log('ProductService.getMyProducts: Retrieving products');

        try {
            const response = await submit('GET', '/products');

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('ProductService.getMyProducts: Response received', serverResponse);
                return serverResponse.body.data;
            } else {
                console.error('ProductService.getMyProducts: Request failed', response.status);
                return null;
            }
        } catch (error) {
            console.error('ProductService.getMyProducts: Error:', error);
            return null;
        }
    }

    /**
     * Create a new product
     */
    static async createProduct(productData: any) {
        console.log('ProductService.createProduct: Creating product', productData);

        try {
            const response = await submit('POST', '/products', productData);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('ProductService.createProduct: Response received', serverResponse);
                return serverResponse;
            } else {
                console.error('ProductService.createProduct: Request failed', response.status);
                return null;
            }
        } catch (error) {
            console.error('ProductService.createProduct: Error:', error);
            return null;
        }
    }

    /**
     * Update an existing product
     */
    static async updateProduct(id: string, productData: any) {
        console.log('ProductService.updateProduct: Updating product', { id, productData });

        try {
            const response = await submit('PUT', `/products/${id}`, productData);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('ProductService.updateProduct: Response received', serverResponse);
                return serverResponse;
            } else {
                console.error('ProductService.updateProduct: Request failed', response.status);
                return null;
            }
        } catch (error) {
            console.error('ProductService.updateProduct: Error:', error);
            return null;
        }
    }

    /**
     * Delete a product
     */
    static async deleteProduct(id: string) {
        console.log('ProductService.deleteProduct: Deleting product', { id });

        try {
            const response = await submit('DELETE', `/products/${id}`);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('ProductService.deleteProduct: Response received', serverResponse);
                return serverResponse;
            } else {
                console.error('ProductService.deleteProduct: Request failed', response.status);
                return null;
            }
        } catch (error) {
            console.error('ProductService.deleteProduct: Error:', error);
            return null;
        }
    }
}
