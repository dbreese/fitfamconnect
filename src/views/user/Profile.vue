<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
// @ts-ignore
import { useLayout } from '@/layout/composables/layout';
import { dark, shadesOfPurple, experimental__simple } from '@clerk/themes';
import { useUser } from '@clerk/vue';
import { type UserResource, type SessionWithActivitiesResource } from '@clerk/types';
import Card from 'primevue/card';
import Avatar from 'primevue/avatar';
import { useI18n } from 'vue-i18n';
import NameValuePair from '@/components/NameValuePair.vue';
import { user } from '@/service/SessionUtils';
import { GradeLevels, gradeLevelForCode } from '@/shared/GradeLevels';
import { submit } from '@/service/NetworkUtil';
import { TemperatureModes, temperatureForCode } from '@/shared/TemperatureModes';
import { letterModeForCode, LetterModes } from '@/shared/LetterModes';
import { onBeforeRouteLeave } from 'vue-router';

const isLoading = ref(false);

const { t } = useI18n();

const { isSignedIn, user: clerkUser, isLoaded } = useUser();
const { layoutConfig, toggleDarkMode, isDarkTheme } = useLayout();

const clerkTheme = ref(experimental__simple);

// TODO: Allow user to kill sessions?
const sessions = ref<SessionWithActivitiesResource[]>();

// Preferences
var shouldSavePrefs = false;
const gradeLevels = ref(GradeLevels);
const gradeLevel = ref(gradeLevelForCode(user.preferences.level));
const temperatureOptions = ref(TemperatureModes);
const temperature = ref(temperatureForCode(user.preferences.temperature));
const modeOptions = ref(LetterModes);
const mode = ref(letterModeForCode(user.preferences.mode));
const fromName = ref(user.preferences.from || '');
const showHelp = ref(user.preferences.help === true ? true : false);

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

watch(
    [layoutConfig.darkTheme, gradeLevel, temperature, mode, fromName, showHelp, sections],
    ([newThemeVal, oldThemeVal]) => {
        if (newThemeVal) {
            clerkTheme.value = dark;
        } else {
            console.log('User pref changed');
            shouldSavePrefs = true;
            clerkTheme.value = experimental__simple;
        }
    },
    { deep: true }
);

watchEffect(async () => {
    console.log('Something changed');
    if (isLoaded && clerkUser.value) {
        try {
            sessions.value = await clerkUser.value!.getSessions();
            sessions.value!.forEach(async (session) => {
                console.log(`Session ID: ${session.id}, Status: ${session.status} ${JSON.stringify(session)}`);
            });
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    }
});

onBeforeRouteLeave(async (to, from, next) => {
    if (shouldSavePrefs) {
        console.log('SAVING PREFS');

        await handleUpdatePreferences();
    } else {
        console.log('NOT SAVING PREFS, NOTHING CHANGED!');
    }
    next();
});

// TODO: This is being called anytime page exits --
// should centralize logic in userService.hasAllPreferences() and use it here
async function handleUpdatePreferences() {
    isLoading.value = true;

    const body = {
        temperature: temperature.value.code,
        level: gradeLevel.value.code,
        mode: mode.value.code,
        from: fromName.value,
        newsletterSections: sections.value,
        help: showHelp.value
    };

    await submit('POST', '/user/preferences', body)
        .then((result) => {
            isLoading.value = false;
            if (result && result?.status < 400) {
                console.log('User prefs updated!');

                // also update in-memory prefs
                console.log('updating in memory user with ' + JSON.stringify(body));
                Object.assign(user.preferences, body);
            } else {
                console.error(`Could not update preferences. code=${result?.status}`);
            }
        })
        .catch((err) => {
            isLoading.value = false;
            console.error('Error occurred.', err);
        });
}
</script>

<template>
    <Fluid>
        <div v-if="!isLoaded || isLoading" class="spinner-overlay progressoverlay">
            <ProgressSpinner aria-label="Loading" />
        </div>

        <div v-else>
            <Card class="card-style">
                <template #title>
                    {{ t('profile.title') }}
                    <div style="display: flex; justify-content: flex-end">
                        <button type="button" class="layout-topbar-action" @click="toggleDarkMode">
                            <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"></i>
                        </button>
                    </div>
                </template>
                <template #content>
                    <div class="flex items-center gap-2">
                        <Avatar :image="clerkUser!.imageUrl" shape="circle" size="large" />
                        <span class="font-bold">{{ user.fullname }}</span>
                    </div>
                    <br />
                    <NameValuePair
                        name="Username"
                        :value="user.username"
                        icon="pi-user"
                        iconSize="medium"
                        class="name-value-pair"
                    />
                    <NameValuePair name="Email" :value="user.email" icon="pi-envelope" iconSize="medium" />
                    <br />
                </template>
                <template #footer></template>
            </Card>

            <Card class="card-style mt-8">
                <template #title>{{ t('profile.preferences') }}</template>
                <template #content>
                    <Help i18n-intro-key="profile.desc" :controls="false"></Help>

                    <form @submit.prevent="handleUpdatePreferences" class="pt-4">
                        <div class="flex flex-wrap gap-2">
                            <Checkbox binary id="help1" name="help" value="true" v-model="showHelp" />
                            <label for="help1">{{ t('profile.showHelp') }}</label>
                        </div>

                        <div class="flex flex-wrap gap-2 pt-8">
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

                        <div class="flex flex-wrap gap-2 pt-4">
                            {{ t('profile.mode') }}

                            <SelectButton
                                id="mode"
                                v-model="mode"
                                :options="modeOptions"
                                optionLabel="name"
                                class="w-full"
                                size="large"
                            />
                        </div>

                        <div class="flex flex-wrap gap-2 pt-4">
                            {{ t('profile.temperature') }}

                            <SelectButton
                                id="temperature"
                                v-model="temperature"
                                :options="temperatureOptions"
                                optionLabel="name"
                                class="w-full"
                                size="large"
                            />
                        </div>

                        <div class="flex flex-col gap-2 pt-8">
                            <FloatLabel variant="on" class="w-full">
                                <label for="fromName">{{ t('profile.from') }}</label>
                                <InputText id="fromName" v-model="fromName" size="large" />
                            </FloatLabel>
                        </div>

                        <div class="flex flex-col gap-2 pt-8">
                            {{ t('profile.newsletterSections') }}

                            <div v-for="(section, index) in sections" :key="section.id">
                                <div class="pt-2">
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
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end">
                            <Button :fluid="false" type="submit" class="mt-8">{{ t('profile.submit') }}</Button>
                        </div>
                    </form>
                </template>
                <template #footer></template>
            </Card>
        </div>

        <br />
        <br />

        <!-- https://clerk.com/docs/customization/overview -->
        <!-- <UserProfile :appearance="clerkTheme" /> -->
    </Fluid>
</template>

<style lang="scss" scoped>
.name-value-pair {
    padding-bottom: 8px;
    margin-left: 8px;
}
</style>
