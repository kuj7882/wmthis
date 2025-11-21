<template>
    <v-app>
        <v-container fluid class="pa-0 ">
            <v-row no-gutters style="height: 900px;">
                <v-col cols="12" md="8" class="d-none d-md-flex">
                    <AccountImagePanel />
                </v-col>
                <v-col cols="12" md="4" class="d-flex flex-column align-center justify-center">
                    <RouterView />
                </v-col>
            </v-row>
        </v-container>
    </v-app>
</template>

<script setup>
import AccountImagePanel from '@/components/account_management/AccountImagePanel.vue';


</script>

<style scoped></style>