<script setup>
import { ref, watch, computed, onMounted } from "vue";
import InventoryRegisterModal from "@/components/inventory_management/InventoryRegisterModal.vue";
import InventoryModifyModal from "@/components/inventory_management/InventoryModifyModal.vue";
import DeleteConfirmModal from "@/components/alerts/DeleteConfirmModal.vue";
import DeleteAlertModal from "@/components/alerts/DeleteAlertModal.vue";
import { api } from "@/api/MenuApi.js"; // api import
import { isLength } from "lodash";

// 모달 상태
const isLoading = ref(true);
const isModalOpen = ref(false);
const isDetailModalOpen = ref(false);
const isDeleteConfirmOpen = ref(false);
const isDeleteAlertOpen = ref(false);
const currentPage = ref(0); // 현재 페이지
const totalPages = ref(1); // 총 페이지 수
const pageSize = 10; // 페이지당 항목 수
const selectedItem = ref(null);
const modalType = ref("register");
const searchKeyword = ref("");

const inventory_items = ref([]);

const fecthStoreInventoryList = async (page = 0) => {
  isLoading.value = true;
  const MIN_LOADING_TIME = 100;
  const res = await api.getStoreInventoryPageList(
    page,
    pageSize,
    searchKeyword.value
  );
  console.log("재고 목록 응답:", res);

  setTimeout(() => {
    if (!res) {
      inventory_items.value = [];
    } else {
      // 구조 맞게 수정
      if (res && res.code === 200 && res.data) {
        currentPage.value = res.data.number;
        totalPages.value = res.data.totalPages;
        inventory_items.value = res.data.content.map((item) => ({
          ...item,
          selected: false,
        }));
      } else {
        inventory_items.value = [];
      }
    }
    isLoading.value = false;
  }, MIN_LOADING_TIME);
};

// 모달 열기/닫기
const openModal = () => {
  modalType.value = "register";
  isModalOpen.value = true;
};
const goToPage = (page) => {
  console.log(currentPage.value, totalPages.value);
  console.log("페이지 이동:", page);
  if (page >= 0 && page < totalPages.value) {
    fecthStoreInventoryList(page);
  }
};

const openDetailModal = (item) => {
  selectedItem.value = item;
  modalType.value = "modify";
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

// // 추가 (등록)
// const addNewInventoryItem = async () => {
//   await InventoryItems(); // 서버에서 다시 받아오기
//   closeModal();
// };

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

watch(
  inventory_items,
  (new_items) => {
    select_all.value = new_items.every((item) => item.selected);
  },
  { deep: true }
);

// 삭제 모달 열기/닫기/실행
const openDeleteConfirm = () => {
  if (!isBlocked.value) {
    const selectedItems = inventory_items.value.some((item) => item.selected);
    if (selectedItems) {
      isDeleteConfirmOpen.value = true;
    } else {
      isDeleteAlertOpen.value = true;
    }
  }
};

const closeDeleteConfirm = () => {
  isDeleteConfirmOpen.value = false;
};

const closeDeleteAlert = () => {
  isDeleteAlertOpen.value = false;
};

const deleteSelectedItems = async () => {
  isDeleteConfirmOpen.value = false;
  const selectedIds = inventory_items.value
    .filter((item) => item.selected)
    .map((item) => item.id);
  console.log("선택된 전체 아이템 리스트:", selectedIds);
  const response = await api.deleteStoreInventorys(selectedIds);
  const message = response.message || "다시 삭제해주세요.";
  if (response.code === 200) {
    alert("삭제되었습니다.");
  } else {
    alert(message);
  }
  fecthStoreInventoryList(0); // 서버에서 다시 받아오기
};

onMounted(() => {
  fecthStoreInventoryList(0);
});
</script>

<template>
  <div class="inventory_container">
    <h1 class="page_title">재고 정보 등록</h1>

    <!-- 검색 바 및 등록/삭제 버튼 -->
    <div class="search_container">
      <div class="search_box">
        <input type="text" class="search_input" v-model="searchKeyword" placeholder="재고명 검색"
          @input="fecthStoreInventoryList(0)" />
        <button class="search_btn" @Click="fecthStoreInventoryList(0)">
          <img src="@/assets/image/search_button.png" class="search_icon" />
        </button>
      </div>
      <div class="action_buttons">
        <button @click="openModal" class="register_btn">등록</button>
        <button @click="openDeleteConfirm" class="delete_btn">삭제</button>
      </div>
    </div>

    <transition name="fade" mode="out-in">
      <template v-if="isLoading">
        <!-- 로딩 중 스켈레톤 테이블 -->
        <table class="inventory_table" key="loading">
          <thead>
            <tr>
              <th>
                <input type="checkbox" v-model="select_all" @change="toggle_select_all" class="circle_checkbox" />
              </th>
              <th>재고명</th>
              <th>단위</th>
              <th>최소수량</th>
              <th>입고 후 유통기한</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in 5" :key="n">
              <td>
                <div class="skeleton-cell checkbox"></div>
              </td>
              <td>
                <div class="skeleton-cell name"></div>
              </td>
              <td>
                <div class="skeleton-cell category"></div>
              </td>
              <td>
                <div class="skeleton-cell stock"></div>
              </td>
              <td>
                <div class="skeleton-cell btn"></div>
              </td>
            </tr>
          </tbody>
        </table>
      </template>

      <template v-else-if="inventory_items.length === 0">
        <!-- 빈 상태 화면 -->
        <div key="empty" class="empty-state">
          <img src="@/assets/image/empty.png" alt="빈 재고" class="empty-icon" />
          <p class="empty-text">
            등록된 재고가 없습니다.<br />오른쪽 상단의 [등록] 버튼을 눌러
            추가해보세요.
          </p>
        </div>
      </template>

      <template v-else>
        <!-- 실제 데이터 테이블과 페이지네이션 -->
        <div key="loaded">
          <table class="inventory_table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" v-model="select_all" @change="toggle_select_all" class="circle_checkbox" />
                </th>
                <th>재고명</th>
                <th>단위</th>
                <th>최소수량</th>
                <th>입고 후 유통기한</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in inventory_items" :key="index" :class="{ selected_row: item.selected }">
                <td>
                  <input type="checkbox" v-model="item.selected" class="circle_checkbox" />
                </td>
                <td class="bold_text">{{ item.name }}</td>
                <td>{{ item.unit === "unit" ? "개" : item.unit }}</td>
                <td>{{ item.minQuantity }}</td>
                <td>{{ item.expiryDate }}일</td>
                <td>
                  <button class="detail_btn" @click="openDetailModal(item)">
                    상세
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="pagination_container">
            <button :disabled="currentPage === 0" @click="goToPage(currentPage - 1)">
              ◀ 이전
            </button>

            <span v-for="page in totalPages" :key="page" @click="goToPage(page - 1)"
              :class="{ 'page-number': true, active: currentPage === page - 1 }">
              {{ page }}
            </span>

            <button :disabled="currentPage === totalPages - 1" @click="goToPage(currentPage + 1)">
              다음 ▶
            </button>
          </div>
        </div>
      </template>
    </transition>

    <!-- 모달 컴포넌트들 -->
    <InventoryRegisterModal v-if="modalType === 'register'" :item="selectedItem" :isOpen="isModalOpen"
      @close="closeModal" @refresh="fecthStoreInventoryList(0)" />

    <InventoryModifyModal v-if="modalType === 'modify'" :isOpen="isModalOpen" :item="selectedItem" @close="closeModal"
      @refresh="fecthStoreInventoryList(0)" />

    <DeleteConfirmModal :isOpen="isDeleteConfirmOpen" @confirm="deleteSelectedItems" @cancel="closeDeleteConfirm" />
    <DeleteAlertModal :isOpen="isDeleteAlertOpen" @close="closeDeleteAlert" />
  </div>
</template>

<style scoped>
.inventory_container {
  padding: 20px;
  color: #413d3d;
}

.bold_text {
  font-weight: bolder;
  color: #413d3d;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.empty-state {
  text-align: center;
  margin-top: 80px;
  color: #888;
}

.empty-icon {
  width: 100px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  line-height: 1.5;
}

/* 기본 skeleton cell 애니메이션 */
.skeleton-cell {
  background: #e0e0e0;
  border-radius: 6px;
  animation: pulse 1.5s infinite ease-in-out;
}

/* 애니메이션 효과 */
@keyframes pulse {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }

  100% {
    opacity: 1;
  }
}

