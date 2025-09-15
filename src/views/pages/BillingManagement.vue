<template>
    <Fluid>
        <div class="card">
            <div class="flex justify-content-between align-items-center mb-3">
                <div>
                    <h2 class="text-2xl font-bold text-gray-900 m-0">{{ showTabs ? t('billing.title') : t('billingReports.title') }}</h2>
                    <p class="text-gray-600 mt-1 mb-0">{{ showTabs ? t('billing.subtitle') : t('billingReports.subtitle') }}</p>
                </div>
            </div>

            <TabView v-if="showTabs" v-model:activeIndex="activeTab">
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
                                            @date-select="onStartDateChange"
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
                                        size="small"
                                        @click="generatePreview"
                                        :loading="loading"
                                        :disabled="!billingPeriod.startDate || !billingPeriod.endDate"
                                    />
                                </div>
                            </template>
                        </Card>

                        <!-- Preview Results -->
                        <BillingPreview
                            :preview="preview"
                            :show-commit-button="true"
                            :show-pdf-button="true"
                            @commit="showCommitDialog = true"
                        />
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
                                selectionMode="single"
                                @row-select="showBillingDetails($event.data)"
                                class="cursor-pointer"
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

            <!-- Billing History (shown when tabs are hidden) -->
            <Card v-if="!showTabs">
                <template #title>{{ t('billing.billingHistory') }}</template>
                <template #content>
                    <DataTable
                        :value="billingHistory"
                        :loading="loadingHistory"
                        responsiveLayout="scroll"
                        stripedRows
                        selectionMode="single"
                        @row-select="showBillingDetails($event.data)"
                        class="cursor-pointer"
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
                        <Button :label="t('billing.cancel')" severity="secondary" size="small" class="p-button-sm compact-button" @click="showCommitDialog = false" />
                        <Button
                            :label="t('billing.confirmCommit')"
                            severity="success"
                            icon="pi pi-check"
                            size="small"
                            class="p-button-sm compact-button"
                            @click="commitBilling"
                            :loading="committing"
                        />
                    </div>
                </template>
            </Dialog>

            <!-- Billing Details Dialog -->
            <Dialog
                v-model:visible="showDetailsDialog"
                :modal="true"
                :header="t('billing.billingDetails')"
                :pt="{ root: { class: 'w-[95vw] md:w-[85vw] lg:w-[75vw]' } }"
            >
                <div v-if="loadingDetails" class="text-center py-8">
                    <ProgressSpinner />
                </div>

                <div v-else-if="selectedBilling" class="space-y-4">
                    <!-- Billing Info -->
                    <div class="p-4 bg-gray-50 rounded-lg">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{ t('billing.billingDate') }}</label>
                                <div>{{ BillingService.formatDate(selectedBilling.billingDate) }}</div>
                            </div>
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{ t('billing.startDate') }}</label>
                                <div>{{ BillingService.formatDate(selectedBilling.startDate) }}</div>
                            </div>
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{ t('billing.endDate') }}</label>
                                <div>{{ BillingService.formatDate(selectedBilling.endDate) }}</div>
                            </div>
                            <div>
                                <label class="font-medium text-sm text-gray-600">{{ t('billing.totalAmount') }}</label>
                                <div class="text-lg font-bold text-green-600">{{ BillingService.formatAmount(billingDetailsPreview?.totalAmount || 0) }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Billing Details Preview -->
                    <BillingPreview
                        ref="billingPreviewComponent"
                        :preview="billingDetailsPreview"
                        :title="t('billing.billingDetails')"
                        :show-commit-button="false"
                        :allow-member-selection="true"
                        :is-filtered="isFiltered"
                        v-model:selectedMembers="selectedMembers"
                    />
                </div>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button
                            :label="t('billing.close')"
                            size="small"
                            class="p-button-sm compact-button"
                            @click="showDetailsDialog = false"
                        />
                        <Button
                            v-if="billingDetailsPreview"
                            :label="t('billing.generatePdf')"
                            icon="pi pi-file-pdf"
                            severity="secondary"
                            size="small"
                            class="p-button-sm compact-button"
                            @click="billingPreviewComponent?.generatePDF()"
                            :disabled="!billingDetailsPreview.charges || billingDetailsPreview.charges.length === 0"
                        />
                        <Button
                            v-if="allowMemberSelection"
                            :label="isFiltered ? t('billing.reset') : t('billing.filterSelected')"
                            :icon="isFiltered ? 'pi pi-refresh' : 'pi pi-filter'"
                            :severity="isFiltered ? 'secondary' : 'info'"
                            size="small"
                            class="p-button-sm compact-button"
                            @click="isFiltered ? resetFilter() : generateInvoiceForSelected()"
                            :disabled="!isFiltered && selectedMembers.length === 0"
                        />
                    </div>
                </template>
            </Dialog>

            <Toast />
        </div>
    </Fluid>
</template>

<script setup lang="ts">
import { ref, onMounted, withDefaults } from 'vue';

interface Props {
    showTabs?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    showTabs: true
});
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
import ProgressSpinner from 'primevue/progressspinner';
import BillingPreview from '@/components/BillingPreview.vue';

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
const selectedBilling = ref<any | null>(null);
const billingDetailsPreview = ref<any | null>(null);
const originalBillingDetails = ref<any | null>(null);
const showDetailsDialog = ref(false);
const loadingDetails = ref(false);
const selectedMembers = ref<any[]>([]);
const isFiltered = ref(false);
const billingPreviewComponent = ref<any>(null);
const activeTab = ref(0);
const allowMemberSelection = ref(true);

