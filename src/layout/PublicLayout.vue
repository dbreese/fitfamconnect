<script setup lang="ts">
import FooterWidget from '@/components/landing/FooterWidget.vue';
import TopbarWidget from '@/components/landing/TopbarWidget.vue';
</script>

<template>
    <div id="home" class="bg-surface-0 dark:bg-surface-900">
        <div class="landing-wrapper overflow-hidden">
            <div class="py-6 px-6 mx-0 md:mx-12 lg:mx-20 lg:px-20 flex items-center justify-between relative lg:static">
                <TopbarWidget />
            </div>
            <router-view></router-view>
            <FooterWidget />
        </div>
    </div>
</template>
