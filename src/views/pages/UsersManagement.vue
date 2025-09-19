<template>
    <div class="grid">
        <div class="col-12">
            <div class="card">
                <div class="mb-4">
                    <h5 class="m-0">{{ translate('root.users.title') }}</h5>
                    <p class="text-600 m-0">{{ translate('root.users.subtitle') }}</p>
                </div>

                <!-- Filters -->
                <div class="flex flex-wrap gap-3 mb-4">
                    <div class="flex-1 min-w-0">
                        <InputText
                            v-model="filters.search"
                            :placeholder="translate('root.users.search')"
                            @input="debouncedSearch"
                            class="w-full"
                        />
                    </div>
                    <Select
                        v-model="filters.role"
                        :options="roleOptions"
                        optionLabel="label"
                        optionValue="value"
                        :placeholder="translate('root.users.filterByRole')"
                        @change="loadUsers"
                        class="w-auto"
                    />
                    <div class="flex align-items-center gap-2">
                        <Checkbox v-model="filters.activeOnly" @change="loadUsers" />
                        <label class="text-sm">{{ translate('root.users.showActive') }}</label>
                    </div>
                </div>

                <div v-if="loading" class="text-center py-4">
                    <ProgressSpinner />
                </div>

                <DataTable v-else :value="users" responsiveLayout="scroll">
                    <Column field="username" :header="translate('root.users.username')" sortable>
                        <template #body="{ data }">
                            <div class="flex align-items-center gap-2">
                                <span>{{ data.username }}</span>
                                <i v-if="!data.isActive" class="pi pi-ban text-red-500" title="Inactive"></i>
                            </div>
                        </template>
                    </Column>
                    <Column field="fullname" :header="translate('root.users.fullname')" sortable></Column>
                    <Column field="email" :header="translate('root.users.email')" sortable></Column>
                    <Column field="roles" :header="translate('root.users.roles')">
                        <template #body="{ data }">
                            <Tag
                                v-for="role in data.roles"
                                :key="role"
                                :value="role.charAt(0).toUpperCase() + role.slice(1)"
                                :severity="getRoleSeverity(role)"
                                class="mr-1"
                            />
                        </template>
                    </Column>
                    <Column field="lastLoginAt" :header="translate('root.users.lastLogin')" sortable>
                        <template #body="{ data }">
                            {{ data.lastLoginAt ? formatDate(data.lastLoginAt) : translate('root.users.never') }}
                        </template>
                    </Column>
                    <Column :header="translate('root.users.actions')">
                        <template #body="{ data }">
                            <div class="flex gap-2">
                                <Button
                                    icon="pi pi-pencil"
                                    size="small"
                                    severity="secondary"
                                    @click="openEditDialog(data)"
                                    :disabled="loading"
                                    title="Edit User"
                                />
                                <Button
                                    icon="pi pi-shield"
                                    size="small"
                                    severity="info"
                                    @click="openRolesDialog(data)"
                                    :disabled="loading"
                                    title="Edit Roles"
                                />
                                <Button
                                    icon="pi pi-trash"
                                    size="small"
                                    severity="danger"
                                    @click="confirmDelete(data)"
                                    :disabled="loading || data._id === currentUserId"
                                    title="Delete User"
                                />
                            </div>
                        </template>
                    </Column>
                </DataTable>

                <!-- Pagination -->
                <div v-if="pagination.totalPages > 1" class="flex justify-content-center mt-4">
                    <Paginator
                        :rows="pagination.limit"
                        :totalRecords="pagination.total"
                        :first="(pagination.page - 1) * pagination.limit"
                        @page="onPageChange"
                    />
                </div>
            </div>
        </div>
    </div>

    <!-- Edit User Dialog -->
    <Dialog
        v-model:visible="showDialog"
        :header="translate('root.users.editUser')"
        :modal="true"
        :closable="!isSubmitting"
        :draggable="false"
        :resizable="false"
        class="p-fluid"
        style="width: 600px"
    >
        <div class="user-form">
            <div class="grid">
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="username" class="font-semibold">{{ translate('root.users.username') }} *</label>
                        <InputText
                            id="username"
                            v-model="formData.username"
                            class="w-full"
                            :class="{ 'p-invalid': formErrors.username }"
                        />
                    </div>
                </div>
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="email" class="font-semibold">{{ translate('root.users.email') }} *</label>
                        <InputText
                            id="email"
                            v-model="formData.email"
                            type="email"
                            class="w-full"
                            :class="{ 'p-invalid': formErrors.email }"
                        />
                    </div>
                </div>
                <div class="col-12">
                    <div class="field">
                        <label for="fullname" class="font-semibold">{{ translate('root.users.fullname') }}</label>
                        <InputText
                            id="fullname"
                            v-model="formData.fullname"
                            class="w-full"
                        />
                    </div>
                </div>
                <div class="col-12">
                    <div class="field">
                        <label class="font-semibold">{{ translate('root.users.roles') }} *</label>
                        <div class="flex flex-wrap gap-3 mt-2">
                            <div class="flex align-items-center">
                                <Checkbox
                                    v-model="formData.roles"
                                    value="member"
                                    inputId="role-member"
                                />
                                <label for="role-member" class="ml-2">{{ translate('root.users.member') }}</label>
                            </div>
                            <div class="flex align-items-center">
                                <Checkbox
                                    v-model="formData.roles"
                                    value="owner"
                                    inputId="role-owner"
                                />
                                <label for="role-owner" class="ml-2">{{ translate('root.users.owner') }}</label>
                            </div>
                            <div class="flex align-items-center">
                                <Checkbox
                                    v-model="formData.roles"
                                    value="root"
                                    inputId="role-root"
                                />
                                <label for="role-root" class="ml-2">{{ translate('root.users.root') }}</label>
                            </div>
                        </div>
                        <small class="text-600">{{ translate('root.users.rolesHelp') }}</small>
                        <div v-if="formErrors.roles" class="text-red-500 text-sm mt-1">
                            {{ translate('root.users.validation.rolesRequired') }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-content-between w-full">
                <Button
                    :label="translate('root.users.cancel')"
                    icon="pi pi-times"
                    severity="secondary"
                    :disabled="isSubmitting"
                    @click="closeDialog"
                />
                <Button
                    :label="translate('root.users.save')"
                    icon="pi pi-check"
                    :loading="isSubmitting"
                    :disabled="isSubmitting"
                    @click="handleSubmit"
                />
            </div>
        </template>
    </Dialog>

    <!-- Edit Roles Dialog -->
    <Dialog
        v-model:visible="showRolesDialog"
        :header="translate('root.users.editRoles')"
        :modal="true"
        :closable="!isSubmitting"
        :draggable="false"
        :resizable="false"
        class="p-fluid"
        style="width: 400px"
    >
        <div class="roles-form">
            <div class="mb-3">
                <p class="text-600">
                    Editing roles for: <strong>{{ selectedUser?.email }}</strong>
                </p>
            </div>

            <div class="field">
                <label class="font-semibold">{{ translate('root.users.selectRoles') }}</label>
                <div class="flex flex-wrap gap-3 mt-2">
                    <div class="flex align-items-center">
                        <Checkbox
                            v-model="rolesFormData"
                            value="member"
                            inputId="roles-member"
                        />
                        <label for="roles-member" class="ml-2">{{ translate('root.users.member') }}</label>
                    </div>
                    <div class="flex align-items-center">
                        <Checkbox
                            v-model="rolesFormData"
                            value="owner"
                            inputId="roles-owner"
                        />
                        <label for="roles-owner" class="ml-2">{{ translate('root.users.owner') }}</label>
                    </div>
                    <div class="flex align-items-center">
                        <Checkbox
                            v-model="rolesFormData"
                            value="root"
                            inputId="roles-root"
                        />
                        <label for="roles-root" class="ml-2">{{ translate('root.users.root') }}</label>
                    </div>
                </div>
                <small class="text-600">{{ translate('root.users.rolesHelp') }}</small>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-content-between w-full">
                <Button
                    :label="translate('root.users.cancel')"
                    icon="pi pi-times"
                    severity="secondary"
                    :disabled="isSubmitting"
                    @click="closeRolesDialog"
                />
                <Button
                    :label="translate('root.users.save')"
                    icon="pi pi-check"
                    :loading="isSubmitting"
                    :disabled="isSubmitting || rolesFormData.length === 0"
                    @click="handleRolesSubmit"
                />
            </div>
        </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
        v-model:visible="showDeleteDialog"
        :header="translate('root.users.deleteConfirmation')"
        :modal="true"
        :closable="!loading"
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
                        {{ translate('root.users.deleteMessage').replace('{email}', selectedUser?.email || '') }}
                    </p>
                </div>
            </div>

            <div class="p-3 surface-50 border-1 border-red-200 border-round">
                <div class="flex align-items-center">
                    <i class="pi pi-times-circle text-red-500 mr-2"></i>
                    <span class="text-red-600 font-semibold">
                        This action cannot be undone
                    </span>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-content-between w-full">
                <Button
                    :label="translate('root.users.cancel')"
                    icon="pi pi-times"
                    severity="secondary"
                    :disabled="loading"
                    @click="showDeleteDialog = false"
                />
                <Button
                    :label="translate('root.users.delete')"
                    icon="pi pi-trash"
                    severity="danger"
                    :loading="loading"
                    :disabled="loading"
                    @click="deleteUser(selectedUser)"
                />
            </div>
        </template>
    </Dialog>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { translate } from '@/i18n/i18n';
import { UserService } from '@/service/UserService';
import { user } from '@/service/SessionUtils';

const toast = useToast();

// Reactive state
const loading = ref(true);
const isSubmitting = ref(false);
const showDialog = ref(false);
const showRolesDialog = ref(false);
const showDeleteDialog = ref(false);
const users = ref([]);
const selectedUser = ref(null);
const pagination = ref({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
});

// Filters
const filters = ref({
    search: '',
    role: '',
    activeOnly: true
});

// Form data
const formData = ref({
    username: '',
    fullname: '',
    email: '',
    roles: [],
    isActive: true
});

const rolesFormData = ref([]);
const formErrors = ref({});

// Options
const roleOptions = [
    { label: translate('root.users.allRoles'), value: '' },
    { label: translate('root.users.member'), value: 'member' },
    { label: translate('root.users.owner'), value: 'owner' },
    { label: translate('root.users.root'), value: 'root' }
];

// Current user ID for preventing self-actions
const currentUserId = computed(() => user.value?._id);

// Debounced search
let searchTimeout;
const debouncedSearch = () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        loadUsers();
    }, 300);
};

