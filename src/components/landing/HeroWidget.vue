<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
    <div
        id="hero"
        class="flex flex-col pt-6 px-6 lg:px-20 overflow-hidden relative lg:min-h-[600px] min-h-[800px]"
        style="
            background: linear-gradient(0deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.2)),
                radial-gradient(77.36% 256.97% at 77.36% 57.52%, #fde68a 0%, #60a5fa 100%);
            clip-path: ellipse(150% 87% at 93% 13%);
        "
    >
        <div class="relative z-10 mx-6 md:mx-20 mt-0 md:mt-6">
            <span class="font-bold block text-6xl cc-font">{{ t('appName') }}</span>
            <p class="font-normal text-5xl leading-normal md:mt-4 text-gray-700">{{ t('homepage.intro') }}</p>
            <p class="font-normal text-2xl leading-normal md:mt-4 text-gray-700">
                {{ t('homepage.subIntro') }}
            </p>
            <p class="font-normal text-2xl leading-normal md:mt-4 text-gray-700">
                <span class="cc-font">{{ t('motto') }}</span>
            </p>
            <LoginButton label="buttons.getStarted" rounded class="!text-xl mt-8 !px-4" />
        </div>
        <div
            class="absolute right-0 top-1/2 -translate-y-1/2 h-full max-h-[400px] transition-opacity duration-300 opacity-10 2xl:opacity-500 xl:opacity-25 l:opacity:25 z-0"
        >
            <img src="/images/logo.png" alt="Hero Image" class="h-full w-auto object-contain" />
        </div>
    </div>
</template>
