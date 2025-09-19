<script setup>
import { ref, computed } from 'vue';
import { translate } from '../i18n/i18n';
import AppMenuItem from './AppMenuItem.vue';
import { useClerk } from '@clerk/vue';
import { user } from '@/service/SessionUtils';

const clerk = useClerk();

const isOwner = computed(() => {
    return user.roles && user.roles.includes('owner');
});

const isMember = computed(() => {
    return user.roles && user.roles.includes('member');
});

const isRoot = computed(() => {
    return user.roles && user.roles.includes('root');
});

const model = computed(() => {
    const menu = [];

    // OWNER MANAGEMENT SECTION
    if (isOwner.value) {
        menu.push({
            label: translate('menu.management'),
            items: [
                { label: translate('gym.menuTitle'), icon: 'pi pi-building', to: '/gym' },
                { label: translate('locations.menuTitle'), icon: 'pi pi-map-marker', to: '/locations' },
                { label: translate('classes.menuTitle'), icon: 'pi pi-calendar', to: '/classes' },
                { label: translate('plans.menuTitle'), icon: 'pi pi-credit-card', to: '/plans' },
                { label: translate('products.menuTitle'), icon: 'pi pi-shopping-bag', to: '/products' },
                { label: translate('memberships.menuTitle'), icon: 'pi pi-users', to: '/memberships' },
                { label: translate('coaches.menuTitle'), icon: 'pi pi-id-card', to: '/coaches' },
                { label: translate('schedules.menuTitle'), icon: 'pi pi-calendar-plus', to: '/schedules' },
                { label: translate('billing.menuTitle'), icon: 'pi pi-dollar', to: '/billing' },

                { separator: true }
            ]
        });
    }

    // MEMBER SECTION
    if (isMember.value) {
        menu.push({
            label: translate('menu.user'),
            items: [
                { label: translate('mygyms.menuTitle'), icon: 'pi pi-building-columns', to: '/mygyms' },
                { label: translate('signups.menuTitle'), icon: 'pi pi-calendar-plus', to: '/signups' },
                { label: translate('mycharges.menuTitle'), icon: 'pi pi-credit-card', to: '/mycharges' },

                { separator: true }
            ]
        });
    }

    // REPORTS
    if (isOwner.value) {
        menu.push({
            label: translate('menu.reports'),
            items: [
                { label: 'Member Retention', icon: 'pi pi-clock', to: '/reports/member-retention' },
                { label: 'Missing Members', icon: 'pi pi-question', to: '/reports/missing-members' },
                { label: 'Attendance', icon: 'pi pi-calendar', to: '/reports/missing-members' },
                { label: 'Payroll', icon: 'pi pi-money-bill', to: '/reports/missing-members' },
                { label: 'Billing', icon: 'pi pi-dollar', to: '/reports/billing' },

                { separator: true }
            ]
        });
    }

    // ROOT SECTION
    if (isRoot.value) {
        menu.push({
            label: 'Root',
            items: [
                { label: 'REST Explorer', icon: 'pi pi-code', to: '/root/rest-explorer' },
                { label: 'Clear Billing', icon: 'pi pi-trash', to: '/root/clear-billing' },

                { separator: true }
            ]
        });
    }
    // System section (common for all users)
    menu.push({
        label: translate('menu.system'),
        items: [
            { label: translate('profile.title'), icon: 'pi pi-user', to: '/user/profile' },
            { label: translate('feedback.menuTitle'), icon: 'pi pi-send', to: '/feedback' },
            { label: translate('help.title'), icon: 'pi pi-question-circle', to: '/app' },
            {
                label: translate('buttons.logout'),
                icon: 'pi pi-sign-out',
                command: async () => {
                    user.value = {};
                    await clerk.value?.signOut();
                }
            }
        ]
    });

    return menu;
});
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
