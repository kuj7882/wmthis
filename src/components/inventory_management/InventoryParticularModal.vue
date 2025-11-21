<script setup>
import { defineProps, defineEmits, ref, computed, watch } from "vue";
import InventoryCorrectionModal from "@/components/inventory_management/InventoryCorrectionModal.vue";
import DeleteConfirmModal from "@/components/alerts/DeleteConfirmModal.vue";
import DeleteAlertModal from "@/components/alerts/DeleteAlertModal.vue";
import { api } from "@/api/MenuApi.js";

const props = defineProps({
  isOpen: Boolean,
  item: {
    type: Object,
    required: true,
  },
});

const recipeList = ref([]);
const emit = defineEmits(["close", "updated"]);
const isCorrectionModalOpen = ref(false);
const correctionItem = ref(null);
const isParticularModalOpen = ref(false);
const isDeleteConfirmOpen = ref(false);
const isDeleteAlertOpen = ref(false);
const selectedDays = ref("1");
const customDays = ref("");
const unit = ref("");
const modalType = ref("");
const isModalOpen = ref(false);
const isLoading = ref(false); // 로딩 상태 추가

const closeModal = () => {
  isModalOpen.value = false;
};
const selectedItem = ref(null);

const openCorrectionModal = (item) => {
  console.log("✅ 재고 보정 클릭됨:", item);
  correctionItem.value = item;
  unit.value = props.item.unit;
  console.log("✅ 재고 보정 모달 열림:", correctionItem.value);
  modalType.value = "correction";
  isModalOpen.value = true;
};

// 전체 선택 기능
const select_all = ref(false);
const isBlocked = computed(
  () => isDeleteConfirmOpen.value || isDeleteAlertOpen.value
);

const toggle_select_all = () => {
  if (!isBlocked.value) {
    inventory_items.value.forEach((item) => (item.selected = select_all.value));
  }
};
const openDeleteConfirm = () => {
  const selectedItems = inventory_items.value.some((item) => item.selected);
  if (selectedItems) {
    isDeleteConfirmOpen.value = true; // 삭제 확인 모달 열기
  } else {
    alert("삭제할 항목을 선택해주세요.");
  }
};
const inventory_items = ref([]);
const latest = inventory_items.value[0]; // 가장 먼저 입고된 항목

const fetchInventory = async () => {
  isLoading.value = true;
  const response = await api.getInventory(props.item.storeInventoryId);
  console.log("✅ API 호출:", response);

  inventory_items.value = response.data
    .map((item) => {
      return {
        ...item,
        purchaseDate: item.purchaseDate.split("T")[0],
        expiryDate: item.expiryDate.split("T")[0],
      };
    })
    .sort((a, b) => {
      if (a.quantity === 0 && b.quantity > 0) return 1;
      if (a.quantity > 0 && b.quantity === 0) return -1;
      return 0;
    });
  // ✅ 수량 > 0인 항목 중 유통기한이 가장 빠른 항목 선택
  const latest = inventory_items.value
    .filter((i) => i.quantity > 0)
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0];

  const idx = inventory_items.value.findIndex(
    (i) => i.storeInventoryId === props.item.storeInventoryId
  );
  if (idx !== -1 && latest) {
    inventory_items.value[idx].expiryDate = latest.expiryDate;
    inventory_items.value[idx].quantity = latest.quantity;
    inventory_items.value[idx].status = getStatusFromExpiryDate(
      latest.expiryDate,
      latest.purchaseDate,
      latest.quantity
    );
  }
  console.log("✅ 재고 목록:", inventory_items.value);

  console.log("✅ 정렬된 inventory_items:", inventory_items.value);
  isLoading.value = false;
  //emit("updated");
};

const closeDeleteConfirm = () => {
  isDeleteConfirmOpen.value = false; // 삭제 확인 모달 닫기
};
const deleteSelectedItems = async () => {
  const selectedIds = inventory_items.value
    .filter((item) => item.selected)
    .map((item) => item.id);

  if (selectedIds.length > 0) {
    try {
      const response = await api.deleteListInventory(selectedIds);
      console.log("✅ 삭제 API 호출:", response);
      if (response.code === 200) {
        alert("삭제되었습니다.");
        fetchInventory(); // 삭제 후 재고 목록 갱신
      } else {
        alert("삭제 실패: " + (response.message || "다시 시도해주세요."));
      }
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다. 다시 시도해주세요.");
      console.error("삭제 오류:", error);
    }
  } else {
    alert("삭제할 항목을 선택해주세요.");
  }

  closeDeleteConfirm(); // 삭제 확인 모달 닫기
};

watch(
  () => props.item,
  (newVal) => {
    if (newVal) {
      console.log("✅ props.item:", newVal);
      fetchInventory();
    }
  },
  { immediate: true }
);

