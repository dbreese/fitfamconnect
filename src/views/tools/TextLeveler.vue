<script setup lang="ts">
import { AIService } from '@/service/AIService';
import { GradeLevels, gradeLevelForCode } from '@/shared/GradeLevels';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import { ref, watch } from 'vue';
import Editor from '@/components/Editor.vue';
import AIInputEditor from '@/components/AIInputEditor.vue';
import { useI18n } from 'vue-i18n';
import { user } from '@/service/SessionUtils';
import { RecentTool, type RecentItem } from '@/shared/Recents';

const { t } = useI18n();

const loading = ref(false);

const gradeLevels = ref(GradeLevels);
const gradeLevel = ref(gradeLevelForCode(user.preferences.level));
const results = ref('');
const text = ref('');

// recent items
const recentItem = ref<RecentItem | null>(null);
watch(recentItem, handleRecentItemChange);
function handleRecentItemChange(recent: RecentItem | null) {
    console.log('RECENT ITEM CHANGED: ' + JSON.stringify(recent, null, 2));
    if (recent === null) {
        text.value = '';
        results.value = '';
        gradeLevel.value = gradeLevelForCode(user.preferences.level);
    } else {
        text.value = recent.query;
        results.value = recent.results;
        gradeLevel.value = gradeLevelForCode(recent.params.level);
    }
}

async function handleSubmit() {
    results.value = '';

    loading.value = true;
    console.log(`Submitting: text=${text.value}, level=${JSON.stringify(gradeLevel.value.code)}`);

    AIService.levelText(text.value, gradeLevel.value.code)
        .then((r) => {
            console.log(r);
            results.value = r?.body.message || '';
            // TODO: Error Handling
            loading.value = false;
        })
        .catch((error) => {
            console.error('Error occurred while submitting.', error);
            results.value = `Something bad happened ${error}`;
            loading.value = false;
        });
}
</script>

<template>
    <Fluid>
        <div class="flex progresscontainer">
            <div v-if="loading" class="spinner-overlay progressoverlay">
                <ProgressSpinner aria-label="Loading" />
            </div>

            <Card class="card-style">
                <template #title>{{ t('textLeveler.title') }}</template>
                <template #subtitle>{{ t('textLeveler.subtitle') }}</template>
                <template #content>
                    <Help
                        i18n-intro-key="textLeveler.desc"
                        i18n-help-key="textLeveler.help"
                        :expanded="user.preferences.help"
                    ></Help>
                    <div class="flex flex-col w-full pt-4">
                        <form @submit.prevent="handleSubmit">
                            <div class="flex flex-col md:flex-row gap-4">
                                <div class="flex flex-wrap gap-2">
                                    <FloatLabel class="w-full md:w-56" variant="on">
                                        <Select
                                            id="state"
                                            v-model="gradeLevel"
                                            :options="gradeLevels"
                                            optionLabel="name"
                                            class="w-full"
                                            size="large"
                                        ></Select>
                                        <label for="state">{{ t('options.gradeTitle') }}</label>
                                    </FloatLabel>
                                </div>
                            </div>

                            <br />

                            <br />
                            <AIInputEditor v-model:text="text" :hint="t('textLeveler.textHint')" :visible-rows="10">
                                <Recents :recent-tool="RecentTool.Leveler" v-model:recent-item="recentItem"></Recents>
                                <Button :fluid="false" type="submit">{{ t('textLeveler.submit') }}</Button>
                            </AIInputEditor>
                        </form>

                        <div v-if="results" class="flex flex-col flex-wrap gap-2 w-full h-full">
                            <Editor :content="results" />
                        </div>
                    </div>
                </template>
                <template #footer></template>
            </Card>
        </div>
    </Fluid>
</template>

<style></style>
