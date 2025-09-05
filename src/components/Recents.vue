<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ref } from 'vue';
import { AIService } from '@/service/AIService';
import { type RecentItem, RecentTool } from '@/shared/Recents';

const props = defineProps<{
    recentTool: RecentTool;
    recentItem: RecentItem | null;
}>();

const emit = defineEmits<{
    (e: 'update:recentItem', value: RecentItem): void;
}>();

const { t } = useI18n();
const dialogLoading = ref(false);

const dialogVisible = ref(false);
const recentItems = ref<RecentItem[]>([]);
const selectedRecent = ref<RecentItem | null>(null);

const fetchItems = async () => {
    // TODO: Optimize this to add recent item to list instead of roundtrip from server
    // if (items.value.length) return;
    dialogLoading.value = true;
    try {
        const recents = await AIService.recents(props.recentTool, 'recent');
        if (recents) {
            recentItems.value = recents;
        }
    } finally {
        dialogLoading.value = false;
    }
};

async function fetchRecentItem(recentItem: RecentItem): Promise<RecentItem | undefined> {
    if (recentItem === undefined) {
        Promise.reject('Must specify recent item');
    }
    dialogLoading.value = true;
    try {
        const recent = await AIService.recentItem(recentItem.id);
        if (recent) {
            emit('update:recentItem', recent);
            return;
        } else {
            Promise.reject(`could not find recent item for ${recent}`);
        }
    } finally {
        dialogLoading.value = false;
    }
}

const openDialog = async () => {
    selectedRecent.value = null;
    dialogVisible.value = true;
    await fetchItems();
};

const selectItem = async () => {
    const item = selectedRecent.value;
    if (item != null) {
        await fetchRecentItem(item);
    }
    dialogVisible.value = false;
};
</script>

<template>
    <Button icon="pi pi-clock" class="p-button-rounded p-button-text p-button-lg-cc self-end" @click="openDialog" />

    <Dialog v-model:visible="dialogVisible" :header="t('recents.dialogTitle')" modal :draggable="true">
        <div v-if="dialogLoading" class="spinner-overlay progressoverlay">
            <ProgressSpinner aria-label="Loading" style="width: 50px; height: 50px" />
        </div>
        <Listbox v-else v-model="selectedRecent" :options="recentItems" optionLabel="name" @change="selectItem">
            <template #option="slotProps">
                <div class="flex align-items-center">
                    <span>{{ slotProps.option.description }}</span>
                </div>
            </template>
        </Listbox>
    </Dialog>
</template>

<style></style>
