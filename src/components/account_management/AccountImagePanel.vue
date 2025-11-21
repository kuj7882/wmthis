<template>
    <v-img :src="imageUrl" cover height="100%"></v-img>

</template>

<script setup>
import { ref } from 'vue';
import LoginImage from '@/assets/image/background.png';

const imageUrl = ref(LoginImage);

</script>

<style scoped></style>