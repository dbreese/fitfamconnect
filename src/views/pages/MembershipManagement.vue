<script setup lang="ts">
import { MembershipService } from '@/service/MembershipService';
import { PlanService } from '@/service/PlanService';
import { ChargeService } from '@/service/ChargeService';
import type { IMember } from '@/server/db/member';
import type { IPlan } from '@/server/db/plan';
import type { ICharge } from '@/server/db/charge';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import Calendar from 'primevue/calendar';
import Checkbox from 'primevue/checkbox';
import Toast from 'primevue/toast';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import { ref, onMounted, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const toast = useToast();

const members = ref<any[]>([]);
const filteredMembers = ref<any[]>([]);
const plans = ref<IPlan[]>([]);
const loading = ref(false);
const showDialog = ref(false);
const showNewMemberDialog = ref(false);
const showAddChargeDialog = ref(false);
const showChargeHistoryDialog = ref(false);
const showEditChargeDialog = ref(false);
const showViewChargeDialog = ref(false);
const selectedMember = ref<any | null>(null);
const memberCharges = ref<any[]>([]);
const selectedCharge = ref<any | null>(null);
const searchQuery = ref('');

const formData = ref({
    status: 'pending' as 'pending' | 'approved' | 'denied' | 'inactive',
    planIds: [] as string[],
    startDate: new Date(),
    notes: ''
});

const newMemberFormData = ref({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US'
    },
    memberType: 'member' as 'owner' | 'coach' | 'member',
    startDate: new Date(),
    notes: ''
});

const chargeFormData = ref({
    amount: '',
    chargeDate: new Date(),
    note: '',
    isBilled: false
});

const statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Denied', value: 'denied' },
    { label: 'Inactive', value: 'inactive' }
];

const memberTypeOptions = [
    { label: 'Member', value: 'member' },
    { label: 'Coach', value: 'coach' },
    { label: 'Owner', value: 'owner' }
];

const planOptions = computed(() => {
    return plans.value.map((plan) => ({
        label: `${plan.name} - ${formatPrice(plan.price, plan.currency)}`,
        value: plan._id
    }));
});

