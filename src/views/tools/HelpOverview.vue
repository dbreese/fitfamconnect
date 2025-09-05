<script setup lang="ts">
import { ref, watch } from 'vue';
import ProgressSpinner from 'primevue/progressspinner';
import Card from 'primevue/card';
import { GradeLevels, gradeLevelForCode } from '@/shared/GradeLevels';
import { useI18n } from 'vue-i18n';
import { user } from '@/service/SessionUtils';

const { t } = useI18n();

const gradeLevels = ref(GradeLevels);
const gradeLevel = ref(gradeLevelForCode(user.preferences.level));
const results = ref('');
const text = ref('');
</script>

<template>
    <Fluid>
        <div class="flex progresscontainer">
            <Card class="card-style">
                <template #title>{{ t('help.title') }}</template>
                <template #subtitle>{{ t('help.subTitle') }}</template>
                <template #content> Coming soon... </template>
                <template #footer></template>
            </Card>
        </div>
    </Fluid>
</template>

<style></style>
