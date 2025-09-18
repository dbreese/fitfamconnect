<template>
    <div class="grid">
        <div class="col-12">
            <Card>
                <template #title>
                    <div class="flex align-items-center gap-2">
                        <i class="pi pi-code text-2xl"></i>
                        <span>REST Explorer</span>
                    </div>
                </template>
                <template #subtitle>
                    Test API endpoints with different HTTP methods and view formatted responses
                </template>
                <template #content>
                    <div class="grid">
                    <!-- Request Configuration -->
                    <div class="col-12 md:col-6">
                        <Card>
                            <template #title>Request Configuration</template>
                            <template #content>
                                <div class="field">
                                <label for="httpMethod" class="font-semibold">HTTP Method</label>
                                <Select
                                    id="httpMethod"
                                    v-model="requestConfig.method"
                                    :options="httpMethods"
                                    optionLabel="label"
                                    optionValue="value"
                                    class="w-full"
                                />
                            </div>

                            <div class="field">
                                <label for="endpoint" class="font-semibold">Endpoint</label>
                                <InputText
                                    id="endpoint"
                                    v-model="requestConfig.endpoint"
                                    placeholder="/api/endpoint"
                                    class="w-full"
                                />
                            </div>

                            <div class="field" v-if="needsBody">
                                <label for="requestBody" class="font-semibold">Request Body (JSON)</label>
                                <Textarea
                                    id="requestBody"
                                    v-model="requestConfig.body"
                                    placeholder='{"key": "value"}'
                                    rows="8"
                                    class="w-full"
                                />
                            </div>

                            <div class="flex gap-2 mt-4">
                                <Button
                                    label="Submit"
                                    icon="pi pi-send"
                                    @click="submitRequest"
                                    :loading="isLoading"
                                    :disabled="!requestConfig.endpoint"
                                />
                                <Button
                                    label="Clear"
                                    icon="pi pi-trash"
                                    severity="secondary"
                                    @click="clearRequest"
                                />
                            </div>
                            </template>
                        </Card>
                    </div>

                    <!-- Response Display -->
                    <div class="col-12 md:col-6">
                        <Card>
                            <template #title>Response</template>
                            <template #content>
                                <div v-if="!response" class="text-center text-gray-500 py-4">
                                <i class="pi pi-info-circle text-2xl mb-2"></i>
                                <p>Submit a request to see the response here</p>
                            </div>

                            <div v-else>
                                <div class="mb-3">
                                    <Tag
                                        :value="`${response.status} ${response.statusText}`"
                                        :severity="getStatusSeverity(response.status)"
                                    />
                                    <span class="ml-2 text-sm text-gray-600">
                                        {{ response.responseTime }}ms
                                    </span>
                                </div>

                                <div class="field">
                                    <label class="font-semibold">Response Headers</label>
                                    <pre class="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-32">{{ formatHeaders(response.headers) }}</pre>
                                </div>

                                <div class="field">
                                    <label class="font-semibold">Response Body</label>
                                    <pre class="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-96">{{ formatResponseBody(response.data) }}</pre>
                                </div>
                            </div>
                            </template>
                        </Card>
                    </div>
                </div>

                <!-- Recent Requests -->
                <div class="col-12 mt-4" v-if="recentRequests.length > 0">
                    <Card>
                        <template #title>
                            <div class="flex align-items-center justify-content-between">
                                <span>Recent Requests</span>
                                <Button
                                    icon="pi pi-trash"
                                    severity="secondary"
                                    size="small"
                                    @click="clearRecentRequests"
                                    v-tooltip="'Clear history'"
                                />
                            </div>
                        </template>
                        <template #content>
                            <DataTable
                            :value="recentRequests"
                            :paginator="true"
                            :rows="5"
                            :rowsPerPageOptions="[5, 10, 20]"
                            class="p-datatable-sm"
                        >
                            <Column field="method" header="Method" :style="{ width: '100px' }">
                                <template #body="{ data }">
                                    <Tag
                                        :value="data.method"
                                        :severity="getMethodSeverity(data.method)"
                                    />
                                </template>
                            </Column>
                            <Column field="endpoint" header="Endpoint" />
                            <Column field="status" header="Status" :style="{ width: '100px' }">
                                <template #body="{ data }">
                                    <Tag
                                        :value="data.status"
                                        :severity="getStatusSeverity(data.status)"
                                    />
                                </template>
                            </Column>
                            <Column field="responseTime" header="Time" :style="{ width: '100px' }">
                                <template #body="{ data }">
                                    {{ data.responseTime }}ms
                                </template>
                            </Column>
                            <Column field="timestamp" header="Time" :style="{ width: '150px' }">
                                <template #body="{ data }">
                                    {{ formatTimestamp(data.timestamp) }}
                                </template>
                            </Column>
                            <Column header="Actions" :style="{ width: '160px' }">
                                <template #body="{ data }">
                                    <div class="flex gap-1">
                                        <Button
                                            icon="pi pi-arrow-up"
                                            size="small"
                                            severity="info"
                                            @click="populateRequest(data)"
                                            v-tooltip="'Populate form with this request'"
                                        />
                                        <Button
                                            icon="pi pi-refresh"
                                            size="small"
                                            severity="secondary"
                                            @click="repeatRequest(data)"
                                            v-tooltip="'Repeat this request'"
                                        />
                                        <Button
                                            icon="pi pi-trash"
                                            size="small"
                                            severity="danger"
                                            @click="deleteRecentRequest(data)"
                                            v-tooltip="'Delete this request'"
                                        />
                                    </div>
                                </template>
                            </Column>
                        </DataTable>
                        </template>
                    </Card>
                </div>
                </template>
            </Card>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { submit } from '@/service/NetworkUtil';

