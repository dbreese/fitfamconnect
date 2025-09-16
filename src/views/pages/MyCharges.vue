<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import Dialog from 'primevue/dialog';
import { BillingService } from '@/service/BillingService';
import { ChargeService } from '@/service/ChargeService';
import BillingPreview from '@/components/BillingPreview.vue';

const { t } = useI18n();
const toast = useToast();

const loading = ref(false);
const unbilledCharges = ref<any[]>([]);
const billingHistory = ref<any[]>([]);
const activeTab = ref(0);
const showBillingPreview = ref(false);
const selectedBilling = ref<any>(null);

async function loadUnbilledCharges() {
    loading.value = true;
    try {
        const result = await ChargeService.getUnbilledCharges();
        if (result) {
            unbilledCharges.value = result;
            console.log(`Loaded ${result.length} unbilled charges`);
        } else {
            unbilledCharges.value = [];
        }
    } catch (error) {
        console.error('Error loading unbilled charges:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('mycharges.error.loadUnbilledFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function loadBillingHistory() {
    loading.value = true;
    try {
        const result = await BillingService.getMemberBillingHistory();
        if (result) {
            // Transform the billing history data to match our interface
            const transformedHistory = result.map((billing: any) => ({
                billingId: billing._id,
                billingDate: billing.billingDate,
                startDate: billing.startDate,
                endDate: billing.endDate,
                totalAmount: billing.statistics.totalAmount, // Keep in cents for consistency
                chargeCount: billing.statistics.totalCharges,
                gymName: 'Your Gym', // This will be the user's gym
                gymId: billing.memberId // This is the gym owner's ID
            }));

            // Sort bills from most recent to oldest
            billingHistory.value = transformedHistory.sort((a: any, b: any) => {
                const dateA = new Date(a.billingDate).getTime();
                const dateB = new Date(b.billingDate).getTime();
                return dateB - dateA;
            });
            console.log(`Loaded ${transformedHistory.length} billing history records`);
        } else {
            billingHistory.value = [];
        }
    } catch (error) {
        console.error('Error loading billing history:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('mycharges.error.loadHistoryFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function formatCurrency(amountInCents: number): string {
    const amount = amountInCents / 100; // Convert cents to dollars
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getChargeTypeSeverity(type: string): string {
    switch (type) {
        case 'recurring':
            return 'info';
        case 'one-time':
            return 'warning';
        case 'pro-rated':
            return 'secondary';
        default:
            return 'info';
    }
}

async function onBillingRowClick(event: any) {
    const billing = event.data;
    if (!billing) return;

    loading.value = true;
    try {
        // Load the detailed billing information for this specific billing ID (member access)
        const result = await BillingService.getMemberBillingDetails(billing.billingId);
        if (result) {
            // Transform the billing details to match BillingPreview format
            const transformedDetails = {
                billingId: result.billingRecord._id,
                startDate: result.billingRecord.startDate,
                endDate: result.billingRecord.endDate,
                totalAmount: result.totalAmount, // Keep in cents for BillingPreview
                summary: result.summary,
                groupedCharges: result.groupedCharges.map((group: any) => ({
                    ...group,
                    subtotal: group.subtotal, // Keep in cents for BillingPreview
                    charges: group.charges.map((charge: any) => ({
                        ...charge,
                        amount: charge.amount // Keep in cents for BillingPreview
                    }))
                }))
            };

            selectedBilling.value = transformedDetails;
            showBillingPreview.value = true;
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: t('mycharges.error.loadBillingDetailsFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error loading billing details:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('mycharges.error.loadBillingDetailsFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    loadUnbilledCharges();
    loadBillingHistory();
});
</script>

<template>
    <Fluid>
        <div class="flex progresscontainer">
            <div v-if="loading" class="spinner-overlay progressoverlay">
                <ProgressSpinner aria-label="Loading" />
            </div>

            <Card class="card-style">
                <template #title>{{ t('mycharges.title') }}</template>
                <template #subtitle>{{ t('mycharges.subtitle') }}</template>
                <template #content>
                    <!-- No Data State -->
                    <div v-if="unbilledCharges.length === 0 && billingHistory.length === 0 && !loading" class="text-center py-12">
                        <div class="mb-6">
                            <i class="pi pi-credit-card text-6xl text-gray-300"></i>
                        </div>
                        <h3 class="text-xl font-semibold text-gray-700 mb-2">{{ t('mycharges.noData') }}</h3>
                        <p class="text-gray-500 mb-6">{{ t('mycharges.noDataMessage') }}</p>
                    </div>

                    <!-- Tab View -->
                    <TabView v-else v-model:activeIndex="activeTab">
                        <!-- Unbilled Charges Tab -->
                        <TabPanel :header="t('mycharges.unbilledCharges')" value="unbilled">
                            <div v-if="loading" class="text-center py-8">
                                <ProgressSpinner />
                                <div class="mt-2 text-gray-600">{{ t('mycharges.loadingUnbilled') }}</div>
                            </div>

                            <div v-else-if="unbilledCharges.length === 0" class="text-center py-8 text-gray-500">
                                <i class="pi pi-check-circle text-4xl mb-4"></i>
                                <div>{{ t('mycharges.noUnbilledCharges') }}</div>
                            </div>

                            <div v-else>
                                <div class="mb-3">
                                    <span class="text-sm text-gray-600">
                                        {{ unbilledCharges.length }} {{ t('mycharges.unbilledFound') }}
                                    </span>
                                </div>

                                <DataTable :value="unbilledCharges" paginator :rows="10" responsiveLayout="scroll">
                                    <Column field="date" :header="t('mycharges.date')" sortable>
                                        <template #body="{ data }">
                                            {{ formatDate(data.date) }}
                                        </template>
                                    </Column>

                                    <Column field="description" :header="t('mycharges.description')" sortable>
                                        <template #body="{ data }">
                                            <div>
                                                <div class="font-semibold">{{ data.description }}</div>
                                                <div v-if="data.planName" class="text-sm text-gray-600">{{ data.planName }}</div>
                                            </div>
                                        </template>
                                    </Column>

                                    <Column field="type" :header="t('mycharges.type')" sortable>
                                        <template #body="{ data }">
                                            <Tag
                                                :value="t(`mycharges.types.${data.type}`)"
                                                :severity="getChargeTypeSeverity(data.type)"
                                            />
                                        </template>
                                    </Column>

                                    <Column field="amount" :header="t('mycharges.amount')" sortable>
                                        <template #body="{ data }">
                                            <span class="font-semibold">{{ formatCurrency(data.amount) }}</span>
                                        </template>
                                    </Column>

                                    <Column field="gymName" :header="t('mycharges.gym')" sortable>
                                        <template #body="{ data }">
                                            {{ data.gymName }}
                                        </template>
                                    </Column>
                                </DataTable>
                            </div>
                        </TabPanel>

                        <!-- Billing History Tab -->
                        <TabPanel :header="t('mycharges.billingHistory')" value="history">
                            <div v-if="loading" class="text-center py-8">
                                <ProgressSpinner />
                                <div class="mt-2 text-gray-600">{{ t('mycharges.loadingHistory') }}</div>
                            </div>

                            <div v-else-if="billingHistory.length === 0" class="text-center py-8 text-gray-500">
                                <i class="pi pi-receipt text-4xl mb-4"></i>
                                <div>{{ t('mycharges.noBillingHistory') }}</div>
                            </div>

                            <div v-else>
                                <div class="mb-3">
                                    <span class="text-sm text-gray-600">
                                        {{ billingHistory.length }} {{ t('mycharges.billsFound') }}
                                    </span>
                                </div>

                                <DataTable
                                    :value="billingHistory"
                                    paginator
                                    :rows="10"
                                    responsiveLayout="scroll"
                                    @row-click="onBillingRowClick"
                                    class="cursor-pointer"
                                >
                                    <Column field="billingDate" :header="t('mycharges.billingDate')" sortable>
                                        <template #body="{ data }">
                                            {{ formatDate(data.billingDate) }}
                                        </template>
                                    </Column>

                                    <Column field="startDate" :header="t('mycharges.billingPeriod')" sortable>
                                        <template #body="{ data }">
                                            {{ formatDate(data.startDate) }} - {{ formatDate(data.endDate) }}
                                        </template>
                                    </Column>

                                    <Column field="totalAmount" :header="t('mycharges.totalAmount')" sortable>
                                        <template #body="{ data }">
                                            <span class="font-semibold">{{ formatCurrency(data.totalAmount) }}</span>
                                        </template>
                                    </Column>

                                    <Column field="chargeCount" :header="t('mycharges.chargeCount')" sortable>
                                        <template #body="{ data }">
                                            {{ data.chargeCount }} {{ t('mycharges.charges') }}
                                        </template>
                                    </Column>

                                    <Column field="gymName" :header="t('mycharges.gym')" sortable>
                                        <template #body="{ data }">
                                            {{ data.gymName }}
                                        </template>
                                    </Column>
                                </DataTable>
                            </div>
                        </TabPanel>
                    </TabView>
                </template>
            </Card>

            <Toast />
        </div>

        <!-- Billing Preview Dialog -->
        <Dialog
            v-model:visible="showBillingPreview"
            :modal="true"
            :header="t('mycharges.billingDetails')"
            :pt="{ root: { class: 'w-[95vw] md:w-[80vw] lg:w-[70vw]' } }"
        >
            <BillingPreview
                v-if="selectedBilling"
                :preview="selectedBilling"
                :title="t('mycharges.billingDetails')"
                :show-commit-button="false"
                :show-pdf-button="true"
            />
        </Dialog>
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
