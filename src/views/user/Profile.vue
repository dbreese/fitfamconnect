<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
// @ts-ignore
import { useLayout } from '@/layout/composables/layout';
import { dark, experimental__simple } from '@clerk/themes';
import { useUser } from '@clerk/vue';
import { type SessionWithActivitiesResource } from '@clerk/types';
import Card from 'primevue/card';
import Avatar from 'primevue/avatar';
import { useI18n } from 'vue-i18n';
import NameValuePair from '@/components/NameValuePair.vue';
import { user } from '@/service/SessionUtils';

const isLoading = ref(false);

const { t } = useI18n();

const { isSignedIn, user: clerkUser, isLoaded } = useUser();
const { layoutConfig, toggleDarkMode, isDarkTheme } = useLayout();

const clerkTheme = ref(experimental__simple);

// TODO: Allow user to kill sessions?
const sessions = ref<SessionWithActivitiesResource[]>();

watch(
    [layoutConfig.darkTheme],
    ([newThemeVal]) => {
        if (newThemeVal) {
            clerkTheme.value = dark;
        } else {
            clerkTheme.value = experimental__simple;
        }
    }
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
