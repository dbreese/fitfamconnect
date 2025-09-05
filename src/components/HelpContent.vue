<script setup lang="ts">
import { defineProps } from 'vue';
import { useI18n } from 'vue-i18n';

const props = withDefaults(
    defineProps<{
        i18nIntroKey: string;
        i18nHelpKey?: string;
    }>(),
    {
        i18nHelpKey: ''
    }
);

const { t, tm } = useI18n();
</script>

<style scoped>
.help-content {
    font-size: 1rem;
}
</style>

<template>
    <div class="help-content">
        <span class="pb-2">{{ t(i18nIntroKey) }}</span>
        <div v-if="i18nHelpKey !== ''">
            <ul v-if="Array.isArray(tm(i18nHelpKey))" class="pt-4">
                <li v-for="(line, index) in tm(i18nHelpKey)" :key="index" class="pb-4">
                    {{ line }}
                </li>
            </ul>
            <p v-else>
                {{ tm(i18nHelpKey) }}
            </p>
        </div>
        <div class="pt-4">
            <slot></slot>
        </div>
    </div>
</template>
