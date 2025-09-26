<template>
    <div class="address-editor">
        <div v-if="showLabel" class="field">
            <label :for="`${fieldId}-street`" class="font-semibold">{{ label }} *</label>
        </div>

        <div class="address-fields">
            <!-- Street Address -->
            <div class="field">
                <InputText
                    :id="`${fieldId}-street`"
                    v-model="localAddress.street"
                    :placeholder="streetPlaceholder"
                    class="w-full"
                    :class="{ 'p-invalid': errors.street }"
                    :required="required"
                />
                <small v-if="errors.street" class="p-error">{{ errors.street }}</small>
            </div>

            <!-- City, State, Zip Row -->
            <div class="flex gap-2">
                <div class="field flex-1">
                    <InputText
                        :id="`${fieldId}-city`"
                        v-model="localAddress.city"
                        :placeholder="cityPlaceholder"
                        class="w-full"
                        :class="{ 'p-invalid': errors.city }"
                        :required="required"
                    />
                    <small v-if="errors.city" class="p-error">{{ errors.city }}</small>
                </div>

                <div class="field" style="width: 100px">
                    <Select
                        :id="`${fieldId}-state`"
                        v-model="localAddress.state"
                        :options="stateOptions"
                        optionLabel="label"
                        optionValue="value"
                        :placeholder="statePlaceholder"
                        class="w-full"
                        :class="{ 'p-invalid': errors.state }"
                        :required="required"
                    />
                    <small v-if="errors.state" class="p-error">{{ errors.state }}</small>
                </div>

                <div class="field" style="width: 120px">
                    <InputText
                        :id="`${fieldId}-zipCode`"
                        v-model="localAddress.zipCode"
                        :placeholder="zipCodePlaceholder"
                        class="w-full"
                        :class="{ 'p-invalid': errors.zipCode }"
                        :required="required"
                    />
                    <small v-if="errors.zipCode" class="p-error">{{ errors.zipCode }}</small>
                </div>
            </div>

            <!-- Country (optional, hidden by default) -->
            <div v-if="showCountry" class="field">
                <InputText
                    :id="`${fieldId}-country`"
                    v-model="localAddress.country"
                    :placeholder="countryPlaceholder"
                    class="w-full"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

interface Props {
    modelValue: Address;
    fieldId?: string;
    label?: string;
    showLabel?: boolean;
    required?: boolean;
    showCountry?: boolean;
    streetPlaceholder?: string;
    cityPlaceholder?: string;
    statePlaceholder?: string;
    zipCodePlaceholder?: string;
    countryPlaceholder?: string;
    errors?: Record<string, string>;
}

const props = withDefaults(defineProps<Props>(), {
    fieldId: 'address',
    label: 'Address',
    showLabel: true,
    required: true,
    showCountry: false,
    streetPlaceholder: 'Street Address',
    cityPlaceholder: 'City',
    statePlaceholder: 'State',
    zipCodePlaceholder: 'ZIP Code',
    countryPlaceholder: 'Country',
    errors: () => ({})
});

const emit = defineEmits<{
    'update:modelValue': [value: Address];
}>();

// Local reactive copy of the address
const localAddress = ref<Address>({ ...props.modelValue });

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
    localAddress.value = { ...newValue };
}, { deep: true });

// Watch for internal changes and emit updates
watch(localAddress, (newValue) => {
    emit('update:modelValue', { ...newValue });
}, { deep: true });

// US State options
const stateOptions = [
    { label: 'Alabama', value: 'AL' },
    { label: 'Alaska', value: 'AK' },
    { label: 'Arizona', value: 'AZ' },
    { label: 'Arkansas', value: 'AR' },
    { label: 'California', value: 'CA' },
    { label: 'Colorado', value: 'CO' },
    { label: 'Connecticut', value: 'CT' },
    { label: 'Delaware', value: 'DE' },
    { label: 'Florida', value: 'FL' },
    { label: 'Georgia', value: 'GA' },
    { label: 'Hawaii', value: 'HI' },
    { label: 'Idaho', value: 'ID' },
    { label: 'Illinois', value: 'IL' },
    { label: 'Indiana', value: 'IN' },
    { label: 'Iowa', value: 'IA' },
    { label: 'Kansas', value: 'KS' },
    { label: 'Kentucky', value: 'KY' },
    { label: 'Louisiana', value: 'LA' },
    { label: 'Maine', value: 'ME' },
    { label: 'Maryland', value: 'MD' },
    { label: 'Massachusetts', value: 'MA' },
    { label: 'Michigan', value: 'MI' },
    { label: 'Minnesota', value: 'MN' },
    { label: 'Mississippi', value: 'MS' },
    { label: 'Missouri', value: 'MO' },
    { label: 'Montana', value: 'MT' },
    { label: 'Nebraska', value: 'NE' },
    { label: 'Nevada', value: 'NV' },
    { label: 'New Hampshire', value: 'NH' },
    { label: 'New Jersey', value: 'NJ' },
    { label: 'New Mexico', value: 'NM' },
    { label: 'New York', value: 'NY' },
    { label: 'North Carolina', value: 'NC' },
    { label: 'North Dakota', value: 'ND' },
    { label: 'Ohio', value: 'OH' },
    { label: 'Oklahoma', value: 'OK' },
    { label: 'Oregon', value: 'OR' },
    { label: 'Pennsylvania', value: 'PA' },
    { label: 'Rhode Island', value: 'RI' },
    { label: 'South Carolina', value: 'SC' },
    { label: 'South Dakota', value: 'SD' },
    { label: 'Tennessee', value: 'TN' },
    { label: 'Texas', value: 'TX' },
    { label: 'Utah', value: 'UT' },
    { label: 'Vermont', value: 'VT' },
    { label: 'Virginia', value: 'VA' },
    { label: 'Washington', value: 'WA' },
    { label: 'West Virginia', value: 'WV' },
    { label: 'Wisconsin', value: 'WI' },
    { label: 'Wyoming', value: 'WY' }
];

// Validation function
const validate = (): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    if (props.required) {
        if (!localAddress.value.street.trim()) {
            errors.street = t('validation.streetRequired');
        }
        if (!localAddress.value.city.trim()) {
            errors.city = t('validation.cityRequired');
        }
        if (!localAddress.value.state.trim()) {
            errors.state = t('validation.stateRequired');
        }
        if (!localAddress.value.zipCode.trim()) {
            errors.zipCode = t('validation.zipRequired');
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// Expose validation function to parent
defineExpose({
    validate
});
</script>

<style scoped>
.address-editor {
    width: 100%;
}

.field {
    margin-bottom: 1rem;
}

.field label {
    display: block;
    margin-bottom: 0.5rem;
}

.address-fields {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.flex {
    display: flex;
}

.gap-2 {
    gap: 0.5rem;
}

.flex-1 {
    flex: 1;
}

.w-full {
    width: 100%;
}

.p-error {
    color: var(--red-500);
    font-size: 0.875rem;
    margin-top: 0.25rem;
}

.p-invalid {
    border-color: var(--red-500);
}
</style>