/**
 * Load users with current filters
 */
const loadUsers = async () => {
    loading.value = true;

    try {
        console.log('UsersManagement: Loading users with filters', filters.value);

        const queryFilters = {
            page: pagination.value.page,
            limit: pagination.value.limit,
            search: filters.value.search || undefined,
            role: filters.value.role || undefined,
            active: filters.value.activeOnly
        };

        const result = await UserService.getAllUsers(queryFilters);
        users.value = result.users;
        pagination.value = result.pagination;

        console.log('UsersManagement: Users loaded', result);
    } catch (error) {
        console.error('UsersManagement: Error loading users', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: translate('root.users.error.loadFailed'),
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

/**
 * Handle pagination
 */
const onPageChange = (event) => {
    pagination.value.page = Math.floor(event.first / event.rows) + 1;
    loadUsers();
};

/**
 * Open edit user dialog
 */
const openEditDialog = (userData) => {
    selectedUser.value = userData;
    formData.value = {
        username: userData.username,
        fullname: userData.fullname || '',
        email: userData.email,
        roles: [...userData.roles],
        isActive: userData.isActive
    };
    showDialog.value = true;
};

/**
 * Open roles dialog
 */
const openRolesDialog = (userData) => {
    selectedUser.value = userData;
    rolesFormData.value = [...userData.roles];
    showRolesDialog.value = true;
};

/**
 * Reset form
 */
const resetForm = () => {
    formData.value = {
        username: '',
        fullname: '',
        email: '',
        roles: ['member'],
        isActive: true
    };
    formErrors.value = {};
};

/**
 * Close dialogs
 */
const closeDialog = () => {
    showDialog.value = false;
    resetForm();
};

const closeRolesDialog = () => {
    showRolesDialog.value = false;
    rolesFormData.value = [];
};

/**
 * Validate form
 */
const validateForm = () => {
    const errors = {};

    if (!formData.value.username.trim()) {
        errors.username = true;
    }
    if (!formData.value.email.trim()) {
        errors.email = true;
    }
    if (!formData.value.roles || formData.value.roles.length === 0) {
        errors.roles = true;
    }

    formErrors.value = errors;
    return Object.keys(errors).length === 0;
};

/**
 * Handle form submission
 */
const handleSubmit = async () => {
    if (!validateForm()) {
        toast.add({
            severity: 'warn',
            summary: 'Validation Error',
            detail: translate('root.users.validation.validationError'),
            life: 5000
        });
        return;
    }

    isSubmitting.value = true;

    try {
        console.log('UsersManagement: Updating user', formData.value);

        const result = await UserService.updateUser(selectedUser.value._id, formData.value);

        if (result.responseCode === 200) {
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: translate('root.users.success.updated'),
                life: 3000
            });

            closeDialog();
            await loadUsers();
        }
    } catch (error) {
        console.error('UsersManagement: Error updating user', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: translate('root.users.error.updateFailed'),
            life: 5000
        });
    } finally {
        isSubmitting.value = false;
    }
};

