<script setup>
import { defineProps, defineEmits, ref } from "vue";
import { api } from "@/api/MenuApi.js";
// props & emits
const props = defineProps({
  isOpen: Boolean,
  item: Object,
});
const emit = defineEmits(["close", "registerInventory"]);
const isSubmitting = ref(false); // 제출 중 상태
// 입력 필드 상태
const name = ref("");
const unit = ref("");
const minQuantity = ref("");

// 유통기한 관련 상태
const selectedDays = ref("1");
const isCustomInput = ref(false);
const customDays = ref("");

// 유통기한 옵션
const expiryDate = [
  { label: "1일", value: "1" },
  { label: "3일", value: "3" },
  { label: "5일", value: "5" },
];

const init = () => {
  name.value = props.item ? props.item.name : "";
  unit.value = props.item ? props.item.unit : "kg";
  minQuantity.value = props.item ? props.item.minQuantity : "";
  selectedDays.value = "1";
  isCustomInput.value = false;
  customDays.value = "";
};

// 유통기한 선택 핸들러
const selectDay = (value) => {
  selectedDays.value = value;
  isCustomInput.value = false;
  customDays.value = "";
};

// 직접입력 활성화
const enableCustomInput = () => {
  selectedDays.value = "custom";
  isCustomInput.value = true;
};

// 직접입력 해제
const disableCustomInput = () => {
  if (!customDays.value) {
    isCustomInput.value = false;
    selectedDays.value = "1";
  }
};

const registerInvnetory = () => {
  registerInventory();
};
// 재고 등록 처리 함수
const registerInventory = async () => {
  if (isSubmitting.value) return; // 중복 제출 방지
  const parsedDays = parseInt(customDays.value, 10);
  if (!name.value.trim()) {
    alert("재고명을 입력해 주세요.");
    return;
  }

  if (!unit.value) {
    alert("단위를 선택해 주세요.");
    return;
  }
  if (
    minQuantity.value === null ||
    minQuantity.value === "" ||
    isNaN(minQuantity.value)
  ) {
    alert("최소수량을 숫자로 입력해 주세요.");
    return;
  }
  if (
    isCustomInput.value &&
    (!customDays.value || isNaN(customDays.value)) &&
    customDays.value > 0
  ) {
    alert("직접 입력한 유통기한을 숫자로 입력해 주세요.");
    return;
  }
  if (isCustomInput.value && !Number.isInteger(parsedDays)) {
    alert("직접 입력한 유통기한은 정수로 입력해야 합니다.");
    return false;
  }

  if ((isCustomInput.value && parsedDays < 1) || parsedDays > 30) {
    alert("직접 입력한 유통기한은 1일에서 30일 사이의 값이어야 합니다.");
    return false;
  }
  isSubmitting.value = true; // 중복 제출 방지
  console.log("api:", api);
  // 등록할 데이터 세팅
  const storeInventoryData = {
    name: name.value,
    expiryDate: isCustomInput.value ? customDays.value : selectedDays.value,

    minQuantity: minQuantity.value,
    unit: unit.value,
  };

  const response = await api.registerStoreInventory(storeInventoryData);
  console.log("등록 결과:", response);

  const message =
    response.message || "재고 등록이 실패했습니다. 다시 시도해주세요.";

  if (response.code === 200) {
    alert("등록이 완료되었습니다.");
    emit("refresh");
  } else {
    alert(message);
  }

  init(); // 초기화 함수 호출
  emit("close");
  isSubmitting.value = false; // 등록 완료 후 상태 초기화
};

// 모달 열릴 때 초기화
</script>

