<script setup lang="ts">
import { ref, watch, watchEffect, onMounted } from 'vue';
// @ts-ignore
import { useLayout } from '@/layout/composables/layout';
import { dark, experimental__simple } from '@clerk/themes';
import { useUser } from '@clerk/vue';
import { type SessionWithActivitiesResource } from '@clerk/types';
import Card from 'primevue/card';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Toast from 'primevue/toast';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import NameValuePair from '@/components/NameValuePair.vue';
import { user } from '@/service/SessionUtils';
import { MemberService } from '@/service/MemberService';

const isLoading = ref(false);
const toast = useToast();

// Member profile management
const memberProfile = ref<any>(null);
const isEditingProfile = ref(false);
const isUpdatingProfile = ref(false);

// Editable fields
const editPhone = ref('');
const editAddress = ref({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
});

// Pin code management
const showPinCodeDialog = ref(false);
const newPinCode = ref('');
const confirmPinCode = ref('');
const hasPinCode = ref(false);

const { t } = useI18n();

const { isSignedIn, user: clerkUser, isLoaded } = useUser();
const { layoutConfig, toggleDarkMode, isDarkTheme } = useLayout();

const clerkTheme = ref(experimental__simple);

// TODO: Allow user to kill sessions?
const sessions = ref<SessionWithActivitiesResource[]>();

watch(
    [layoutConfig.darkTheme],
    ([newThemeVal]) => {
        if (newThemeVal) {
            clerkTheme.value = dark;
        } else {
            clerkTheme.value = experimental__simple;
        }
    }
);

