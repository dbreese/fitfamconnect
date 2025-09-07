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
                requiresAuth: true
            },
            children: [
                {
                    path: '/app',
                    name: 'app',
                    component: () => import('@/views/Dashboard.vue')
                },

                {
                    path: '/tools/help',
                    name: 'help',
                    component: () => import('@/views/tools/HelpOverview.vue')
                },

                {
                    path: '/tools/textleveler',
                    name: 'textleveler',
                    component: () => import('@/views/tools/TextLeveler.vue')
                },

                {
                    path: '/tools/grammarchecker',
                    name: 'grammarchecker',
                    component: () => import('@/views/tools/GrammarChecker.vue')
                },

                {
                    path: '/tools/letterwriter',
                    name: 'letterwriter',
                    component: () => import('@/views/tools/LetterWriter.vue')
                },

                {
                    path: '/tools/newsletter',
                    name: 'newsletter',
                    component: () => import('@/views/tools/NewsLetter.vue')
                },

                {
                    path: '/tools/quizes',
                    name: 'quizes',
                    component: () => import('@/views/tools/Quizes.vue')
                },

                {
                    path: '/tools/rubric',
                    name: 'rubric',
                    component: () => import('@/views/tools/Rubric.vue')
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

                {
                    path: '/gym',
                    name: 'gym',
                    component: () => import('@/views/pages/GymManagement.vue')
                },

                {
                    path: '/classes',
                    name: 'classes',
                    component: () => import('@/views/pages/ClassManagement.vue')
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
        if (!user.username) {
            const dbUser = await authProvider.status();
            console.log('auth user: ' + JSON.stringify(dbUser));

            Object.assign(user, dbUser);
        }
        if (user.username) {
            console.log(`Routing to ${to.path} allowed`);
            next();
        } else {
            console.log(`Routing to ${to.path} NOT allowed`);
            next({ name: 'home' });
        }
    } else {
        // Non-protected route, allow access
        next();
    }
});

export default router;
