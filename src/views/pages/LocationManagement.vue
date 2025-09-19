<script setup lang="ts">
import { LocationService } from '@/service/LocationService';
import type { ILocation, ISubLocation } from '@/server/db/location';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Chips from 'primevue/chips';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import ProgressSpinner from 'primevue/progressspinner';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();

const locations = ref<ILocation[]>([]);
const loading = ref(false);
const showDialog = ref(false);
const editMode = ref(false);
const selectedLocation = ref<ILocation | null>(null);

const formData = ref({
    name: '',
    description: '',
    maxMemberCount: null as number | null,
    operatingHours: [] as Array<{
        dayOfWeek: number;
        openTime: string;
        closeTime: string;
        isClosed: boolean;
    }>
});

const daysOfWeek = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 }
];

async function loadLocations() {
    loading.value = true;
    try {
        const result = await LocationService.getMyLocations();
        if (result) {
            locations.value = result;
            console.log(`Loaded ${result.length} locations`);
        } else {
            locations.value = [];
        }
    } catch (error) {
        console.error('Error loading locations:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('locations.error.loadFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function openNewDialog() {
    editMode.value = false;
    selectedLocation.value = null;
    resetForm();
    showDialog.value = true;
}

function openEditDialog(location: ILocation) {
    editMode.value = true;
    selectedLocation.value = location;
    formData.value = {
        name: location.name,
        description: location.description || '',
        maxMemberCount: location.maxMemberCount || null,
        operatingHours: location.operatingHours ? [...location.operatingHours] : getDefaultOperatingHours()
    };
    showDialog.value = true;
}

function resetForm() {
    formData.value = {
        name: '',
        description: '',
        maxMemberCount: null,
        operatingHours: getDefaultOperatingHours()
    };
}

function getDefaultOperatingHours() {
    return daysOfWeek.map((day) => ({
        dayOfWeek: day.value,
        openTime: '06:00',
        closeTime: '22:00',
        isClosed: false
    }));
}


function validateForm(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.value.name.trim()) {
        errors.push(t('locations.validation.nameRequired'));
    }

    if (formData.value.maxMemberCount !== null && formData.value.maxMemberCount <= 0) {
        errors.push(t('locations.validation.maxMembersInvalid'));
    }

    // Validate operating hours
    for (const hours of formData.value.operatingHours) {
        if (!hours.isClosed) {
            if (!hours.openTime || !hours.closeTime) {
                errors.push(t('locations.validation.hoursRequired'));
                break;
            }
            if (hours.openTime >= hours.closeTime) {
                errors.push(t('locations.validation.invalidHours'));
                break;
            }
        }
    }


    return {
        isValid: errors.length === 0,
        errors
    };
}

async function handleSubmit() {
    // Validate form before submission
    const validation = validateForm();
    if (!validation.isValid) {
        toast.add({
            severity: 'warn',
            summary: t('locations.validation.validationError'),
            detail: validation.errors[0],
            life: 5000
        });
        return;
    }

    loading.value = true;
    try {
        let result;

        // Prepare data for submission
        const submitData = {
            ...formData.value,
            description: formData.value.description.trim() || undefined,
            maxMemberCount: formData.value.maxMemberCount || undefined,
            subLocations: [] // Required by ILocation interface
        };

        if (editMode.value && selectedLocation.value) {
            result = await LocationService.updateLocation((selectedLocation.value as any)._id, submitData);
        } else {
            result = await LocationService.createLocation(submitData);
        }

        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: editMode.value ? t('locations.success.updated') : t('locations.success.created'),
                life: 3000
            });
            showDialog.value = false;
            await loadLocations();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: editMode.value ? t('locations.error.updateFailed') : t('locations.error.createFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error submitting location:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: editMode.value ? t('locations.error.updateFailed') : t('locations.error.createFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function confirmDelete(location: ILocation) {
    confirm.require({
        message: t('locations.deleteMessage', { name: location.name }),
        header: t('locations.deleteConfirmation'),
        icon: 'pi pi-info-circle',
        rejectLabel: t('locations.cancel'),
        rejectProps: {
            label: t('locations.cancel'),
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: t('locations.delete'),
            severity: 'danger'
        },
        accept: () => {
            deleteLocation(location);
        }
    });
}

async function deleteLocation(location: ILocation) {
    loading.value = true;
    try {
        const result = await LocationService.deleteLocation((location as any)._id);
        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: t('locations.success.deleted'),
                life: 3000
            });
            await loadLocations();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: t('locations.error.deleteFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error deleting location:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('locations.error.deleteFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function getDayName(dayOfWeek: number): string {
    return daysOfWeek.find((d) => d.value === dayOfWeek)?.label || '';
}

function formatOperatingHours(operatingHours: any[]): string {
    if (!operatingHours || operatingHours.length === 0) {
        return t('locations.noHours');
    }

    const openDays = operatingHours.filter((h) => !h.isClosed);
    if (openDays.length === 0) {
        return t('locations.closed');
    }

    return `${openDays.length}/7 ${t('locations.daysOpen')}`;
}


onMounted(() => {
    loadLocations();
});
</script>

<template>
    <Fluid>
        <div class="flex progresscontainer">
            <div v-if="loading" class="spinner-overlay progressoverlay">
                <ProgressSpinner aria-label="Loading" />
            </div>

            <Card class="card-style">
                <template #title>{{ t('locations.title') }}</template>
                <template #subtitle>{{ t('locations.subtitle') }}</template>
                <template #content>
                    <div class="flex justify-content-end mb-3">
                        <Button icon="pi pi-plus" :label="t('locations.newLocation')" @click="openNewDialog" />
                    </div>

                    <DataTable :value="locations" paginator :rows="10" responsiveLayout="scroll">
                        <Column field="name" :header="t('locations.locationName')" sortable></Column>
                        <Column field="maxMemberCount" :header="t('locations.maxMembers')">
                            <template #body="{ data }">
                                {{ data.maxMemberCount || t('locations.unlimited') }}
                            </template>
                        </Column>
                        <Column field="operatingHours" :header="t('locations.hours')">
                            <template #body="{ data }">
                                {{ formatOperatingHours(data.operatingHours) }}
                            </template>
                        </Column>
                        <Column :header="t('locations.actions')">
                            <template #body="{ data }">
                                <div class="flex gap-2">
                                    <Button
                                        icon="pi pi-pencil"
                                        size="small"
                                        severity="secondary"
                                        @click="openEditDialog(data)"
                                    />
                                    <Button
                                        icon="pi pi-trash"
                                        size="small"
                                        severity="danger"
                                        @click="confirmDelete(data)"
                                    />
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </template>
            </Card>

            <!-- Create/Edit Dialog -->
            <Dialog
                v-model:visible="showDialog"
                :modal="true"
                :header="editMode ? t('locations.editLocation') : t('locations.newLocation')"
                :pt="{ root: { class: 'w-[95vw] md:w-[80vw] lg:w-[70vw] max-h-[90vh]' } }"
            >
                <TabView>
                    <!-- Basic Information Tab -->
                    <TabPanel :header="t('locations.basicInfo')" value="basic">
                        <form @submit.prevent="handleSubmit" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="field">
                                <label for="locationName" class="font-medium"
                                    >{{ t('locations.locationName') }} *</label
                                >
                                <InputText id="locationName" v-model="formData.name" required class="w-full" />
                            </div>

                            <div class="field">
                                <label for="maxMembers" class="font-medium">{{ t('locations.maxMembers') }}</label>
                                <InputNumber
                                    id="maxMembers"
                                    v-model="formData.maxMemberCount"
                                    :min="1"
                                    :max="1000"
                                    class="w-full"
                                    :placeholder="t('locations.maxMembersPlaceholder')"
                                />
                            </div>

                            <div class="field col-span-full">
                                <label for="description" class="font-medium">{{ t('locations.description') }}</label>
                                <Textarea
                                    id="description"
                                    v-model="formData.description"
                                    rows="3"
                                    class="w-full"
                                    :placeholder="t('locations.descriptionPlaceholder')"
                                />
                            </div>
                        </form>
                    </TabPanel>

                    <!-- Operating Hours Tab -->
                    <TabPanel :header="t('locations.operatingHours')" value="hours">
                        <div class="space-y-4">
                            <div
                                v-for="(hours, index) in formData.operatingHours"
                                :key="hours.dayOfWeek"
                                class="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-4 border rounded-lg"
                            >
                                <div class="font-medium">
                                    {{ getDayName(hours.dayOfWeek) }}
                                </div>

                                <div class="flex items-center gap-2">
                                    <Checkbox v-model="hours.isClosed" binary />
                                    <label class="text-sm">{{ t('locations.closed') }}</label>
                                </div>

                                <div v-if="!hours.isClosed" class="field">
                                    <label class="font-medium text-sm">{{ t('locations.openTime') }}</label>
                                    <InputText v-model="hours.openTime" type="time" class="w-full" />
                                </div>

                                <div v-if="!hours.isClosed" class="field">
                                    <label class="font-medium text-sm">{{ t('locations.closeTime') }}</label>
                                    <InputText v-model="hours.closeTime" type="time" class="w-full" />
                                </div>
                            </div>
                        </div>
                    </TabPanel>
                </TabView>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button :label="t('locations.cancel')" severity="secondary" @click="showDialog = false" />
                        <Button :label="t('locations.save')" type="submit" @click="handleSubmit" />
                    </div>
                </template>
            </Dialog>

            <Toast />
            <ConfirmDialog />
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
