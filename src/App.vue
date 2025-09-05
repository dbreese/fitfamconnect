<script setup lang="ts">
import { provide, reactive } from 'vue';

const user = reactive<Record<string, any>>({});
provide('user', user);
</script>

<template>
    <!-- <Suspense> -->
    <router-view />
    <!-- </Suspense> -->
</template>

<style scoped></style>
