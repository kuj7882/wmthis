<script setup>
import { defineProps, defineEmits, ref, watch, onMounted } from "vue";
import { api } from "@/api/MenuApi.js";
// props & emits
const props = defineProps({
  isOpen: Boolean,
  item: {
    type: Object,
    required: true,
  },
});
const emit = defineEmits(["close", "registerInventory", "totalInventory"]);
const isSubmitting = ref(false); // 제출 중 상태

// 입력 필드 상태
const quantity = ref(0); // 재고 수량
const ingredients = ref([]); // 재료 목록을 저장할 변수
const ingredient = ref(""); // 선택된 재료 (ingredient 변수 정의)
const price = ref(0); // 단가
// 유통기한 관련
const selectedDays = ref("1"); // 기본값: 1일
const isCustomInput = ref(false);
const customDays = ref("");
const isExpirationDifferent = ref(false);
const expiryDate = ref(""); // 유통기한

// 유통기한 선택 옵션
const days = [
  { label: "1일", value: "1" },
  { label: "3일", value: "3" },
  { label: "5일", value: "5" },
];

// 유통기한 선택
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
    selectedDays.value = "1"; // 기본값
  }
};

const init = () => {
  quantity.value = 0;
  price.value = 0;
  selectedDays.value = "1";
  customDays.value = "";
  isCustomInput.value = false;
  isExpirationDifferent.value = false;
};
// 등록 처리
const totalInventory = async () => {
  if (isSubmitting.value) return; // 이미 제출 중이면 함수 종료
  if (!ingredient.value || !ingredient.value.id) {
    console.error("재료가 선택되지 않았습니다.");
    return;
  }
  const data = {
    storeInventoryId: ingredient.value.id,
    quantity: quantity.value,
    price: price.value,
  };

  isSubmitting.value = true; // 제출 중 상태로 변경
  console.log("등록할 재고 데이터:", data);

  const response = await api.registerInventory(data);
  console.log("등록 응답:", response);
  if (response.code && response.code === 200) {
    alert("재고 등록이 완료되었습니다.");
    emit("refresh");
  } else {
    alert("재고 등록에 실패했습니다. 다시 시도해주세요.");
  }
  init();
  emit("close");
  isSubmitting.value = false; // 제출 완료 상태로 변경
};

const fetchIngredients = async () => {
  try {
    const response = await api.getStoreInventoryList();
    console.log("재료 목록 응답:", response);
    ingredients.value = response.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      quantity: item.miniquantity,
      expiryDate: item.expiryDate,
    }));
    console.log("Fetched ingredients:", ingredients.value);
  } catch (error) {
    console.error("Error fetching ingredients:", error);
  }
};

// 모달이 열릴 때 재료 목록을 가져옴
// 모달 열릴 때 재료 목록 불러오기
watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      console.log("모달이 열렸습니다. 재료 목록을 가져옵니다.");
      fetchIngredients(); // 재료 목록을 가져옴
    }
  },
  { immediate: true }
);

// ingredient 변경 시 기본 유통기한 세팅
watch(ingredient, (newVal) => {
  if (newVal) {
    // 유통기한이 달라요 체크되지 않았을 경우 기존 유통기한 사용
    if (!isExpirationDifferent.value) {
      // 유효한 expiryDate가 있을 경우만 사용, 없으면 기본값으로 처리
      if (newVal.expiryDate) {
        expiryDate.value = newVal.expiryDate;
      } else {
        // expiryDate가 없으면 오늘 날짜로 설정
        const today = new Date();
        expiryDate.value = today.toISOString().split("T")[0];
      }
      console.log("기존 유통기한 설정:", expiryDate.value);
    }
  }
});
onMounted(() => {
  // 컴포넌트가 마운트될 때 재료 목록을 가져옴
  console.log("Component mounted, fetching ingredients...");

  fetchIngredients();
});
</script>

