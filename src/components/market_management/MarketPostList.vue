<script setup>
import { ref, computed, onMounted } from 'vue';
import { marketApi } from '@/api/MarketApi.js';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import MyMapDetailModal from '@/components/market_management/MyMapDetailModal.vue'

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(relativeTime);
dayjs.locale('ko');
const startDate = ref('');
const endDate = ref('');
const selectedSaleId = ref('');
const saleDetail = ref({});

const filteredItems = computed(() => {
    return [...menu_items.value]
        .filter(item => {
            const itemDate = dayjs(item.date).startOf('day'); // ← 이걸로 정확하게 처리
            const start = startDate.value ? dayjs(startDate.value).startOf('day') : null;
            const end = endDate.value ? dayjs(endDate.value).startOf('day') : null;

            const afterStart = !start || itemDate.isSameOrAfter(start);
            const beforeEnd = !end || itemDate.isSameOrBefore(end);

            return afterStart && beforeEnd;
        })
        .sort((a, b) => {
            const dateA = dayjs(a.date);
            const dateB = dayjs(b.date);
            return sortOrder.value === 'asc' ? dateA.diff(dateB) : dateB.diff(dateA);
        });
});
// D-day 계산
const getDday = (expirationDate) => {
    const today = dayjs();
    const exp = dayjs(expirationDate);
    const diff = exp.diff(today, 'day');

    if (diff > 0) return `D-${diff}`;
    else if (diff === 0) return 'D-day';
    else return `D+${Math.abs(diff)}`;
};

// 등록날짜를 '오늘', '어제', 'n일 전' 형식으로 변환
const getRelativeDate = (dateStr) => {
    const today = dayjs().startOf('day');
    const date = dayjs(dateStr).startOf('day');
    const diff = today.diff(date, 'day');

    if (diff === 0) return '오늘';
    else if (diff === 1) return '어제';
    else return `${diff}일 전`;
};

const sortOrder = ref('desc'); // 'desc'는 최신순, 'asc'는 오래된순

// 정렬 방향 토글 함수
const toggleSortOrder = () => {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
};

const isDetailModalOpen = ref(false);

//const openDetailModal = () => { isDetailModalOpen.value = true; };
const closeDetailModal = () => { isDetailModalOpen.value = false; };

const menu_items = ref([]);

const openDetailModal = async (item) => {

    console.log(item);
    selectedSaleId.value = item.inventorySaleId;
    console.log(selectedSaleId.value);

    const response = await marketApi.getInventorySaleDetail(selectedSaleId.value);

    if (!response) {

    } else {
        if (response.code === 200) {
            saleDetail.value = response.data;
            console.log(response);
            console.log(saleDetail.value);
            isDetailModalOpen.value = true;
        }

    }
}

const fetchInventorySaleList = async () => {
    const response = await marketApi.getInventorySaleList();

    // 서버 에러일때
    if (!response) {

    } else {
        const code = response.code;
        console.log(response.data);
        if (code === 200) {
            menu_items.value = response.data.map(item => ({
                ...item,
            }))
            console.log(menu_items.value);
        }

    }
}


onMounted(() => {
    // 컴포넌트생성될때 거래내역 목록 가져옴
    fetchInventorySaleList();

});
</script>
<template>
    <div class="body">
        <h1 class="page_title">목록으로 보기</h1>

        <!-- 검색 바 및 등록/삭제 버튼 -->
        <div class="search_container">
            <div class="search_box">
                <input type="text" class="search_input" placeholder="물품 검색" />
                <button class="search_btn">
                    <img src="@/assets/image/search_button.png" class="search_icon">
                </button>
            </div>
            <div class="date_filter_box">
                <label>
                    시작일
                    <input type="date" v-model="startDate" />
                </label>
                <label>
                    종료일
                    <input type="date" v-model="endDate" />
                </label>
            </div>
        </div>

        <!-- 상품 목록 -->
        <table class="menu_table">
            <thead>
                <tr>
                    <th>판매물품 </th>
                    <th>수량</th>
                    <th>유통기한</th>
                    <th>희망가격</th>
                    <th>
                        <div class="sortable_header" @click="toggleSortOrder">
                            등록날짜
                            <span v-if="sortOrder === 'asc'">🔼</span>
                            <span v-else>🔽</span>
                        </div>
                    </th>
                    <th>가게명</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(item, index) in filteredItems" :key="index">
                    <td class="bold_text">{{ item.inventoryName }}</td>
                    <td class="bold_text">{{ item.quantity }} </td>
                    <td>{{ getDday(item.expirationDate) }}</td>
                    <td>{{ item.price.toLocaleString() }}원</td>
                    <td>{{ getRelativeDate(item.createdDate) }}</td>
                    <td>{{ item.sellerStoreName }}</td>
                    <td>
                        <button class="detail_btn" @click="openDetailModal(item)">상세</button>
                    </td>
                </tr>
            </tbody>
        </table>
        <MyMapDetailModal :isOpen="isDetailModalOpen" :item="saleDetail" @close="closeDetailModal" />
    </div>
</template>

<style scoped>
.body {
    padding: 20px;
}

.bold_text {
    font-weight: bold;
}

.sortable_header {
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    gap: 4px;
    user-select: none;
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
    background-color: #B8C0C8;
    color: black;
    width: 80px;
    border: 1px solid #ccc;
    font-size: 14px;
    border-radius: 20px;
    font-weight: bold;
    cursor: pointer;
}

.detail_btn:hover {
    background-color: #98A8B8;
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
    background-color: #B8C0C8;
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
    background-color: blue;
    border-color: blue;
    ;
}

.circle_checkbox:checked::after {
    content: "";
    position: absolute;
    top: 4px;
    left: 4px;
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
}
</style>