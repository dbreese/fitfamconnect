<script setup lang="ts">
import { MembershipService } from '@/service/MembershipService';
import { PlanService } from '@/service/PlanService';
import type { IMembership } from '@/server/db/membership';
import type { IPlan } from '@/server/db/plan';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import Toast from 'primevue/toast';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import { ref, onMounted, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const toast = useToast();

const memberships = ref<any[]>([]);
const plans = ref<IPlan[]>([]);
const loading = ref(false);
const showDialog = ref(false);
const selectedMembership = ref<any | null>(null);

const formData = ref({
    status: 'pending' as 'pending' | 'approved' | 'denied' | 'inactive',
    planIds: [] as string[],
    notes: ''
});

const statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Denied', value: 'denied' },
    { label: 'Inactive', value: 'inactive' }
];

const planOptions = computed(() => {
    return plans.value.map((plan) => ({
        label: `${plan.name} - ${formatPrice(plan.price, plan.currency)}`,
        value: plan._id
    }));
});

async function loadMemberships() {
    loading.value = true;
    try {
        const result = await MembershipService.getMyMemberships();
        if (result) {
            memberships.value = result;
            console.log(`Loaded ${result.length} memberships`);
        } else {
            memberships.value = [];
        }
    } catch (error) {
        console.error('Error loading memberships:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('memberships.error.loadFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function loadPlans() {
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
    }
}

function openEditDialog(membership: any) {
    selectedMembership.value = membership;
    formData.value = {
        status: membership.status,
        planIds: [...membership.planIds],
        notes: membership.notes || ''
    };
    showDialog.value = true;
}

function validateForm(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.value.status) {
        errors.push(t('memberships.validation.statusRequired'));
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
            summary: t('memberships.validation.validationError'),
            detail: validation.errors[0],
            life: 5000
        });
        return;
    }

    loading.value = true;
    try {
        const result = await MembershipService.updateMembership((selectedMembership.value as any)._id, {
            status: formData.value.status,
            planIds: formData.value.planIds,
            notes: formData.value.notes.trim() || undefined
        });

        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: t('memberships.success.updated'),
                life: 3000
            });
            showDialog.value = false;
            await loadMemberships();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: t('memberships.error.updateFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error updating membership:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('memberships.error.updateFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function getStatusSeverity(status: string): string {
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

function getStatusLabel(status: string): string {
    switch (status) {
        case 'approved':
            return t('memberships.status.approved');
        case 'pending':
            return t('memberships.status.pending');
        case 'denied':
            return t('memberships.status.denied');
        case 'inactive':
            return t('memberships.status.inactive');
        default:
            return status;
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

function formatMemberName(member: any): string {
    if (!member) return t('memberships.unknownMember');
    return `${member.firstName} ${member.lastName}`;
}

function formatMemberContact(member: any): string {
    if (!member) return '';
    const parts = [];
    if (member.email) parts.push(member.email);
    if (member.phone) parts.push(member.phone);
    return parts.join(' • ');
}

function formatPlans(plans: any[]): string {
    if (!plans || plans.length === 0) {
        return t('memberships.noPlans');
    }
    return plans.map((plan) => plan.name).join(', ');
}

function formatJoinDate(date: string | Date): string {
    return new Date(date).toLocaleDateString();
}

onMounted(() => {
    loadMemberships();
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
                <template #title>{{ t('memberships.title') }}</template>
                <template #subtitle>{{ t('memberships.subtitle') }}</template>
                <template #content>
                    <DataTable :value="memberships" paginator :rows="10" responsiveLayout="scroll">
                        <Column field="member" :header="t('memberships.memberName')" sortable>
                            <template #body="{ data }">
                                <div>
                                    <div class="font-semibold">{{ formatMemberName(data.member) }}</div>
                                    <div class="text-sm text-gray-600">{{ formatMemberContact(data.member) }}</div>
                                </div>
                            </template>
                        </Column>
                        <Column field="status" :header="t('memberships.status')" sortable>
                            <template #body="{ data }">
                                <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
                            </template>
                        </Column>
                        <Column field="plans" :header="t('memberships.plans')">
                            <template #body="{ data }">
                                {{ formatPlans(data.plans) }}
                            </template>
                        </Column>
                        <Column field="joinRequestDate" :header="t('memberships.joinDate')" sortable>
                            <template #body="{ data }">
                                {{ formatJoinDate(data.joinRequestDate) }}
                            </template>
                        </Column>
                        <Column field="notes" :header="t('memberships.notes')">
                            <template #body="{ data }">
                                <span v-if="data.notes" class="text-sm">{{ data.notes }}</span>
                                <span v-else class="text-gray-400 text-sm">{{ t('memberships.noNotes') }}</span>
                            </template>
                        </Column>
                        <Column :header="t('memberships.actions')">
                            <template #body="{ data }">
                                <Button
                                    icon="pi pi-pencil"
                                    size="small"
                                    severity="secondary"
                                    :label="t('memberships.manage')"
                                    @click="openEditDialog(data)"
                                />
                            </template>
                        </Column>
                    </DataTable>
                </template>
            </Card>

            <!-- Edit Dialog -->
            <Dialog
                v-model:visible="showDialog"
                :modal="true"
                :header="t('memberships.editMembership')"
                :pt="{ root: { class: 'w-[90vw] md:w-[70vw] lg:w-[50vw]' } }"
            >
                <div v-if="selectedMembership" class="space-y-6">
                    <!-- Member Information (Read-only) -->
                    <div class="p-4 bg-gray-50 rounded-lg">
                        <h4 class="text-lg font-semibold mb-3">{{ t('memberships.memberInfo') }}</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{
                                    t('memberships.memberName')
                                }}</label>
                                <div class="text-lg">{{ formatMemberName(selectedMembership.member) }}</div>
                            </div>
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{ t('memberships.contact') }}</label>
                                <div>{{ formatMemberContact(selectedMembership.member) }}</div>
                            </div>
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{ t('memberships.joinDate') }}</label>
                                <div>{{ formatJoinDate(selectedMembership.joinRequestDate) }}</div>
                            </div>
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{
                                    t('memberships.memberType')
                                }}</label>
                                <div class="capitalize">
                                    {{ selectedMembership.member?.memberType || t('memberships.unknown') }}
                                </div>
                            </div>
                        </div>
                        <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <p class="text-sm text-yellow-800">
                                <i class="pi pi-info-circle mr-2"></i>
                                {{ t('memberships.memberInfoNote') }}
                            </p>
                        </div>
                    </div>

                    <!-- Editable Fields -->
                    <form @submit.prevent="handleSubmit" class="space-y-4">
                        <div class="field">
                            <label for="status" class="font-medium">{{ t('memberships.status') }} *</label>
                            <Select
                                id="status"
                                v-model="formData.status"
                                :options="statusOptions"
                                optionLabel="label"
                                optionValue="value"
                                class="w-full"
                                required
                            />
                        </div>

                        <div class="field">
                            <label for="plans" class="font-medium">{{ t('memberships.plans') }}</label>
                            <MultiSelect
                                id="plans"
                                v-model="formData.planIds"
                                :options="planOptions"
                                optionLabel="label"
                                optionValue="value"
                                class="w-full"
                                :placeholder="t('memberships.selectPlans')"
                            />
                            <small class="text-gray-500">{{ t('memberships.plansHelp') }}</small>
                        </div>

                        <div class="field">
                            <label for="notes" class="font-medium">{{ t('memberships.notes') }}</label>
                            <Textarea
                                id="notes"
                                v-model="formData.notes"
                                rows="3"
                                class="w-full"
                                :placeholder="t('memberships.notesPlaceholder')"
                            />
                            <small class="text-gray-500">{{ t('memberships.notesHelp') }}</small>
                        </div>
                    </form>
                </div>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button :label="t('memberships.cancel')" severity="secondary" @click="showDialog = false" />
                        <Button :label="t('memberships.save')" type="submit" @click="handleSubmit" />
                    </div>
                </template>
            </Dialog>

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
