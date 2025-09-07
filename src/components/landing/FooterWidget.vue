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
    <div class="py-6 px-6 mx-0 mt-20 lg:mx-20">
        <div class="flex flex-col">
            <div class="w-full mb-8 flex justify-center md:justify-center">
                <a @click="smoothScroll('home')" class="flex items-center cursor-pointer whitespace-nowrap">
                    <img src="/images/logo.png" class="h-10 w-10" alt="mockup" />
                    <h4 class="font-medium text-3xl text-surface-900 dark:text-surface-0 cc-font pl-2">
                        {{ $t('appName') }}
                    </h4>
                </a>
            </div>

            <div class="grid grid-cols-12 gap-8 text-center md:text-left">
                <div class="col-span-12 md:col-span-4 mx-auto">
                    <h4 class="font-medium text-2xl leading-normal mb-4 text-surface-900 dark:text-surface-0">
                        {{ $t('footer.company') }}
                    </h4>
                    <a
                        @click="smoothScroll('about')"
                        class="leading-normal text-xl block cursor-pointer mb-2 text-surface-700 dark:text-surface-100"
                    >
                        {{ $t('about.title') }}
                    </a>
                </div>

                <div class="col-span-12 md:col-span-4 mx-auto">
                    <h4 class="font-medium text-2xl leading-normal mb-4 text-surface-900 dark:text-surface-0">
                        {{ $t('footer.resources') }}
                    </h4>
                    <router-link
                        to="/comingsoon"
                        class="leading-normal text-xl block cursor-pointer mb-2 text-surface-700 dark:text-surface-100"
                    >
                        {{ $t('footer.getstarted') }}
                    </router-link>

                    <router-link
                        to="/comingsoon"
                        class="leading-normal text-xl block cursor-pointer mb-2 text-surface-700 dark:text-surface-100"
                    >
                        {{ $t('footer.learn') }}
                    </router-link>
                </div>

                <div class="col-span-12 md:col-span-4 mx-auto">
                    <h4 class="font-medium text-2xl leading-normal mb-4 text-surface-900 dark:text-surface-0">Legal</h4>
                    <router-link
                        to="/privacy"
                        class="leading-normal text-xl block cursor-pointer mb-2 text-surface-700 dark:text-surface-100"
                    >
                        {{ $t('footer.privacy') }}
                    </router-link>

                    <router-link
                        to="/terms"
                        class="leading-normal text-xl block cursor-pointer mb-2 text-surface-700 dark:text-surface-100"
                    >
                        {{ $t('footer.termsofservice') }}</router-link
                    >
                </div>
            </div>
        </div>
    </div>
</template>
