<script setup lang="ts">
import { MyGymsService } from '@/service/MyGymsService';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const toast = useToast();

const loading = ref(false);
const gymMemberships = ref<any[]>([]);
const showJoinDialog = ref(false);
const gymCode = ref('');
const foundGym = ref<any | null>(null);
const lookingUpGym = ref(false);
const joiningGym = ref(false);

async function loadMyGyms() {
    loading.value = true;
    try {
        const result = await MyGymsService.getMyGyms();
        if (result) {
            gymMemberships.value = result;
            console.log(`Loaded ${result.length} gym memberships`);
        } else {
            gymMemberships.value = [];
        }
    } catch (error) {
        console.error('Error loading gym memberships:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('mygyms.error.loadFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function formatGymName(gymMembership: any): string {
    return gymMembership.gym?.name || t('mygyms.unknownGym');
}

function formatGymAddress(gymMembership: any): string {
    const address = gymMembership.gym?.billingAddress;
    if (!address) return '';

    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zipCode) parts.push(address.zipCode);

    return parts.join(', ');
}

function formatMembershipStatus(gymMembership: any): string {
    const status = gymMembership.membership?.status;
    if (!status) return t('mygyms.unknownStatus');

    return t(`membershipStatus.${status}`) || status;
}

function getMembershipStatusSeverity(status: string): string {
    switch (status) {
        case 'approved':
            return 'success';
        case 'pending':
            return 'warning';
        case 'denied':
            return 'danger';
        case 'inactive':
            return 'secondary';
        default:
            return 'info';
    }
}

function formatMemberType(gymMembership: any): string {
    const type = gymMembership.membership?.memberType;
    switch (type) {
        case 'owner':
            return t('mygyms.memberTypes.owner');
        case 'coach':
            return t('mygyms.memberTypes.coach');
        case 'member':
            return t('mygyms.memberTypes.member');
        default:
            return t('mygyms.unknownType');
    }
}

function formatJoinDate(gymMembership: any): string {
    const date = gymMembership.membership?.joinRequestDate;
    return date ? new Date(date).toLocaleDateString() : '';
}

function formatStartDate(gymMembership: any): string {
    const date = gymMembership.membership?.startDate;
    return date ? new Date(date).toLocaleDateString() : '';
}

function openJoinDialog() {
    gymCode.value = '';
    foundGym.value = null;
    showJoinDialog.value = true;
}

async function lookupGym() {
    if (!gymCode.value.trim()) {
        toast.add({
            severity: 'warn',
            summary: t('feedback.errorTitle'),
            detail: t('mygyms.validation.gymCodeRequired'),
            life: 3000
        });
        return;
    }

    lookingUpGym.value = true;
    try {
        const gym = await MyGymsService.lookupGym(gymCode.value.trim());
        foundGym.value = gym;
        console.log('Found gym:', gym);
    } catch (error) {
        console.error('Error looking up gym:', error);
        foundGym.value = null;
        const errorMessage = error instanceof Error ? error.message : t('mygyms.error.lookupFailed');
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: errorMessage,
            life: 5000
        });
    } finally {
        lookingUpGym.value = false;
    }
}

async function joinGym() {
    if (!foundGym.value) return;

    joiningGym.value = true;
    try {
        await MyGymsService.joinGym(foundGym.value._id);
        toast.add({
            severity: 'success',
            summary: t('feedback.successTitle'),
            detail: t('mygyms.success.joinRequested', { gymName: foundGym.value.name }),
            life: 5000
        });
        showJoinDialog.value = false;
        await loadMyGyms(); // Refresh the list
    } catch (error) {
        console.error('Error joining gym:', error);
        const errorMessage = error instanceof Error ? error.message : t('mygyms.error.joinFailed');
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: errorMessage,
            life: 5000
        });
    } finally {
        joiningGym.value = false;
    }
}

function formatFoundGymAddress(gym: any): string {
    const address = gym?.billingAddress;
    if (!address) return '';

    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zipCode) parts.push(address.zipCode);

    return parts.join(', ');
}

onMounted(() => {
    loadMyGyms();
});
</script>

