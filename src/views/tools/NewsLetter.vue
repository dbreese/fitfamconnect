<script setup lang="ts">
import { AIService } from '@/service/AIService';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import { ref, watch } from 'vue';
import Editor from '@/components/Editor.vue';
import AIInputEditor from '@/components/AIInputEditor.vue';
import { useI18n } from 'vue-i18n';
import { user } from '@/service/SessionUtils';
import { temperatureForCode, TemperatureModes } from '@/shared/TemperatureModes';
import { RecentTool, type RecentItem } from '@/shared/Recents';
import type { NewsletterSection } from '@/shared/Newsletter';

const { t } = useI18n();

const loading = ref(false);

const results = ref('');

// newsletter can have up to 4 sections and titles.
const userPrefsSections = user.preferences.newsletterSections;
function getDefaultSectionInfo(i: number): Record<string, any> {
    if (userPrefsSections == undefined || userPrefsSections[i] === undefined) {
        return { title: t(`newsLetter.defaultTitles[${i}]`), enabled: true };
    }
    return userPrefsSections[i];
}

const sections = ref([
    { id: 0, text: '', title: '', enabled: true },
    { id: 1, text: '', title: '', enabled: true },
    { id: 2, text: '', title: '', enabled: true },
    { id: 3, text: '', title: '', enabled: true }
]);
function setSectionDefaults(enabled: boolean) {
    for (let i = 0; i < 4; i++) {
        const defaultSectionInfo = getDefaultSectionInfo(i);
        sections.value[i] = {
            id: i,
            text: '',
            title: defaultSectionInfo.title,
            enabled: defaultSectionInfo.enabled
        };
    }
}
setSectionDefaults(true);

const temperatureOptions = ref(TemperatureModes);
const temperature = ref(temperatureForCode(user.preferences.temperature));

// recent items
const recentItem = ref<RecentItem | null>(null);
watch(recentItem, handleRecentItemChange);
function handleRecentItemChange(recent: RecentItem | null) {
    console.log('RECENT ITEM CHANGED: ' + JSON.stringify(recent, null, 2));
    if (recent === null) {
        results.value = '';
        temperature.value = temperatureForCode(user.preferences.temperature);
    } else {
        // first set all sections to defaults
        setSectionDefaults(false);

        var i = 0;
        (recent.params.sections as NewsletterSection[]).forEach((section: NewsletterSection) => {
            sections.value[i].enabled = section.enabled;
            sections.value[i].text = section.text;
            sections.value[i].title = section.title;
            i++;
        });

        results.value = recent.results;
        temperature.value = temperatureForCode(recent.params.temperature);
    }
}

async function handleSubmit() {
    results.value = '';
    loading.value = true;

    const selectedTemperature = temperature.value.code;

    const userSections: NewsletterSection[] = [];
    sections.value.forEach((section) => {
        userSections.push({
            enabled: section.enabled,
            title: section.title,
            text: section.text
        });
    });
    console.log(`Submitting sections: ${JSON.stringify(userSections)}`);

    AIService.newsLetter(userSections, selectedTemperature)
        .then((r) => {
            console.log(r);
            results.value = r?.body.message || '';
            // TODO: Error Handling
            loading.value = false;

            // also update in-memory prefs
            Object.assign(user.preferences, {
                temperature: selectedTemperature,
                newsletterSections: userSections.map(({ text, ...rest }) => rest)
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
        <div v-if="loading" class="spinner-overlay progressoverlay">
            <ProgressSpinner aria-label="Loading" />
        </div>

        <Card class="card-style">
            <template #title>{{ t('newsLetter.title') }}</template>
            <template #subtitle>{{ t('newsLetter.subtitle') }}</template>
            <template #content>
                <Help
                    i18n-intro-key="newsLetter.desc"
                    i18n-help-key="newsLetter.help"
                    :expanded="user.preferences.help"
                >
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

                        <div class="flex flex-row justify-end items-center space-x-4">
                            <Recents :recent-tool="RecentTool.NewsLetter" v-model:recent-item="recentItem"></Recents>
                            <Button :fluid="false" type="submit">{{ t('newsLetter.submit') }}</Button>
                        </div>
                        <div v-for="(section, index) in sections" :key="section.id">
                            <div class="pt-8">
                                <div class="flex items-center space-x-4 w-full">
                                    <label>
                                        <input type="checkbox" v-model="section.enabled" />
                                        {{ t('newsLetter.includeSection') }}
                                    </label>
                                    <FloatLabel variant="on">
                                        <label for="sectionTitle">{{ t('newsLetter.sectionsTitle') }}</label>
                                        <InputText
                                            id="sectionTitle"
                                            v-model="section.title"
                                            size="large"
                                            :disabled="!section.enabled"
                                        />
                                    </FloatLabel>
                                </div>
                                <div class="pb-2"></div>
                                <AIInputEditor
                                    v-model:text="section.text"
                                    :hint="t('newsLetter.sectionsHint')"
                                    :show-upload-button="false"
                                    :enabled="section.enabled"
                                >
                                </AIInputEditor>
                            </div>
                        </div>
                    </form>

                    <div v-if="results" class="flex flex-col flex-wrap gap-2 w-full h-full">
                        <Editor v-model:content="results" />
                    </div>
                </div>
            </template>
            <template #footer></template>
        </Card>
    </Fluid>
</template>