watchEffect(async () => {
    console.log('Something changed');
    if (isLoaded && clerkUser.value) {
        try {
            sessions.value = await clerkUser.value!.getSessions();
            sessions.value!.forEach(async (session) => {
                console.log(`Session ID: ${session.id}, Status: ${session.status} ${JSON.stringify(session)}`);
            });
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    }
});

// Load member profile information
async function loadMemberProfile() {
    try {
        const result = await MemberService.getProfile();
        if (result && result.body?.data && result.body.data.length > 0) {
            memberProfile.value = result.body.data[0]; // Use first member record for display
            hasPinCode.value = result.body.data.some((member: any) => member.hasPinCode);

            // Initialize editable fields
            editPhone.value = memberProfile.value.phone || '';
            editAddress.value = {
                street: memberProfile.value.address?.street || '',
                city: memberProfile.value.address?.city || '',
                state: memberProfile.value.address?.state || '',
                zipCode: memberProfile.value.address?.zipCode || '',
                country: memberProfile.value.address?.country || 'US'
            };
        }
    } catch (error) {
        console.error('Error loading member profile:', error);
    }
}

// Profile editing functions
function startEditingProfile() {
    isEditingProfile.value = true;
}

function cancelEditingProfile() {
    isEditingProfile.value = false;
    // Reset to original values
    editPhone.value = memberProfile.value?.phone || '';
    editAddress.value = {
        street: memberProfile.value?.address?.street || '',
        city: memberProfile.value?.address?.city || '',
        state: memberProfile.value?.address?.state || '',
        zipCode: memberProfile.value?.address?.zipCode || '',
        country: memberProfile.value?.address?.country || 'US'
    };
}

async function saveProfile() {
    isUpdatingProfile.value = true;

    try {
        const updates: any = {};

        // Only include fields that have changed
        if (editPhone.value !== (memberProfile.value?.phone || '')) {
            updates.phone = editPhone.value;
        }

        const currentAddress = memberProfile.value?.address || {};
        if (JSON.stringify(editAddress.value) !== JSON.stringify(currentAddress)) {
            updates.address = editAddress.value;
        }

        if (Object.keys(updates).length === 0) {
            toast.add({
                severity: 'info',
                summary: t('profile.noChanges'),
                detail: t('profile.noChangesDetail'),
                life: 3000
            });
            isEditingProfile.value = false;
            return;
        }

        const result = await MemberService.updateProfile(updates);

        if (result && result.responseCode === 200) {
            // Update local profile data
            memberProfile.value = result.body.data.profile[0];
            isEditingProfile.value = false;
            toast.add({
                severity: 'success',
                summary: t('profile.updateSuccess'),
                detail: t('profile.updateSuccessDetail'),
                life: 3000
            });
        } else {
            throw new Error(result?.body?.message || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        toast.add({
            severity: 'error',
            summary: t('profile.updateError'),
            detail: error instanceof Error ? error.message : t('profile.updateErrorDetail'),
            life: 3000
        });
    } finally {
        isUpdatingProfile.value = false;
    }
}

// Pin code management functions
function openPinCodeDialog() {
    newPinCode.value = '';
    confirmPinCode.value = '';
    showPinCodeDialog.value = true;
}

function closePinCodeDialog() {
    showPinCodeDialog.value = false;
    newPinCode.value = '';
    confirmPinCode.value = '';
}

async function updatePinCode() {
    if (!newPinCode.value || !confirmPinCode.value) {
        toast.add({
            severity: 'error',
            summary: t('profile.pinCode.errorTitle'),
            detail: t('profile.pinCode.fillBothFields'),
            life: 3000
        });
        return;
    }

    if (newPinCode.value !== confirmPinCode.value) {
        toast.add({
            severity: 'error',
            summary: t('profile.pinCode.errorTitle'),
            detail: t('profile.pinCode.mismatch'),
            life: 3000
        });
        return;
    }

    if (!/^\d{4,6}$/.test(newPinCode.value)) {
        toast.add({
            severity: 'error',
            summary: t('profile.pinCode.errorTitle'),
            detail: t('profile.pinCode.invalidFormat'),
            life: 3000
        });
        return;
    }

    isUpdatingProfile.value = true;

    try {
        const result = await MemberService.updateProfile({ pinCode: newPinCode.value });

        if (result && result.responseCode === 200) {
            hasPinCode.value = true;
            memberProfile.value = result.body.data.profile[0];
            closePinCodeDialog();
            toast.add({
                severity: 'success',
                summary: t('profile.pinCode.successTitle'),
                detail: t('profile.pinCode.updatedSuccessfully'),
                life: 3000
            });
        } else {
            throw new Error(result?.body?.message || 'Failed to update pin code');
        }
    } catch (error) {
        console.error('Error updating pin code:', error);
        toast.add({
            severity: 'error',
            summary: t('profile.pinCode.errorTitle'),
            detail: error instanceof Error ? error.message : t('profile.pinCode.updateFailed'),
            life: 3000
        });
    } finally {
        isUpdatingProfile.value = false;
    }
}

async function removePinCode() {
    isUpdatingProfile.value = true;

    try {
        const result = await MemberService.updateProfile({ pinCode: null });

        if (result && result.responseCode === 200) {
            hasPinCode.value = false;
            memberProfile.value = result.body.data.profile[0];
            toast.add({
                severity: 'success',
                summary: t('profile.pinCode.successTitle'),
                detail: t('profile.pinCode.removedSuccessfully'),
                life: 3000
            });
        } else {
            throw new Error(result?.body?.message || 'Failed to remove pin code');
        }
    } catch (error) {
        console.error('Error removing pin code:', error);
        toast.add({
            severity: 'error',
            summary: t('profile.pinCode.errorTitle'),
            detail: error instanceof Error ? error.message : t('profile.pinCode.removeFailed'),
            life: 3000
        });
    } finally {
        isUpdatingProfile.value = false;
    }
}

// Helper function to format address
function formatAddress(address: any): string {
    if (!address) return t('profile.memberInfo.notSet');

    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zipCode) parts.push(address.zipCode);

    return parts.length > 0 ? parts.join(', ') : t('profile.memberInfo.notSet');
}

onMounted(() => {
    loadMemberProfile();
});

</script>

<template>
    <Fluid>
        <div v-if="!isLoaded || isLoading" class="spinner-overlay progressoverlay">
            <ProgressSpinner aria-label="Loading" />
        </div>

        <div v-else>
            <Card class="card-style">
                <template #title>
                    {{ t('profile.title') }}
                    <div style="display: flex; justify-content: flex-end">
                        <button type="button" class="layout-topbar-action" @click="toggleDarkMode">
                            <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"></i>
                        </button>
                    </div>
                </template>
                <template #content>
                    <div class="flex items-center gap-2">
                        <Avatar :image="clerkUser!.imageUrl" shape="circle" size="large" />
                        <span class="font-bold">{{ user.fullname }}</span>
                    </div>
                    <br />
                    <NameValuePair
                        name="Username"
                        :value="user.username"
                        icon="pi-user"
                        iconSize="medium"
                        class="name-value-pair"
                    />
                    <NameValuePair name="Email" :value="user.email" icon="pi-envelope" iconSize="medium" />
                    <br />

                    <!-- Member Profile Information -->
                    <div v-if="memberProfile" class="member-profile-section">
                        <div class="flex align-items-center justify-content-between mb-3">
                            <h4>{{ t('profile.memberInfo.title') }}</h4>
                            <Button
                                v-if="!isEditingProfile"
                                :label="t('profile.memberInfo.edit')"
                                icon="pi pi-pencil"
                                size="small"
                                @click="startEditingProfile"
                            />
                        </div>

                        <!-- Display Mode -->
                        <div v-if="!isEditingProfile">
                            <NameValuePair
                                name="Phone"
                                :value="memberProfile.phone || t('profile.memberInfo.notSet')"
                                icon="pi-phone"
                                iconSize="medium"
                            />
                            <NameValuePair
                                name="Address"
                                :value="formatAddress(memberProfile.address)"
                                icon="pi-map-marker"
                                iconSize="medium"
                            />
                        </div>

                        <!-- Edit Mode -->
                        <div v-else class="edit-form">
                            <div class="field">
                                <label for="editPhone" class="font-semibold">{{ t('profile.memberInfo.phone') }}</label>
                                <InputText
                                    id="editPhone"
                                    v-model="editPhone"
                                    :placeholder="t('profile.memberInfo.phonePlaceholder')"
                                    class="w-full"
                                />
                            </div>

                            <div class="field">
                                <label class="font-semibold">{{ t('profile.memberInfo.address') }}</label>
                                <div class="address-fields">
                                    <InputText
                                        v-model="editAddress.street"
                                        :placeholder="t('profile.memberInfo.street')"
                                        class="w-full mb-2"
                                    />
                                    <div class="flex gap-2">
                                        <InputText
                                            v-model="editAddress.city"
                                            :placeholder="t('profile.memberInfo.city')"
                                            class="flex-1"
                                        />
                                        <InputText
                                            v-model="editAddress.state"
                                            :placeholder="t('profile.memberInfo.state')"
                                            style="width: 100px"
                                        />
                                        <InputText
                                            v-model="editAddress.zipCode"
                                            :placeholder="t('profile.memberInfo.zipCode')"
                                            style="width: 120px"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div class="flex gap-2 mt-3">
                                <Button
                                    :label="t('profile.memberInfo.cancel')"
                                    icon="pi pi-times"
                                    severity="secondary"
                                    @click="cancelEditingProfile"
                                    :disabled="isUpdatingProfile"
                                />
                                <Button
                                    :label="t('profile.memberInfo.save')"
                                    icon="pi pi-check"
                                    @click="saveProfile"
                                    :loading="isUpdatingProfile"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Pin Code Management -->
                    <div class="pin-code-section">
                        <h4>{{ t('profile.pinCode.title') }}</h4>
                        <div class="flex align-items-center gap-2">
                            <span class="pin-code-status">
                                {{ hasPinCode ? t('profile.pinCode.hasPinCode') : t('profile.pinCode.noPinCode') }}
                            </span>
                            <Button
                                :label="hasPinCode ? t('profile.pinCode.changePinCode') : t('profile.pinCode.setPinCode')"
                                icon="pi pi-key"
                                size="small"
                                @click="openPinCodeDialog"
                                :loading="isUpdatingProfile"
                            />
                            <Button
                                v-if="hasPinCode"
                                :label="t('profile.pinCode.removePinCode')"
                                icon="pi pi-trash"
                                size="small"
                                severity="danger"
                                @click="removePinCode"
                                :loading="isUpdatingProfile"
                            />
                        </div>
                    </div>
                </template>
                <template #footer></template>
            </Card>

        </div>

        <br />
        <br />

        <!-- Pin Code Dialog -->
        <Dialog
            v-model:visible="showPinCodeDialog"
            :header="t('profile.pinCode.dialogTitle')"
            :modal="true"
            :closable="true"
            :style="{ width: '400px' }"
        >
            <div class="pin-code-dialog">
                <div class="field">
                    <label for="newPinCode" class="font-semibold">{{ t('profile.pinCode.newPinCode') }}</label>
                    <InputText
                        id="newPinCode"
                        v-model="newPinCode"
                        type="password"
                        :placeholder="t('profile.pinCode.enterPinCode')"
                        maxlength="6"
                        class="w-full"
                    />
                </div>

                <div class="field">
                    <label for="confirmPinCode" class="font-semibold">{{ t('profile.pinCode.confirmPinCode') }}</label>
                    <InputText
                        id="confirmPinCode"
                        v-model="confirmPinCode"
                        type="password"
                        :placeholder="t('profile.pinCode.confirmPinCode')"
                        maxlength="6"
                        class="w-full"
                    />
                </div>

                <div class="pin-code-help">
                    <small class="text-gray-600">{{ t('profile.pinCode.helpText') }}</small>
                </div>
            </div>

            <template #footer>
                <Button
                    :label="t('profile.pinCode.cancel')"
                    icon="pi pi-times"
                    severity="secondary"
                    @click="closePinCodeDialog"
                    :disabled="isUpdatingProfile"
                />
                <Button
                    :label="t('profile.pinCode.save')"
                    icon="pi pi-check"
                    @click="updatePinCode"
                    :loading="isUpdatingProfile"
                />
            </template>
        </Dialog>

        <Toast />

        <!-- https://clerk.com/docs/customization/overview -->
        <!-- <UserProfile :appearance="clerkTheme" /> -->
    </Fluid>
</template>

<style lang="scss" scoped>
.name-value-pair {
    padding-bottom: 8px;
    margin-left: 8px;
}

.member-profile-section {
    margin-top: 1rem;
    padding: 1rem;
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    background-color: var(--surface-card);
}

.member-profile-section h4 {
    margin: 0;
    color: var(--text-color);
}

.edit-form .field {
    margin-bottom: 1rem;
}

.edit-form .field label {
    display: block;
    margin-bottom: 0.5rem;
}

.address-fields {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.pin-code-section {
    margin-top: 1rem;
    padding: 1rem;
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    background-color: var(--surface-card);
}

.pin-code-section h4 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
}

.pin-code-status {
    font-weight: 500;
    color: var(--text-color-secondary);
}

.pin-code-dialog .field {
    margin-bottom: 1rem;
}

.pin-code-dialog .field label {
    display: block;
    margin-bottom: 0.5rem;
}

.pin-code-help {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: var(--surface-100);
    border-radius: 4px;
}
</style>
