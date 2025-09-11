import { submit } from './NetworkUtil';
import type { ServerResponse } from '../shared/ServerResponse';

export interface IBillingChargeGroup {
    memberId: string;
    memberName: string;
    charges: IBillingCharge[];
    subtotal: number;
}

export interface IBillingPreview {
    startDate: Date;
    endDate: Date;
    charges: IBillingCharge[];
    groupedCharges: IBillingChargeGroup[];
    totalAmount: number;
    summary: {
        oneTimeCharges: number;
        recurringPlans: number;
        totalCharges: number;
    };
}

export interface IBillingCharge {
    type: 'one-time-charge' | 'recurring-plan';
    chargeId?: string;
    memberId: string;
    memberName: string;
    planId?: string;
    planName?: string;
    amount: number;
    description: string;
    date: Date;
}

export interface IBillingCommitResult {
    billingId: string;
    chargesCreated: number;
    existingChargesBilled: number;
}

export interface IBillingHistory {
    _id: string;
    memberId: string;
    billingDate: Date;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

export class BillingService {
    private static baseUrl = '/billing';

    /**
     * Generate billing preview for given period
     */
    static async generatePreview(startDate: Date, endDate: Date): Promise<IBillingPreview | null> {
        console.log(`BillingService.generatePreview: Generating preview for ${startDate} to ${endDate}`);

        try {
            const response = await submit('POST', `${this.baseUrl}/preview`, {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('BillingService.generatePreview: Response received', serverResponse);
                return serverResponse.body.data as IBillingPreview;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('BillingService.generatePreview: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to generate billing preview');
            }
        } catch (error) {
            console.error('BillingService.generatePreview: Error:', error);
            throw error;
        }
    }

    /**
     * Commit billing run
     */
    static async commitBillingRun(
        startDate: Date,
        endDate: Date,
        charges: IBillingCharge[]
    ): Promise<IBillingCommitResult | null> {
        console.log(
            `BillingService.commitBillingRun: Committing billing run for ${startDate} to ${endDate} with ${charges.length} charges`
        );

        try {
            const response = await submit('POST', `${this.baseUrl}/commit`, {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                charges
            });

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('BillingService.commitBillingRun: Response received', serverResponse);
                return serverResponse.body.data as IBillingCommitResult;
            } else {
                const errorResult = await response.json();
                const errorResponse = errorResult as ServerResponse;
                console.error('BillingService.commitBillingRun: Request failed', response.status, errorResponse);
                throw new Error(errorResponse.body.message || 'Failed to commit billing run');
            }
        } catch (error) {
            console.error('BillingService.commitBillingRun: Error:', error);
            throw error;
        }
    }

    /**
     * Get billing history
     */
    static async getBillingHistory(): Promise<IBillingHistory[] | null> {
        console.log('BillingService.getBillingHistory: Retrieving billing history');

        try {
            const response = await submit('GET', `${this.baseUrl}/history`);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('BillingService.getBillingHistory: Response received', serverResponse);
                return serverResponse.body.data as IBillingHistory[];
            } else {
                console.error('BillingService.getBillingHistory: Request failed', response.status);
                return null;
            }
        } catch (error) {
            console.error('BillingService.getBillingHistory: Error:', error);
            return null;
        }
    }

    /**
     * Get billing details for a specific billing run
     */
    static async getBillingDetails(billingId: string) {
        console.log('BillingService.getBillingDetails: Retrieving billing details for', billingId);

        try {
            const response = await submit('GET', `${this.baseUrl}/details/${billingId}`);

            if (response.ok) {
                const result = await response.json();
                const serverResponse = result as ServerResponse;
                console.log('BillingService.getBillingDetails: Response received', serverResponse);
                return serverResponse.body.data;
            } else {
                console.error('BillingService.getBillingDetails: Request failed', response.status);
                return null;
            }
        } catch (error) {
            console.error('BillingService.getBillingDetails: Error:', error);
            return null;
        }
    }

    /**
     * Format amount in cents to currency string
     */
    static formatAmount(amountInCents: number): string {
        const amount = (amountInCents / 100).toFixed(2);
        return `$${amount}`;
    }

    /**
     * Format date for display
     */
    static formatDate(date: Date | string): string {
        return new Date(date).toLocaleDateString();
    }

    /**
     * Get charge type display name
     */
    static getChargeTypeDisplayName(type: string): string {
        switch (type) {
            case 'one-time-charge':
                return 'One-time Charge';
            case 'recurring-plan':
                return 'Plan';
            default:
                return 'Unknown';
        }
    }

    /**
     * Get charge type severity for UI
     */
    static getChargeTypeSeverity(type: string): string {
        switch (type) {
            case 'one-time-charge':
                return 'warning';
            case 'recurring-plan':
                return 'success';
            default:
                return 'secondary';
        }
    }
}
