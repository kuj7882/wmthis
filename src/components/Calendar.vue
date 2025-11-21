<script setup>
import { defineProps, defineEmits, computed } from "vue";

// props 정의
const props = defineProps({
  startDate: String,
  endDate: String,
});

// emit 정의
const emit = defineEmits(["update:startDate", "update:endDate"]);

// computed로 v-model 연동 (양방향)
const modelStartDate = computed({
  get: () => props.startDate,
  set: (val) => emit("update:startDate", val),
});

const modelEndDate = computed({
  get: () => props.endDate,
  set: (val) => emit("update:endDate", val),
});
</script>

<template>
  <div class="date_filter_box">
    <label>
      시작일
      <input type="date" v-model="modelStartDate" />
    </label>
    <label>
      종료일
      <input type="date" v-model="modelEndDate" />
    </label>
  </div>
</template>

<style scoped>
.date_filter_box {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.date_filter_box label {
  display: flex;
  flex-direction: column;
  font-weight: 500;
  font-size: 14px;
}

.date_filter_box input {
  border: #ccc solid 1px;
  padding: 5px;
  border-radius: 10px;
}
</style>
