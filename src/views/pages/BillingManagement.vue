<template>
    <Fluid>
        <div class="card">
            <div class="flex justify-content-between align-items-center mb-3">
                <div>
                    <h2 class="text-2xl font-bold text-gray-900 m-0">{{ t('billing.title') }}</h2>
                    <p class="text-gray-600 mt-1 mb-0">{{ t('billing.subtitle') }}</p>
                </div>
            </div>

            <TabView>
                <!-- Billing Run Tab -->
                <TabPanel :header="t('billing.billingRun')" value="run">
                    <div class="space-y-6">
                        <!-- Date Selection -->
                        <Card>
                            <template #title>{{ t('billing.selectPeriod') }}</template>
                            <template #content>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="field">
                                        <label for="startDate" class="font-medium"
                                            >{{ t('billing.startDate') }} *</label
                                        >
                                        <Calendar
                                            id="startDate"
                                            v-model="billingPeriod.startDate"
                                            class="w-full"
                                            required
                                            :max-date="billingPeriod.endDate"
                                        />
                                    </div>
                                    <div class="field">
                                        <label for="endDate" class="font-medium">{{ t('billing.endDate') }} *</label>
                                        <Calendar
                                            id="endDate"
                                            v-model="billingPeriod.endDate"
                                            class="w-full"
                                            required
                                            :min-date="billingPeriod.startDate"
                                        />
                                    </div>
                                </div>
                                <div class="flex justify-end mt-4">
                                    <Button
                                        :label="t('billing.generatePreview')"
                                        icon="pi pi-search"
                                        @click="generatePreview"
                                        :loading="loading"
                                        :disabled="!billingPeriod.startDate || !billingPeriod.endDate"
                                    />
                                </div>
                            </template>
                        </Card>

                        <!-- Preview Results -->
                        <Card v-if="preview">
                            <template #title>
                                <div class="flex justify-content-between align-items-center">
                                    <span>{{ t('billing.previewResults') }}</span>
                                    <Tag
                                        :value="BillingService.formatAmount(preview.totalAmount)"
                                        severity="success"
                                        class="text-lg"
                                    />
                                </div>
                            </template>
                            <template #content>
                                <!-- Summary -->
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div class="text-center">
                                        <div class="text-2xl font-bold text-blue-600">
                                            {{ preview.summary.recurringPlans }}
                                        </div>
                                        <div class="text-sm text-gray-600">{{ t('billing.recurringPlans') }}</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="text-2xl font-bold text-yellow-600">
                                            {{ preview.summary.oneTimeCharges }}
                                        </div>
                                        <div class="text-sm text-gray-600">{{ t('billing.additionalCharges') }}</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="text-2xl font-bold text-green-600">
                                            {{ preview.summary.totalCharges }}
                                        </div>
                                        <div class="text-sm text-gray-600">{{ t('billing.totalCharges') }}</div>
                                    </div>
                                </div>

                                <!-- Grouped Charges Display -->
                                <div v-for="group in preview.groupedCharges" :key="group.memberId" class="mb-6">
                                    <!-- Member Header -->
                                    <div
                                        class="flex justify-between items-center bg-gray-100 p-3 rounded-t-lg border-b-2 border-gray-300"
                                    >
                                        <h4 class="text-lg font-semibold text-gray-800">{{ group.memberName }}</h4>
                                        <div class="text-lg font-bold text-green-600">
                                            {{ t('billing.subtotal') }}:
                                            {{ BillingService.formatAmount(group.subtotal) }}
                                        </div>
                                    </div>

                                    <!-- Member Charges Table -->
                                    <DataTable
                                        :value="group.charges"
                                        responsiveLayout="scroll"
                                        class="border border-t-0 rounded-b-lg"
                                    >
                                        <Column field="type" :header="t('billing.type')" style="width: 150px">
                                            <template #body="{ data }">
                                                <Tag
                                                    :value="BillingService.getChargeTypeDisplayName(data.type)"
                                                    :severity="BillingService.getChargeTypeSeverity(data.type)"
                                                />
                                            </template>
                                        </Column>
                                        <Column field="description" :header="t('billing.description')">
                                            <template #body="{ data }">
                                                <div class="max-w-xs truncate">{{ data.description }}</div>
                                            </template>
                                        </Column>
                                        <Column field="amount" :header="t('billing.amount')" style="width: 120px">
                                            <template #body="{ data }">
                                                <span class="font-semibold">{{
                                                    BillingService.formatAmount(data.amount)
                                                }}</span>
                                            </template>
                                        </Column>
                                        <Column field="date" :header="t('billing.date')" style="width: 120px">
                                            <template #body="{ data }">
                                                {{ BillingService.formatDate(data.date) }}
                                            </template>
                                        </Column>
                                    </DataTable>
                                </div>

                                <!-- Commit Button -->
                                <div class="flex justify-end mt-4">
                                    <Button
                                        :label="t('billing.commitBilling')"
                                        icon="pi pi-check"
                                        severity="success"
                                        @click="showCommitDialog = true"
                                        :disabled="preview.charges.length === 0"
                                    />
                                </div>
                            </template>
                        </Card>
                    </div>
                </TabPanel>

                <!-- Billing History Tab -->
                <TabPanel :header="t('billing.history')" value="history">
                    <Card>
                        <template #title>{{ t('billing.billingHistory') }}</template>
                        <template #content>
                            <DataTable
                                :value="billingHistory"
                                :loading="loadingHistory"
                                responsiveLayout="scroll"
                                stripedRows
                            >
                                <Column field="billingDate" :header="t('billing.billingDate')" sortable>
                                    <template #body="{ data }">
                                        {{ BillingService.formatDate(data.billingDate) }}
                                    </template>
                                </Column>
                                <Column field="startDate" :header="t('billing.startDate')" sortable>
                                    <template #body="{ data }">
                                        {{ BillingService.formatDate(data.startDate) }}
                                    </template>
                                </Column>
                                <Column field="endDate" :header="t('billing.endDate')" sortable>
                                    <template #body="{ data }">
                                        {{ BillingService.formatDate(data.endDate) }}
                                    </template>
                                </Column>
                                <Column field="createdAt" :header="t('billing.createdAt')" sortable>
                                    <template #body="{ data }">
                                        {{ BillingService.formatDate(data.createdAt) }}
                                    </template>
                                </Column>
                            </DataTable>
                        </template>
                    </Card>
                </TabPanel>
            </TabView>

            <!-- Commit Confirmation Dialog -->
            <Dialog
                v-model:visible="showCommitDialog"
                :modal="true"
                :header="t('billing.confirmCommit')"
                :pt="{ root: { class: 'w-[90vw] md:w-[50vw] lg:w-[40vw]' } }"
            >
                <div class="space-y-4">
                    <div class="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <i class="pi pi-exclamation-triangle text-yellow-600 text-xl"></i>
                        <div>
                            <div class="font-medium text-yellow-800">{{ t('billing.commitWarning') }}</div>
                            <div class="text-sm text-yellow-700 mt-1">{{ t('billing.commitWarningDetail') }}</div>
                        </div>
                    </div>

                    <div v-if="preview" class="space-y-2">
                        <div class="flex justify-between">
                            <span>{{ t('billing.billingPeriod') }}:</span>
                            <span class="font-medium">
                                {{ BillingService.formatDate(preview.startDate) }} -
                                {{ BillingService.formatDate(preview.endDate) }}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span>{{ t('billing.totalCharges') }}:</span>
                            <span class="font-medium">{{ preview.summary.totalCharges }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>{{ t('billing.totalAmount') }}:</span>
                            <span class="font-bold text-green-600">{{
                                BillingService.formatAmount(preview.totalAmount)
                            }}</span>
                        </div>
                    </div>
                </div>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button :label="t('billing.cancel')" severity="secondary" @click="showCommitDialog = false" />
                        <Button
                            :label="t('billing.confirmCommit')"
                            severity="success"
                            icon="pi pi-check"
                            @click="commitBilling"
                            :loading="committing"
                        />
                    </div>
                </template>
            </Dialog>

            <Toast />
        </div>
    </Fluid>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { BillingService, type IBillingPreview, type IBillingHistory } from '../../service/BillingService';
import Fluid from 'primevue/fluid';
import Card from 'primevue/card';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Calendar from 'primevue/calendar';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Toast from 'primevue/toast';

const { t } = useI18n();
const toast = useToast();

// Reactive data
const loading = ref(false);
const loadingHistory = ref(false);
const committing = ref(false);
const showCommitDialog = ref(false);

const billingPeriod = ref({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) // Last day of current month
});

