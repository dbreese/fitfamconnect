<script setup lang="ts">
import { ProductService } from '@/service/ProductService';
import type { IProduct } from '@/server/db/product';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import { ref, onMounted, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();

const products = ref<any[]>([]);
const loading = ref(false);
const showDialog = ref(false);
const editMode = ref(false);
const selectedProduct = ref<any | null>(null);

const formData = ref({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
    price: 0, // In dollars (converted to cents for API)
    cost: null as number | null // In dollars (converted to cents for API)
});

const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' }
];

async function loadProducts() {
    loading.value = true;
    try {
        const result = await ProductService.getMyProducts();
        if (result) {
            products.value = result;
            console.log(`Loaded ${result.length} products`);
        } else {
            products.value = [];
        }
    } catch (error) {
        console.error('Error loading products:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('products.error.loadFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function openNewDialog() {
    editMode.value = false;
    selectedProduct.value = null;
    resetForm();
    showDialog.value = true;
}

function openEditDialog(product: any) {
    editMode.value = true;
    selectedProduct.value = product;
    formData.value = {
        name: product.name,
        description: product.description || '',
        status: product.status,
        price: product.price / 100, // Convert cents to dollars for display
        cost: product.cost ? product.cost / 100 : null // Convert cents to dollars for display
    };
    showDialog.value = true;
}

function resetForm() {
    formData.value = {
        name: '',
        description: '',
        status: 'active',
        price: 0,
        cost: null
    };
}

function validateForm(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.value.name.trim()) {
        errors.push(t('products.validation.nameRequired'));
    }

    if (formData.value.price < 0) {
        errors.push(t('products.validation.priceRequired'));
    }

    if (formData.value.cost !== null && formData.value.cost < 0) {
        errors.push(t('products.validation.costInvalid'));
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

async function handleSubmit() {
    const validation = validateForm();
    if (!validation.isValid) {
        toast.add({
            severity: 'warn',
            summary: t('products.validation.validationError'),
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
            cost: formData.value.cost ? Math.round(formData.value.cost * 100) : undefined, // Convert dollars to cents
            description: formData.value.description.trim() || undefined
        };

        if (editMode.value && selectedProduct.value) {
            result = await ProductService.updateProduct(selectedProduct.value._id, submitData);
        } else {
            result = await ProductService.createProduct(submitData);
        }

        if (result && (result.responseCode === 200 || result.responseCode === 201)) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: editMode.value ? t('products.success.updated') : t('products.success.created'),
                life: 3000
            });
            showDialog.value = false;
            await loadProducts();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: editMode.value ? t('products.error.updateFailed') : t('products.error.createFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error submitting product:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: editMode.value ? t('products.error.updateFailed') : t('products.error.createFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function confirmDelete(product: any) {
    confirm.require({
        message: t('products.deleteMessage', { name: product.name }),
        header: t('products.deleteConfirmation'),
        icon: 'pi pi-info-circle',
        rejectLabel: t('products.cancel'),
        rejectProps: {
            label: t('products.cancel'),
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: t('products.delete'),
            severity: 'danger'
        },
        accept: () => {
            deleteProduct(product);
        }
    });
}

async function deleteProduct(product: any) {
    loading.value = true;
    try {
        const result = await ProductService.deleteProduct(product._id);
        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: t('products.success.deleted'),
                life: 3000
            });
            await loadProducts();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: t('products.error.deleteFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('products.error.deleteFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function formatPrice(priceInCents: number): string {
    const price = (priceInCents / 100).toFixed(2);
    return `$${price}`;
}

function getStatusSeverity(status: string): string {
    return status === 'active' ? 'success' : 'secondary';
}

function getStatusLabel(status: string): string {
    return status === 'active' ? t('products.statuses.active') : t('products.statuses.inactive');
}

onMounted(() => {
    loadProducts();
});
</script>

<template>
    <Fluid>
        <div class="flex progresscontainer">
            <div v-if="loading" class="spinner-overlay progressoverlay">
                <ProgressSpinner aria-label="Loading" />
            </div>

            <Card class="card-style">
                <template #title>{{ t('products.title') }}</template>
                <template #subtitle>{{ t('products.subtitle') }}</template>
                <template #content>
                    <div class="flex items-center mb-3 w-full">
                        <div class="flex items-center gap-3 flex-1">
                            <span class="text-sm text-gray-600">
                                {{ products.length }} {{ t('products.productsFound') }}
                            </span>
                        </div>
                        <div class="flex gap-2 flex-shrink-0">
                            <Button
                                icon="pi pi-plus"
                                :label="t('products.newProduct')"
                                @click="openNewDialog"
                            />
                        </div>
                    </div>

                    <DataTable :value="products" paginator :rows="10" responsiveLayout="scroll">
                        <Column field="name" :header="t('products.name')" sortable>
                            <template #body="{ data }">
                                <div>
                                    <div class="font-semibold">{{ data.name }}</div>
                                    <div class="text-sm text-gray-600">{{ data.description || '' }}</div>
                                </div>
                            </template>
                        </Column>

                        <Column field="price" :header="t('products.price')" sortable>
                            <template #body="{ data }">
                                <span class="font-semibold">{{ formatPrice(data.price) }}</span>
                            </template>
                        </Column>

                        <Column field="cost" :header="t('products.cost')">
                            <template #body="{ data }">
                                <span v-if="data.cost" class="text-sm">{{ formatPrice(data.cost) }}</span>
                                <span v-else class="text-gray-400 text-sm">-</span>
                            </template>
                        </Column>

                        <Column field="status" :header="t('products.status')" sortable>
                            <template #body="{ data }">
                                <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
                            </template>
                        </Column>

                        <Column :header="t('products.actions')">
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
                :header="editMode ? t('products.editProduct') : t('products.newProduct')"
                :pt="{ root: { class: 'w-[90vw] md:w-[70vw] lg:w-[50vw]' } }"
            >
                <form @submit.prevent="handleSubmit" class="space-y-4">
                    <div class="field">
                        <label for="productName" class="font-medium">{{ t('products.name') }} *</label>
                        <InputText id="productName" v-model="formData.name" required class="w-full" />
                    </div>

                    <div class="field">
                        <label for="description" class="font-medium">{{ t('products.description') }}</label>
                        <Textarea
                            id="description"
                            v-model="formData.description"
                            rows="3"
                            class="w-full"
                            :placeholder="t('products.descriptionPlaceholder')"
                        />
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="field">
                            <label for="price" class="font-medium">{{ t('products.price') }} *</label>
                            <div class="flex">
                                <span class="flex items-center px-3 border border-r-0 bg-gray-50 rounded-l">$</span>
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
                            <small class="text-gray-500">{{ t('products.priceHelp') }}</small>
                        </div>

                        <div class="field">
                            <label for="cost" class="font-medium">{{ t('products.cost') }}</label>
                            <div class="flex">
                                <span class="flex items-center px-3 border border-r-0 bg-gray-50 rounded-l">$</span>
                                <InputNumber
                                    id="cost"
                                    v-model="formData.cost"
                                    mode="decimal"
                                    :minFractionDigits="2"
                                    :maxFractionDigits="2"
                                    :min="0"
                                    :step="0.01"
                                    class="flex-1"
                                    inputClass="rounded-l-none border-l-0"
                                />
                            </div>
                            <small class="text-gray-500">{{ t('products.costHelp') }}</small>
                        </div>
                    </div>

                    <div class="field">
                        <label for="status" class="font-medium">{{ t('products.status') }}</label>
                        <Select
                            id="status"
                            v-model="formData.status"
                            :options="statusOptions"
                            optionLabel="label"
                            optionValue="value"
                            class="w-full"
                        />
                    </div>
                </form>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button :label="t('products.cancel')" severity="secondary" @click="showDialog = false" />
                        <Button :label="t('products.save')" type="submit" @click="handleSubmit" />
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