<template>
    <Fluid>
        <div class="flex progresscontainer">
            <div v-if="loading" class="spinner-overlay progressoverlay">
                <ProgressSpinner aria-label="Loading" />
            </div>

            <Card class="card-style">
                <template #title>{{ t('mygyms.title') }}</template>
                <template #subtitle>{{ t('mygyms.subtitle') }}</template>
                <template #content>
                    <!-- No Gyms State -->
                    <div v-if="gymMemberships.length === 0 && !loading" class="text-center py-12">
                        <div class="mb-6">
                            <i class="pi pi-building text-6xl text-gray-300"></i>
                        </div>
                        <h3 class="text-xl font-semibold text-gray-700 mb-2">{{ t('mygyms.noGyms') }}</h3>
                        <p class="text-gray-500 mb-6">{{ t('mygyms.noGymsMessage') }}</p>
                        <Button
                            :label="t('mygyms.joinGym')"
                            icon="pi pi-plus"
                            size="large"
                            severity="success"
                            class="p-4 text-lg"
                            @click="openJoinDialog"
                        />
                    </div>

                    <!-- Gyms Table -->
                    <div v-else>
                        <div class="flex items-center mb-3 w-full">
                            <div class="flex items-center gap-3 flex-1">
                                <span class="text-sm text-gray-600">
                                    {{ gymMemberships.length }} {{ t('mygyms.gymsFound') }}
                                </span>
                            </div>
                            <div class="flex gap-2 flex-shrink-0">
                                <Button
                                    icon="pi pi-plus"
                                    :label="t('mygyms.joinAnotherGym')"
                                    @click="openJoinDialog"
                                />
                            </div>
                        </div>

                        <DataTable :value="gymMemberships" paginator :rows="10" responsiveLayout="scroll">
                        <Column field="gym.name" :header="t('mygyms.gymName')" sortable>
                            <template #body="{ data }">
                                <div>
                                    <div class="font-semibold">{{ formatGymName(data) }}</div>
                                    <div class="text-sm text-gray-600">{{ data.gym?.description || '' }}</div>
                                </div>
                            </template>
                        </Column>

                        <Column field="gym.billingAddress" :header="t('mygyms.address')">
                            <template #body="{ data }">
                                <div class="text-sm">{{ formatGymAddress(data) }}</div>
                            </template>
                        </Column>

                        <Column field="membership.memberType" :header="t('mygyms.memberType')" sortable>
                            <template #body="{ data }">
                                <span class="capitalize">{{ formatMemberType(data) }}</span>
                            </template>
                        </Column>

                        <Column field="membership.status" :header="t('mygyms.status')" sortable>
                            <template #body="{ data }">
                                <Tag
                                    :value="formatMembershipStatus(data)"
                                    :severity="getMembershipStatusSeverity(data.membership?.status || '')"
                                />
                            </template>
                        </Column>

                        <Column field="membership.joinRequestDate" :header="t('mygyms.joinDate')" sortable>
                            <template #body="{ data }">
                                {{ formatJoinDate(data) }}
                            </template>
                        </Column>

                        <Column field="membership.startDate" :header="t('mygyms.startDate')" sortable>
                            <template #body="{ data }">
                                {{ formatStartDate(data) }}
                            </template>
                        </Column>
                        </DataTable>
                    </div>
                </template>
            </Card>

            <!-- Join Gym Dialog -->
            <Dialog
                v-model:visible="showJoinDialog"
                :modal="true"
                :header="t('mygyms.joinGymTitle')"
                :pt="{ root: { class: 'w-[90vw] md:w-[60vw] lg:w-[50vw]' } }"
            >
                <div class="space-y-4">
                    <!-- Gym Code Input -->
                    <div class="field">
                        <label for="gymCode" class="font-medium">{{ t('mygyms.gymCode') }} *</label>
                        <InputText
                            id="gymCode"
                            v-model="gymCode"
                            class="w-full"
                            :placeholder="t('mygyms.gymCodePlaceholder')"
                            maxlength="6"
                            style="text-transform: uppercase"
                            @input="foundGym = null"
                            @keyup.enter="lookupGym"
                        />
                        <small class="text-gray-500">{{ t('mygyms.gymCodeHelp') }}</small>
                    </div>

                    <!-- Lookup Button -->
                    <div class="flex justify-center">
                        <Button
                            :label="t('mygyms.lookupGym')"
                            icon="pi pi-search"
                            @click="lookupGym"
                            :loading="lookingUpGym"
                            :disabled="!gymCode.trim()"
                        />
                    </div>

                    <!-- Gym Details (when found) -->
                    <div v-if="foundGym" class="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 class="text-lg font-semibold text-green-800 mb-3">{{ t('mygyms.gymFound') }}</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{ t('mygyms.gymName') }}</label>
                                <div class="text-lg font-semibold">{{ foundGym.name }}</div>
                            </div>
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{ t('mygyms.gymCode') }}</label>
                                <div class="font-mono text-lg">{{ foundGym.gymCode }}</div>
                            </div>
                            <div v-if="foundGym.description" class="md:col-span-2">
                                <label class="font-medium text-sm text-gray-600">{{ t('mygyms.description') }}</label>
                                <div>{{ foundGym.description }}</div>
                            </div>
                            <div class="md:col-span-2">
                                <label class="font-medium text-sm text-gray-600">{{ t('mygyms.address') }}</label>
                                <div>{{ formatFoundGymAddress(foundGym) }}</div>
                            </div>
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{ t('mygyms.contact') }}</label>
                                <div>{{ foundGym.contact?.email || '' }}</div>
                                <div v-if="foundGym.contact?.phone">{{ foundGym.contact.phone }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button
                            :label="t('mygyms.cancel')"
                            severity="secondary"
                            @click="showJoinDialog = false"
                        />
                        <Button
                            v-if="foundGym"
                            :label="t('mygyms.join')"
                            severity="success"
                            icon="pi pi-check"
                            @click="joinGym"
                            :loading="joiningGym"
                        />
                    </div>
                </template>
            </Dialog>

            <Toast />
        </div>
    </Fluid>
</template>

<style scoped>
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
