<template>
    <div class="grid">
        <div class="col-12">
            <div class="card">
                <div class="flex justify-content-between align-items-center mb-4">
                    <div>
                        <h5 class="m-0">{{ translate('root.gyms.title') }}</h5>
                        <p class="text-600 m-0">{{ translate('root.gyms.subtitle') }}</p>
                    </div>
                    <Button
                        :label="translate('root.gyms.newGym')"
                        icon="pi pi-plus"
                        @click="openNewDialog"
                        :disabled="loading"
                    />
                </div>

                <div v-if="loading" class="text-center py-4">
                    <ProgressSpinner />
                </div>

                <DataTable v-else :value="gyms" paginator :rows="10" responsiveLayout="scroll">
                    <Column field="name" :header="translate('root.gyms.gymName')" sortable></Column>
                    <Column field="gymCode" :header="translate('root.gyms.gymCode')" sortable></Column>
                    <Column field="owner" :header="translate('root.gyms.owner')">
                        <template #body="{ data }">
                            {{ data.owner ? `${data.owner.firstName} ${data.owner.lastName}` : 'No Owner' }}
                        </template>
                    </Column>
                    <Column field="contact.email" :header="translate('root.gyms.email')" sortable></Column>
                    <Column field="isActive" :header="translate('root.gyms.status')">
                        <template #body="{ data }">
                            <Tag :value="data.isActive ? translate('root.gyms.active') : translate('root.gyms.inactive')"
                                 :severity="data.isActive ? 'success' : 'danger'" />
                        </template>
                    </Column>
                    <Column :header="translate('root.gyms.actions')">
                        <template #body="{ data }">
                            <div class="flex gap-2">
                                <Button
                                    icon="pi pi-pencil"
                                    size="small"
                                    severity="secondary"
                                    @click="openEditDialog(data)"
                                    :disabled="loading"
                                />
                                <Button
                                    icon="pi pi-trash"
                                    size="small"
                                    severity="danger"
                                    @click="confirmDelete(data)"
                                    :disabled="loading"
                                />
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog
        v-model:visible="showDialog"
        :header="editMode ? translate('root.gyms.editGym') : translate('root.gyms.newGym')"
        :modal="true"
        :closable="!isSubmitting"
        :draggable="false"
        :resizable="false"
        class="p-fluid"
        style="width: 700px"
    >
        <div class="gym-form">
            <!-- Basic Information -->
            <div class="mb-4">
                <h6 class="mb-3">Basic Information</h6>
                <div class="grid">
                    <div class="col-12 md:col-6">
                        <div class="field">
                            <label for="gymName" class="font-semibold">{{ translate('root.gyms.gymName') }} *</label>
                            <InputText
                                id="gymName"
                                v-model="formData.name"
                                :placeholder="translate('root.gyms.gymName')"
                                class="w-full"
                                :class="{ 'p-invalid': formErrors.name }"
                            />
                        </div>
                    </div>
                    <div class="col-12 md:col-6">
                        <div class="field">
                            <label for="gymCode" class="font-semibold">{{ translate('root.gyms.gymCode') }}</label>
                            <InputText
                                id="gymCode"
                                v-model="formData.gymCode"
                                placeholder="Auto-generated if empty"
                                class="w-full"
                                maxlength="6"
                            />
                            <small class="text-600">6-character alphanumeric code (auto-generated if empty)</small>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="field">
                            <label for="description" class="font-semibold">Description</label>
                            <Textarea
                                id="description"
                                v-model="formData.description"
                                rows="3"
                                class="w-full"
                                placeholder="Brief description of the gym..."
                            />
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="field">
                            <label for="owner" class="font-semibold">{{ translate('root.gyms.owner') }} *</label>
                            <Select
                                id="owner"
                                v-model="formData.ownerId"
                                :options="owners"
                                optionLabel="displayName"
                                optionValue="_id"
                                :placeholder="translate('root.gyms.selectOwner')"
                                class="w-full"
                                :class="{ 'p-invalid': formErrors.ownerId }"
                                :loading="loadingOwners"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Billing Address -->
            <div class="mb-4">
                <AddressEditor
                    v-model="formData.billingAddress"
                    field-id="billing-address"
                    :label="translate('root.gyms.billingAddress')"
                    :street-placeholder="translate('root.gyms.street')"
                    :city-placeholder="translate('root.gyms.city')"
                    :state-placeholder="translate('root.gyms.state')"
                    :zip-code-placeholder="translate('root.gyms.zipCode')"
                    :errors="formErrors"
                />
            </div>

            <!-- Contact Information -->
            <div class="mb-4">
                <h6 class="mb-3">{{ translate('root.gyms.contactInfo') }}</h6>
                <div class="grid">
                    <div class="col-12 md:col-6">
                        <div class="field">
                            <label for="contactEmail" class="font-semibold">{{ translate('root.gyms.email') }} *</label>
                            <InputText
                                id="contactEmail"
                                v-model="formData.contact.email"
                                type="email"
                                class="w-full"
                                :class="{ 'p-invalid': formErrors.email }"
                            />
                        </div>
                    </div>
                    <div class="col-12 md:col-6">
                        <div class="field">
                            <label for="contactPhone" class="font-semibold">{{ translate('root.gyms.phone') }}</label>
                            <InputText
                                id="contactPhone"
                                v-model="formData.contact.phone"
                                type="tel"
                                class="w-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-content-between w-full">
                <Button
                    :label="translate('root.gyms.cancel')"
                    icon="pi pi-times"
                    severity="secondary"
                    :disabled="isSubmitting"
                    @click="closeDialog"
                />
                <Button
                    :label="translate('root.gyms.save')"
                    icon="pi pi-check"
                    :loading="isSubmitting"
                    :disabled="isSubmitting"
                    @click="handleSubmit"
                />
            </div>
        </template>
    </Dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { translate } from '@/i18n/i18n';
