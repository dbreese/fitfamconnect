<script setup>
import { useLayout } from '@/layout/composables/layout';
const { toggleMenu } = useLayout();
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <router-link to="/app" class="layout-topbar-logo">
                <img src="/images/logo.png" class="h-10 w-10" alt="mockup" /><span class="cc-font">{{
                    $t('appName')
                }}</span>
            </router-link>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <ProfileButton></ProfileButton>
            </div>
        </div>
    </div>
</template>
