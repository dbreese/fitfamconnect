<script setup lang="ts">
import { LocationService } from '@/service/LocationService';
import type { ILocation } from '@/server/db/location';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import ProgressSpinner from 'primevue/progressspinner';
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';

const toast = useToast();
const confirm = useConfirm();
const { t } = useI18n();

const locations = ref<ILocation[]>([]);
const loading = ref(false);
const showDialog = ref(false);
const editMode = ref(false);
const selectedLocation = ref<ILocation | null>(null);

const formData = ref({
    name: '',
    description: '',
    address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US'
    },
    contact: {
        email: '',
        phone: ''
    },
    operatingHours: [
        { dayOfWeek: 0, openTime: '09:00', closeTime: '17:00', isClosed: false },
        { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: false },
        { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', isClosed: false },
        { dayOfWeek: 3, openTime: '09:00', closeTime: '17:00', isClosed: false },
        { dayOfWeek: 4, openTime: '09:00', closeTime: '17:00', isClosed: false },
        { dayOfWeek: 5, openTime: '09:00', closeTime: '17:00', isClosed: false },
        { dayOfWeek: 6, openTime: '09:00', closeTime: '17:00', isClosed: true }
    ]
});

const dayNames = [
    t('locations.days.sunday'),
    t('locations.days.monday'),
    t('locations.days.tuesday'),
    t('locations.days.wednesday'),
    t('locations.days.thursday'),
    t('locations.days.friday'),
    t('locations.days.saturday')
];

const stateOptions = [
    { label: 'Alabama', value: 'AL' },
    { label: 'Alaska', value: 'AK' },
    { label: 'Arizona', value: 'AZ' },
    { label: 'Arkansas', value: 'AR' },
    { label: 'California', value: 'CA' },
    { label: 'Colorado', value: 'CO' },
    { label: 'Connecticut', value: 'CT' },
    { label: 'Delaware', value: 'DE' },
    { label: 'Florida', value: 'FL' },
    { label: 'Georgia', value: 'GA' },
    { label: 'Hawaii', value: 'HI' },
    { label: 'Idaho', value: 'ID' },
    { label: 'Illinois', value: 'IL' },
    { label: 'Indiana', value: 'IN' },
    { label: 'Iowa', value: 'IA' },
    { label: 'Kansas', value: 'KS' },
    { label: 'Kentucky', value: 'KY' },
    { label: 'Louisiana', value: 'LA' },
    { label: 'Maine', value: 'ME' },
    { label: 'Maryland', value: 'MD' },
    { label: 'Massachusetts', value: 'MA' },
    { label: 'Michigan', value: 'MI' },
    { label: 'Minnesota', value: 'MN' },
    { label: 'Mississippi', value: 'MS' },
    { label: 'Missouri', value: 'MO' },
    { label: 'Montana', value: 'MT' },
    { label: 'Nebraska', value: 'NE' },
    { label: 'Nevada', value: 'NV' },
    { label: 'New Hampshire', value: 'NH' },
    { label: 'New Jersey', value: 'NJ' },
    { label: 'New Mexico', value: 'NM' },
    { label: 'New York', value: 'NY' },
    { label: 'North Carolina', value: 'NC' },
    { label: 'North Dakota', value: 'ND' },
    { label: 'Ohio', value: 'OH' },
    { label: 'Oklahoma', value: 'OK' },
    { label: 'Oregon', value: 'OR' },
    { label: 'Pennsylvania', value: 'PA' },
    { label: 'Rhode Island', value: 'RI' },
    { label: 'South Carolina', value: 'SC' },
    { label: 'South Dakota', value: 'SD' },
    { label: 'Tennessee', value: 'TN' },
    { label: 'Texas', value: 'TX' },
    { label: 'Utah', value: 'UT' },
    { label: 'Vermont', value: 'VT' },
    { label: 'Virginia', value: 'VA' },
    { label: 'Washington', value: 'WA' },
    { label: 'West Virginia', value: 'WV' },
    { label: 'Wisconsin', value: 'WI' },
    { label: 'Wyoming', value: 'WY' }
];