// Functions
function onStartDateChange() {
    if (billingPeriod.value.startDate) {
        const startDate = new Date(billingPeriod.value.startDate);
        const lastDayOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        billingPeriod.value.endDate = lastDayOfMonth;
    }
}

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

async function showBillingDetails(billing: any) {
    selectedBilling.value = billing;
    loadingDetails.value = true;
    showDetailsDialog.value = true;

    try {
        const result = await BillingService.getBillingDetails(billing._id);
        if (result) {
            // Convert billing details to preview format for the dialog
            const detailsData = {
                startDate: result.billingRecord.startDate,
                endDate: result.billingRecord.endDate,
                charges: result.charges,
                groupedCharges: result.groupedCharges,
                totalAmount: result.totalAmount,
                summary: result.summary
            };

            billingDetailsPreview.value = detailsData;
            originalBillingDetails.value = detailsData; // Store original for reset
            isFiltered.value = false;
            selectedMembers.value = []; // Clear any previous selections
            console.log(`Loaded billing details for ${billing._id}`);
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: t('billing.error.detailsFailed'),
                life: 3000
            });
            showDetailsDialog.value = false;
        }
    } catch (error) {
        console.error('Error loading billing details:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('billing.error.detailsFailed'),
            life: 3000
        });
        showDetailsDialog.value = false;
    } finally {
        loadingDetails.value = false;
    }
}

function generateInvoiceForSelected() {
    if (!billingDetailsPreview.value || selectedMembers.value.length === 0) return;

    // Filter the billing details to only include selected members
    const selectedMemberIds = new Set(selectedMembers.value.map(m => m.memberId));

    const filteredGroupedCharges = billingDetailsPreview.value.groupedCharges.filter(
        (group: any) => selectedMemberIds.has(group.memberId)
    );

    const filteredCharges = billingDetailsPreview.value.charges.filter(
        (charge: any) => selectedMemberIds.has(charge.memberId.toString())
    );

    const totalAmount = filteredCharges.reduce((sum: number, charge: any) => sum + charge.amount, 0);

    // Create filtered preview for selected members and update the dialog content
    const filteredPreview = {
        startDate: billingDetailsPreview.value.startDate,
        endDate: billingDetailsPreview.value.endDate,
        charges: filteredCharges,
        groupedCharges: filteredGroupedCharges,
        totalAmount: totalAmount,
        summary: {
            oneTimeCharges: filteredCharges.filter((c: any) => c.type === 'one-time-charge').length,
            recurringPlans: filteredCharges.filter((c: any) => c.type === 'recurring-plan').length,
            totalCharges: filteredCharges.length
        }
    };

    // Update the dialog content to show filtered data
    billingDetailsPreview.value = filteredPreview;

    // Clear selections and mark as filtered
    selectedMembers.value = [];
    isFiltered.value = true;

    toast.add({
        severity: 'info',
        summary: t('feedback.successTitle'),
        detail: t('billing.invoiceGenerated', { memberCount: selectedMemberIds.size }),
        life: 3000
    });
}

function resetFilter() {
    if (originalBillingDetails.value) {
        billingDetailsPreview.value = originalBillingDetails.value;
        selectedMembers.value = [];
        isFiltered.value = false;

        toast.add({
            severity: 'info',
            summary: t('feedback.successTitle'),
            detail: t('billing.filterReset'),
            life: 2000
        });
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
