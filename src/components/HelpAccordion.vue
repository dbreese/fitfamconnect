<script setup lang="ts">
import { defineProps, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import HelpContent from './HelpContent.vue';

const { t } = useI18n();

const props = withDefaults(
    defineProps<{
        i18nIntroKey: string;
        i18nHelpKey?: string;
        expanded?: boolean;
    }>(),
    {
        i18nHelpKey: '',
        expanded: true
    }
);

const active = ref(props.expanded === true ? '0' : '1');
</script>

<template>
    <div class="pb-2 px-0 md:px-8">
        <Accordion v-model:value="active" expandIcon="pi pi-question-circle" collapseIcon="pi pi-chevron-circle-up">
            <AccordionPanel value="0" style="--p-accordion-panel-border-width: 0px">
                <AccordionHeader>{{ t('help.title') }}</AccordionHeader>
                <AccordionContent>
                    <HelpContent :i18nIntroKey="i18nIntroKey" :i18nHelpKey="i18nHelpKey">
                        <slot></slot>
                    </HelpContent>
                </AccordionContent>
            </AccordionPanel>
        </Accordion>
    </div>
</template>
