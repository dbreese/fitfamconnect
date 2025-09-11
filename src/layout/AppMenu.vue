<script setup>
import { ref } from 'vue';
import { translate } from '../i18n/i18n';
import AppMenuItem from './AppMenuItem.vue';
import { useClerk } from '@clerk/vue';
import { user } from '@/service/SessionUtils';

const clerk = useClerk();

const model = ref([
    {
        label: translate('menu.management'),
        items: [
            { label: translate('gym.menuTitle'), icon: 'pi pi-building', to: '/gym' },
            { label: translate('locations.menuTitle'), icon: 'pi pi-map-marker', to: '/locations' },
            { label: translate('classes.menuTitle'), icon: 'pi pi-calendar', to: '/classes' },
            { label: translate('plans.menuTitle'), icon: 'pi pi-credit-card', to: '/plans' },
            { label: translate('memberships.menuTitle'), icon: 'pi pi-users', to: '/memberships' },
            { label: translate('coaches.menuTitle'), icon: 'pi pi-id-card', to: '/coaches' },
            { label: translate('schedules.menuTitle'), icon: 'pi pi-calendar-plus', to: '/schedules' },
            { label: translate('billing.menuTitle'), icon: 'pi pi-dollar', to: '/billing' },

            { separator: true }
        ]
    },
    {
        label: translate('menu.reports'),
        items: [
            { label: 'Member Retention', icon: 'pi pi-clock', to: '/reports/member-retention' },
            { label: 'Missing Members', icon: 'pi pi-question', to: '/reports/missing-members' },
            { label: 'Attendance', icon: 'pi pi-calendar', to: '/reports/missing-members' },
            { label: 'Payroll', icon: 'pi pi-money-bill', to: '/reports/missing-members' },
            { label: 'Billing', icon: 'pi pi-dollar', to: '/reports/missing-members' },

            { separator: true }
        ]
    },
    {
        label: translate('menu.system'),
        items: [
            { label: translate('help.title'), icon: 'pi pi-question-circle', to: '/app' },
            { label: translate('feedback.menuTitle'), icon: 'pi pi-send', to: '/feedback' },
            { label: translate('profile.title'), icon: 'pi pi-user', to: '/user/profile' },
            {
                label: translate('buttons.logout'),
                icon: 'pi pi-sign-out',
                command: async () => {
                    user.value = {};
                    await clerk.value?.signOut();
                }
            }
        ]
    }
]);
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