watch(
  inventory_items,
  (new_items) => {
    select_all.value = new_items.every((item) => item.selected);
  },
  { deep: true }
);
</script>
<template>
  <div class="particular_modal_container" style="z-index: 9999">
    <div class="modal">
      <div class="modal_content">
        <div class="modal_header">
          <button class="close_btn" @click="emit('close')">✕</button>
          <h2 class="modal_title">재고 상세</h2>
        </div>

        <!-- 로딩 인디케이터 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>데이터를 불러오는 중...</p>
        </div>

        <div v-else>
          <div class="input_group">
            <div class="modal_title2"></div>
            <div class="inventory_info">
              <p v-if="props.item">
                <strong>재고명 :</strong> {{ props.item.name }}
              </p>
              <p v-if="props.item">
                <strong>총 수량 :</strong> {{ props.item.quantity }}
                {{ props.item.unit }}
              </p>
              <!--
              <p v-if="recipeList.length">
                <strong>사용메뉴 :</strong> {{ recipeList.join(", ") }}
              </p>
              <p v-else><strong>사용메뉴 :</strong> 메뉴 정보가 없습니다.</p>
            -->
            </div>
          </div>
          <button type="button" @click="openDeleteConfirm" class="delete_btn">
            삭제
          </button>
          <table class="inventory_table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" v-model="select_all" @change="toggle_select_all" class="circle_checkbox" />
                </th>
                <th>입고날짜</th>
                <th>유통기한</th>
                <th>수량</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in inventory_items" :key="index">
                <td>
                  <input type="checkbox" v-model="item.selected" class="circle_checkbox" />
                </td>
                <td>{{ item.purchaseDate }}</td>
                <td>{{ item.expiryDate }}</td>
                <td>{{ item.quantity }} {{ props.item.unit }}</td>
                <td>
                  <button @click="openCorrectionModal(item)" class="update_btn">
                    보정
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal_footer">
        <button class="confirm_btn" @click="emit('close')">확인</button>
      </div>
    </div>
    <InventoryCorrectionModal v-if="isModalOpen" :item="correctionItem" :unit="unit" :isOpen="isModalOpen"
      @close="closeModal" @updated="fetchInventory" />
    <DeleteConfirmModal :isOpen="isDeleteConfirmOpen" @confirm="deleteSelectedItems" @cancel="closeDeleteConfirm" />
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

.header {
  position: fixed;
  z-index: 10000;
  /* ❗️문제의 원인일 수 있음 */
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

.modal-panel {
  width: 400px;
  /* 필요에 따라 조절 */
  height: 100%;
  background-color: white;
  padding: 20px;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

.modal-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  /* ← 이게 없으면 화면 일부만 차지함 */
  height: 100vh;
  background-color: #fff;
  z-index: 9999;
  overflow-y: auto;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
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

.inventory_info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  margin-bottom: 20px;
}

.info_row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 6px;
}

.tab_inventory {
  display: flex;
  border-bottom: none;
  margin-bottom: 15px;
  gap: 10px;
  justify-content: center;
  width: 100%;
}

.inventory_table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.inventory_table th,
.inventory_table td {
  padding: 12px;
  text-align: center;
}

.inventory_table td {
  border-bottom: #d1d5c2 solid 1px;
}

.inventory_table th {
  background-color: #b8c0c8;
  font-size: 18px;
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
  background: white url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24' fill='gray'%3E%3Cpath d='M7 10l5 5 5-5H7z'/%3E%3C/svg%3E") no-repeat right 10px center;
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
  /* 항목 간격을 균등하게 배치 */
  align-items: center;
  gap: 20px;
  /* 항목 간 간격을 설정 */
}

.delete_btn {
  padding: 8px 12px;
  background-color: #b8c0c8;
  border: none;
  border-radius: 20px;
  width: 80px;
  cursor: pointer;
  font-weight: bold;
}

.update_btn {
  padding: 8px 12px;
  background-color: #b8c0c8;
  border: none;
  border-radius: 20px;
  width: 80px;
  cursor: pointer;
  font-weight: bold;
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
  width: 15px;
  height: 15px;
  border: 2px solid #666;
  border-radius: 50%;
  /* 둥글게 */
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

.text-button {
  background: none;
  border: none;
  color: #1976d2;
  /* Vuetify 기본 primary 색상 */
  padding: 6px 8px;
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.text-button:hover {
  background-color: rgba(25, 118, 210, 0.1);
  /* hover 시 약간의 배경색 */
}

.text-button:focus {
  outline: none;
  background-color: rgba(25, 118, 210, 0.2);
  /* focus 시 더 진한 배경 */
}
</style>
