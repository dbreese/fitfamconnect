<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    name: string;
    value: string;
    icon: string;
    iconSize?: 'small' | 'medium' | 'large';
}>();

const computedStyle = computed(() => {
    const sizeMap: Record<'small' | 'medium' | 'large', string> = {
        small: '1rem',
        medium: '1.5rem',
        large: '2rem'
    };
    return `font-size: ${sizeMap[props.iconSize ?? 'medium']};`;
});
</script>

<template>
    <div class="name-value-pair">
        <div v-if="icon">
            <i :class="['pi', icon]" :style="computedStyle" class="icon"></i>
        </div>
        <span class="name">{{ name }}</span>
        <span class="value">{{ value }}</span>
    </div>
</template>

<style scoped>
.name-value-pair {
    display: grid;
    grid-template-columns: 40px 1fr 10fr; /* Icons, Names, Values */
    align-items: center;
    gap: 8px;
}

.icon {
    justify-self: center;
}

.name {
    text-align: left;
    font-weight: bold;
}

.value {
    text-align: left;
}
</style>
