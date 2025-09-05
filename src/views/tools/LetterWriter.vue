<script setup lang="ts">
import { AIService } from '@/service/AIService';
import { GradeLevels, gradeLevelForCode } from '@/shared/GradeLevels';
import { LetterModes, letterModeForCode } from '@/shared/LetterModes';
import { TemperatureModes, temperatureForCode } from '@/shared/TemperatureModes';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import { ref, watch } from 'vue';
import Editor from '@/components/Editor.vue';
import AIInputEditor from '@/components/AIInputEditor.vue';
import { useI18n } from 'vue-i18n';
import { user } from '@/service/SessionUtils';
import { RecentTool, type RecentItem } from '@/shared/Recents';

const { t } = useI18n();

const loading = ref(false);

const text = ref('');

const gradeLevels = ref(GradeLevels);
const gradeLevel = ref(gradeLevelForCode(user.preferences.level));
const results = ref('');
const fromName = ref(user.preferences.from || '');
const toName = ref('');
const subject = ref('');

const modeOptions = ref(LetterModes);
const mode = ref(letterModeForCode(user.preferences.mode));

const temperatureOptions = ref(TemperatureModes);
const temperature = ref(temperatureForCode(user.preferences.temperature));

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
        mode.value = modeOptions.value[0];
        fromName.value = user.preferences.from || '';
        toName.value = '';
        subject.value = '';
    } else {
        text.value = recent.query;
        results.value = recent.results;
        gradeLevel.value = gradeLevelForCode(recent.params.level);
        temperature.value = temperatureForCode(recent.params.temperature);
        mode.value = letterModeForCode(recent.params.mode);
        fromName.value = recent.params.from;
        toName.value = recent.params.to;
        subject.value = recent.params.subject;
    }
}

async function handleSubmit() {
    results.value = '';
    loading.value = true;
    console.log(`Submitting: text=${text.value}, level=${JSON.stringify(gradeLevel.value.code)}`);

    const selectedMode = mode.value.code;
    const selectedTemperature = temperature.value.code;

    // only define gradelevel if mode is a kid
    const selectedLevel = selectedMode === 'kid' ? gradeLevel.value.code : undefined;

    AIService.letterWriter(
        text.value,
        selectedLevel,
        selectedMode,
        subject.value,
        fromName.value,
        toName.value,
        selectedTemperature
    )
        .then((r) => {
            console.log(r);
            results.value = r?.body.message || '';
            // TODO: Error Handling
            loading.value = false;

            // also update in-memory prefs
            Object.assign(user.preferences, {
                level: gradeLevel.value.code,
                mode: selectedMode,
                temperature: selectedTemperature,
                from: fromName.value
            });
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
                <template #title>{{ t('letterWriter.title') }}</template>
                <template #subtitle>{{ t('letterWriter.subtitle') }}</template>
                <template #content>
                    <Help
                        i18n-intro-key="letterWriter.desc"
                        i18n-help-key="letterWriter.help"
                        :expanded="user.preferences.help"
                    >
                        {{ t('letterWriter.helpAudience') }}
                        <br />
                        <span v-for="(item, index) in modeOptions" :key="index">
                            &nbsp;&nbsp;<b>{{ item.name }}</b
                            >: {{ item.description }}
                            <br />
                        </span>
                        <br />
                        {{ t('letterWriter.helpTemperature') }}
                        <br />
                        <span v-for="(item, index) in temperatureOptions" :key="index">
                            &nbsp;&nbsp;<b>{{ item.name }}</b
                            >: {{ item.description }}
                            <br />
                        </span>
                    </Help>

                    <div class="flex flex-col w-full pt-4">
                        <form @submit.prevent="handleSubmit">
                            <div class="flex flex-col md:flex-row gap-4">
                                <div class="flex flex-wrap gap-2">
                                    <SelectButton
                                        id="mode"
                                        v-model="mode"
                                        :options="modeOptions"
                                        optionLabel="name"
                                        class="w-full"
                                        size="large"
                                    />
                                </div>

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

                            <p>&nbsp;</p>

                            <div class="flex flex-col md:flex-row gap-4">
                                <div class="flex flex-wrap gap-2" v-if="mode == modeOptions[0]">
                                    <FloatLabel class="w-full md:w-56" variant="on">
                                        <Select
                                            id="level"
                                            v-model="gradeLevel"
                                            :options="gradeLevels"
                                            optionLabel="name"
                                            class="w-full"
                                            size="large"
                                        ></Select>
                                        <label for="level">{{ t('options.gradeTitle') }}</label>
                                    </FloatLabel>
                                </div>

                                <div class="flex flex-col gap-2">
                                    <FloatLabel variant="on" class="w-full">
                                        <label for="toName">{{ t('letterWriter.to') }}</label>
                                        <InputText id="toName" v-model="toName" size="large" />
                                    </FloatLabel>
                                </div>

                                <div class="flex flex-col gap-2">
                                    <FloatLabel variant="on" class="w-full">
                                        <label for="fromName">{{ t('letterWriter.from') }}</label>
                                        <InputText id="fromName" v-model="fromName" size="large" />
                                    </FloatLabel>
                                </div>

                                <div class="flex flex-col gap-2">
                                    <FloatLabel variant="on" class="w-full">
                                        <label for="subject">{{ t('letterWriter.subject') }}</label>
                                        <InputText id="subject" v-model="subject" size="large" />
                                    </FloatLabel>
                                </div>
                            </div>

                            <br />

                            <AIInputEditor v-model:text="text" :hint="t('letterWriter.textHint')" :visible-rows="10">
                                <Recents
                                    :recent-tool="RecentTool.LetterWriter"
                                    v-model:recent-item="recentItem"
                                ></Recents>
                                <Button :fluid="false" type="submit">{{ t('letterWriter.submit') }}</Button>
                            </AIInputEditor>
                        </form>

                        <br />

                        <div v-if="results" class="flex flex-col flex-wrap gap-2 w-full h-full">
                            <Editor v-model:content="results" />
                        </div>
                    </div>
                </template>
                <template #footer></template>
            </Card>
        </div>
    </Fluid>
</template>
