<script lang="ts" setup>
import { SignInButton } from '@clerk/vue';
defineProps<{ label: string }>();
</script>

<template>
    <Button rounded>
        <SignInButton forceRedirectUrl="/app">{{ $t(label) }}</SignInButton>
    </Button>
</template>
