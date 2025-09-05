<script setup lang="ts">
import { AIService } from '@/service/AIService';
import { GradeLevels, gradeLevelForCode } from '@/shared/GradeLevels';
import { QuizTypes, quizTypeForCode } from '@/shared/QuizTypes';
import { TemperatureModes, temperatureForCode } from '@/shared/TemperatureModes';
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
const numberOfQuestions = ref(8);

const temperatureOptions = ref(TemperatureModes);
const temperature = ref(temperatureForCode(user.preferences.temperature));

const quizTypes = ref(QuizTypes);
const quizType = ref(quizTypes.value[0]);

// recent items
const recentItem = ref<RecentItem | null>(null);
watch(recentItem, handleRecentItemChange);
function handleRecentItemChange(recent: RecentItem | null) {
    console.log('RECENT ITEM CHANGED: ' + JSON.stringify(recent, null, 2));
    if (recent === null) {
        text.value = '';
        results.value = '';
        gradeLevel.value = gradeLevelForCode(user.preferences.level);
        temperature.value = temperatureForCode(user.prefereces.temperature);
        quizType.value = quizTypes.value[0];
        numberOfQuestions.value = 8;
    } else {
        text.value = recent.query;
        results.value = recent.results;
        gradeLevel.value = gradeLevelForCode(recent.params.level);
        temperature.value = temperatureForCode(recent.params.temperature);
        quizType.value = quizTypeForCode(recent.params.quizType);
        numberOfQuestions.value = recent.params.numberOfQuestions;
    }
}

async function handleSubmit() {
    results.value = '';

    loading.value = true;
    console.log(`Submitting: text=${text.value}, level=${JSON.stringify(gradeLevel.value.code)}`);

    AIService.quiz(
        text.value,
        quizType.value.code,
        gradeLevel.value.code,
        temperature.value.code,
        numberOfQuestions.value
    )
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
                <template #title>{{ t('quizes.title') }}</template>
                <template #subtitle>{{ t('quizes.subtitle') }}</template>
                <template #content>
                    <Help i18n-intro-key="quizes.desc" i18n-help-key="quizes.help" :expanded="user.preferences.help">
                        {{ t('quizes.helpTemperature') }}
                        <br />
                        <span v-for="(item, index) in temperatureOptions" :key="index">
                            &nbsp;&nbsp;<b>{{ item.name }}</b
                            >: {{ item.description }}
                            <br />
                        </span>
                        <br />
                        {{ t('quizes.helpTypes') }}
                        <br />
                        <span v-for="(item, index) in quizTypes" :key="index">
                            &nbsp;&nbsp;<b>{{ item.name }}</b
                            >: {{ item.description }}
                            <br />
                        </span>
                    </Help>
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

                                <div class="flex flex-wrap gap-2">
                                    <FloatLabel class="w-full md:w-56" variant="on">
                                        <InputNumber
                                            class="h-full w-full"
                                            v-model="numberOfQuestions"
                                            inputId="numberOf"
                                            showButtons
                                            buttonLayout="horizontal"
                                            :step="1"
                                            :min="2"
                                            :max="20"
                                        >
                                            <template #incrementbuttonicon>
                                                <span class="pi pi-plus" />
                                            </template>
                                            <template #decrementbuttonicon> <span class="pi pi-minus" /> </template>
                                        </InputNumber>
                                        <label for="state">{{ t('quizes.number') }}</label>
                                    </FloatLabel>
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-2 pt-2">
                                <div class="flex flex-wrap gap-1">
                                    <div class="flex flex-wrap gap-2">
                                        <SelectButton
                                            id="temperature"
                                            v-model="temperature"
                                            :options="temperatureOptions"
                                            optionLabel="name"
                                            class="w-full"
                                            size="large"
                                        />
                                    </div>
                                </div>

                                <div class="flex flex-wrap gap-1">
                                    <div class="flex flex-wrap gap-2">
                                        <SelectButton
                                            id="quizType"
                                            v-model="quizType"
                                            :options="quizTypes"
                                            optionLabel="name"
                                            class="w-full"
                                            size="large"
                                        />
                                    </div>
                                </div>
                            </div>

                            <br />

                            <br />
                            <AIInputEditor v-model:text="text" :hint="t('quizes.textHint')">
                                <Recents :recent-tool="RecentTool.Quiz" v-model:recent-item="recentItem"></Recents>
                                <Button :fluid="false" type="submit">{{ t('quizes.submit') }}</Button>
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
