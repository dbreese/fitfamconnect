<script setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
    <Fluid>
        <div class="flex">
            <Card class="card-style">
                <template #title>
                    <div class="text-3xl font-bold mb-2 cc-font">{{ t('dashboard.title') }}</div>
                </template>
                <template #subtitle>
                    <span class="text-xl mb-4">{{ t('dashboard.subTitle') }}</span>
                </template>
                <template #content>
                    <div class="space-y-6">
                        <div>{{ t('dashboard.intro') }}</div>

                        <div>
                            <div class="font-semibold text-xl mb-2 cc-font">{{ t('motto') }}</div>
                            <div>{{ t('dashboard.haveFun') }}</div>
                        </div>
                    </div>
                </template>
                <template #footer></template>
            </Card>
        </div>
    </Fluid>
</template>
