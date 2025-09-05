import { Clerk } from '@clerk/clerk-js';
import { API_SERVER } from '@/shared/config';
import { SessionUtils } from './SessionUtils.js';

/**
 *
 * @param apiKey - publishable key
 * @returns auth provider
 */
export function createClientAuthProvider(apiKey?: string) {
    if (!apiKey) {
        throw new Error('Publishable api key required to create auth provider');
    }
    const clerk = new Clerk(apiKey);

    return {
        async status(): Promise<Record<string, any> | undefined> {
            await clerk.load({});
            const user = clerk.user;
            if (user) {
                const clerkEmail = user.primaryEmailAddress?.emailAddress ?? 'unknown';
                if (!clerkEmail) {
                    console.error(`User does not have a primary email address.: ${user}`);
                    return undefined;
                }

                // testing
                // const token = await SessionUtils.getToken();
                const token = await clerk.session?.getToken();
                const endpoint = `${__API_SERVER__}/auth/user`;

                // TODO: Dont hit this every time and cache results
                var remoteUser: Record<string, any> | undefined = undefined;
                await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    }
                })
                    .then((result) => result.json())
                    .then((data) => {
                        const { __v, _id, remoteId, ...filteredData } = data;
                        remoteUser = { ...filteredData };
                    })
                    .catch((error) => {
                        return Promise.reject('Error.');
                    });

                // testing

                return remoteUser;
            } else {
                return undefined;
            }
        }
    };
}
