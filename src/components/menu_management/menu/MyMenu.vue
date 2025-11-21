<script setup>
import { ref, watch, computed, onMounted } from "vue";
import { api } from "@/api/MenuApi.js"; // api.js에서 api 객체를 가져옵니다.
import { useMenuStore } from "@/stores/useMenuStore";
import MenuRegisterModal from "@/components/menu_management/menu/MenuRegisterModal.vue";
import MenuDetailModal from "@/components/menu_management/menu/MenuDetailModal.vue";
import DeleteConfirmModal from "@/components/alerts/DeleteConfirmModal.vue";
import DeleteAlertModal from "@/components/alerts/DeleteAlertModal.vue";

const menuStore = useMenuStore();
const isLoading = ref(true);
const searchKeyword = ref("");
const isModalOpen = ref(false);
const isDetailModalOpen = ref(false);
const isDeleteConfirmOpen = ref(false);
const isDeleteAlertOpen = ref(false); // 삭제 항목 선택 안내 모달
const selectedMenu = ref(null); // 선택된 메뉴 항목
const openModal = () => {
  isModalOpen.value = true;
};
const closeModal = () => {
  isModalOpen.value = false;
};
const openDetailModal = (item) => {
  selectedMenu.value = item; // 선택된 메뉴 항목을 저장합니다.
  console.log("상세보기 항목:", item);
  isDetailModalOpen.value = true;
};
const closeDetailModal = () => {
  isDetailModalOpen.value = false;
};
const menu_items = ref([]);
const currentPage = ref(0); // 현재 페이지
const totalPages = ref(0); // 총 페이지 수
const pageSize = 10; // 페이지당 항목 수
const errorMessage = ref("");
const select_all = ref(false);
const isBlocked = computed(() => isDeleteConfirmOpen.value || isDeleteAlertOpen.value);
// 전체 선택 토글
const toggle_select_all = () => {
  if (!isBlocked.value) {
    menu_items.value.forEach((item) => (item.selected = select_all.value));
  }
};

// 개별 선택 체크 시 전체 선택 여부 감지
watch(
  menu_items,
  (new_items) => {
    select_all.value = new_items.every((item) => item.selected);
  },
  { deep: true }
);

// 삭제 확인 모달 열기
const openDeleteConfirm = () => {
  if (!isBlocked.value) {
    const selectedItems = menu_items.value.some((item) => item.selected);
    if (selectedItems) {
      isDeleteConfirmOpen.value = true;
    } else {
      isDeleteAlertOpen.value = true;
    }
  }
};

// 삭제 확인 모달 닫기
const closeDeleteConfirm = () => {
  isDeleteConfirmOpen.value = false;
};

// 삭제 경고 모달 닫기
const closeDeleteAlert = () => {
  isDeleteAlertOpen.value = false;
};

// 삭제 실행
const deleteSelectedItems = async () => {
  isDeleteConfirmOpen.value = false;
  const selectedIds = menu_items.value.filter((item) => item.selected).map((item) => item.id);
  console.log("삭제할 메뉴 ID:", selectedIds);
  const response = await api.deleteMenus(selectedIds);
  console.log("삭제 응답:", response);

  menu_items.value = menu_items.value.filter((item) => !item.selected);
};
const fetchMenus = async (page = 0) => {
  isLoading.value = true;

  const MIN_LOADING_TIME = 100; // 최소 0.5초

  const response = await api.getMenuList(page, pageSize, searchKeyword.value);
  console.log("메뉴 목록 응답:", response);

  setTimeout(() => {
    if (!response) {
      menu_items.value = [];
    } else {
      if (response.code === 200) {
        menu_items.value = response.data.content.map(item => ({
          ...item,
          selected: false
        }));
        currentPage.value = response.data.number;
        totalPages.value = response.data.totalPages;
      } else {
        menu_items.value = [];
      }
    }
    isLoading.value = false;
  }, MIN_LOADING_TIME);
};

const goToPage = (page) => {
  console.log(currentPage.value, totalPages.value);
  console.log("페이지 이동:", page);
  if (page >= 0 && page < totalPages.value) {
    fetchMenus(page);
  }
};

onMounted(() => {
  fetchMenus(0);
  menuStore.initialize();
});
</script>

