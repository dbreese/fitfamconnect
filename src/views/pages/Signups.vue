<script setup lang="ts">
import { ClassService } from '@/service/ClassService';
import { MyGymsService } from '@/service/MyGymsService';
import Card from 'primevue/card';
import Select from 'primevue/select';
import Calendar from 'primevue/calendar';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import Tag from 'primevue/tag';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { ref, onMounted, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import { user } from '@/service/SessionUtils';

const { t } = useI18n();
const toast = useToast();

const loading = ref(false);
const loadingClasses = ref(false);
const gymMemberships = ref<any[]>([]);
const selectedGymId = ref<string>('');
const selectedDate = ref<Date>(new Date());
const availableClasses = ref<any[]>([]);
const upcomingSignups = ref<any[]>([]);
const loadingUpcoming = ref(false);
const activeTab = ref(0);

const gymOptions = computed(() => {
    return gymMemberships.value.map(membership => ({
        label: membership.gym?.name || 'Unknown Gym',
        value: membership.gym?._id
    }));
});

async function loadMyGyms() {
    loading.value = true;
    try {
        const result = await MyGymsService.getMyGyms();
        if (result && result.length > 0) {
            gymMemberships.value = result.filter((m: any) => m.membership?.status === 'approved');

            // Auto-select first gym if only one
            if (gymMemberships.value.length === 1) {
                selectedGymId.value = gymMemberships.value[0].gym._id;
            }

            console.log(`Loaded ${gymMemberships.value.length} approved gym memberships`);
        } else {
            gymMemberships.value = [];
        }
    } catch (error) {
        console.error('Error loading gyms:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('signups.error.loadGymsFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function loadClasses() {
    if (!selectedGymId.value || !selectedDate.value) {
        availableClasses.value = [];
        return;
    }

    loadingClasses.value = true;
    try {
        // Format date as YYYY-MM-DD in local timezone to avoid timezone issues
        const year = selectedDate.value.getFullYear();
        const month = String(selectedDate.value.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.value.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const result = await ClassService.getClassesForDate(selectedGymId.value, dateStr);
        if (result) {
            // Process classes and determine if current user is signed up
            const processedClasses = result.map((classSchedule: any) => {
                // Check if current user is in the signups array and get their signup status
                const userEmail = user.email;
                const userSignup = classSchedule.signups && classSchedule.signups.find((signup: any) =>
                    signup.member && signup.member.email === userEmail
                );

                return {
                    ...classSchedule,
                    isSignedUp: userSignup ? (userSignup.status === 'active' || userSignup.status === 'done') : false,
                    signupStatus: userSignup ? userSignup.status : null
                };
            });

            // Sort classes by start time
            availableClasses.value = processedClasses.sort((a: any, b: any) => {
                const timeA = new Date(a.startDateTime).getTime();
                const timeB = new Date(b.startDateTime).getTime();
                return timeA - timeB;
            });
            console.log(`Loaded ${result.length} classes for ${dateStr}`);
        } else {
            availableClasses.value = [];
        }
    } catch (error) {
        console.error('Error loading classes:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('signups.error.loadClassesFailed'),
            life: 3000
        });
    } finally {
        loadingClasses.value = false;
    }
}

async function toggleSignup(classSchedule: any) {
    try {
        // Format the selected date for the API
        const year = selectedDate.value.getFullYear();
        const month = String(selectedDate.value.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.value.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const result = await ClassService.toggleSignup(classSchedule._id, dateStr);

        // Update the local state - use the isSignedUp field from the response
        classSchedule.isSignedUp = result.isSignedUp;
        classSchedule.signupStatus = result.status;

        const message = classSchedule.isSignedUp
            ? t('signups.success.signedUp', { className: classSchedule.class?.name })
            : t('signups.success.cancelled', { className: classSchedule.class?.name });

        toast.add({
            severity: 'success',
            summary: t('feedback.successTitle'),
            detail: message,
            life: 3000
        });

        // Refresh upcoming signups to keep tabs in sync
        await loadUpcomingSignups();
    } catch (error) {
        console.error('Error toggling signup:', error);
        const errorMessage = error instanceof Error ? error.message : t('signups.error.toggleFailed');
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: errorMessage,
            life: 3000
        });
    }
}

function formatTime(date: Date | string): string {
    return new Date(date).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatDuration(startTime: Date | string, duration: number): string {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000);
    return `${formatTime(start)} - ${formatTime(end)}`;
}

function getSignupButtonSeverity(classSchedule: any): string {
    if (!classSchedule.isSignedUp) return 'success';
    if (classSchedule.signupStatus === 'done') return 'info';
    return 'danger';
}

function getSignupButtonIcon(classSchedule: any): string {
    if (!classSchedule.isSignedUp) return 'pi pi-plus';
    if (classSchedule.signupStatus === 'done') return 'pi pi-check';
    return 'pi pi-times';
}

function getSignupButtonLabel(classSchedule: any): string {
    if (!classSchedule.isSignedUp) return t('signups.signUp');
    if (classSchedule.signupStatus === 'done') return t('signups.statusLabels.done');
    return t('signups.cancel');
}

function previousDay() {
    const newDate = new Date(selectedDate.value);
    newDate.setDate(newDate.getDate() - 1);
    selectedDate.value = newDate;
}

function nextDay() {
    const newDate = new Date(selectedDate.value);
    newDate.setDate(newDate.getDate() + 1);
    selectedDate.value = newDate;
}

function goToToday() {
    selectedDate.value = new Date();
}

async function loadUpcomingSignups() {
    loadingUpcoming.value = true;
    try {
        const result = await ClassService.getUpcomingSignups();
        if (result) {
            // Sort upcoming signups by start time
            upcomingSignups.value = result.sort((a: any, b: any) => {
                const timeA = new Date(a.schedule.startDateTime).getTime();
                const timeB = new Date(b.schedule.startDateTime).getTime();
                return timeA - timeB;
            });
            console.log(`Loaded ${result.length} upcoming signups`);
        } else {
            upcomingSignups.value = [];
        }
    } catch (error) {
        console.error('Error loading upcoming signups:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('signups.error.loadUpcomingFailed'),
            life: 3000
        });
    } finally {
        loadingUpcoming.value = false;
    }
}

function formatSelectedDate(): string {
    return selectedDate.value.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Watch for changes to reload classes
watch([selectedGymId, selectedDate], () => {
    loadClasses();
});

function formatUpcomingDate(signup: any): string {
    return new Date(signup.signup.classDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function formatUpcomingTime(signup: any): string {
    if (!signup.schedule.startDateTime) return '';
    return formatTime(signup.schedule.startDateTime);
}

async function cancelUpcomingSignup(signup: any) {
    try {
        const year = new Date(signup.signup.classDate).getFullYear();
        const month = String(new Date(signup.signup.classDate).getMonth() + 1).padStart(2, '0');
        const day = String(new Date(signup.signup.classDate).getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const result = await ClassService.toggleSignup(signup.schedule._id, dateStr);

        toast.add({
            severity: 'success',
            summary: t('feedback.successTitle'),
            detail: t('signups.success.cancelled', { className: signup.class.name }),
            life: 3000
        });

        // Reload upcoming signups and refresh browse classes tab
        await loadUpcomingSignups();
        await loadClasses(); // Refresh browse classes to show updated signup status
    } catch (error) {
        console.error('Error cancelling signup:', error);
        const errorMessage = error instanceof Error ? error.message : t('signups.error.toggleFailed');
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: errorMessage,
            life: 3000
        });
    }
}

function getStatusLabel(status: string): string {
    switch (status) {
        case 'active': return t('signups.statusLabels.active');
        case 'cancelled': return t('signups.statusLabels.cancelled');
        case 'done': return t('signups.statusLabels.done');
        default: return status;
    }
}

function getStatusSeverity(status: string): string {
    switch (status) {
        case 'active': return 'success';
        case 'cancelled': return 'danger';
        case 'done': return 'info';
        default: return 'secondary';
    }
}

onMounted(() => {
    loadMyGyms();
    loadUpcomingSignups();
});
</script>

<template>
    <Fluid>
        <div class="flex progresscontainer">
            <div v-if="loading" class="spinner-overlay progressoverlay">
                <ProgressSpinner aria-label="Loading" />
            </div>

            <Card class="card-style">
                <template #title>{{ t('signups.title') }}</template>
                <template #subtitle>{{ t('signups.subtitle') }}</template>
                <template #content>
                    <!-- No Gyms State -->
                    <div v-if="gymMemberships.length === 0 && !loading" class="text-center py-12">
                        <div class="mb-6">
                            <i class="pi pi-calendar text-6xl text-gray-300"></i>
                        </div>
                        <h3 class="text-xl font-semibold text-gray-700 mb-2">{{ t('signups.noGyms') }}</h3>
                        <p class="text-gray-500 mb-6">{{ t('signups.noGymsMessage') }}</p>
                    </div>

                    <!-- Tab View -->
                    <TabView v-else v-model:activeIndex="activeTab">
                        <!-- Browse Classes Tab -->
                        <TabPanel :header="t('signups.browseClasses')" value="browse">
                            <div class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="field">
                                <label for="gym" class="font-medium">{{ t('signups.selectGym') }} *</label>
                                <Select
                                    v-if="gymMemberships.length > 1"
                                    id="gym"
                                    v-model="selectedGymId"
                                    :options="gymOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    class="w-full"
                                    :placeholder="t('signups.selectGymPlaceholder')"
                                />
                                <div
                                    v-else
                                    class="p-3 border border-gray-300 rounded-md bg-gray-50"
                                >
                                    <span class="font-medium">{{ gymMemberships[0]?.gym?.name || 'Unknown Gym' }}</span>
                                </div>
                            </div>
                            <div class="field">
                                <label for="date" class="font-medium">{{ t('signups.selectDate') }} *</label>
                                <div class="flex items-center gap-2">
                                    <Button
                                        icon="pi pi-chevron-left"
                                        size="small"
                                        severity="secondary"
                                        @click="previousDay"
                                        :disabled="selectedDate <= new Date(new Date().setHours(0, 0, 0, 0))"
                                    />
                                    <div class="flex-1">
                                        <Calendar
                                            id="date"
                                            v-model="selectedDate"
                                            class="w-full"
                                            :min-date="new Date()"
                                        />
                                    </div>
                                    <Button
                                        icon="pi pi-chevron-right"
                                        size="small"
                                        severity="secondary"
                                        @click="nextDay"
                                    />
                                    <Button
                                        icon="pi pi-home"
                                        size="small"
                                        severity="info"
                                        @click="goToToday"
                                        v-tooltip.top="t('signups.today')"
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- Classes List -->
                        <div v-if="selectedGymId && selectedDate">
                            <div v-if="loadingClasses" class="text-center py-8">
                                <ProgressSpinner />
                                <div class="mt-2 text-gray-600">{{ t('signups.loadingClasses') }}</div>
                            </div>

                            <div v-else-if="availableClasses.length === 0" class="text-center py-8 text-gray-500">
                                <i class="pi pi-calendar-times text-4xl mb-4"></i>
                                <div>{{ t('signups.noClassesAvailable') }}</div>
                            </div>

                            <div v-else class="space-y-3">
                                <h3 class="text-2xl font-bold text-gray-800 mb-4 text-center">
                                    {{ formatSelectedDate() }}
                                </h3>

                                <div class="grid grid-cols-1 gap-3">
                                    <div
                                        v-for="classSchedule in availableClasses"
                                        :key="classSchedule._id"
                                        class="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                        :class="{ 'border-green-300 bg-green-50': classSchedule.isSignedUp }"
                                    >
                                        <div class="flex justify-between items-center">
                                            <div class="flex-1">
                                                <div class="flex items-center gap-3">
                                                    <h5 class="text-lg font-semibold">{{ classSchedule.class?.name }}</h5>
                                                    <Tag
                                                        v-if="classSchedule.class?.category"
                                                        :value="classSchedule.class.category"
                                                        severity="info"
                                                        class="text-xs"
                                                    />
                                                    <i
                                                        v-if="classSchedule.isSignedUp"
                                                        class="pi pi-check-circle text-green-600 text-xl"
                                                    ></i>
                                                </div>
                                                <div class="text-sm text-gray-600 mt-1">
                                                    <div>{{ classSchedule.class?.description || '' }}</div>
                                                    <div class="flex items-center gap-4 mt-1">
                                                        <span><i class="pi pi-clock mr-1"></i>{{ formatDuration(classSchedule.startDateTime, classSchedule.class?.duration || 60) }}</span>
                                                        <span><i class="pi pi-map-marker mr-1"></i>{{ classSchedule.location?.name }}</span>
                                                        <span v-if="classSchedule.coach">
                                                            <i class="pi pi-user mr-1"></i>{{ classSchedule.coach.firstName }} {{ classSchedule.coach.lastName }}
                                                        </span>
                                                        <span v-if="classSchedule.maxAttendees">
                                                            <i class="pi pi-users mr-1"></i>{{ t('signups.maxAttendees', { max: classSchedule.maxAttendees }) }}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="ml-4">
                                                <Button
                                                    :icon="getSignupButtonIcon(classSchedule)"
                                                    :label="getSignupButtonLabel(classSchedule)"
                                                    :severity="getSignupButtonSeverity(classSchedule)"
                                                    :disabled="classSchedule.signupStatus === 'done'"
                                                    @click="toggleSignup(classSchedule)"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                            </div>
                        </TabPanel>

                        <!-- Upcoming Signups Tab -->
                        <TabPanel :header="t('signups.upcoming')" value="upcoming">
                            <div v-if="loadingUpcoming" class="text-center py-8">
                                <ProgressSpinner />
                                <div class="mt-2 text-gray-600">{{ t('signups.loadingUpcoming') }}</div>
                            </div>

                            <div v-else-if="upcomingSignups.length === 0" class="text-center py-8 text-gray-500">
                                <i class="pi pi-calendar-times text-4xl mb-4"></i>
                                <div>{{ t('signups.noUpcomingSignups') }}</div>
                            </div>

                            <div v-else>
                                <div class="mb-3">
                                    <span class="text-sm text-gray-600">
                                        {{ upcomingSignups.length }} {{ t('signups.upcomingFound') }}
                                    </span>
                                </div>

                                <DataTable
                                    :value="upcomingSignups"
                                    paginator
                                    :rows="10"
                                    responsiveLayout="scroll"
                                    sortField="schedule.startDateTime"
                                    :sortOrder="1"
                                >
                                    <Column field="class.name" :header="t('signups.className')" sortable>
                                        <template #body="{ data }">
                                            <div>
                                                <div class="font-semibold">{{ data.class?.name }}</div>
                                                <div class="text-sm text-gray-600">{{ data.class?.description || '' }}</div>
                                            </div>
                                        </template>
                                    </Column>

                                    <Column field="gym.name" :header="t('signups.gym')" sortable>
                                        <template #body="{ data }">
                                            {{ data.gym?.name }}
                                        </template>
                                    </Column>

                                    <Column field="signup.classDate" :header="t('signups.date')" sortable>
                                        <template #body="{ data }">
                                            {{ formatUpcomingDate(data) }}
                                        </template>
                                    </Column>

                                    <Column field="schedule.startDateTime" :header="t('signups.time')" sortable>
                                        <template #body="{ data }">
                                            {{ formatUpcomingTime(data) }}
                                        </template>
                                    </Column>

                                    <Column field="location.name" :header="t('signups.location')">
                                        <template #body="{ data }">
                                            {{ data.location?.name }}
                                        </template>
                                    </Column>

                                    <Column field="coach" :header="t('signups.coach')">
                                        <template #body="{ data }">
                                            {{ data.coach ? `${data.coach.firstName} ${data.coach.lastName}` : t('signups.noCoach') }}
                                        </template>
                                    </Column>

                                    <Column field="signup.status" :header="t('signups.status')">
                                        <template #body="{ data }">
                                            <Tag
                                                :value="getStatusLabel(data.signup.status)"
                                                :severity="getStatusSeverity(data.signup.status)"
                                            />
                                        </template>
                                    </Column>

                                    <Column :header="t('signups.actions')">
                                        <template #body="{ data }">
                                            <Button
                                                icon="pi pi-times"
                                                :label="t('signups.cancel')"
                                                size="small"
                                                severity="danger"
                                                @click="cancelUpcomingSignup(data)"
                                            />
                                        </template>
                                    </Column>
                                </DataTable>
                            </div>
                        </TabPanel>
                    </TabView>
                </template>
            </Card>

            <Toast />
        </div>
    </Fluid>
</template>

<style scoped>
.field {
    margin-bottom: 1rem;
}

.field label {
    display: block;
    margin-bottom: 0.5rem;
}

.progresscontainer {
    position: relative;
}

.progressoverlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}
</style>
