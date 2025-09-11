<script setup lang="ts">
import { BillingService } from '@/service/BillingService';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface Props {
    preview: any;
    showCommitButton?: boolean;
    title?: string;
}

const props = withDefaults(defineProps<Props>(), {
    showCommitButton: false,
    title: undefined
});

const emit = defineEmits<{
    commit: [];
}>();

function handleCommit() {
    emit('commit');
}
</script>

<template>
    <Card v-if="preview">
        <template #title>
            <div class="flex justify-content-between align-items-center">
                <span>{{ title || t('billing.previewResults') }}</span>
                <Tag
                    :value="BillingService.formatAmount(preview.totalAmount)"
                    severity="success"
                    class="text-lg"
                />
            </div>
        </template>
        <template #content>
            <!-- Summary -->
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
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

            <!-- Commit Button (only show when enabled) -->
            <div v-if="showCommitButton" class="flex justify-end mt-4">
                <Button
                    :label="t('billing.commitBilling')"
                    icon="pi pi-check"
                    severity="success"
                    @click="handleCommit"
                    :disabled="preview.charges.length === 0"
                />
            </div>
        </template>
    </Card>
</template>

<style scoped>
.truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