<template>
  <div v-if="isOpen" class="store_modal_container" style="z-index: 2000">
    <div class="modal">
      <div class="modal_content">
        <div class="modal_header">
          <button class="close_btn" @click="emit('close')">✕</button>

          <h2 class="modal_title">재고 입고 등록</h2>
        </div>
        <!-- 재고명 영역 -->
        <div class="input_group" style="flex: 1">
          <div class="modal_title2">
            <label>재고명</label>
            <p class="title_warn">(필수)</p>
          </div>
          <p class="sub_title">입고할 재고명을 선택해주세요.</p>
          <div class="unit-container">
            <select
              v-model="ingredient"
              class="unit-select"
              style="width: 200px"
            >
              <option value="" disabled>재고 선택</option>
              <option v-for="item in ingredients" :key="item.id" :value="item">
                {{ item.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="input_group">
          <div class="input_row">
            <div class="input_label_group">
              <label>수량</label>
              <p class="title_warn">(필수)</p>
            </div>
            <div class="unit_container">
              <input
                type="text"
                v-model="quantity"
                placeholder="5"
                class="min_qty_input"
              />
              <div class="inventory_info">
                <p>
                  {{ ingredient.unit }}
                </p>
              </div>
            </div>
          </div>
          <p class="sub_title">입고할 수량을 입력해주세요.</p>
        </div>
        <div class="input_group">
          <div class="modal_title2">
            <label>입고 가격</label>
            <p class="title_warn">(필수)</p>
          </div>
          <p class="sub_title">상품의 입고시 가격을 입력해 주세요.</p>
          <input type="text" v-model="price" placeholder="32000원" />
        </div>

        <!--
        <div class="input_group">
          <div class="modal_title2 flex_between">
            <label>유통기한</label>
            <div class="checkbox_group">
              <input type="checkbox" class="checkbox" v-model="isExpirationDifferent" />
              <p class="sub_title">유통기한이 달라요</p>
            </div>
          </div>

          <p class="sub_title">
            재고의 입고 후 유통기한이 등록된 정보와 다르면 입력해주세요.
          </p>

          <div class="button_group">
            <v-btn v-for="day in days" :key="day.value" :class="[
              { selected_btn: selectedDays === day.value },
              { no_opacity_disabled: !isExpirationDifferent },
            ]" @click="selectDay(day.value)" variant="outlined" :disabled="!isExpirationDifferent">
              {{ day.label }}
            </v-btn>

            <v-btn v-if="!isCustomInput" :class="{ selected_btn: selectedDays === 'custom' }" @click="enableCustomInput"
              variant="outlined" :disabled="!isExpirationDifferent">
              직접입력
            </v-btn>

            <v-text-field v-else v-model="customDays" class="custom_input" variant="outlined" density="compact"
              hide-details @blur="disableCustomInput" :disabled="!isExpirationDifferent"></v-text-field>

            <span class="fixed_text">일 까지</span>
            
      </div>
      
    </div>
      --></div>
      <div class="modal_footer">
        <button
          class="confirm_btn"
          :disabled="isSubmitting"
          @click="totalInventory"
        >
          {{ isSubmitting ? "등록 중..." : "등록" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.store_modal_container {
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

.inventory_info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  margin-bottom: 20px;
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

.circle_checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #666;
  border-radius: 50%;
  background-color: white;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease-in-out;
}

.circle_checkbox:checked {
  background-color: #708090;
  border-color: #708090;
}

.circle_checkbox:checked::after {
  content: "";
  position: absolute;
  top: 4px;
  left: 4px;
  width: 8px;
  height: 8px;
  background: #708090;
  border-radius: 50%;
}

.checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #666;
  border-radius: 50%;
  background-color: white;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease-in-out;
}

.checkbox:checked {
  background-color: #708090;
  border-color: #708090;
}

.checkbox:checked::after {
  content: "";
  position: absolute;
  top: 4px;
  left: 4px;
  width: 8px;
  height: 8px;
  background: #708090;
  border-radius: 50%;
}

.flex_between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkbox_group {
  display: flex;
  align-items: center;
  gap: 4px;
  /* 체크박스와 텍스트 사이 간격 */
}

.sub_title {
  margin: 0;
  font-size: 14px;
  padding: 9px 0;
}

.v-btn.no-opacity-disabled.v-btn--disabled {
  opacity: 1 !important;
  pointer-events: none;
  /* 클릭은 막음 */
}
</style>