async function loadLocations() {
    loading.value = true;
    try {
        const result = await LocationService.getAll();
        if (result) {
            locations.value = result;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: t('locations.error.title'),
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
        address: { ...location.address },
        contact: {
            email: location.contact.email || '',
            phone: location.contact.phone || ''
        },
        operatingHours: location.operatingHours.map((oh) => ({ ...oh }))
    };
    showDialog.value = true;
}

function resetForm() {
    formData.value = {
        name: '',
        description: '',
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'US'
        },
        contact: {
            email: '',
            phone: ''
        },
        operatingHours: [
            { dayOfWeek: 0, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { dayOfWeek: 3, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { dayOfWeek: 4, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { dayOfWeek: 5, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { dayOfWeek: 6, openTime: '09:00', closeTime: '17:00', isClosed: true }
        ]
    };
}

function validateForm(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required field validation
    if (!formData.value.name.trim()) {
        errors.push(t('locations.validation.nameRequired'));
    }

    if (!formData.value.address.street.trim()) {
        errors.push(t('locations.validation.streetRequired'));
    }

    if (!formData.value.address.city.trim()) {
        errors.push(t('locations.validation.cityRequired'));
    }

    if (!formData.value.address.state.trim()) {
        errors.push(t('locations.validation.stateRequired'));
    }

    if (!formData.value.address.zipCode.trim()) {
        errors.push(t('locations.validation.zipCodeRequired'));
    }

    if (!formData.value.address.country.trim()) {
        errors.push(t('locations.validation.countryRequired'));
    }

    // Operating hours validation - ensure at least one day is open
    const hasOpenDays = formData.value.operatingHours.some((hours) => !hours.isClosed);
    if (!hasOpenDays) {
        errors.push(t('locations.validation.atLeastOneDay'));
    }

    // Time validation for open days
    for (const hours of formData.value.operatingHours) {
        if (!hours.isClosed) {
            if (!hours.openTime || !hours.closeTime) {
                errors.push(t('locations.validation.timesRequired', { day: dayNames[hours.dayOfWeek] }));
            } else if (hours.openTime >= hours.closeTime) {
                errors.push(t('locations.validation.closeAfterOpen', { day: dayNames[hours.dayOfWeek] }));
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
            detail: validation.errors[0], // Show first error
            life: 5000
        });
        return;
    }

    loading.value = true;
    try {
        let result;
        if (editMode.value && selectedLocation.value) {
            result = await LocationService.update((selectedLocation.value as any)._id, formData.value);
        } else {
            result = await LocationService.create(formData.value);
        }

        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('locations.success.title'),
                detail: editMode.value ? t('locations.success.updated') : t('locations.success.created'),
                life: 3000
            });
            showDialog.value = false;
            await loadLocations();
        } else {
            toast.add({
                severity: 'error',
                summary: t('locations.error.title'),
                detail: editMode.value ? t('locations.error.updateFailed') : t('locations.error.createFailed'),
                life: 3000
            });
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: t('locations.error.title'),
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
        const result = await LocationService.delete((location as any)._id);
        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('locations.success.title'),
                detail: t('locations.success.deleted'),
                life: 3000
            });
            await loadLocations();
        } else {
            toast.add({
                severity: 'error',
                summary: t('locations.error.title'),
                detail: t('locations.error.deleteFailed'),
                life: 3000
            });
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: t('locations.error.title'),
            detail: t('locations.error.deleteFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function formatOperatingHours(operatingHours: any[]) {
    const openDays = operatingHours.filter((oh) => !oh.isClosed);
    if (openDays.length === 0) return t('locations.closed');
    if (openDays.length === 7) return t('locations.openDaily');
    return t('locations.daysPerWeek', { count: openDays.length });
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
                        <Column field="name" :header="t('locations.name')" sortable></Column>
                        <Column field="address" :header="t('locations.address')" sortable>
                            <template #body="{ data }">
                                {{ data.address.street }}, {{ data.address.city }}, {{ data.address.state }}
                            </template>
                        </Column>
                        <Column field="contact" :header="t('locations.contact')">
                            <template #body="{ data }">
                                <div class="text-sm">
                                    <div v-if="data.contact.email">{{ data.contact.email }}</div>
                                    <div v-if="data.contact.phone">{{ data.contact.phone }}</div>
                                </div>
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
                :pt="{ root: { class: 'w-[90vw] md:w-[70vw] lg:w-[50vw]' } }"
            >
                <form @submit.prevent="handleSubmit" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Basic Information -->
                    <div class="col-span-full">
                        <h4 class="text-lg font-semibold mb-2">{{ t('locations.basicInformation') }}</h4>
                    </div>

                    <div class="field">
                        <label for="name" class="font-medium">{{ t('locations.nameRequired') }}</label>
                        <InputText id="name" v-model="formData.name" required class="w-full" />
                    </div>

                    <div class="field col-span-full">
                        <label for="description" class="font-medium">{{ t('locations.description') }}</label>
                        <Textarea id="description" v-model="formData.description" rows="3" class="w-full" />
                    </div>

                    <!-- Address -->
                    <div class="col-span-full">
                        <h4 class="text-lg font-semibold mb-2">{{ t('locations.addressTitle') }}</h4>
                    </div>

                    <div class="field col-span-full">
                        <label for="street" class="font-medium">{{ t('locations.streetRequired') }}</label>
                        <InputText id="street" v-model="formData.address.street" required class="w-full" />
                    </div>

                    <div class="field">
                        <label for="city" class="font-medium">{{ t('locations.cityRequired') }}</label>
                        <InputText id="city" v-model="formData.address.city" required class="w-full" />
                    </div>

                    <div class="field">
                        <label for="state" class="font-medium">{{ t('locations.stateRequired') }}</label>
                        <Select
                            id="state"
                            v-model="formData.address.state"
                            :options="stateOptions"
                            optionLabel="label"
                            optionValue="value"
                            :placeholder="t('locations.selectState')"
                            class="w-full"
                            required
                        />
                    </div>

                    <div class="field">
                        <label for="zipCode" class="font-medium">{{ t('locations.zipCodeRequired') }}</label>
                        <InputText id="zipCode" v-model="formData.address.zipCode" required class="w-full" />
                    </div>

                    <div class="field">
                        <label for="country" class="font-medium">{{ t('locations.country') }}</label>
                        <InputText id="country" v-model="formData.address.country" class="w-full" />
                    </div>

                    <!-- Contact Information -->
                    <div class="col-span-full">
                        <h4 class="text-lg font-semibold mb-2">{{ t('locations.contactInformation') }}</h4>
                    </div>

                    <div class="field">
                        <label for="email" class="font-medium">{{ t('locations.email') }}</label>
                        <InputText id="email" v-model="formData.contact.email" type="email" class="w-full" />
                    </div>

                    <div class="field">
                        <label for="phone" class="font-medium">{{ t('locations.phone') }}</label>
                        <InputText id="phone" v-model="formData.contact.phone" class="w-full" />
                    </div>

                    <!-- Operating Hours -->
                    <div class="col-span-full">
                        <h4 class="text-lg font-semibold mb-2">{{ t('locations.operatingHours') }}</h4>
                        <div class="space-y-2">
                            <div
                                v-for="(hours, index) in formData.operatingHours"
                                :key="hours.dayOfWeek"
                                class="flex items-center gap-4 p-2 border rounded"
                            >
                                <div class="w-20 font-medium">{{ dayNames[hours.dayOfWeek] }}</div>
                                <Checkbox v-model="hours.isClosed" binary />
                                <label class="mr-2">{{ t('locations.closed') }}</label>
                                <div v-if="!hours.isClosed" class="flex items-center gap-2">
                                    <InputText v-model="hours.openTime" type="time" class="w-24" />
                                    <span>{{ t('locations.to') }}</span>
                                    <InputText v-model="hours.closeTime" type="time" class="w-24" />
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

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
</style>
