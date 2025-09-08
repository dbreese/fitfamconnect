import { API_SERVER } from '@/shared/config';

/**
 * Create auth provider that uses the global Clerk instance
 * @param apiKey - publishable key (kept for compatibility but not used)
 * @returns auth provider
 */
export function createClientAuthProvider(apiKey?: string) {
    return {
        async status(): Promise<Record<string, any> | undefined> {
            try {
                // Wait for Clerk to be available on window
                let attempts = 0;
                const maxAttempts = 50; // 5 seconds max wait

                while (!window.Clerk && attempts < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    attempts++;
                }

                if (!window.Clerk) {
                    console.error('Clerk not available after waiting');
                    return undefined;
                }

                // Wait for Clerk to be loaded
                await window.Clerk.load();

                const clerkUser = window.Clerk.user;
                const session = window.Clerk.session;

                if (!clerkUser || !session) {
                    console.log('No authenticated user or session found');
                    return undefined;
                }

                const clerkEmail = clerkUser.primaryEmailAddress?.emailAddress ?? 'unknown';
                if (!clerkEmail || clerkEmail === 'unknown') {
                    console.error(`User does not have a primary email address: ${clerkUser}`);
                    return undefined;
                }

                // Get the session token
                const token = await session.getToken();
                if (!token) {
                    console.error('Could not get session token');
                    return undefined;
                }

                // Fetch user data from our backend
                const endpoint = `${API_SERVER}/auth/user`;
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    console.error(`Backend auth failed: ${response.status} ${response.statusText}`);
                    return undefined;
                }

                const data = await response.json();
                const { __v, _id, remoteId, ...filteredData } = data;

                console.log('Successfully authenticated user:', filteredData);
                return { ...filteredData };
            } catch (error) {
                console.error('Authentication check failed:', error);
                return undefined;
            }
        }
    };
}
