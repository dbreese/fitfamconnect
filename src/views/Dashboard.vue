<script setup>
import { useI18n } from 'vue-i18n';
const { t, tm } = useI18n();

const tools = [
    { name: t('textLeveler.title'), desc: t('textLeveler.desc') },
    { name: t('grammarChecker.title'), desc: t('grammarChecker.desc') },
    { name: t('letterWriter.title'), desc: t('letterWriter.desc') },
    { name: t('newsLetter.title'), desc: t('newsLetter.desc') },
    { name: t('quizes.title'), desc: t('quizes.desc') },
    { name: t('rubric.title'), desc: t('rubric.desc') }
];
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

                        <!-- <ul class="space-y-4 list-none pl-0">
                            <li v-for="({ name, desc }, index) in tools" :key="index" class="flex flex-col md:flex-row">
                                <span class="font-bold md:min-w-[180px] mb-1 md:mb-0">{{ name }}</span>
                                <span class="md:pl-4">
                                    {{ desc }}
                                </span>
                                {{ line }}
                            </li>
                        </ul> -->

                        <div>
                            <div class="font-semibold text-xl mb-2">{{ t('disclaimer.title') }}</div>
                            <div>{{ t('disclaimer.desc') }}</div>
                        </div>

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