// Constants
const STORAGE_KEY = 'restExplorer_recentRequests';

// Reactive data
const isLoading = ref(false);
const response = ref(null);
const recentRequests = ref([]);
const isRepeatingRequest = ref(false);

const requestConfig = ref({
    method: 'GET',
    endpoint: '',
    body: ''
});

const httpMethods = [
    { label: 'GET', value: 'GET' },
    { label: 'POST', value: 'POST' },
    { label: 'PUT', value: 'PUT' },
    { label: 'PATCH', value: 'PATCH' },
    { label: 'DELETE', value: 'DELETE' }
];

// Computed properties
const needsBody = computed(() => {
    return ['POST', 'PUT', 'PATCH'].includes(requestConfig.value.method);
});

// Lifecycle
onMounted(() => {
    loadRecentRequests();
});

// Methods
const submitRequest = async () => {
    if (!requestConfig.value.endpoint) {
        return;
    }

    isLoading.value = true;
    const startTime = Date.now();

    try {
        let requestBody = null;
        if (needsBody.value && requestConfig.value.body) {
            try {
                requestBody = JSON.parse(requestConfig.value.body);
            } catch (error) {
                response.value = {
                    status: 400,
                    statusText: 'Bad Request',
                    headers: {},
                    data: { error: 'Invalid JSON in request body' },
                    responseTime: 0
                };
                return;
            }
        }

        const result = await submit(
            requestConfig.value.method,
            requestConfig.value.endpoint,
            requestBody
        );

        const responseTime = Date.now() - startTime;
        let responseData = null;

        try {
            responseData = await result.json();
        } catch (error) {
            responseData = { error: 'Failed to parse response as JSON' };
        }

        response.value = {
            status: result.status,
            statusText: result.statusText || getStatusText(result.status),
            headers: Object.fromEntries(result.headers.entries()),
            data: responseData,
            responseTime
        };

        // Add to recent requests only if not repeating a request
        if (!isRepeatingRequest.value) {
            addToRecentRequests({
                method: requestConfig.value.method,
                endpoint: requestConfig.value.endpoint,
                status: result.status,
                responseTime,
                timestamp: new Date(),
                body: requestConfig.value.body
            });
        }

    } catch (error) {
        const responseTime = Date.now() - startTime;
        response.value = {
            status: 0,
            statusText: 'Network Error',
            headers: {},
            data: { error: error.message || 'Network request failed' },
            responseTime
        };
    } finally {
        isLoading.value = false;
        isRepeatingRequest.value = false;
    }
};

const clearRequest = () => {
    requestConfig.value = {
        method: 'GET',
        endpoint: '',
        body: ''
    };
    response.value = null;
};

const repeatRequest = (request) => {
    isRepeatingRequest.value = true;
    requestConfig.value = {
        method: request.method,
        endpoint: request.endpoint,
        body: request.body || ''
    };
    submitRequest();
};

const addToRecentRequests = (request) => {
    recentRequests.value.unshift(request);
    // Keep only last 20 requests
    if (recentRequests.value.length > 20) {
        recentRequests.value = recentRequests.value.slice(0, 20);
    }
    // Save to localStorage
    saveRecentRequests();
};

const loadRecentRequests = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Convert timestamp strings back to Date objects
            recentRequests.value = parsed.map(request => ({
                ...request,
                timestamp: new Date(request.timestamp)
            }));
        }
    } catch (error) {
        console.error('Failed to load recent requests from localStorage:', error);
        recentRequests.value = [];
    }
};

const saveRecentRequests = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recentRequests.value));
    } catch (error) {
        console.error('Failed to save recent requests to localStorage:', error);
    }
};

const clearRecentRequests = () => {
    recentRequests.value = [];
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear recent requests from localStorage:', error);
    }
};

const deleteRecentRequest = (requestToDelete) => {
    const index = recentRequests.value.findIndex(request =>
        request.method === requestToDelete.method &&
        request.endpoint === requestToDelete.endpoint &&
        request.timestamp.getTime() === requestToDelete.timestamp.getTime()
    );

    if (index !== -1) {
        recentRequests.value.splice(index, 1);
        saveRecentRequests();
    }
};

const populateRequest = (request) => {
    requestConfig.value = {
        method: request.method,
        endpoint: request.endpoint,
        body: request.body || ''
    };
};

const getStatusSeverity = (status) => {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 300 && status < 400) return 'info';
    if (status >= 400 && status < 500) return 'warn';
    if (status >= 500) return 'danger';
    return 'secondary';
};

const getMethodSeverity = (method) => {
    switch (method) {
        case 'GET': return 'info';
        case 'POST': return 'success';
        case 'PUT': return 'warning';
        case 'PATCH': return 'help';
        case 'DELETE': return 'danger';
        default: return 'secondary';
    }
};

const getStatusText = (status) => {
    const statusTexts = {
        200: 'OK',
        201: 'Created',
        204: 'No Content',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        500: 'Internal Server Error'
    };
    return statusTexts[status] || 'Unknown';
};

const formatHeaders = (headers) => {
    return Object.entries(headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
};

const formatResponseBody = (data) => {
    return JSON.stringify(data, null, 2);
};

const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
};
</script>

<style scoped>
.field {
    margin-bottom: 1rem;
}

pre {
    font-family: 'Courier New', monospace;
    white-space: pre-wrap;
    word-wrap: break-word;
}
</style>
