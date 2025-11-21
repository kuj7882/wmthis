<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { api } from "@/api/MenuApi.js"; // API 호출을 위한 axios 인스턴스 import
import { debounce } from "lodash";
import OptionRegisterModal from "@/components/menu_management/option/OptionRegisterModal.vue";
import OptionEditModal from "@/components/menu_management/option/OptionEditModal.vue";
import DeleteConfirmModal from "@/components/alerts/DeleteConfirmModal.vue";
import DeleteAlertModal from "@/components/alerts/DeleteAlertModal.vue";
import { useMenuStore } from "@/stores/useMenuStore";
const menuStore = useMenuStore();

const isLoading = ref(true);
const searchKeyword = ref("");
const isRegisterModalOpen = ref(false);
const isEditModalOpen = ref(false);
const isDeleteConfirmOpen = ref(false);
const selectedOptionId = ref(null); // 이미 등록된 카테고리도 받을 수 있도록
const isDeleteAlertOpen = ref(false); // 삭제 항목 선택 안내 모달
const openRegisterModal = () => {
  isRegisterModalOpen.value = true;
};
const closeRegisterModal = () => {
  isRegisterModalOpen.value = false;
};

const openEditModal = (id) => {
  selectedOptionId.value = id; // 선택된 옵션 ID 저장
  isEditModalOpen.value = true;
};
const closeEditModal = () => {
  isEditModalOpen.value = false;
};

const option_items = ref([]);

const select_all = ref(false);
const isBlocked = computed(() => false);

const toggle_select_all = () => {
  if (!isBlocked.value) {
    option_items.value.forEach((item) => (item.selected = select_all.value));
  }
};

watch(
  option_items,
  (new_items_ref) => {
    select_all.value = new_items_ref.every((item) => item.selected);
  },
  { deep: true }
);

// 삭제 확인 모달 열기
const openDeleteConfirm = () => {
  if (!isBlocked.value) {
    const selectedItems = option_items.value.some((item) => item.selected);
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
const deleteSelectedItems = () => {
  isDeleteConfirmOpen.value = false;
  api
    .deleteOptions(
      option_items.value
        .filter((item) => item.selected)
        .map((item) => item.optionId)
    )
    .then((res) => {
      console.log("삭제 성공:", res);
      fetchOptionList(); // 삭제 후 목록 갱신
    })
    .catch((error) => {
      console.error("삭제 실패:", error);
    });
  option_items.value = option_items.value.filter((item) => !item.selected);
};

const currentPage = ref(0);
const totalPages = ref(1);
const pageSize = 10;

// 페이지 이동 함수 [페이지네이션]

const goToPage = (page) => {
  if (page >= 0 && page < totalPages.value) {
    fetchOptionList(page);
  }
};

const fetchOptionList = async (page = 0) => {

  isLoading.value = true;
  const MIN_LOADING_TIME = 100; // 최소 로딩 시간 (ms)

  const response = await api.getOptionList(page, pageSize, searchKeyword.value);
  console.log('옵션 목록:', response);
  setTimeout(() => {
    if (response) {
      option_items.value = response.content.map(item => ({
        ...item,
        selected: false
      }));
      currentPage.value = response.number;
      totalPages.value = response.totalPages;
    } else {
      console.error('옵션 목록 불러오기 실패:', response);
    }
    isLoading.value = false;
  }, MIN_LOADING_TIME);

};

onMounted(() => {
  fetchOptionList(0);
  menuStore.initialize();
});
</script>

<template>
  <div class="body">
    <h1 class="page_title">옵션 관리</h1>
    <div class="search_container">
      <div class="search_box">
        <input type="text" v-model="searchKeyword" class="search_input" placeholder="옵션 검색"
          @keyup.enter="fetchOptionList(0)" />
        <button class="search_btn" @click="fetchOptionList(0)">
          <img src="@/assets/image/search_button.png" class="search_icon" />
        </button>
      </div>

      <div class="action_buttons">
        <button @click="openRegisterModal" class="register_btn">등록</button>
        <button @click="openDeleteConfirm" class="delete_btn">삭제</button>
      </div>
    </div>

    <transition name="fade" mode="out-in">
      <!-- 로딩 중 스켈레톤 테이블 -->
      <table class="menu_table" key="loading" v-if="isLoading">
        <thead>
          <tr>
            <th></th>
            <th>옵션명</th>
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
              <div class="skeleton-cell btn"></div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 등록된 메뉴가 없을 때 -->
      <div v-else-if="!isLoading && option_items.length === 0" key="empty" class="empty-state">
        <img src="@/assets/image/empty.png" alt="빈 메뉴" class="empty-icon" />
        <p class="empty-text">
          등록된 옵션이 없습니다.<br />오른쪽 상단의 [등록] 버튼을 눌러
          추가해보세요.
        </p>
      </div>

      <!-- 목록이 있을 때 -->
      <div v-else key="list">
        <table class="menu_table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" v-model="select_all" @change="toggle_select_all" class="circle_checkbox" />
              </th>
              <th>옵션명</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in option_items" :key="index" :class="{ 'selected-row': item.selected }">
              <td>
                <input type="checkbox" v-model="item.selected" class="circle_checkbox" />
              </td>
              <td>{{ item.name }}</td>
              <td>
                <button class="detail_btn" @click="openEditModal(item.optionId)">
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
    </transition>
    <OptionRegisterModal :isOpen="isRegisterModalOpen" @close="closeRegisterModal" @refresh="fetchOptionList" />
    <OptionEditModal :isOpen="isEditModalOpen" :optionId="selectedOptionId" @close="isEditModalOpen = false"
      @refresh="fetchOptionList" />

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

.page_title {
  font-size: 28px;
  font-weight: bold;
  margin-top: 10px;
  margin-bottom: 30px;
}

.menu_table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.menu_table th,
.menu_table td {
  padding: 12px;
  text-align: center;
  border-bottom: #d1d5c2 solid 1px;
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

.selected-row {
  background-color: rgba(206, 222, 239, 0.42);
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

.search_input {
  flex: 1;
  max-width: 500px;
  padding: 6px;
  border-bottom: 1px solid #ccc;
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
