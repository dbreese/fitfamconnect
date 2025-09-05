<script setup lang="ts">
import { defineProps } from 'vue';
import HelpContent from './HelpContent.vue';
import HelpAccordion from './HelpAccordion.vue';

const props = withDefaults(
    defineProps<{
        i18nIntroKey: string;
        i18nHelpKey?: string;
        expanded?: boolean;
        controls?: boolean;
    }>(),
    {
        i18nHelpKey: '',
        expanded: true,
        controls: true
    }
);
</script>

<template>
    <template v-if="controls">
        <HelpAccordion :i18nIntroKey="i18nIntroKey" :i18nHelpKey="i18nHelpKey" :expanded="expanded">
            <slot></slot>
        </HelpAccordion>
    </template>
    <template v-else>
        <HelpContent :i18nIntroKey="i18nIntroKey" :i18nHelpKey="i18nHelpKey">
            <slot></slot>
        </HelpContent>
    </template>
</template>

<style scoped>
.help-content {
    font-size: 1rem;
}
</style>
