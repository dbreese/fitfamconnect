<template>
    <div class="grid">
        <div class="col-12">
            <div class="card">
                <div class="flex justify-content-between align-items-center mb-4">
                    <h5 class="m-0">{{ translate('root.clearBilling.title') }}</h5>
                </div>

                <div class="mb-4">
                    <p class="text-600 line-height-3">
                        {{ translate('root.clearBilling.description') }}
                    </p>
                </div>

                <div class="p-3 surface-100 border-round mb-4">
                    <div class="flex align-items-center mb-2">
                        <i class="pi pi-exclamation-triangle text-orange-500 mr-2"></i>
                        <span class="font-semibold text-orange-500">Warning</span>
                    </div>
                    <p class="text-600 m-0">
                        {{ translate('root.clearBilling.confirmWarning') }}
                    </p>
                </div>

                <div class="flex justify-content-start">
                    <Button
                        :label="translate('root.clearBilling.buttonText')"
                        icon="pi pi-trash"
                        severity="danger"
                        :loading="isClearing"
                        :disabled="isClearing"
                        @click="showConfirmDialog = true"
                    />
                </div>
            </div>
        </div>
    </div>

    <!-- Confirmation Dialog -->
    <Dialog
        v-model:visible="showConfirmDialog"
        :header="translate('root.clearBilling.confirmTitle')"
        :modal="true"
        :closable="!isClearing"
        :draggable="false"
        :resizable="false"
        class="p-fluid"
        style="width: 500px"
    >
        <div class="confirmation-content">
            <div class="flex align-items-center mb-3">
                <i class="pi pi-exclamation-triangle text-red-500 text-4xl mr-3"></i>
                <div>
                    <h6 class="text-red-500 m-0 mb-2 font-semibold">Destructive Action</h6>
                    <p class="text-600 m-0 line-height-3">
                        {{ translate('root.clearBilling.confirmMessage') }}
                    </p>
                </div>
            </div>

            <div class="p-3 surface-50 border-1 border-red-200 border-round">
                <div class="flex align-items-center">
                    <i class="pi pi-times-circle text-red-500 mr-2"></i>
                    <span class="text-red-600 font-semibold">
                        {{ translate('root.clearBilling.confirmWarning') }}
                    </span>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-content-between w-full">
                <Button
                    :label="translate('root.clearBilling.cancelButton')"
                    icon="pi pi-times"
                    severity="secondary"
                    :disabled="isClearing"
                    @click="showConfirmDialog = false"
                />
                <Button
                    :label="translate('root.clearBilling.confirmButton')"
                    icon="pi pi-trash"
                    severity="danger"
                    :loading="isClearing"
                    :disabled="isClearing"
                    @click="clearBillingData"
                />
            </div>
        </template>
    </Dialog>
</template>

<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { translate } from '@/i18n/i18n';
import { BillingService } from '@/service/BillingService';

const toast = useToast();

// Reactive state
const showConfirmDialog = ref(false);
const isClearing = ref(false);

/**
 * Clear all billing data
 */
const clearBillingData = async () => {
    isClearing.value = true;

    try {
        console.log('ClearBilling: Starting clear billing data operation');

        const response = await BillingService.clearAllBillingData();

        if (response.responseCode === 200) {
            const data = response.body.data;

            console.log('ClearBilling: Billing data cleared successfully', data);

            // Show success message with details
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: `${translate('root.clearBilling.success')} (${data.totalDeleted} records deleted)`,
                life: 5000
            });

            showConfirmDialog.value = false;
        } else {
            console.error('ClearBilling: Unexpected response code', response.responseCode);
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: translate('root.clearBilling.error'),
                life: 5000
            });
        }
    } catch (error) {
        console.error('ClearBilling: Error clearing billing data', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: translate('root.clearBilling.error'),
            life: 5000
        });
    } finally {
        isClearing.value = false;
    }
};
</script>

<style scoped>
.confirmation-content {
    min-height: 120px;
}
</style>