import { GymService } from '@/service/GymService';
import AddressEditor from '@/components/AddressEditor.vue';

const toast = useToast();
const confirm = useConfirm();

// Reactive state
const loading = ref(true);
const loadingOwners = ref(false);
const isSubmitting = ref(false);
const showDialog = ref(false);
const editMode = ref(false);
const gyms = ref([]);
const owners = ref([]);
const selectedGym = ref(null);

// Form data
const formData = ref({
    name: '',
    description: '',
    gymCode: '',
    ownerId: '',
    billingAddress: {
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
    isActive: true
});

// Form validation errors
const formErrors = ref({});

/**
 * Load all gyms
 */
const loadGyms = async () => {
    loading.value = true;

    try {
        console.log('GymsManagement: Loading gyms');
        const result = await GymService.getAllGyms();
        gyms.value = result;
        console.log('GymsManagement: Gyms loaded', result);
    } catch (error) {
        console.error('GymsManagement: Error loading gyms', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: translate('root.gyms.error.loadFailed'),
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

/**
 * Load owners for selection
 */
const loadOwners = async () => {
    loadingOwners.value = true;

    try {
        console.log('GymsManagement: Loading owners');
        const result = await GymService.getOwners();

        // Format for dropdown display
        owners.value = result.map(owner => ({
            ...owner,
            displayName: `${owner.firstName} ${owner.lastName} (${owner.email})`
        }));

        console.log('GymsManagement: Owners loaded', owners.value);
    } catch (error) {
        console.error('GymsManagement: Error loading owners', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: translate('root.gyms.error.loadOwnersFailed'),
            life: 5000
        });
    } finally {
        loadingOwners.value = false;
    }
};

/**
 * Open new gym dialog
 */
const openNewDialog = () => {
    editMode.value = false;
    selectedGym.value = null;
    resetForm();
    showDialog.value = true;
    loadOwners();
};

/**
 * Open edit gym dialog
 */
const openEditDialog = (gym) => {
    editMode.value = true;
    selectedGym.value = gym;
    formData.value = {
        name: gym.name,
        description: gym.description || '',
        gymCode: gym.gymCode,
        ownerId: gym.ownerId,
        billingAddress: { ...gym.billingAddress },
        contact: { ...gym.contact },
        isActive: gym.isActive
    };
    showDialog.value = true;
    loadOwners();
};

/**
 * Reset form
 */
const resetForm = () => {
    formData.value = {
        name: '',
        description: '',
        gymCode: '',
        ownerId: '',
        billingAddress: {
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
        isActive: true
    };
    formErrors.value = {};
};

/**
 * Close dialog
 */
const closeDialog = () => {
    showDialog.value = false;
    resetForm();
};

/**
 * Validate form
 */
const validateForm = () => {
    const errors = {};

    if (!formData.value.name.trim()) {
        errors.name = true;
    }
    if (!formData.value.ownerId) {
        errors.ownerId = true;
    }
    if (!formData.value.contact.email.trim()) {
        errors.email = true;
    }
    if (!formData.value.billingAddress.street.trim()) {
        errors.street = true;
    }
    if (!formData.value.billingAddress.city.trim()) {
        errors.city = true;
    }
    if (!formData.value.billingAddress.state.trim()) {
        errors.state = true;
    }
    if (!formData.value.billingAddress.zipCode.trim()) {
        errors.zipCode = true;
    }

    formErrors.value = errors;
    return Object.keys(errors).length === 0;
};

/**
 * Handle form submission
 */
const handleSubmit = async () => {
    if (!validateForm()) {
        toast.add({
            severity: 'warn',
            summary: 'Validation Error',
            detail: translate('root.gyms.validation.validationError'),
            life: 5000
        });
        return;
    }

    isSubmitting.value = true;

    try {
        console.log('GymsManagement: Submitting gym', formData.value);

        let result;
        if (editMode.value && selectedGym.value) {
            result = await GymService.updateGym(selectedGym.value._id, formData.value);
        } else {
            result = await GymService.createGym(formData.value);
        }

        if (result.responseCode === 200 || result.responseCode === 201) {
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: editMode.value ? translate('root.gyms.success.updated') : translate('root.gyms.success.created'),
                life: 3000
            });

            closeDialog();
            await loadGyms();
        }
    } catch (error) {
        console.error('GymsManagement: Error submitting gym', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: editMode.value ? translate('root.gyms.error.updateFailed') : translate('root.gyms.error.createFailed'),
            life: 5000
        });
    } finally {
        isSubmitting.value = false;
    }
};

/**
 * Confirm delete gym
 */
const confirmDelete = (gym) => {
    confirm.require({
        message: translate('root.gyms.deleteMessage', { name: gym.name }),
        header: translate('root.gyms.deleteConfirmation'),
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: translate('root.gyms.cancel'),
        acceptLabel: translate('root.gyms.delete'),
        accept: () => deleteGym(gym)
    });
};

/**
 * Delete gym
 */
const deleteGym = async (gym) => {
    loading.value = true;

    try {
        await GymService.deleteGym(gym._id);

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: translate('root.gyms.success.deleted'),
            life: 3000
        });

        await loadGyms();
    } catch (error) {
        console.error('GymsManagement: Error deleting gym', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: translate('root.gyms.error.deleteFailed'),
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadGyms();
});
</script>

<style scoped>
.gym-form {
    min-height: 400px;
}

.field {
    margin-bottom: 1rem;
}

.field label {
    display: block;
    margin-bottom: 0.5rem;
}
</style>
