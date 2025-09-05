<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
const { t, tm } = useI18n();
</script>
<template>
    <div id="features" class="py-6 px-6 lg:px-20 mt-8 mx-0 lg:mx-20">
        <div class="grid grid-cols-12 gap-4 justify-center">
            <div class="col-span-12 text-center mt-20 mb-6">
                <div class="text-surface-900 dark:text-surface-0 font-normal mb-2 text-4xl cc-font">
                    {{ t('features.title') }}
                </div>
                <span class="text-muted-color text-2xl">{{ t('features.subTitle') }}</span>
            </div>

            <div
                v-for="(point, index) in tm('features.points') as Array<{
                    icon: string;
                    color: string;
                    title: string;
                    subTitle: string;
                }>"
                :key="index"
                class="col-span-12 md:col-span-12 lg:col-span-4 p-0 lg:pr-8 lg:pb-8 mt-6 lg:mt-0"
            >
                <div
                    style="
                        height: 160px;
                        padding: 2px;
                        border-radius: 10px;
                        background: linear-gradient(90deg, rgba(253, 228, 165, 0.2), rgba(187, 199, 205, 0.2)),
                            linear-gradient(180deg, rgba(253, 228, 165, 0.2), rgba(187, 199, 205, 0.2));
                    "
                >
                    <div class="p-4 bg-surface-0 dark:bg-surface-900 h-full" style="border-radius: 8px">
                        <div
                            :class="['flex', 'items-center', 'justify-center', point.color, 'mb-4']"
                            style="width: 3.5rem; height: 3.5rem; border-radius: 10px"
                        >
                            <i :class="['pi', 'pi-fw', point.icon, '!text-2xl', point.color]"></i>
                        </div>
                        <div class="mt-6 mb-1 text-surface-900 dark:text-surface-0 text-xl font-semibold">
                            {{ point.title }}
                        </div>
                        <span class="text-surface-600 dark:text-surface-200">{{ point.subTitle }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
