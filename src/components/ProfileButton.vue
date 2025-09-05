<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { useUser, useClerk } from '@clerk/vue';

import { user } from '@/service/SessionUtils';
import Menu from 'primevue/menu';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const { user: clerkUser, isLoaded } = useUser();
const clerk = useClerk();

const router = useRouter();
const menu = ref();
const menuItems = ref([
    {
        label: t('profile.title'),
        icon: 'pi pi-user',
        command: () => {
            router.push({ name: 'profile' });
        }
    },
    {
        label: t('buttons.logout'),
        icon: 'pi pi-sign-out',
        command: () => {
            handleLogout();
        }
    }
]);

const handleLogout = async () => {
    console.log('Logging out...');
    user.value = {};
    await clerk.value?.signOut();
};
</script>

<template>
    <Menu ref="menu" :model="menuItems" popup />

    <div @click="menu.toggle($event)" class="profile-container">
        <div v-if="!isLoaded" class="spinner-overlay progressoverlay">
            <ProgressSpinner aria-label="Loading" />
        </div>

        <div v-else>
            <div class="flex items-center gap-2">
                <Avatar :image="clerkUser!.imageUrl" shape="circle" size="large" class="avatar" />
                <span class="font-bold hidden md:inline">{{ user.fullname }}</span>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.profile-container {
    border-radius: var(--content-border-radius);
    padding: 0.5rem;
    cursor: pointer;

    &:hover {
        background-color: var(--surface-hover);
    }
}

.avatar {
    margin-left: 0.25rem;
    :deep(img) {
        width: 2.5rem !important;
        height: 2.5rem !important;
        border-radius: 50%;
    }
}

@media (min-width: 768px) {
    .avatar {
        margin-left: 0.5rem;
    }
}
</style>
