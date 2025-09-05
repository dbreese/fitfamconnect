<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();

async function smoothScroll(id: any) {
    // If not on home route, navigate there first
    if (router.currentRoute.value.path !== '/') {
        console.log('navigating to home');
        await router.push('/');
        // Wait a brief moment for the DOM to update
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    document.body.click();
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}
</script>
<template>
    <a class="flex items-center" href="#">
        <img src="/images/cclogo.svg" class="h-10 w-10" alt="mockup" />
        <span
            class="text-surface-900 dark:text-surface-0 font-medium text-3xl leading-normal mr-20 cc-font whitespace-nowrap pl-2"
            >{{ $t('appName') }}</span
        >
    </a>
    <Button
        class="lg:!hidden"
        text
        severity="secondary"
        rounded
        v-styleclass="{
            selector: '@next',
            enterFromClass: 'hidden',
            enterActiveClass: 'animate-scalein',
            leaveToClass: 'hidden',
            leaveActiveClass: 'animate-fadeout',
            hideOnOutsideClick: true
        }"
    >
        <i class="pi pi-bars !text-2xl"></i>
    </Button>
    <div
        class="items-center bg-surface-0 dark:bg-surface-900 grow justify-between hidden lg:flex absolute lg:static w-full left-0 top-full px-12 lg:px-0 z-20 rounded-border"
    >
        <ul class="list-none p-0 m-0 flex lg:items-center select-none flex-col lg:flex-row cursor-pointer gap-8">
            <li>
                <a
                    @click="smoothScroll('home')"
                    class="px-0 py-4 text-surface-900 dark:text-surface-0 font-medium text-xl"
                >
                    <span>{{ $t('landing.tabs.home') }}</span>
                </a>
            </li>
            <li>
                <a
                    @click="smoothScroll('features')"
                    class="px-0 py-4 text-surface-900 dark:text-surface-0 font-medium text-xl"
                >
                    <span>{{ $t('landing.tabs.features') }}</span>
                </a>
            </li>
            <li>
                <a
                    @click="smoothScroll('highlights')"
                    class="px-0 py-4 text-surface-900 dark:text-surface-0 font-medium text-xl"
                >
                    <span>{{ $t('landing.tabs.highlights') }}</span>
                </a>
            </li>
            <li>
                <a
                    @click="smoothScroll('about')"
                    class="px-0 py-4 text-surface-900 dark:text-surface-0 font-medium text-xl"
                >
                    <span>{{ $t('landing.tabs.about') }}</span>
                </a>
            </li>
        </ul>
        <div class="flex border-t lg:border-t-0 border-surface py-4 lg:py-0 mt-4 lg:mt-0 gap-2">
            <LoginButton label="buttons.getStarted" />
        </div>
    </div>
</template>