/* 제목 */
.page_title {
  font-size: 28px;
  font-weight: bold;
  margin-top: 10px;
  margin-bottom: 30px;
  color: #413d3d;
}

/* 검색창 및 버튼 */
.search_container {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
  justify-content: space-between;
}

.search_box {
  display: flex;
  gap: 5px;
  flex: 0.6;
}

.search_input {
  flex: 1;
  max-width: 500px;
  padding: 6px;
  border-bottom: 1px solid #ccc;
}

.selected_row {
  background-color: rgba(206, 222, 239, 0.42);
}

.search_btn {
  padding: 8px;
  background-color: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 5px;
  transition: background-color 0.3s;
}

.search_btn:hover {
  background-color: #e0e0e0;
  /* 살짝 회색 배경 */
}

/* 이미지 크기 조정 */
.search_icon {
  width: 24px;
  height: 24px;
}

.detail_btn {
  padding: 8px 12px;
  background-color: #b8c0c8;
  color: black;
  width: 80px;
  border: 1px solid #ccc;
  font-size: 14px;
  border-radius: 20px;
  font-weight: bold;
  cursor: pointer;
}

.detail_btn:hover {
  background-color: #98a8b8;
}

.action_buttons {
  display: flex;
  gap: 10px;
}

.register_btn,
.delete_btn {
  padding: 8px 12px;
  background-color: #b8c0c8;
  border: none;
  border-radius: 20px;
  width: 80px;
  cursor: pointer;
  font-weight: bold;
}

.register_btn:hover,
.delete_btn:hover {
  background-color: #98a8b8;
}

/* 테이블 */
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

/* 상단 왼쪽 */
.inventory_table thead tr:first-child th:first-child {
  border-top-left-radius: 20px;
}

/* 상단 오른쪽 */
.inventory_table thead tr:first-child th:last-child {
  border-top-right-radius: 20px;
}

/* 왼쪽 아래 둥글게 */
.inventory_table thead tr:first-child th:first-child {
  border-bottom-left-radius: 20px;
}

/* 오른쪽 아래 둥글게 */
.inventory_table thead tr:first-child th:last-child {
  border-bottom-right-radius: 20px;
}

.inventory_table th {
  background-color: #b8c0c8;
  font-size: 18px;
}

.circle_checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
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

.pagination_container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;
  gap: 0.5rem;
}

.page-number {
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  border-radius: 4px;
}

.page-number.active {
  background-color: #98a8b8;
  font-weight: bold;
}
</style>