<template>
  <div v-if="isOpen" class="register_modal_container" style="z-index: 2000">
    <div class="modal">
      <div class="modal_content">
        <div class="modal_header">
          <button class="close_btn" @click="emit('close')">✕</button>

          <h2 class="modal_title">재고 항목 등록</h2>
        </div>
        <div class="input_group">
          <div class="modal_title2">
            <label>재고명</label>
            <p class="title_warn">(필수)</p>
          </div>
          <p class="sub_title">재고의 정확한 이름을 입력해 주세요.</p>
          <input type="text" v-model="name" placeholder="마늘" />
        </div>

        <div class="input_group">
          <div class="input_row">
            <div class="input_label_group">
              <label>단위</label>
              <p class="title_warn">(필수)</p>
            </div>
            <div class="unit_container">
              <select v-model="unit" class="unit_select">
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="ml">ml</option>
                <option value="unit">개</option>
              </select>
            </div>
          </div>
          <p class="sub_title">재고를 관리하는 단위를 입력해주세요.</p>
        </div>

        <div class="input_group">
          <div class="modal_title2 between">
            <label>최소수량</label>
            <input
              type="text"
              v-model="minQuantity"
              placeholder="5"
              class="min_qty_input"
            />
          </div>
          <p class="sub_title">
            최소 보유하고 있어야하는 재고의 수량을 입력해 주세요. <br />
            소수점 2자리까지 저장됩니다.
          </p>
        </div>
        <div class="input_group">
          <div class="modal_title2">
            <label>입고 후 유통기한</label>
          </div>
          <p class="sub_title">재고의 입고 후 평균 유통기한를 입력해주세요.</p>
          <div class="button_group">
            <v-btn
              v-for="day in expiryDate"
              :key="day.value"
              :class="{ selected_btn: selectedDays === day.value }"
              @click="selectDay(day.value)"
              variant="outlined"
            >
              {{ day.label }}
            </v-btn>

            <!-- 직접입력 버튼 -->
            <v-btn
              v-if="!isCustomInput"
              :class="{ 'selected-btn': selectedDays === 'custom' }"
              @click="enableCustomInput"
              variant="outlined"
            >
              직접입력
            </v-btn>

            <template v-if="isCustomInput">
              <v-text-field
                v-model.number="customDays"
                class="custom_input"
                variant="outlined"
                density="compact"
                hide-details
                @blur="disableCustomInput"
                type="number"
                min="1"
                max="30"
              ></v-text-field>
              <span class="fixed_text">일 까지</span>
            </template>
          </div>
        </div>
      </div>
      <div class="modal_footer">
        <button
          class="confirm_btn"
          :disabled="isSubmitting"
          @click="registerInvnetory"
        >
          {{ isSubmitting ? "등록 중..." : "등록" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register_modal_container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: flex-end;
  opacity: 0;
  animation: fadeIn 0.3s forwards;
}

.modal_header {
  border-bottom: #ccc solid 1px;
  margin-bottom: 10px;
}

/* 모달 슬라이드 애니메이션 */
.modal {
  width: 33.33%;
  height: 100vh;
  background: white;
  padding: 20px;
  border-left: 1px solid #ddd;
  box-shadow: -5px 0 10px rgba(0, 0, 0, 0.1);
  justify-content: space-between;
  /* 상단-하단 요소 분리 */
  position: relative;
  display: flex;
  flex-direction: column;

  transform: translateX(100%);
  animation: slideIn 0.3s forwards;
}

/* 모달 안의 스크롤 영역 */
.modal_content {
  position: relative;
  overflow-y: auto;
  flex: 1;
}

/* 등록 버튼 고정 영역 */
.modal_footer {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  background-color: #fff;
}

/* 페이드인 효과 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

/* 오른쪽에서 왼쪽으로 슬라이드 */
@keyframes slideIn {
  from {
    transform: translateX(100%);
  }

  to {
    transform: translateX(0);
  }
}

.modal_header {
  border-bottom: #ccc solid 1px;
  padding-bottom: 5px;
  /* 👈 선 위 아래 여백 */
  margin-bottom: 45px;
  /* 👈 선 아래 전체 여백 (원하시는 만큼 늘리세요) */
}

.modal_title2 {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal_title2.between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.min_qty_input {
  width: 80px;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 18px;
  font-size: 14px;
  text-align: right;
}

.title_warn {
  font-size: 14px;
  color: red;
  font-weight: bold;
}

.close_btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  z-index: 10;
}

.modal_title {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 10px;
}

.sub_title {
  font-size: 12px;
  margin-top: 4px;
  margin-bottom: 4px;
  color: #666;
  justify-content: flex-end;
  /* 🌟 오른쪽 정렬 */
}

.modal_desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
}

