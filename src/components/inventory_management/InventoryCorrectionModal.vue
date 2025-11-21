<script setup>
import { ref, defineProps, defineEmits, watch, computed } from "vue";
import { api } from "@/api/MenuApi.js";

const props = defineProps({
  isOpen: Boolean,
  item: {
    type: Object,
    default: null,
  },
  unit: String,
});
const isSubmitting = ref(false);
const emit = defineEmits(["close", "updated"]);

// 수정할 데이터를 저장할 변수
const expiryDate = ref("");
const quantity = ref(0);
const price = ref(0);
const isLoading = ref(false);
const errors = ref({
  expiryDate: "",
  quantity: "",
});

// props.item이 변경될 때 초기값 설정
watch(
  () => props.item,
  (newItem) => {
    if (newItem) {
      expiryDate.value = newItem.expiryDate;
      quantity.value = newItem.quantity;
      // 오류 초기화
      errors.value = {
        expiryDate: "",
        quantity: "",
      };
      console.log("Item updated:", newItem);
    }
  },
  { immediate: true }
);

// 수량 입력 시 숫자만 입력되도록 처리
const handleQuantityInput = (e) => {
  // 숫자가 아닌 문자 제거
  const value = e.target.value.replace(/[^0-9]/g, "");

  // 음수 방지 (이미 숫자만 입력되므로 추가 검증은 필요 없음)
  quantity.value = value === "" ? 0 : parseInt(value, 10);
};

// 유효성 검사 함수
const validateForm = () => {
  let isValid = true;
  errors.value = {
    expiryDate: "",
    quantity: "",
  };

  // 유통기한 검증: 입고날짜보다 이후여야 함
  if (props.item && props.item.purchaseDate) {
    const purchaseDate = new Date(props.item.purchaseDate);
    const expiry = new Date(expiryDate.value);

    if (expiry < purchaseDate) {
      errors.value.expiryDate = "유통기한은 입고날짜보다 이후여야 합니다.";
      isValid = false;
    }
  }

  // 수량 검증: 양수여야 함
  if (quantity.value < 0) {
    errors.value.quantity = "수량은 0 이상이어야 합니다.";
    isValid = false;
  }

  return isValid;
};

// 보정 내용 저장
const saveCorrection = async () => {
  if (isSubmitting.value) return;
  if (!props.item) return;

  // 유효성 검사
  if (!validateForm()) {
    return;
  }
  isSubmitting.value = true;
  const data = {
    inventoryId: props.item.id,
    expiryDate: expiryDate.value,
    quantity: quantity.value,
  };
  console.log("Saving correction:", data);
  const response = await api.updateInventory(data);
  if (response.code === 200) {
    alert("보정 내용이 저장되었습니다.");
    emit("updated", data);
  } else {
    alert("보정 내용 저장에 실패했습니다.");
  }
  emit("close");
  isSubmitting.value = false;
};

// 폼이 유효한지 확인
const isFormValid = computed(() => {
  return !errors.value.expiryDate && !errors.value.quantity;
});
</script>

<template>
  <div class="particular_modal_container" style="z-index: 10000">
    <div class="modal">
      <div class="modal_content">
        <div class="modal_header">
          <button class="close_btn" @click="emit('close')">✕</button>
          <h2 class="modal_title">재고 보정</h2>
        </div>

        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>저장 중...</p>
        </div>

        <div v-else-if="props.item" class="input_group">
          <div class="inventory_info">
            <p><strong>입고날짜:</strong> {{ props.item.purchaseDate }}</p>
          </div>

          <!-- 유통기한 수정 -->
          <div class="input_group">
            <label for="expiryDate" class="mb-2">유통기한</label>
            <input
              id="expiryDate"
              v-model="expiryDate"
              type="date"
              class="custom_solid_autocomplete"
              :class="{ 'error-input': errors.expiryDate }"
              :min="props.item.purchaseDate"
            />
            <p v-if="errors.expiryDate" class="error-message">
              {{ errors.expiryDate }}
            </p>
          </div>

          <!-- 수량 수정 -->
          <div class="input_group">
            <label for="quantity" class="mb-2">수량</label>
            <div class="unit_container">
              <input
                id="quantity"
                :value="quantity"
                @input="handleQuantityInput"
                type="number"
                min="0"
                class="unit_input"
                :class="{ 'error-input': errors.quantity }"
              />
              <span>{{ props.unit }}</span>
            </div>
            <p v-if="errors.quantity" class="error-message">
              {{ errors.quantity }}
            </p>
          </div>
          <!--
          <div class="input_group">
            <label for="price" class="mb-2">가격</label>
            <div class="unit_container">
              <input id="price" :value="price" @input="handleQuantityInput" type="number" min="0" class="unit_input"
                :class="{ 'error-input': errors.quantity }" />
              <span>원</span>
            </div>
            <p v-if="errors.price" class="error-message">{{ errors.price }}</p>
          </div>
        --></div>

        <div v-else class="empty-state">
          <p>데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
      <div class="modal_footer">
        <div class="flex gap-4">
          <button class="cancel_btn" @click="emit('close')">취소</button>
          <button
            class="confirm_btn"
            @click="saveCorrection"
            :disabled="(isLoading || !isFormValid, isSubmitting)"
          >
            {{ isSubmitting ? "저장 중..." : "저장" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.particular_modal_container {
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
  z-index: 10000;
}

.modal {
  width: 33.33%;
  height: 100vh;
  background: white;
  padding: 20px;
  border-left: 1px solid #ddd;
  box-shadow: -5px 0 10px rgba(0, 0, 0, 0.1);
  justify-content: space-between;
  position: relative;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  animation: slideIn 0.3s forwards;
}

.modal_content {
  position: relative;
  overflow-y: auto;
  flex: 1;
}

.modal_footer {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  background-color: #fff;
}

.modal_header {
  border-bottom: #ccc solid 1px;
  padding-bottom: 5px;
  margin-bottom: 20px;
}

.modal_title {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 10px;
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

.input_group {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

.input_group label {
  font-size: 16px;
  color: #222;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.custom_solid_autocomplete {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 18px;
  font-size: 14px;
}

.unit_container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit_input {
  height: 45px;
  border-radius: 20px;
  border: 1px solid #ccc;
  padding: 0 12px;
  font-size: 16px;
  text-align: right;
  width: 100px;
}

.confirm_btn {
  padding: 10px 20px;
  background: #b1d5c2;
  color: black;
  margin: 0 9px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  flex: 1;
}

.confirm_btn:hover {
  background: #8cbfa4;
}

.cancel_btn {
  padding: 10px 20px;
  background: #f0f0f0;
  color: black;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  flex: 1;
}

.cancel_btn:hover {
  background: #e0e0e0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }

  to {
    transform: translateX(0);
  }
}
</style>