<template>
  <div class="body">
    <h1 class="page_title">메뉴 관리</h1>

    <!-- 검색 바 및 등록/삭제 버튼 -->
    <div class="search_container">
      <div class="search_box">
        <input type="text" v-model="searchKeyword" class="search_input" placeholder="메뉴명 검색"
          @keyup.enter="fetchMenus(0)" />
        <button class="search_btn" @click="fetchMenus(0)">
          <img src="@/assets/image/search_button.png" class="search_icon" />
        </button>
      </div>
      <div class="action_buttons">
        <button @click="openModal" class="register_btn">등록</button>
        <button @click="openDeleteConfirm" class="delete_btn">삭제</button>
      </div>
    </div>

    <transition name="fade" mode="out-in">
      <!-- 로딩 중 스켈레톤 테이블 -->
      <table class="menu_table" key="loading" v-if="isLoading">
        <thead>
          <tr>
            <th></th>
            <th>상품</th>
            <th>카테고리</th>
            <th>재고</th>
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

      <!-- 등록된 메뉴가 없을 때 -->
      <div v-else-if="!isLoading && menu_items.length === 0" key="empty" class="empty-state">
        <img src="@/assets/image/empty.png" alt="빈 메뉴" class="empty-icon" />
        <p class="empty-text">등록된 메뉴가 없습니다.<br />오른쪽 상단의 [등록] 버튼을 눌러 추가해보세요.</p>
      </div>

      <!-- 목록이 있을 때 -->
      <div v-else key="list">
        <table class="menu_table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" v-model="select_all" @change="toggle_select_all" class="circle_checkbox" />
              </th>
              <th>상품</th>
              <th>카테고리</th>
              <th>재고</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in menu_items" :key="index" :class="{ 'selected-row': item.selected }">
              <td>
                <input type="checkbox" v-model="item.selected" class="circle_checkbox" />
              </td>
              <td class="bold-text">{{ item.name }}</td>
              <td>{{ item.category }}</td>
              <td>{{ item.ingredients }}</td>
              <td>
                <button class="detail_btn" @click="openDetailModal(item)">상세</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination_container">
          <button :disabled="currentPage === 0 || totalPages <= 1 || menu_items.length === 0
            " @click="goToPage(currentPage - 1)">
            ◀ 이전
          </button>

          <span v-for="page in totalPages" :key="page" @click="goToPage(page - 1)" v-if="totalPages >= 1"
            :class="{ 'page-number': true, active: currentPage === page - 1 }">
            {{ page }}
          </span>
          <button :disabled="currentPage === totalPages - 1 ||
            totalPages <= 1 ||
            menu_items.length === 0
            " @click="goToPage(currentPage + 1)">
            다음 ▶
          </button>
        </div>
      </div>
    </transition>
    <!-- 모달 컴포넌트들 -->
    <MenuRegisterModal :isOpen="isModalOpen" @close="closeModal" @refresh="fetchMenus" />
    <MenuDetailModal :isOpen="isDetailModalOpen" :menu="selectedMenu" @close="closeDetailModal" @refresh="fetchMenus" />
    <DeleteConfirmModal :isOpen="isDeleteConfirmOpen" @confirm="deleteSelectedItems" @cancel="closeDeleteConfirm" />
    <DeleteAlertModal :isOpen="isDeleteAlertOpen" @close="closeDeleteAlert" />
  </div>
</template>

<style scoped>
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

/* 각 셀 사이즈 맞춤 */
.skeleton-cell.checkbox {
  width: 20px;
  height: 20px;
  margin: 0 auto;
}

.skeleton-cell.name {
  width: 100px;
  height: 20px;
  margin: 0 auto;
}

.skeleton-cell.category {
  width: 80px;
  height: 20px;
  margin: 0 auto;
}

.skeleton-cell.stock {
  width: 60px;
  height: 20px;
  margin: 0 auto;
}

.skeleton-cell.btn {
  width: 50px;
  height: 25px;
  margin: 0 auto;
}

.body {
  padding: 20px;
}

.bold-text {
  font-weight: bold;
}

/* 제목 */
.page_title {
  font-size: 28px;
  font-weight: bold;
  margin-top: 10px;
  margin-bottom: 30px;
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

.selected-row {
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
.menu_table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.menu_table th,
.menu_table td {
  padding: 12px;
  text-align: center;
}

.menu_table td {
  border-bottom: #d1d5c2 solid 1px;
}

/* 상단 왼쪽 */
.menu_table thead tr:first-child th:first-child {
  border-top-left-radius: 20px;
}

/* 상단 오른쪽 */
.menu_table thead tr:first-child th:last-child {
  border-top-right-radius: 20px;
}

/* 왼쪽 아래 둥글게 */
.menu_table thead tr:first-child th:first-child {
  border-bottom-left-radius: 20px;
}

/* 오른쪽 아래 둥글게 */
.menu_table thead tr:first-child th:last-child {
  border-bottom-right-radius: 20px;
}

.menu_table th {
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