async function loadMembers() {
    loading.value = true;
    try {
        const result = await MembershipService.getMyMembers();
        if (result) {
            members.value = result;
            filterMembers();
            console.log(`Loaded ${result.length} members`);
        } else {
            members.value = [];
            filteredMembers.value = [];
        }
    } catch (error) {
        console.error('Error loading members:', error);
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

function filterMembers() {
    if (!searchQuery.value.trim()) {
        filteredMembers.value = members.value;
        return;
    }

    const query = searchQuery.value.toLowerCase().trim();
    filteredMembers.value = members.value.filter((member) => {
        const firstName = (member.firstName || '').toLowerCase();
        const lastName = (member.lastName || '').toLowerCase();
        const email = (member.email || '').toLowerCase();
        const phone = (member.phone || '').toLowerCase();

        return firstName.includes(query) ||
               lastName.includes(query) ||
               email.includes(query) ||
               phone.includes(query);
    });
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

async function loadMemberCharges() {
    if (!selectedMember.value) return;

    loading.value = true;
    try {
        const result = await ChargeService.getChargesByMember((selectedMember.value as any)._id);
        if (result) {
            memberCharges.value = result;
            console.log(`Loaded ${result.length} charges for member`);
        } else {
            memberCharges.value = [];
        }
    } catch (error) {
        console.error('Error loading member charges:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('charges.error.loadFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function openEditDialog(member: any) {
    selectedMember.value = member;
    formData.value = {
        status: member.status,
        planIds: member.plans ? member.plans.map((plan: any) => plan._id) : [],
        startDate: member.startDate ? new Date(member.startDate) : new Date(),
        notes: member.notes || ''
    };
    showDialog.value = true;
}

function openNewMemberDialog() {
    resetNewMemberForm();
    showNewMemberDialog.value = true;
}

function openChargeHistoryDialog(member: any) {
    selectedMember.value = member;
    loadMemberCharges();
    showChargeHistoryDialog.value = true;
}

function openAddChargeDialog() {
    resetChargeForm();
    showAddChargeDialog.value = true;
}

function openEditChargeDialog(charge: any) {
    selectedCharge.value = charge;
    chargeFormData.value = {
        amount: (charge.amount / 100).toFixed(2),
        chargeDate: new Date(charge.chargeDate),
        note: charge.note || '',
        isBilled: charge.isBilled
    };
    showEditChargeDialog.value = true;
}

function openViewChargeDialog(charge: any) {
    selectedCharge.value = charge;
    chargeFormData.value = {
        amount: (charge.amount / 100).toFixed(2),
        chargeDate: new Date(charge.chargeDate),
        note: charge.note || '',
        isBilled: charge.isBilled
    };
    showViewChargeDialog.value = true;
}

function closeEditChargeDialog() {
    showEditChargeDialog.value = false;
    selectedCharge.value = null;
    resetChargeForm();
}

function resetNewMemberForm() {
    newMemberFormData.value = {
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'US'
        },
        memberType: 'member',
        startDate: new Date(),
        notes: ''
    };
}

function resetChargeForm() {
    chargeFormData.value = {
        amount: '',
        chargeDate: new Date(),
        note: '',
        isBilled: false
    };
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

function validateNewMemberForm(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!newMemberFormData.value.email) {
        errors.push(t('memberships.validation.emailRequired'));
    }
    if (!newMemberFormData.value.firstName) {
        errors.push(t('memberships.validation.firstNameRequired'));
    }
    if (!newMemberFormData.value.lastName) {
        errors.push(t('memberships.validation.lastNameRequired'));
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

function validateChargeForm(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!chargeFormData.value.amount || parseFloat(chargeFormData.value.amount) <= 0) {
        errors.push(t('charges.validation.amountRequired'));
    }
    if (!chargeFormData.value.chargeDate) {
        errors.push(t('charges.validation.dateRequired'));
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
        // Update member status
        const result = await MembershipService.updateMember((selectedMember.value as any)._id, {
            status: formData.value.status,
            startDate: formData.value.startDate,
            notes: formData.value.notes.trim() || undefined
        });

        if (result && result.responseCode === 200) {
            // Handle plan assignments
            const currentPlanIds = selectedMember.value.plans
                ? selectedMember.value.plans.map((plan: any) => plan._id)
                : [];
            const newPlanIds = formData.value.planIds;

            // Remove plans that are no longer selected
            for (const planId of currentPlanIds) {
                if (!newPlanIds.includes(planId)) {
                    await MembershipService.removePlan((selectedMember.value as any)._id, planId);
                }
            }

            // Add new plans
            for (const planId of newPlanIds) {
                if (!currentPlanIds.includes(planId)) {
                    await MembershipService.assignPlan((selectedMember.value as any)._id, planId);
                }
            }

            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: t('memberships.success.updated'),
                life: 3000
            });
            showDialog.value = false;
            await loadMembers();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: t('memberships.error.updateFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error updating member:', error);
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

async function handleNewMemberSubmit() {
    // Validate form before submission
    const validation = validateNewMemberForm();
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
        // Prepare member data
        const memberData = {
            email: newMemberFormData.value.email,
            firstName: newMemberFormData.value.firstName,
            lastName: newMemberFormData.value.lastName,
            phone: newMemberFormData.value.phone || undefined,
            address:
                newMemberFormData.value.address.street ||
                newMemberFormData.value.address.city ||
                newMemberFormData.value.address.state ||
                newMemberFormData.value.address.zipCode
                    ? newMemberFormData.value.address
                    : undefined,
            memberType: newMemberFormData.value.memberType,
            startDate: newMemberFormData.value.startDate,
            isActive: true,
            notes: newMemberFormData.value.notes.trim() || undefined
        };

        const result = await MembershipService.createMember(memberData);

        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: t('memberships.success.created'),
                life: 3000
            });
            showNewMemberDialog.value = false;
            await loadMembers();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: t('memberships.error.createFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error creating member:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('memberships.error.createFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function handleChargeSubmit() {
    // Validate form before submission
    const validation = validateChargeForm();
    if (!validation.isValid) {
        toast.add({
            severity: 'warn',
            summary: t('charges.validation.validationError'),
            detail: validation.errors[0],
            life: 5000
        });
        return;
    }

    loading.value = true;
    try {
        // Prepare charge data
        const chargeData = {
            memberId: (selectedMember.value as any)._id,
            amount: Math.round(parseFloat(chargeFormData.value.amount) * 100), // Convert to cents
            chargeDate: chargeFormData.value.chargeDate,
            note: chargeFormData.value.note.trim() || undefined,
            isBilled: chargeFormData.value.isBilled
        };

        let result;
        if (selectedCharge.value) {
            // Update existing charge
            result = await ChargeService.updateCharge((selectedCharge.value as any)._id, chargeData);
        } else {
            // Create new charge
            result = await ChargeService.createCharge(chargeData);
        }

        if (result && (result.responseCode === 201 || result.responseCode === 200)) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: selectedCharge.value ? t('charges.success.updated') : t('charges.success.created'),
                life: 3000
            });
            showAddChargeDialog.value = false;
            closeEditChargeDialog();
            // Refresh the charge list
            await loadMemberCharges();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: selectedCharge.value ? t('charges.error.updateFailed') : t('charges.error.createFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error saving charge:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: selectedCharge.value ? t('charges.error.updateFailed') : t('charges.error.createFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function handleDeleteCharge(charge: any) {
    if (!confirm(t('charges.confirmDelete'))) {
        return;
    }

    loading.value = true;
    try {
        const result = await ChargeService.deleteCharge((charge as any)._id);

        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: t('charges.success.deleted'),
                life: 3000
            });
            // Refresh the charge list
            await loadMemberCharges();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: t('charges.error.deleteFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error deleting charge:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('charges.error.deleteFailed'),
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
            return t('memberships.statuses.approved');
        case 'pending':
            return t('memberships.statuses.pending');
        case 'denied':
            return t('memberships.statuses.denied');
        case 'inactive':
            return t('memberships.statuses.inactive');
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
    if (member.address) {
        const addressParts = [];
        if (member.address.street) addressParts.push(member.address.street);
        if (member.address.city) addressParts.push(member.address.city);
        if (member.address.state) addressParts.push(member.address.state);
        if (member.address.zipCode) addressParts.push(member.address.zipCode);
        if (addressParts.length > 0) {
            parts.push(addressParts.join(', '));
        }
    }
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

function formatChargeAmount(amountInCents: number): string {
    const amount = (amountInCents / 100).toFixed(2);
    return `$${amount}`;
}

function formatChargeDate(date: string | Date): string {
    return new Date(date).toLocaleDateString();
}

function getBillingStatusSeverity(isBilled: boolean): string {
    return isBilled ? 'success' : 'warning';
}

function getBillingStatusLabel(isBilled: boolean): string {
    return isBilled ? t('charges.billed') : t('charges.unbilled');
}

// Watch for search query changes
watch(searchQuery, () => {
    filterMembers();
});

onMounted(() => {
    loadMembers();
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
                    <div class="flex items-center mb-3 w-full">
                        <div class="flex items-center gap-3 flex-1">
                            <div class="p-input-icon-left">
                                <InputText
                                    v-model="searchQuery"
                                    :placeholder="t('memberships.searchPlaceholder')"
                                    class="w-80 pl-10"
                                />
                            </div>
                            <span class="text-sm text-gray-600 whitespace-nowrap">
                                {{ filteredMembers.length }} {{ t('memberships.membersFound') }}
                            </span>
                        </div>
                        <div class="flex gap-2 flex-shrink-0">
                            <Button
                                icon="pi pi-plus"
                                :label="t('memberships.newMember')"
                                @click="openNewMemberDialog"
                            />
                        </div>
                    </div>
                    <DataTable :value="filteredMembers" paginator :rows="10" responsiveLayout="scroll">
                        <Column field="firstName" :header="t('memberships.memberName')" sortable>
                            <template #body="{ data }">
                                <div>
                                    <div class="font-semibold">{{ formatMemberName(data) }}</div>
                                    <div class="text-sm text-gray-600">{{ formatMemberContact(data) }}</div>
                                </div>
                            </template>
                        </Column>
                        <Column field="status" :header="t('memberships.statusField')" sortable>
                            <template #body="{ data }">
                                <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
                            </template>
                        </Column>
                        <Column field="plans" :header="t('memberships.plans')">
                            <template #body="{ data }">
                                {{ formatPlans(data.plans) }}
                            </template>
                        </Column>
                        <Column field="joinRequestDate" :header="t('memberships.joinRequestDate')" sortable>
                            <template #body="{ data }">
                                {{ formatJoinDate(data.joinRequestDate) }}
                            </template>
                        </Column>
                        <Column field="startDate" :header="t('memberships.startDate')" sortable>
                            <template #body="{ data }">
                                {{ formatJoinDate(data.startDate) }}
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
                                <div class="flex gap-2">
                                    <Button
                                        icon="pi pi-pencil"
                                        size="small"
                                        severity="secondary"
                                        :label="t('memberships.manage')"
                                        @click="openEditDialog(data)"
                                    />
                                    <Button
                                        icon="pi pi-dollar"
                                        size="small"
                                        severity="info"
                                        :label="t('charges.chargeHistory')"
                                        @click="openChargeHistoryDialog(data)"
                                    />
                                </div>
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
                <div v-if="selectedMember" class="space-y-6">
                    <!-- Member Information (Read-only) -->
                    <div class="p-4 bg-gray-50 rounded-lg">
                        <h4 class="text-lg font-semibold mb-3">{{ t('memberships.memberInfo') }}</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{
                                    t('memberships.memberName')
                                }}</label>
                                <div class="text-lg">{{ formatMemberName(selectedMember) }}</div>
                            </div>
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{ t('memberships.contact') }}</label>
                                <div>{{ formatMemberContact(selectedMember) }}</div>
                            </div>
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{ t('memberships.joinRequestDate') }}</label>
                                <div>{{ formatJoinDate(selectedMember.joinRequestDate) }}</div>
                            </div>
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{ t('memberships.startDate') }}</label>
                                <Calendar
                                    v-model="formData.startDate"
                                    class="w-full"
                                />
                            </div>
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{
                                    t('memberships.memberType')
                                }}</label>
                                <div class="capitalize">
                                    {{ selectedMember?.memberType || t('memberships.unknown') }}
                                </div>
                            </div>
                            <div v-if="selectedMember?.address" class="md:col-span-2">
                                <label class="font-medium text-sm text-gray-600">{{ t('memberships.address') }}</label>
                                <div class="text-sm">
                                    <div v-if="selectedMember.address.street">
                                        {{ selectedMember.address.street }}
                                    </div>
                                    <div
                                        v-if="
                                            selectedMember.address.city ||
                                            selectedMember.address.state ||
                                            selectedMember.address.zipCode
                                        "
                                    >
                                        {{
                                            [
                                                selectedMember.address.city,
                                                selectedMember.address.state,
                                                selectedMember.address.zipCode
                                            ]
                                                .filter(Boolean)
                                                .join(', ')
                                        }}
                                    </div>
                                    <div
                                        v-if="selectedMember.address.country && selectedMember.address.country !== 'US'"
                                    >
                                        {{ selectedMember.address.country }}
                                    </div>
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
                            <label for="status" class="font-medium">{{ t('memberships.statusField') }} *</label>
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

            <!-- New Member Dialog -->
            <Dialog
                v-model:visible="showNewMemberDialog"
                :modal="true"
                :header="t('memberships.newMember')"
                :pt="{ root: { class: 'w-[90vw] md:w-[70vw] lg:w-[50vw]' } }"
            >
                <form @submit.prevent="handleNewMemberSubmit" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="field">
                            <label for="newEmail" class="font-medium">{{ t('memberships.email') }} *</label>
                            <InputText
                                id="newEmail"
                                v-model="newMemberFormData.email"
                                type="email"
                                class="w-full"
                                required
                            />
                        </div>
                        <div class="field">
                            <label for="newPhone" class="font-medium">{{ t('memberships.phone') }}</label>
                            <InputText id="newPhone" v-model="newMemberFormData.phone" type="tel" class="w-full" />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="field">
                            <label for="newFirstName" class="font-medium">{{ t('memberships.firstName') }} *</label>
                            <InputText
                                id="newFirstName"
                                v-model="newMemberFormData.firstName"
                                class="w-full"
                                required
                            />
                        </div>
                        <div class="field">
                            <label for="newLastName" class="font-medium">{{ t('memberships.lastName') }} *</label>
                            <InputText id="newLastName" v-model="newMemberFormData.lastName" class="w-full" required />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="field">
                            <label for="newMemberType" class="font-medium">{{ t('memberships.memberType') }}</label>
                            <Select
                                id="newMemberType"
                                v-model="newMemberFormData.memberType"
                                :options="memberTypeOptions"
                                optionLabel="label"
                                optionValue="value"
                                class="w-full"
                            />
                        </div>
                        <div class="field">
                            <label for="newStartDate" class="font-medium">{{ t('memberships.startDate') }} *</label>
                            <Calendar
                                id="newStartDate"
                                v-model="newMemberFormData.startDate"
                                class="w-full"
                                required
                            />
                        </div>
                    </div>

                    <div class="field">
                        <label class="font-medium">{{ t('memberships.address') }}</label>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="newStreet" class="text-sm text-gray-600">{{
                                    t('memberships.street')
                                }}</label>
                                <InputText id="newStreet" v-model="newMemberFormData.address.street" class="w-full" />
                            </div>
                            <div>
                                <label for="newCity" class="text-sm text-gray-600">{{ t('memberships.city') }}</label>
                                <InputText id="newCity" v-model="newMemberFormData.address.city" class="w-full" />
                            </div>
                            <div>
                                <label for="newState" class="text-sm text-gray-600">{{ t('memberships.state') }}</label>
                                <InputText id="newState" v-model="newMemberFormData.address.state" class="w-full" />
                            </div>
                            <div>
                                <label for="newZipCode" class="text-sm text-gray-600">{{
                                    t('memberships.zipCode')
                                }}</label>
                                <InputText id="newZipCode" v-model="newMemberFormData.address.zipCode" class="w-full" />
                            </div>
                        </div>
                    </div>

                    <div class="field">
                        <label for="newNotes" class="font-medium">{{ t('memberships.notes') }}</label>
                        <Textarea
                            id="newNotes"
                            v-model="newMemberFormData.notes"
                            rows="3"
                            class="w-full"
                            :placeholder="t('memberships.notesPlaceholder')"
                        />
                    </div>
                </form>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button
                            :label="t('memberships.cancel')"
                            severity="secondary"
                            @click="showNewMemberDialog = false"
                        />
                        <Button :label="t('memberships.create')" type="submit" @click="handleNewMemberSubmit" />
                    </div>
                </template>
            </Dialog>

            <!-- Charge History Dialog -->
            <Dialog
                v-model:visible="showChargeHistoryDialog"
                :modal="true"
                :header="t('charges.chargeHistory')"
                :pt="{ root: { class: 'w-[90vw] md:w-[80vw] lg:w-[70vw]' } }"
            >
                <div v-if="selectedMember" class="space-y-4">
                    <!-- Member Information (Read-only) -->
                    <div class="p-3 bg-gray-50 rounded-lg">
                        <h4 class="text-sm font-semibold mb-2">{{ t('charges.chargingMember') }}</h4>
                        <div class="text-lg font-medium">{{ formatMemberName(selectedMember) }}</div>
                        <div class="text-sm text-gray-600">{{ selectedMember.email }}</div>
                    </div>

                    <!-- Add New Charge Button -->
                    <div class="flex justify-end">
                        <Button
                            icon="pi pi-plus"
                            :label="t('charges.addCharge')"
                            @click="openAddChargeDialog"
                            size="small"
                        />
                    </div>

                    <!-- Charges List -->
                    <div class="border rounded-lg">
                        <DataTable :value="memberCharges" :loading="loading" responsiveLayout="scroll">
                            <Column field="amount" :header="t('charges.amount')" sortable>
                                <template #body="{ data }">
                                    <span class="font-semibold">{{ formatChargeAmount(data.amount) }}</span>
                                </template>
                            </Column>
                            <Column field="chargeDate" :header="t('charges.date')" sortable>
                                <template #body="{ data }">
                                    {{ formatChargeDate(data.chargeDate) }}
                                </template>
                            </Column>
                            <Column field="note" :header="t('charges.note')">
                                <template #body="{ data }">
                                    <span v-if="data.note" class="text-sm">{{ data.note }}</span>
                                    <span v-else class="text-gray-400 text-sm">{{ t('charges.noNote') }}</span>
                                </template>
                            </Column>
                            <Column field="isBilled" :header="t('charges.billingStatus')" sortable>
                                <template #body="{ data }">
                                    <Tag
                                        :value="getBillingStatusLabel(data.isBilled)"
                                        :severity="getBillingStatusSeverity(data.isBilled)"
                                    />
                                </template>
                            </Column>
                            <Column field="billedDate" :header="t('charges.billedDate')" sortable>
                                <template #body="{ data }">
                                    <span v-if="data.billedDate" class="text-sm">
                                        {{ formatChargeDate(data.billedDate) }}
                                    </span>
                                    <span v-else class="text-gray-400 text-sm">-</span>
                                </template>
                            </Column>
                            <Column :header="t('charges.actions')" :exportable="false" style="min-width: 8rem">
                                <template #body="{ data }">
                                    <div class="flex gap-2">
                                        <Button
                                            v-if="data.isBilled"
                                            icon="pi pi-eye"
                                            size="small"
                                            severity="secondary"
                                            :label="t('charges.view')"
                                            @click="openViewChargeDialog(data)"
                                        />
                                        <Button
                                            v-else
                                            icon="pi pi-pencil"
                                            size="small"
                                            severity="info"
                                            :label="t('charges.edit')"
                                            @click="openEditChargeDialog(data)"
                                        />
                                        <Button
                                            v-if="!data.isBilled"
                                            icon="pi pi-trash"
                                            size="small"
                                            severity="danger"
                                            :label="t('charges.delete')"
                                            @click="handleDeleteCharge(data)"
                                        />
                                    </div>
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </div>

                <template #footer>
                    <div class="flex justify-end">
                        <Button
                            :label="t('charges.close')"
                            severity="secondary"
                            @click="showChargeHistoryDialog = false"
                        />
                    </div>
                </template>
            </Dialog>

            <!-- Add Charge Dialog -->
            <Dialog
                v-model:visible="showAddChargeDialog"
                :modal="true"
                :header="t('charges.addCharge')"
                :pt="{ root: { class: 'w-[90vw] md:w-[50vw] lg:w-[40vw]' } }"
            >
                <div v-if="selectedMember" class="space-y-4">
                    <!-- Member Information (Read-only) -->
                    <div class="p-3 bg-gray-50 rounded-lg">
                        <h4 class="text-sm font-semibold mb-2">{{ t('charges.chargingMember') }}</h4>
                        <div class="text-lg font-medium">{{ formatMemberName(selectedMember) }}</div>
                        <div class="text-sm text-gray-600">{{ selectedMember.email }}</div>
                    </div>

                    <form @submit.prevent="handleChargeSubmit" class="space-y-4">
                        <div class="field">
                            <label for="chargeAmount" class="font-medium">{{ t('charges.amount') }} *</label>
                            <InputText
                                id="chargeAmount"
                                v-model="chargeFormData.amount"
                                type="number"
                                step="0.01"
                                min="0"
                                class="w-full"
                                :placeholder="t('charges.amountPlaceholder')"
                                required
                            />
                            <small class="text-gray-500">{{ t('charges.amountHelp') }}</small>
                        </div>

                        <div class="field">
                            <label for="chargeDate" class="font-medium">{{ t('charges.date') }} *</label>
                            <Calendar id="chargeDate" v-model="chargeFormData.chargeDate" class="w-full" required />
                        </div>

                        <div class="field">
                            <label for="chargeNote" class="font-medium">{{ t('charges.note') }}</label>
                            <Textarea
                                id="chargeNote"
                                v-model="chargeFormData.note"
                                rows="3"
                                class="w-full"
                                :placeholder="t('charges.notePlaceholder')"
                            />
                            <small class="text-gray-500">{{ t('charges.noteHelp') }}</small>
                        </div>

                        <div class="field">
                            <div class="flex items-center gap-2">
                                <Checkbox v-model="chargeFormData.isBilled" binary />
                                <label class="font-medium">{{ t('charges.isBilled') }}</label>
                            </div>
                            <small class="text-gray-500">{{ t('charges.isBilledHelp') }}</small>
                        </div>
                    </form>
                </div>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button
                            :label="t('charges.cancel')"
                            severity="secondary"
                            @click="showAddChargeDialog = false"
                        />
                        <Button :label="t('charges.create')" type="submit" @click="handleChargeSubmit" />
                    </div>
                </template>
            </Dialog>

            <!-- Edit Charge Dialog -->
            <Dialog
                v-model:visible="showEditChargeDialog"
                :modal="true"
                :header="t('charges.editCharge')"
                :pt="{ root: { class: 'w-[90vw] md:w-[50vw] lg:w-[40vw]' } }"
            >
                <div v-if="selectedMember" class="space-y-4">
                    <!-- Member Information (Read-only) -->
                    <div class="p-3 bg-gray-50 rounded-lg">
                        <h4 class="text-sm font-semibold mb-2">{{ t('charges.chargingMember') }}</h4>
                        <div class="text-lg font-medium">{{ formatMemberName(selectedMember) }}</div>
                        <div class="text-sm text-gray-600">{{ selectedMember.email }}</div>
                    </div>

                    <form @submit.prevent="handleChargeSubmit" class="space-y-4">
                        <div class="field">
                            <label for="editChargeAmount" class="font-medium">{{ t('charges.amount') }} *</label>
                            <InputText
                                id="editChargeAmount"
                                v-model="chargeFormData.amount"
                                type="number"
                                step="0.01"
                                min="0"
                                class="w-full"
                                :placeholder="t('charges.amountPlaceholder')"
                                required
                            />
                            <small class="text-gray-500">{{ t('charges.amountHelp') }}</small>
                        </div>

                        <div class="field">
                            <label for="editChargeDate" class="font-medium">{{ t('charges.date') }} *</label>
                            <Calendar id="editChargeDate" v-model="chargeFormData.chargeDate" class="w-full" required />
                        </div>

                        <div class="field">
                            <label for="editChargeNote" class="font-medium">{{ t('charges.note') }}</label>
                            <Textarea
                                id="editChargeNote"
                                v-model="chargeFormData.note"
                                rows="3"
                                class="w-full"
                                :placeholder="t('charges.notePlaceholder')"
                            />
                            <small class="text-gray-500">{{ t('charges.noteHelp') }}</small>
                        </div>

                        <div class="field">
                            <div class="flex items-center gap-2">
                                <Checkbox v-model="chargeFormData.isBilled" binary />
                                <label class="font-medium">{{ t('charges.isBilled') }}</label>
                            </div>
                            <small class="text-gray-500">{{ t('charges.isBilledHelp') }}</small>
                        </div>
                    </form>
                </div>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button :label="t('charges.cancel')" severity="secondary" @click="closeEditChargeDialog" />
                        <Button :label="t('charges.update')" type="submit" @click="handleChargeSubmit" />
                    </div>
                </template>
            </Dialog>

            <!-- View Charge Dialog (Read-only for billed charges) -->
            <Dialog
                v-model:visible="showViewChargeDialog"
                :modal="true"
                :header="t('charges.viewCharge')"
                :pt="{ root: { class: 'w-[90vw] md:w-[50vw] lg:w-[40vw]' } }"
            >
                <div v-if="selectedMember" class="space-y-4">
                    <!-- Member Information (Read-only) -->
                    <div class="p-3 bg-gray-50 rounded-lg">
                        <h4 class="text-sm font-semibold mb-2">{{ t('charges.chargingMember') }}</h4>
                        <div class="text-lg font-medium">{{ formatMemberName(selectedMember) }}</div>
                        <div class="text-sm text-gray-600">{{ selectedMember.email }}</div>
                    </div>

                    <div class="space-y-4">
                        <div class="field">
                            <label class="font-medium text-sm text-gray-600">{{ t('charges.amount') }}</label>
                            <div class="text-lg font-semibold">${{ chargeFormData.amount }}</div>
                        </div>

                        <div class="field">
                            <label class="font-medium text-sm text-gray-600">{{ t('charges.date') }}</label>
                            <div>{{ formatChargeDate(chargeFormData.chargeDate) }}</div>
                        </div>

                        <div class="field">
                            <label class="font-medium text-sm text-gray-600">{{ t('charges.note') }}</label>
                            <div>{{ chargeFormData.note || t('charges.noNote') }}</div>
                        </div>

                        <div class="field">
                            <label class="font-medium text-sm text-gray-600">{{ t('charges.billingStatus') }}</label>
                            <div>
                                <Tag
                                    :value="getBillingStatusLabel(chargeFormData.isBilled)"
                                    :severity="getBillingStatusSeverity(chargeFormData.isBilled)"
                                />
                            </div>
                        </div>

                        <div v-if="selectedCharge?.billedDate" class="field">
                            <label class="font-medium text-sm text-gray-600">{{ t('charges.billedDate') }}</label>
                            <div>{{ formatChargeDate(selectedCharge.billedDate) }}</div>
                        </div>
                    </div>

                    <div class="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p class="text-sm text-blue-800">
                            <i class="pi pi-info-circle mr-2"></i>
                            {{ t('charges.billedChargeNote') }}
                        </p>
                    </div>
                </div>

                <template #footer>
                    <div class="flex justify-end">
                        <Button
                            :label="t('charges.close')"
                            @click="showViewChargeDialog = false"
                        />
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