const preview = ref<IBillingPreview | null>(null);
const billingHistory = ref<IBillingHistory[]>([]);

// Functions
async function generatePreview() {
    if (!billingPeriod.value.startDate || !billingPeriod.value.endDate) {
        toast.add({
            severity: 'warn',
            summary: t('feedback.errorTitle'),
            detail: t('billing.validation.periodRequired'),
            life: 3000
        });
        return;
    }

    if (billingPeriod.value.endDate <= billingPeriod.value.startDate) {
        toast.add({
            severity: 'warn',
            summary: t('feedback.errorTitle'),
            detail: t('billing.validation.endDateAfterStart'),
            life: 3000
        });
        return;
    }

    loading.value = true;
    try {
        const result = await BillingService.generatePreview(billingPeriod.value.startDate, billingPeriod.value.endDate);

        if (result) {
            preview.value = result;
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: t('billing.success.previewGenerated'),
                life: 3000
            });
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: t('billing.error.previewFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error generating preview:', error);
        const errorMessage = error instanceof Error ? error.message : t('billing.error.previewFailed');
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: errorMessage,
            life: 5000
        });
    } finally {
        loading.value = false;
    }
}

async function commitBilling() {
    if (!preview.value) return;

    committing.value = true;
    try {
        const result = await BillingService.commitBillingRun(
            billingPeriod.value.startDate,
            billingPeriod.value.endDate,
            preview.value.charges
        );

        if (result) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: t('billing.success.committed', {
                    charges: result.chargesCreated,
                    existing: result.existingChargesBilled
                }),
                life: 5000
            });

            showCommitDialog.value = false;
            preview.value = null;

            // Refresh billing history
            await loadBillingHistory();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: t('billing.error.commitFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error committing billing:', error);
        const errorMessage = error instanceof Error ? error.message : t('billing.error.commitFailed');
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: errorMessage,
            life: 5000
        });
    } finally {
        committing.value = false;
    }
}

async function loadBillingHistory() {
    loadingHistory.value = true;
    try {
        const result = await BillingService.getBillingHistory();

        if (result) {
            billingHistory.value = result;
            console.log(`Loaded ${result.length} billing history records`);
        } else {
            billingHistory.value = [];
        }
    } catch (error) {
        console.error('Error loading billing history:', error);
        billingHistory.value = [];
    } finally {
        loadingHistory.value = false;
    }
}

onMounted(() => {
    loadBillingHistory();
});
</script>

<style scoped>
.truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
