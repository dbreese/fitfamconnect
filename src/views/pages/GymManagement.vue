<script setup lang="ts">
import { GymService } from '@/service/GymService';
import type { IGym } from '@/server/db/gym';
import Card from 'primevue/card';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Toast from 'primevue/toast';
import ProgressSpinner from 'primevue/progressspinner';
import AddressEditor from '@/components/AddressEditor.vue';
import Fluid from 'primevue/fluid';
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const toast = useToast();

const loading = ref(false);
const gym = ref<IGym | null>(null);
const hasGym = ref(false);

const formData = ref({
    name: '',
    description: '',
    billingAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US'
    },
    contact: {
        email: '',
        phone: ''
    }
});


async function loadGym() {
    loading.value = true;
    try {
        const result = await GymService.getMyGym();
        if (result) {
            gym.value = result;
            hasGym.value = true;
            // Populate form with existing data
            formData.value = {
                name: result.name,
                description: result.description || '',
                billingAddress: { ...result.billingAddress },
                contact: {
                    email: result.contact.email,
                    phone: result.contact.phone || ''
                }
            };
            console.log('Loaded gym data:', result);
        } else {
            hasGym.value = false;
            console.log('No gym found for user');
        }
    } catch (error) {
        console.error('Error loading gym:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('gym.error.loadFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function validateForm(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.value.name.trim()) {
        errors.push(t('gym.validation.nameRequired'));
    }

    if (!formData.value.billingAddress.street.trim()) {
        errors.push(t('gym.validation.streetRequired'));
    }

    if (!formData.value.billingAddress.city.trim()) {
        errors.push(t('gym.validation.cityRequired'));
    }

    if (!formData.value.billingAddress.state.trim()) {
        errors.push(t('gym.validation.stateRequired'));
    }

    if (!formData.value.billingAddress.zipCode.trim()) {
        errors.push(t('gym.validation.zipRequired'));
    }

    if (!formData.value.contact.email.trim()) {
        errors.push(t('gym.validation.emailRequired'));
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.value.contact.email && !emailRegex.test(formData.value.contact.email)) {
        errors.push(t('gym.validation.invalidEmail'));
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
            summary: t('gym.validation.validationError'),
            detail: validation.errors[0],
            life: 5000
        });
        return;
    }

    loading.value = true;
    try {
        const result = await GymService.updateMyGym(formData.value);

        if (result && result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: t('feedback.successTitle'),
                detail: t('gym.success.updated'),
                life: 3000
            });
            // Reload gym data to get updated information
            await loadGym();
        } else {
            toast.add({
                severity: 'error',
                summary: t('feedback.errorTitle'),
                detail: t('gym.error.updateFailed'),
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error updating gym:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('gym.error.updateFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    loadGym();
});
</script>

<template>
    <Fluid>
        <div class="flex progresscontainer">
            <div v-if="loading" class="spinner-overlay progressoverlay">
                <ProgressSpinner aria-label="Loading" />
            </div>

            <Card class="card-style">
                <template #title>{{ t('gym.title') }}</template>
                <template #subtitle v-if="hasGym">
                    {{ t('gym.subtitle') }}
                </template>
                <template #subtitle v-else>
                    {{ t('gym.noGymMessage') }}
                </template>

                <template #content v-if="hasGym">
                    <div class="grid grid-cols-1 gap-6">
                        <!-- Gym Code Display -->
                        <div v-if="gym" class="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h3 class="text-lg font-semibold text-blue-900 mb-2">{{ t('gym.gymCodeTitle') }}</h3>
                            <div class="flex items-center gap-4">
                                <span
                                    class="text-2xl font-mono font-bold text-blue-700 bg-white px-3 py-1 rounded border"
                                >
                                    {{ gym.gymCode }}
                                </span>
                                <p class="text-sm text-blue-600">
                                    {{ t('gym.gymCodeDescription') }}
                                </p>
                            </div>
                        </div>

                        <!-- Edit Form -->
                        <form @submit.prevent="handleSubmit" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Basic Information -->
                            <div class="col-span-full">
                                <h4 class="text-lg font-semibold mb-3">{{ t('gym.basicInfo') }}</h4>
                            </div>

                            <div class="field">
                                <label for="name" class="font-medium">{{ t('gym.gymName') }} *</label>
                                <InputText id="name" v-model="formData.name" required class="w-full" />
                            </div>

                            <div class="field col-span-full">
                                <label for="description" class="font-medium">{{ t('gym.description') }}</label>
                                <Textarea
                                    id="description"
                                    v-model="formData.description"
                                    rows="3"
                                    class="w-full"
                                    :placeholder="t('gym.descriptionPlaceholder')"
                                />
                            </div>

                            <!-- Billing Address -->
                            <div class="col-span-full">
                                <AddressEditor
                                    v-model="formData.billingAddress"
                                    field-id="gym-billing-address"
                                    :label="t('gym.billingAddress')"
                                    :street-placeholder="t('gym.streetAddress')"
                                    :city-placeholder="t('gym.city')"
                                    :state-placeholder="t('gym.selectState')"
                                    :zip-code-placeholder="t('gym.zipCode')"
                                    :country-placeholder="t('gym.country')"
                                    :show-country="true"
                                />
                            </div>

                            <!-- Contact Information -->
                            <div class="col-span-full">
                                <h4 class="text-lg font-semibold mb-3">{{ t('gym.contactInfo') }}</h4>
                            </div>

                            <div class="field">
                                <label for="email" class="font-medium">{{ t('gym.contactEmail') }} *</label>
                                <InputText
                                    id="email"
                                    v-model="formData.contact.email"
                                    type="email"
                                    required
                                    class="w-full"
                                />
                            </div>

                            <div class="field">
                                <label for="phone" class="font-medium">{{ t('gym.phoneNumber') }}</label>
                                <InputText id="phone" v-model="formData.contact.phone" type="tel" class="w-full" />
                            </div>

                            <!-- Submit Button -->
                            <div class="col-span-full flex justify-end pt-4">
                                <Button type="submit" :disabled="loading" class="px-6">
                                    <i class="pi pi-save mr-2"></i>
                                    {{ t('gym.updateButton') }}
                                </Button>
                            </div>
                        </form>
                    </div>
                </template>

                <template #content v-else-if="!loading">
                    <div class="text-center py-8">
                        <i class="pi pi-building text-4xl text-gray-400 mb-4"></i>
                        <h3 class="text-xl font-semibold text-gray-600 mb-2">{{ t('gym.noGymTitle') }}</h3>
                        <p class="text-gray-500 mb-4">
                            {{ t('gym.noGymMessage') }}
                        </p>
                        <p class="text-sm text-gray-400">
                            {{ t('gym.contactSupport') }}
                        </p>
                    </div>
                </template>
            </Card>

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
