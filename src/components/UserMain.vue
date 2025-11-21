<script setup>
import { RouterView } from 'vue-router';
import Header from '@/components/common/Header.vue';
</script>
<template>
  <v-app>
    <div class="header-wrapper">
      <Header />
    </div>
    <v-main>
      <v-container fluid>
        <div class="content_wrapper" style="min-height: 700px;">
          <RouterView />
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.v-main {
  padding-top: 64px;
}

@media (max-width: 959px) {
  .v-main {
    padding-top: 56px;
  }
}

/* 헤더 중앙 정렬을 위한 래퍼 */
.header-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
  position: fixed;
  z-index: 100;
}

/* 중앙 정렬된 콘텐츠 박스 */
.content_wrapper {
  background-color: rgb(255, 255, 255);
  padding: 50px;
  max-width: 1300px !important;
  margin: 20px auto;
  /* 수평 가운데 정렬 */
  padding: 16px;
  /* 콘텐츠 여백 */
  width: 100%;
  box-sizing: border-box;
  border-radius: 15px;
}
</style>