<script setup lang="ts">
import { ClassService } from '@/service/ClassService';
import type { IClass } from '@/server/db/class';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Chips from 'primevue/chips';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import ProgressSpinner from 'primevue/progressspinner';
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();

const classes = ref<IClass[]>([]);
const loading = ref(false);
const showDialog = ref(false);
const editMode = ref(false);
const selectedClass = ref<IClass | null>(null);

const formData = ref({
    name: '',
    description: '',
    duration: 60, // Default 60 minutes
    maxMembers: null as number | null,
    category: '',
    equipment: [] as string[]
});

async function loadClasses() {
    loading.value = true;
    try {
        const result = await ClassService.getMyClasses();
        if (result) {
            classes.value = result;
            console.log(`Loaded ${result.length} classes`);
        } else {
            classes.value = [];
        }
    } catch (error) {
        console.error('Error loading classes:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('classes.error.loadFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function openNewDialog() {
    editMode.value = false;
    selectedClass.value = null;
    resetForm();
    showDialog.value = true;
}

function openEditDialog(classItem: IClass) {
    editMode.value = true;
    selectedClass.value = classItem;
    formData.value = {
        name: classItem.name,
        description: classItem.description || '',
        duration: classItem.duration,
        maxMembers: classItem.maxMembers || null,
        category: classItem.category || '',
        equipment: classItem.equipment ? [...classItem.equipment] : []
    };
    showDialog.value = true;
}

function resetForm() {
    formData.value = {
        name: '',
        description: '',
        duration: 60,
        maxMembers: null,
        category: '',
        equipment: []
    };
}

function validateForm(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.value.name.trim()) {
        errors.push(t('classes.validation.nameRequired'));
    }

    if (formData.value.duration <= 0) {
        errors.push(t('classes.validation.durationRequired'));
    }

    if (formData.value.maxMembers !== null && formData.value.maxMembers <= 0) {
        errors.push(t('classes.validation.maxMembersInvalid'));
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
            summary: t('classes.validation.validationError'),
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
            // Convert empty strings to undefined for optional fields
            description: formData.value.description.trim() || undefined,
            category: formData.value.category.trim() || undefined,
            maxMembers: formData.value.maxMembers || undefined,
            equipment: formData.value.equipment.length > 0 ? formData.value.equipment : undefined
        };

        if (editMode.value && selectedClass.value) {
            result = await ClassService.updateClass((selectedClass.value as any)._id, submitData);
        } else {
            result = await ClassService.createClass(submitData);
        }

        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: editMode.value ? t('classes.success.updated') : t('classes.success.created'),
                life: 3000
            });
            showDialog.value = false;
            await loadClasses();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: editMode.value ? t('classes.error.updateFailed') : t('classes.error.createFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error submitting class:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: editMode.value ? t('classes.error.updateFailed') : t('classes.error.createFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function confirmDelete(classItem: IClass) {
    confirm.require({
        message: t('classes.deleteMessage', { name: classItem.name }),
        header: t('classes.deleteConfirmation'),
        icon: 'pi pi-info-circle',
        rejectLabel: t('classes.cancel'),
        rejectProps: {
            label: t('classes.cancel'),
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: t('classes.delete'),
            severity: 'danger'
        },
        accept: () => {
            deleteClass(classItem);
        }
    });
}

async function deleteClass(classItem: IClass) {
    loading.value = true;
    try {
        const result = await ClassService.deleteClass((classItem as any)._id);
        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: t('classes.success.deleted'),
                life: 3000
            });
            await loadClasses();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: t('classes.error.deleteFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error deleting class:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('classes.error.deleteFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} ${t('classes.minutes')}`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `${hours}${t('classes.hours')}`;
        } else {
            return `${hours}${t('classes.hours')} ${remainingMinutes}${t('classes.minutes')}`;
        }
    }
}

function formatEquipment(equipment: string[] | undefined): string {
    if (!equipment || equipment.length === 0) {
        return t('classes.none');
    }
    return equipment.join(', ');
}

onMounted(() => {
    loadClasses();
});
</script>

<template>
    <Fluid>
        <div class="flex progresscontainer">
            <div v-if="loading" class="spinner-overlay progressoverlay">
                <ProgressSpinner aria-label="Loading" />
            </div>

            <Card class="card-style">
                <template #title>{{ t('classes.title') }}</template>
                <template #subtitle>{{ t('classes.subtitle') }}</template>
                <template #content>
                    <div class="flex justify-content-end mb-3">
                        <Button icon="pi pi-plus" :label="t('classes.newClass')" @click="openNewDialog" />
                    </div>

                    <DataTable :value="classes" paginator :rows="10" responsiveLayout="scroll">
                        <Column field="name" :header="t('classes.className')" sortable></Column>
                        <Column field="category" :header="t('classes.category')" sortable>
                            <template #body="{ data }">
                                {{ data.category || t('classes.general') }}
                            </template>
                        </Column>
                        <Column field="duration" :header="t('classes.duration')">
                            <template #body="{ data }">
                                {{ formatDuration(data.duration) }}
                            </template>
                        </Column>
                        <Column field="maxMembers" :header="t('classes.maxMembers')">
                            <template #body="{ data }">
                                {{ data.maxMembers || t('classes.unlimited') }}
                            </template>
                        </Column>
                        <Column field="equipment" :header="t('classes.equipment')">
                            <template #body="{ data }">
                                {{ formatEquipment(data.equipment) }}
                            </template>
                        </Column>
                        <Column :header="t('classes.actions')">
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
                :header="editMode ? t('classes.editClass') : t('classes.newClass')"
                :pt="{ root: { class: 'w-[90vw] md:w-[70vw] lg:w-[50vw]' } }"
            >
                <form @submit.prevent="handleSubmit" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Basic Information -->
                    <div class="col-span-full">
                        <h4 class="text-lg font-semibold mb-2">{{ t('classes.basicInfo') }}</h4>
                    </div>

                    <div class="field">
                        <label for="className" class="font-medium">{{ t('classes.className') }} *</label>
                        <InputText id="className" v-model="formData.name" required class="w-full" />
                    </div>

                    <div class="field">
                        <label for="category" class="font-medium">{{ t('classes.category') }}</label>
                        <InputText
                            id="category"
                            v-model="formData.category"
                            class="w-full"
                            :placeholder="t('classes.categoryPlaceholder')"
                        />
                    </div>

                    <div class="field col-span-full">
                        <label for="description" class="font-medium">{{ t('classes.description') }}</label>
                        <Textarea
                            id="description"
                            v-model="formData.description"
                            rows="3"
                            class="w-full"
                            :placeholder="t('classes.descriptionPlaceholder')"
                        />
                    </div>

                    <!-- Class Details -->
                    <div class="col-span-full">
                        <h4 class="text-lg font-semibold mb-2">{{ t('classes.classDetails') }}</h4>
                    </div>

                    <div class="field">
                        <label for="duration" class="font-medium">{{ t('classes.duration') }} *</label>
                        <InputNumber
                            id="duration"
                            v-model="formData.duration"
                            :min="1"
                            :max="300"
                            required
                            class="w-full"
                        />
                    </div>

                    <div class="field">
                        <label for="maxMembers" class="font-medium">{{ t('classes.maxMembers') }}</label>
                        <InputNumber
                            id="maxMembers"
                            v-model="formData.maxMembers"
                            :min="1"
                            :max="100"
                            class="w-full"
                            :placeholder="t('classes.maxMembersPlaceholder')"
                        />
                    </div>

                    <div class="field col-span-full">
                        <label for="equipment" class="font-medium">{{ t('classes.equipment') }}</label>
                        <Chips
                            id="equipment"
                            v-model="formData.equipment"
                            class="w-full"
                            placeholder="Type equipment name and press Enter"
                        />
                        <small class="text-gray-500">{{ t('classes.equipmentHelp') }}</small>
                    </div>
                </form>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button :label="t('classes.cancel')" severity="secondary" @click="showDialog = false" />
                        <Button :label="t('classes.save')" type="submit" @click="handleSubmit" />
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
