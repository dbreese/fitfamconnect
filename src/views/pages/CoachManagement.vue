<script setup lang="ts">
import { CoachService } from '@/service/CoachService';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import ProgressSpinner from 'primevue/progressspinner';
import { ref, onMounted, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();

const loading = ref(false);
const coaches = ref<any[]>([]);
const showAddDialog = ref(false);
const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const searchLoading = ref(false);

async function loadCoaches() {
    loading.value = true;
    try {
        coaches.value = await CoachService.getCoaches();
        console.log(`Loaded ${coaches.value.length} coaches`);
    } catch (error) {
        console.error('Error loading coaches:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('coaches.error.loadFailed'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function openAddDialog() {
    searchQuery.value = '';
    searchResults.value = [];
    showAddDialog.value = true;
    // Initial search to show all members
    searchMembers();
}

async function searchMembers() {
    searchLoading.value = true;
    try {
        searchResults.value = await CoachService.searchMembers(searchQuery.value);
    } catch (error) {
        console.error('Error searching members:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('coaches.error.searchFailed'),
            life: 3000
        });
    } finally {
        searchLoading.value = false;
    }
}

// Watch search query for real-time search
watch(searchQuery, () => {
    searchMembers();
});

async function addCoach(member: any) {
    try {
        await CoachService.setCoach(member._id);
        toast.add({
            severity: 'success',
            summary: t('feedback.successTitle'),
            detail: t('coaches.success.coachAdded', { name: `${member.firstName} ${member.lastName}` }),
            life: 3000
        });
        showAddDialog.value = false;
        await loadCoaches();
    } catch (error) {
        console.error('Error adding coach:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('coaches.error.addFailed'),
            life: 3000
        });
    }
}

function confirmRemoveCoach(coach: any) {
    confirm.require({
        message: t('coaches.removeMessage', { name: `${coach.firstName} ${coach.lastName}` }),
        header: t('coaches.removeConfirmation'),
        icon: 'pi pi-info-circle',
        rejectLabel: t('coaches.cancel'),
        rejectProps: {
            label: t('coaches.cancel'),
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: t('coaches.remove'),
            severity: 'danger'
        },
        accept: () => {
            removeCoach(coach);
        }
    });
}

async function removeCoach(coach: any) {
    try {
        await CoachService.unsetCoach(coach._id);
        toast.add({
            severity: 'success',
            summary: t('feedback.successTitle'),
            detail: t('coaches.success.coachRemoved', { name: `${coach.firstName} ${coach.lastName}` }),
            life: 3000
        });
        await loadCoaches();
    } catch (error) {
        console.error('Error removing coach:', error);
        toast.add({
            severity: 'error',
            summary: t('feedback.errorTitle'),
            detail: t('coaches.error.removeFailed'),
            life: 3000
        });
    }
}

function formatMemberName(member: any): string {
    return `${member.firstName} ${member.lastName}`;
}

function formatMemberContact(member: any): string {
    const parts = [];
    if (member.email) parts.push(member.email);
    if (member.phone) parts.push(member.phone);
    return parts.join(' • ');
}

onMounted(() => {
    loadCoaches();
});
</script>

<template>
    <Fluid>
        <div class="flex progresscontainer">
            <div v-if="loading" class="spinner-overlay progressoverlay">
                <ProgressSpinner aria-label="Loading" />
            </div>

            <Card class="card-style">
                <template #title>{{ t('coaches.title') }}</template>
                <template #subtitle>{{ t('coaches.subtitle') }}</template>
                <template #content>
                    <div class="flex justify-between items-center mb-3">
                        <div class="flex items-center gap-3">
                            <span class="text-sm text-gray-600">
                                {{ coaches.length }} {{ t('coaches.totalCoaches') }}
                            </span>
                        </div>
                        <div class="flex gap-2">
                            <Button
                                icon="pi pi-plus"
                                :label="t('coaches.newCoach')"
                                @click="openAddDialog"
                            />
                        </div>
                    </div>

                    <DataTable :value="coaches" paginator :rows="10" responsiveLayout="scroll">
                        <Column field="firstName" :header="t('coaches.name')" sortable>
                            <template #body="{ data }">
                                <div class="font-semibold">{{ formatMemberName(data) }}</div>
                            </template>
                        </Column>
                        <Column field="email" :header="t('coaches.contact')" sortable>
                            <template #body="{ data }">
                                <div class="text-sm">{{ formatMemberContact(data) }}</div>
                            </template>
                        </Column>
                        <Column field="startDate" :header="t('coaches.startDate')" sortable>
                            <template #body="{ data }">
                                {{ new Date(data.startDate).toLocaleDateString() }}
                            </template>
                        </Column>
                        <Column :header="t('coaches.actions')">
                            <template #body="{ data }">
                                <div class="flex gap-2">
                                    <Button
                                        icon="pi pi-trash"
                                        size="small"
                                        severity="danger"
                                        :label="t('coaches.remove')"
                                        @click="confirmRemoveCoach(data)"
                                    />
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </template>
            </Card>

            <!-- Add Coach Dialog -->
            <Dialog
                v-model:visible="showAddDialog"
                :modal="true"
                :header="t('coaches.addCoachTitle')"
                :pt="{ root: { class: 'w-[90vw] md:w-[70vw] lg:w-[60vw]' } }"
            >
                <div class="space-y-4">
                    <div class="field">
                        <label for="search" class="font-medium">{{ t('coaches.searchMembers') }}</label>
                        <div class="p-input-icon-left">
                            <i class="pi pi-search"></i>
                            <InputText
                                id="search"
                                v-model="searchQuery"
                                :placeholder="t('coaches.searchPlaceholder')"
                                class="w-full pl-10"
                            />
                        </div>
                        <small class="text-gray-500">{{ t('coaches.searchHelp') }}</small>
                    </div>

                    <div v-if="searchLoading" class="text-center py-4">
                        <ProgressSpinner />
                    </div>

                    <div v-else-if="searchResults.length === 0" class="text-center py-4 text-gray-500">
                        {{ t('coaches.noMembersFound') }}
                    </div>

                    <div v-else>
                        <DataTable :value="searchResults" :rows="5" paginator responsiveLayout="scroll">
                            <Column field="firstName" :header="t('coaches.name')" sortable>
                                <template #body="{ data }">
                                    <div class="font-semibold">{{ formatMemberName(data) }}</div>
                                </template>
                            </Column>
                            <Column field="email" :header="t('coaches.contact')" sortable>
                                <template #body="{ data }">
                                    <div class="text-sm">{{ formatMemberContact(data) }}</div>
                                </template>
                            </Column>
                            <Column :header="t('coaches.actions')">
                                <template #body="{ data }">
                                    <Button
                                        icon="pi pi-plus"
                                        size="small"
                                        :label="t('coaches.add')"
                                        @click="addCoach(data)"
                                    />
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </div>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <Button
                            :label="t('coaches.cancel')"
                            severity="secondary"
                            @click="showAddDialog = false"
                        />
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
