import { createClientAuthProvider } from '@/service/ClientAuthProvider';
import { createRouter, createWebHistory } from 'vue-router';
import { user } from '@/service/SessionUtils';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'home',
            component: () => import('@/layout/PublicLayout.vue'),
            meta: {
                requiresAuth: false
            },
            children: [
                {
                    path: '/',
                    name: 'default',
                    component: () => import('@/views/pages/Home.vue')
                },
                {
                    path: '/comingsoon',
                    name: 'comingsoon',
                    component: () => import('@/views/pages/ComingSoon.vue')
                },
                {
                    path: '/privacy',
                    name: 'privacy',
                    component: () => import('@/views/pages/PrivacyPolicy.vue')
                },
                {
                    path: '/terms',
                    name: 'terms',
                    component: () => import('@/views/pages/TermsOfService.vue')
                }
            ]
        },
        {
            path: '/pages/notfound',
            name: 'notfound',
            component: () => import('@/views/pages/NotFound.vue')
        },

        {
            path: '/auth/login',
            name: 'login',
            component: () => import('@/views/pages/auth/Login.vue')
        },

        {
            path: '/auth/access',
            name: 'accessDenied',
            component: () => import('@/views/pages/auth/Access.vue')
        },

        {
            path: '/auth/error',
            name: 'error',
            component: () => import('@/views/pages/auth/Error.vue')
        },

                {
                    path: '/app',
                    component: () => import('@/layout/AppLayout.vue'),
                    meta: {
                        requiresAuth: true,
                        roles: ['member', 'owner']
                    },
                    children: [
                        // Common routes for all authenticated users
                        {
                            path: '/app',
                            name: 'app',
                            component: () => import('@/views/Dashboard.vue')
                        },
                        {
                            path: '/user/profile',
                            name: 'profile',
                            component: () => import('@/views/user/Profile.vue')
                        },
                        {
                            path: '/feedback',
                            name: 'feedback',
                            component: () => import('@/views/pages/Feedback.vue')
                        },

                        // Owner-only routes
                        {
                            path: '/tools/help',
                            name: 'help',
                            component: () => import('@/views/tools/HelpOverview.vue'),
                            meta: { roles: ['owner'] }
                        },
                        {
                            path: '/gym',
                            name: 'gym',
                            component: () => import('@/views/pages/GymManagement.vue'),
                            meta: { roles: ['owner'] }
                        },
                        {
                            path: '/classes',
                            name: 'classes',
                            component: () => import('@/views/pages/ClassManagement.vue'),
                            meta: { roles: ['owner'] }
                        },
                        {
                            path: '/plans',
                            name: 'plans',
                            component: () => import('@/views/pages/PlanManagement.vue'),
                            meta: { roles: ['owner'] }
                        },
                        {
                            path: '/locations',
                            name: 'locations',
                            component: () => import('@/views/pages/LocationManagement.vue'),
                            meta: { roles: ['owner'] }
                        },
                        {
                            path: '/memberships',
                            name: 'memberships',
                            component: () => import('@/views/pages/MembershipManagement.vue'),
                            meta: { roles: ['owner'] }
                        },
                        {
                            path: '/schedules',
                            name: 'schedules',
                            component: () => import('@/views/pages/ScheduleManagement.vue'),
                            meta: { roles: ['owner'] }
                        },
                        {
                            path: '/billing',
                            name: 'billing',
                            component: () => import('@/views/pages/BillingManagement.vue'),
                            meta: { roles: ['owner'] }
                        },
                        {
                            path: '/coaches',
                            name: 'coaches',
                            component: () => import('@/views/pages/CoachManagement.vue'),
                            meta: { roles: ['owner'] }
                        }
                    ]
                }
    ],
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition;
        } else {
            return { top: 0 };
        }
    }
});

const authProvider = createClientAuthProvider(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

router.beforeEach(async (to, from, next) => {
    if (to.meta.requiresAuth) {
        // Always check authentication status on page refresh or if user data is missing
        if (!user.username || !user.email) {
            let retryCount = 0;
            const maxRetries = 3;
            let dbUser = null;

            // Retry authentication check with exponential backoff
            while (retryCount < maxRetries && !dbUser) {
                try {
                    console.log(`Authentication attempt ${retryCount + 1}/${maxRetries}`);
                    dbUser = await authProvider.status();

                    if (dbUser) {
                        console.log('Authentication successful:', dbUser);
                        Object.assign(user, dbUser);
                        break;
                    }
                } catch (error) {
                    console.error(`Authentication attempt ${retryCount + 1} failed:`, error);

                    // Wait before retry with exponential backoff
                    if (retryCount < maxRetries - 1) {
                        const delay = Math.pow(2, retryCount) * 100; // 100ms, 200ms, 400ms
                        await new Promise((resolve) => setTimeout(resolve, delay));
                    }
                }
                retryCount++;
            }

            // If all retries failed, clear any stale user data
            if (!dbUser) {
                console.error('All authentication attempts failed, clearing user data');
                Object.keys(user).forEach((key) => delete user[key]);
            }
        }

        if (user.username && user.email) {
            // Check if route has specific role requirements
            if (to.meta.roles && Array.isArray(to.meta.roles)) {
                const hasRequiredRole = user.roles && user.roles.some(role => to.meta.roles.includes(role));
                if (!hasRequiredRole) {
                    console.log(`Routing to ${to.path} denied - user roles ${user.roles} not in required roles ${to.meta.roles}`);
                    next({ name: 'app' }); // Redirect to dashboard instead of home
                    return;
                }
            }

            console.log(`Routing to ${to.path} allowed for user: ${user.username} with roles: ${user.roles}`);
            next();
        } else {
            console.log(`Routing to ${to.path} NOT allowed - redirecting to home`);
            next({ name: 'home' });
        }
    } else {
        // Non-protected route, allow access
        next();
    }
});

export default router;
