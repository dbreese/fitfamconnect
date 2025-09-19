<script setup lang="ts">
import { PlanService } from '@/service/PlanService';
import type { IPlan } from '@/server/db/plan';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import Calendar from 'primevue/calendar';
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

const plans = ref<IPlan[]>([]);
const loading = ref(false);
const showDialog = ref(false);
const editMode = ref(false);
const selectedPlan = ref<IPlan | null>(null);

const formData = ref({
    name: '',
    description: '',
    price: 0, // In dollars (converted to cents for API)
    currency: 'USD',
    startDateTime: new Date(),
    endDateTime: null as Date | null,
    recurringPeriod: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'yearly'
});

const currencyOptions = [
    { label: 'USD - US Dollar', value: 'USD' },
    { label: 'CAD - Canadian Dollar', value: 'CAD' },
    { label: 'EUR - Euro', value: 'EUR' },
    { label: 'GBP - British Pound', value: 'GBP' }
];

const recurringPeriodOptions = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Yearly', value: 'yearly' }
];

async function loadPlans() {
    loading.value = true;
    try {
        const result = await PlanService.getMyPlans();
        if (result) {
            plans.value = result;
            console.log(`Loaded ${result.length} plans`);
        } else {
            plans.value = [];
        }
    } catch (error) {
        console.error('Error loading plans:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('plans.error.loadFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function openNewDialog() {
    editMode.value = false;
    selectedPlan.value = null;
    resetForm();
    showDialog.value = true;
}

function openEditDialog(plan: IPlan) {
    editMode.value = true;
    selectedPlan.value = plan;
    formData.value = {
        name: plan.name,
        description: plan.description || '',
        price: plan.price / 100, // Convert cents to dollars for display
        currency: plan.currency,
        startDateTime: new Date(plan.startDateTime),
        endDateTime: plan.endDateTime ? new Date(plan.endDateTime) : null,
        recurringPeriod: plan.recurringPeriod || 'monthly'
    };
    showDialog.value = true;
}

function resetForm() {
    formData.value = {
        name: '',
        description: '',
        price: 0,
        currency: 'USD',
        startDateTime: new Date(),
        endDateTime: null,
        recurringPeriod: 'monthly'
    };
}

function validateForm(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.value.name.trim()) {
        errors.push(t('plans.validation.nameRequired'));
    }

    if (formData.value.price < 0) {
        errors.push(t('plans.validation.priceRequired'));
    }

    if (!formData.value.startDateTime) {
        errors.push(t('plans.validation.startDateRequired'));
    }

    // End date must be after start date if provided
    if (formData.value.endDateTime && formData.value.startDateTime >= formData.value.endDateTime) {
        errors.push(t('plans.validation.endAfterStart'));
    }

    // Recurring period is required
    if (!formData.value.recurringPeriod) {
        errors.push(t('plans.validation.periodRequired'));
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
            summary: t('plans.validation.validationError'),
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
            price: Math.round(formData.value.price * 100), // Convert dollars to cents
            description: formData.value.description.trim() || undefined,
            endDateTime: formData.value.endDateTime || undefined
        };

        if (editMode.value && selectedPlan.value) {
            result = await PlanService.updatePlan((selectedPlan.value as any)._id, submitData);
        } else {
            result = await PlanService.createPlan(submitData);
        }

        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: editMode.value ? t('plans.success.updated') : t('plans.success.created'),
                life: 3000
            });
            showDialog.value = false;
            await loadPlans();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: editMode.value ? t('plans.error.updateFailed') : t('plans.error.createFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error submitting plan:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: editMode.value ? t('plans.error.updateFailed') : t('plans.error.createFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function confirmDelete(plan: IPlan) {
    confirm.require({
        message: t('plans.deleteMessage', { name: plan.name }),
        header: t('plans.deleteConfirmation'),
        icon: 'pi pi-info-circle',
        rejectLabel: t('plans.cancel'),
        rejectProps: {
            label: t('plans.cancel'),
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: t('plans.delete'),
            severity: 'danger'
        },
        accept: () => {
            deletePlan(plan);
        }
    });
}

async function deletePlan(plan: IPlan) {
    loading.value = true;
    try {
        const result = await PlanService.deletePlan((plan as any)._id);
        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: t('plans.success.deleted'),
                life: 3000
            });
            await loadPlans();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: t('plans.error.deleteFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error deleting plan:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('plans.error.deleteFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function formatPrice(priceInCents: number, currency: string): string {
    const price = (priceInCents / 100).toFixed(2);
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${price}`;
}

function getCurrencySymbol(currency: string): string {
    switch (currency) {
        case 'USD':
        case 'CAD':
            return '$';
        case 'EUR':
            return '€';
        case 'GBP':
            return '£';
        default:
            return '$';
    }
}

function formatPlanType(plan: IPlan): string {
    const period = plan.recurringPeriod?.toLowerCase();
    switch (period) {
        case 'weekly':
            return t('plans.periods.weekly');
        case 'monthly':
            return t('plans.periods.monthly');
        case 'quarterly':
            return t('plans.periods.quarterly');
        case 'yearly':
            return t('plans.periods.yearly');
        default:
            return plan.recurringPeriod || '';
    }
}

function formatDateRange(plan: IPlan): string {
    const startDate = new Date(plan.startDateTime).toLocaleDateString();
    if (plan.endDateTime) {
        const endDate = new Date(plan.endDateTime).toLocaleDateString();
        return `${startDate} - ${endDate}`;
    }
    return startDate;
}

onMounted(() => {
    loadPlans();
});
</script>

<template>
    <Fluid>
        <div class="flex progresscontainer">
            <div v-if="loading" class="spinner-overlay progressoverlay">
                <ProgressSpinner aria-label="Loading" />
            </div>

            <Card class="card-style">
                <template #title>{{ t('plans.title') }}</template>
                <template #subtitle>{{ t('plans.subtitle') }}</template>
                <template #content>
                    <div class="flex justify-content-end mb-3">
                        <Button icon="pi pi-plus" :label="t('plans.newPlan')" @click="openNewDialog" />
                    </div>

                    <DataTable :value="plans" paginator :rows="10" responsiveLayout="scroll">
                        <Column field="name" :header="t('plans.planName')" sortable></Column>
                        <Column field="price" :header="t('plans.price')" sortable>
                            <template #body="{ data }">
                                {{ formatPrice(data.price, data.currency) }}
                            </template>
                        </Column>
                        <Column field="type" :header="t('plans.type')">
                            <template #body="{ data }">
                                {{ formatPlanType(data) }}
                            </template>
                        </Column>
                        <Column field="dateRange" :header="t('plans.dateRange')">
                            <template #body="{ data }">
                                {{ formatDateRange(data) }}
                            </template>
                        </Column>
                        <Column :header="t('plans.actions')">
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
                :header="editMode ? t('plans.editPlan') : t('plans.newPlan')"
                :pt="{ root: { class: 'w-[90vw] md:w-[70vw] lg:w-[50vw]' } }"
            >
                <form @submit.prevent="handleSubmit" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Basic Information -->
                    <div class="col-span-full">
                        <h4 class="text-lg font-semibold mb-2">{{ t('plans.basicInfo') }}</h4>
                    </div>

                    <div class="field">
                        <label for="planName" class="font-medium">{{ t('plans.planName') }} *</label>
                        <InputText id="planName" v-model="formData.name" required class="w-full" />
                    </div>

                    <div class="field">
                        <label for="currency" class="font-medium">{{ t('plans.currency') }}</label>
                        <Select
                            id="currency"
                            v-model="formData.currency"
                            :options="currencyOptions"
                            optionLabel="label"
                            optionValue="value"
                            class="w-full"
                        />
                    </div>

                    <div class="field col-span-full">
                        <label for="description" class="font-medium">{{ t('plans.description') }}</label>
                        <Textarea
                            id="description"
                            v-model="formData.description"
                            rows="3"
                            class="w-full"
                            :placeholder="t('plans.descriptionPlaceholder')"
                        />
                    </div>

                    <!-- Pricing -->
                    <div class="col-span-full">
                        <h4 class="text-lg font-semibold mb-2">{{ t('plans.pricing') }}</h4>
                    </div>

                    <div class="field">
                        <label for="price" class="font-medium">{{ t('plans.priceLabel') }} *</label>
                        <div class="flex">
                            <span class="flex items-center px-3 border border-r-0 bg-gray-50 rounded-l">
                                {{ getCurrencySymbol(formData.currency) }}
                            </span>
                            <InputNumber
                                id="price"
                                v-model="formData.price"
                                mode="decimal"
                                :minFractionDigits="2"
                                :maxFractionDigits="2"
                                :min="0"
                                :step="0.01"
                                required
                                class="flex-1"
                                inputClass="rounded-l-none border-l-0"
                            />
                        </div>
                        <small class="text-gray-500">{{ t('plans.priceHelp') }}</small>
                    </div>

                    <div class="field">
                        <label for="recurringPeriod" class="font-medium">{{ t('plans.recurringPeriod') }} *</label>
                        <Select
                            id="recurringPeriod"
                            v-model="formData.recurringPeriod"
                            :options="recurringPeriodOptions"
                            optionLabel="label"
                            optionValue="value"
                            class="w-full"
                            required
                        />
                    </div>

                    <!-- Schedule -->
                    <div class="col-span-full">
                        <h4 class="text-lg font-semibold mb-2">{{ t('plans.schedule') }}</h4>
                    </div>

                    <div class="field">
                        <label for="startDate" class="font-medium">{{ t('plans.startDate') }} *</label>
                        <Calendar
                            id="startDate"
                            v-model="formData.startDateTime"
                            showTime
                            hourFormat="12"
                            required
                            class="w-full"
                        />
                    </div>

                    <div class="field">
                        <label for="endDate" class="font-medium">{{ t('plans.endDateOptional') }}</label>
                        <Calendar
                            id="endDate"
                            v-model="formData.endDateTime"
                            :minDate="formData.startDateTime"
                            class="w-full"
                        />
                        <small class="text-gray-500">{{ t('plans.endDateHelp') }}</small>
                    </div>
                </form>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button :label="t('plans.cancel')" severity="secondary" @click="showDialog = false" />
                        <Button :label="t('plans.save')" type="submit" @click="handleSubmit" />
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
