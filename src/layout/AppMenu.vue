<script setup>
import { ref } from 'vue';
import { translate } from '../i18n/i18n';
import AppMenuItem from './AppMenuItem.vue';
import { useClerk } from '@clerk/vue';
import { user } from '@/service/SessionUtils';

const clerk = useClerk();

const model = ref([
    {
        label: translate('menu.management'),
        items: [
            { label: translate('gym.menuTitle'), icon: 'pi pi-building', to: '/gym' },

            { label: translate('textLeveler.title'), icon: 'pi pi-pencil', to: '/tools/textleveler' },
            { label: translate('grammarChecker.title'), icon: 'pi pi-check-circle', to: '/tools/grammarchecker' },
            { label: translate('letterWriter.title'), icon: 'pi pi-file-edit', to: '/tools/letterwriter' },
            { label: translate('newsLetter.title'), icon: 'pi pi-envelope', to: '/tools/newsletter' },
            { label: translate('quizes.title'), icon: 'pi pi-list-check', to: '/tools/quizes' },
            { label: translate('rubric.title'), icon: 'pi pi-th-large', to: '/tools/rubric' },

            { separator: true }
        ]
    },
    {
        label: translate('menu.system'),
        items: [
            { label: translate('help.title'), icon: 'pi pi-question-circle', to: '/app' },
            { label: translate('feedback.menuTitle'), icon: 'pi pi-send', to: '/feedback' },
            { label: translate('profile.title'), icon: 'pi pi-user', to: '/user/profile' },
            {
                label: translate('buttons.logout'),
                icon: 'pi pi-sign-out',
                command: async () => {
                    user.value = {};
                    await clerk.value?.signOut();
                }
            }
        ]
    }
]);
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