.tab_inventory {
  display: flex;
  border-bottom: none;
  margin-bottom: 15px;
  gap: 10px;
  justify-content: center;
  width: 100%;
}

.tab_inventory button {
  flex: 1;
  /* 버튼을 가로로 균등하게 배치 */
  padding: 6px 30px;
  /* 높이를 줄이고 가로 길이를 늘림 */
  background-color: #b8c0c8;
  /* 기본 색 */
  border: 2px solid #b8c0c8;
  border-radius: 30px;
  /* 더 길쭉한 느낌 */
  font-size: 14px;
  /* 폰트 크기도 살짝 줄임 */
  cursor: pointer;
  color: black;
  font-weight: bold;
  transition: background-color 0.3s, color 0.3s, transform 0.2s;
  text-align: center;
}

.tab_inventory button:hover {
  background-color: #9fa6ad;
}

.tab_inventory button.active {
  background-color: #858b91;
  color: white;
  border-color: #858b91;
}

.ingredient_inputs {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.ingredient_inputs select,
.ingredient_inputs input {
  flex: 1;
  min-width: 0;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 14px;
}

.add_btn {
  flex-shrink: 0;
  padding: 10px 14px;
  background: #c8c8c8;
  color: white;
  border: none;
  border-radius: 18px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
}

.add_btn:hover {
  background: #9fa6ad;
}

/* 추가된 재료 리스트 스타일 */
.tag_container {
  margin-top: 5px;
  margin-bottom: 30px;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  display: inline-flex;
  align-items: center;
  background-color: #dbe2ea;
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 14px;
  color: #333;
}

.remove_btn {
  background: none;
  border: none;
  color: black;
  margin-left: 8px;
  cursor: pointer;
  font-weight: bold;
}

.input_group input,
.input_group select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 18px;
  font-size: 14px;
}

.input_group label {
  font-size: 16px;
  color: #222;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.input_group {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
}

.confirm_btn {
  margin-top: auto;
  padding: 10px;
  background: #b1d5c2;
  color: black;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  width: 100%;
}

.confirm_btn:hover {
  background: #8cbfa4;
}

.custom-solid-autocomplete {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 18px;
  font-size: 14px;
}

.unit_container {
  display: flex;
  align-items: center;
  gap: 8px;
  /* 입력 필드와 드롭다운 사이 간격 */
}

.unit_input,
.unit_select {
  height: 45px;
  /* 동일한 높이 */
  border-radius: 20px;
  /* 둥근 모서리 */
  border: 1px solid #ccc;
  padding: 0 12px;
  font-size: 16px;
  text-align: center;
  display: flex;
  justify-content: flex-end;
}

.unit_input {
  width: 80px;
  /* 숫자 입력 필드 크기 */
}

.unit_select {
  width: 80px;
  /* 드롭다운 크기 */
  appearance: none;
  /* 기본 스타일 제거 */
  background: white
    url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24' fill='gray'%3E%3Cpath d='M7 10l5 5 5-5H7z'/%3E%3C/svg%3E")
    no-repeat right 10px center;
  background-size: 16px;
}

.button_group {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 🌟 가운데 정렬 */
  gap: 8px;
}

.v-btn {
  min-width: 60px;
  /* 모든 버튼 크기 일정하게 */
  height: 40px;
  border-radius: 20px;
  font-size: 14px;
}

.selected_btn {
  background-color: #c8c8c8 !important;
  font-weight: bold;
}

.custom_input {
  width: 10px !important;
  /* 직접입력 칸의 가로 크기 */
  height: 40px !important;
  /* 버튼과 동일한 높이 */
  text-align: center;
  font-size: 14px;
  padding: 0;
}

.fixed_text {
  margin-left: 8px;
  font-size: 14px;
}

.input_row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.input_label_group {
  display: flex;
  align-items: center;
  gap: 6px;
  /* label과 (필수) 사이 간격 조절 */
}

.min_qty_input {
  width: 80px;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 18px;
  font-size: 14px;
  text-align: right;
}
</style>