/**
 * Handle roles submission
 */
const handleRolesSubmit = async () => {
    if (rolesFormData.value.length === 0) {
        toast.add({
            severity: 'warn',
            summary: 'Validation Error',
            detail: translate('root.users.validation.rolesRequired'),
            life: 5000
        });
        return;
    }

    isSubmitting.value = true;

    try {
        await UserService.updateUserRoles(selectedUser.value._id, rolesFormData.value);

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: translate('root.users.success.rolesUpdated'),
            life: 3000
        });

        closeRolesDialog();
        await loadUsers();
    } catch (error) {
        console.error('UsersManagement: Error updating roles', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: translate('root.users.error.rolesUpdateFailed'),
            life: 5000
        });
    } finally {
        isSubmitting.value = false;
    }
};

/**
 * Confirmation dialogs
 */
const confirmDelete = (userData) => {
    selectedUser.value = userData;
    showDeleteDialog.value = true;
};


/**
 * User actions
 */
const deleteUser = async (userData) => {
    loading.value = true;

    try {
        await UserService.deleteUser(userData._id);

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: translate('root.users.success.deleted'),
            life: 3000
        });

        showDeleteDialog.value = false;
        await loadUsers();
    } catch (error) {
        console.error('UsersManagement: Error deleting user', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: translate('root.users.error.deleteFailed'),
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};


/**
 * Helper functions
 */
const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
};

const getRoleSeverity = (role) => {
    switch (role) {
        case 'root': return 'danger';
        case 'owner': return 'warning';
        case 'member': return 'info';
        default: return 'secondary';
    }
};

onMounted(() => {
    loadUsers();
});
</script>

<style scoped>
.user-form {
    min-height: 300px;
}

.roles-form {
    min-height: 150px;
}

.field {
    margin-bottom: 1rem;
}

.field label {
    display: block;
    margin-bottom: 0.5rem;
}
</style>
