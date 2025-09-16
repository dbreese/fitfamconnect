<script setup lang="ts">
import { BillingService } from '@/service/BillingService';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import { useI18n } from 'vue-i18n';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { t } = useI18n();

interface Props {
    preview: any;
    showCommitButton?: boolean;
    showPdfButton?: boolean;
    title?: string;
    allowMemberSelection?: boolean;
    selectedMembers?: any[];
    isFiltered?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    showCommitButton: false,
    showPdfButton: false,
    title: undefined,
    allowMemberSelection: false,
    selectedMembers: () => [],
    isFiltered: false
});

const emit = defineEmits<{
    commit: [];
    'update:selectedMembers': [members: any[]];
}>();

function handleCommit() {
    emit('commit');
}

function toggleMemberSelection(group: any) {
    const currentSelection = [...props.selectedMembers];
    const memberIndex = currentSelection.findIndex(m => m.memberId === group.memberId);

    if (memberIndex >= 0) {
        // Remove member from selection
        currentSelection.splice(memberIndex, 1);
    } else {
        // Add member to selection
        currentSelection.push({
            memberId: group.memberId,
            memberName: group.memberName
        });
    }

    emit('update:selectedMembers', currentSelection);
}

function isMemberSelected(group: any): boolean {
    return props.selectedMembers.some(m => m.memberId === group.memberId);
}

function generatePDF() {
    if (!props.preview) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Title
    doc.setFontSize(20);
    doc.text(props.title || t('billing.billingReport'), pageWidth / 2, 20, { align: 'center' });

    // Billing period
    doc.setFontSize(12);
    const startDate = BillingService.formatDate(props.preview.startDate);
    const endDate = BillingService.formatDate(props.preview.endDate);
    doc.text(`${t('billing.billingPeriod')}: ${startDate} - ${endDate}`, 20, 35);

    // Summary
    doc.setFontSize(14);
    doc.text(t('billing.summary'), 20, 50);
    doc.setFontSize(10);
    doc.text(`${t('billing.recurringPlans')}: ${props.preview.summary.recurringPlans}`, 20, 60);
    doc.text(`${t('billing.additionalCharges')}: ${props.preview.summary.oneTimeCharges}`, 20, 67);
    doc.text(`${t('billing.totalCharges')}: ${props.preview.summary.totalCharges}`, 20, 74);
    doc.text(`${t('billing.totalAmount')}: ${BillingService.formatAmount(props.preview.totalAmount)}`, 20, 81);

    let yPosition = 95;

    // Generate table for each member
    props.preview.groupedCharges.forEach((group: any) => {
        // Check if we need a new page
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }

        // Member header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${group.memberName} - ${BillingService.formatAmount(group.subtotal)}`, 20, yPosition);
        yPosition += 10;

        // Member charges table
        const tableData = group.charges.map((charge: any) => [
            BillingService.getChargeTypeDisplayName(charge.type),
            charge.description,
            BillingService.formatAmount(charge.amount),
            BillingService.formatDate(charge.date)
        ]);

        autoTable(doc, {
            startY: yPosition,
            head: [[t('billing.type'), t('billing.description'), t('billing.amount'), t('billing.date')]],
            body: tableData,
            margin: { left: 20, right: 20 },
            styles: { fontSize: 8 },
            headStyles: { fillColor: [66, 139, 202] },
            didDrawPage: (data: any) => {
                yPosition = data.cursor.y + 10;
            }
        });

        yPosition += 10;
    });

    // Save the PDF
    const fileName = `billing-${startDate}-${endDate}.pdf`;
    doc.save(fileName);
}

// Expose the generatePDF function so parent components can call it
defineExpose({
    generatePDF
});
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
                    <div class="flex items-center gap-3">
                        <Checkbox
                            v-if="allowMemberSelection"
                            :modelValue="isMemberSelected(group)"
                            @update:modelValue="() => toggleMemberSelection(group)"
                            binary
                        />
                        <h4
                            class="text-lg font-semibold text-gray-800"
                            :class="{ 'cursor-pointer hover:text-blue-600': allowMemberSelection }"
                            @click="allowMemberSelection ? toggleMemberSelection(group) : null"
                        >
                            {{ group.memberName }}
                        </h4>
                    </div>
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

            <!-- Action Buttons -->
            <div v-if="showCommitButton || showPdfButton" class="flex justify-end gap-2 mt-4">
                <Button
                    v-if="showPdfButton"
                    :label="t('billing.generatePdf')"
                    icon="pi pi-file-pdf"
                    severity="secondary"
                    size="small"
                    class="p-button-sm compact-button"
                    @click="generatePDF"
                />
                <Button
                    v-if="showCommitButton"
                    :label="t('billing.commitBilling')"
                    icon="pi pi-check"
                    severity="success"
                    size="small"
                    class="p-button-sm compact-button"
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
