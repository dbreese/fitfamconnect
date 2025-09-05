<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Constants from '@/shared/Constants';
import { extractTextFromFile } from '@/shared/FileUtils';
const toast = useToast();
const { t } = useI18n();

const props = withDefaults(
    defineProps<{
        text: string;
        hint: string;
        enabled?: boolean;
        showUploadButton?: boolean;
        visibleRows?: number;
    }>(),
    {
        enabled: true,
        showUploadButton: true,
        visibleRows: 2
    }
);
const emit = defineEmits(['update:text']);

/** File uploading */
async function onFileSelect(event: { files: any[] }) {
    const file = event.files[0];
    if (file) {
        if (file.size > 2000000) {
            toast.add({
                severity: 'error',
                summary: t('error.fileTooLarge'),
                // detail: t('utils.clipboardSuccess'),
                life: Constants.DEFAULT_TOAST_TIME
            });
            return;
        }

        const fileText = (await extractTextFromFile(file))?.trim();
        emit('update:text', fileText);
    }
}
</script>

<template>
    <div :class="{ 'disabled-wrapper': !enabled }">
        <div class="flex flex-col">
            <div class="flex flex-wrap gap-2 w-full">
                <FloatLabel variant="on" class="w-full">
                    <Textarea
                        id="text"
                        size="large"
                        :rows="enabled ? visibleRows : 1"
                        maxlength="4096"
                        autoResize
                        :model-value="text"
                        @update:model-value="emit('update:text', $event)"
                    />
                    <label for="text">{{ hint }}</label>
                </FloatLabel>
            </div>

            <div class="flex justify-end gap-2">
                <slot></slot>
                <FileUpload
                    v-if="showUploadButton"
                    mode="basic"
                    accept="text/plain,application/pdf,"
                    @select="onFileSelect"
                    customUpload
                    auto
                    severity="secondary"
                    class="p-0 p-button-outlined"
                    chooseIcon="fa-solid fa-upload"
                    :choose-label="$t('buttons.fileUpload')"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.disabled-wrapper {
    pointer-events: none;
    opacity: 0.5;
}
</style>
