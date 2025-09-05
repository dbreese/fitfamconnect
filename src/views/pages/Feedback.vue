<script setup lang="ts">
import { FeedbackService } from '@/service/FeedbackService';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import { ref, watch } from 'vue';
import Editor from '@/components/Editor.vue';
import AIInputEditor from '@/components/AIInputEditor.vue';
import { useI18n } from 'vue-i18n';
import { user } from '@/service/SessionUtils';

const { t } = useI18n();

const loading = ref(false);
const showDialog = ref(false);
const resultMessage = ref('');
const text = ref('');

async function handleSubmit() {
    resultMessage.value = '';
    loading.value = true;

    FeedbackService.send(text.value)
        .then((r) => {
            console.log('FEEDBACK RESULTS: ' + JSON.stringify(r));
            if (r?.responseCode === 200) {
                resultMessage.value = t('feedback.successMsg');
            } else {
                resultMessage.value = t('feedback.errorMsg');
            }
            showDialog.value = true;
            loading.value = false;
        })
        .catch((error) => {
            console.error('Error occurred while submitting.', error);
            resultMessage.value = t('feedback.errorMsg');
            showDialog.value = true;
            loading.value = false;
        });
}

function hideDialog() {
    showDialog.value = false;
    if (resultMessage.value === t('feedback.successMsg')) {
        text.value = '';
    }
}
</script>

<template>
    <Fluid>
        <div class="flex progresscontainer">
            <div v-if="loading" class="spinner-overlay progressoverlay">
                <ProgressSpinner aria-label="Loading" />
            </div>

            <Card class="card-style">
                <template #title>{{ t('feedback.title') }}</template>
                <template #subtitle>{{ t('feedback.subTitle') }}</template>
                <template #content>
                    {{ t('dashboard.haveFun') }}
                    <br />
                    <div class="flex flex-col w-full pt-4">
                        <form @submit.prevent="handleSubmit">
                            <AIInputEditor
                                v-model:text="text"
                                :hint="t('feedback.textHint')"
                                :visible-rows="10"
                                :showUploadButton="false"
                            >
                                <Button :fluid="false" type="submit">{{ t('feedback.submit') }}</Button>
                            </AIInputEditor>
                        </form>
                    </div>
                </template>
                <template #footer></template>
            </Card>

            <Dialog
                v-model:visible="showDialog"
                :modal="true"
                :closable="false"
                :pt="{
                    root: { class: 'w-[90vw] md:w-[50vw] lg:w-[30vw]' }
                }"
            >
                <template #header>
                    <h3 class="text-xl font-semibold">
                        {{
                            resultMessage === t('feedback.successMsg')
                                ? t('feedback.successTitle')
                                : t('feedback.errorTitle')
                        }}
                    </h3>
                </template>
                <p>{{ resultMessage }}</p>
                <template #footer>
                    <div class="flex justify-end">
                        <Button @click="hideDialog" class="p-button-primary">
                            {{ t('buttons.ok') }}
                        </Button>
                    </div>
                </template>
            </Dialog>
        </div>
    </Fluid>
</template>

<style></style>
