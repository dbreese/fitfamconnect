<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const email = ref('');
const password = ref('');
const checked = ref(false);

const loginError = ref('');
</script>

<template>
    <FloatingConfigurator />
    <header>
        <SignedOut>
            <SignInButton />
        </SignedOut>
        <SignedIn>
            <UserButton />
        </SignedIn>
    </header>
</template>

<style scoped>
.pi-eye {
    transform: scale(1.6);
    margin-right: 1rem;
}

.pi-eye-slash {
    transform: scale(1.6);
    margin-right: 1rem;
}
</style>
