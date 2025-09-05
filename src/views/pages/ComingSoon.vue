<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
const { t, tm } = useI18n();
</script>
<template>
    <div id="about" class="py-6 px-6 lg:px-20 mx-0 my-12 lg:mx-20">
        <div class="text-center">
            <div class="text-surface-900 dark:text-surface-0 font-normal mb-2 text-4xl">
                {{ t('comingsoon.title') }}
            </div>
            <span class="text-muted-color text-2xl">{{ t('comingsoon.subTitle') }}</span>
        </div>

        <div class="grid grid-cols-12 gap-4 mt-20 pb-2 md:pb-20">
            <template v-for="(section, index) in tm('comingsoon.sections')" :key="index">
                <div class="col-span-12 my-auto flex flex-col items-center text-center gap-4">
                    <span
                        class="text-surface-700 dark:text-surface-100 text-2xl leading-normal"
                        style="max-width: 650px"
                        >{{ section }}</span
                    >
                </div>
            </template>
        </div>
    </div>
</template>
