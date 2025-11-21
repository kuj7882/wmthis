<script setup>
import { marketApi } from "@/api/MarketApi.js";
import { api } from '@/api/MenuApi.js';
import { defineProps, defineEmits, ref, watch } from 'vue';

const props = defineProps({
    saleId: Number,
    isOpen: Boolean,
    productName: {
        type: String,
        default: ''
    },
    items: {
        type: Object,
        required: true,
    },
});
const ingredients = ref([]);

const methodMap = {
    "cash": "만나서결제",
    "credit_card": "카드결제",
};
const handleOverlayClick = () => {
    emit('close');
};
const emit = defineEmits(['close']);

// 샘플 요청 데이터
const requestItems = ref([]);

// 요청 처리 함수
const handleApprove = async (id) => {
    await marketApi.approvePurchase(props.saleId, id);
    alert(`ID ${id} 요청을 승인했습니다.`);
};

const handleReject = async (id) => {
    await marketApi.rejectPurchase(id);
    alert(`ID ${id} 요청을 거절했습니다.`);
};
const setItems = (items) => {
    requestItems.value = items;
}
watch(() => props.items, (newItems) => {
    console.log('새로 받은 아이템:', newItems);
    getStoreInventoryList(); // 재고 목록을 가져오는 함수 호출
    if (newItems) setItems(newItems);
});
const getStoreInventoryList = async () => {
    const result = await api.getStoreInventoryList();
    if (result) {
        ingredients.value = result.map(item => ({
            id: item.id,
            name: item.name,
            unit: item.unit,
        }));
        console.log('재고 목록:', ingredients.value);
    } else {
        console.log("재고 목록을 불러오는 데 실패했습니다.");
    }
};
</script>

<template>
    <div v-if="props.isOpen" class="side_modal_overlay" @click="handleOverlayClick" style="z-index: 2000;">
        <div class="side_modal" @click.stop>
            <div class="modal_content">
                <div class="modal_header">
                    <h2 class="modal_title">요청 목록</h2>
                    <button class="close_btn" @click="emit('close')">✕</button>
                </div>

                <div class="product_name">{{ props.productName }}</div>

                <table class="request_table">
                    <thead>
                        <tr>
                            <th>수량</th>
                            <th>희망 금액</th>
                            <th>결제 방법</th>
                            <th>신청 매장</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in requestItems" :key="item.id">
                            <td>{{ item.quantity }}</td>
                            <td>{{ item.price }}</td>
                            <td>{{ methodMap[item.method] }}</td>
                            <td>{{ item.buyerStoreName }}</td>
                            <td class="action_buttons">
                                <button class="approve_btn" @click="handleApprove(item.inventoryPurchaseId)">✓</button>
                                <button class="reject_btn" @click="handleReject(item.inventoryPurchaseId)">✗</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 오른쪽 정렬 모달 오버레이 - 요청 목록 모달용 */
.side_modal_overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    justify-content: flex-end;
    /* 오른쪽에 모달 표시 */
    align-items: flex-start;
    /* 상단 정렬 */
    opacity: 0;
    animation: fadeIn 0.3s forwards;
    z-index: 1000;
}

.side_modal {
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

.modal_header {
    border-bottom: #ccc solid 1px;
    margin-bottom: 10px;
    position: relative;
    padding-bottom: 10px;
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

.close_btn {
    position: absolute;
    top: 0;
    right: 0;
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

.product_name {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 15px;
}

.request_table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
}

.request_table th {
    background-color: #B8C0C8;
    padding: 12px 8px;
    text-align: center;
    font-weight: bold;
    font-size: 14px;
}

.request_table td {
    padding: 12px 8px;
    text-align: center;
    border-bottom: 1px solid #eee;
    font-size: 14px;
}

.action_buttons {
    display: flex;
    justify-content: center;
    gap: 8px;
}

.approve_btn,
.reject_btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    cursor: pointer;
}

.approve_btn {
    background-color: #4caf50;
    color: white;
}

.reject_btn {
    background-color: #f44336;
    color: white;
}

.confirm_btn {
    margin-top: auto;
    padding: 12px;
    background: #B1D5C2;
    color: black;
    border: none;
    border-radius: 30px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    width: 100%;
    transition: background-color 0.3s ease;
}

.confirm_btn:hover {
    background: #8CBFA4;
}


/* 상단 왼쪽 */
.request_table thead tr:first-child th:first-child {
    border-top-left-radius: 20px;
}

/* 상단 오른쪽 */
.request_table thead tr:first-child th:last-child {
    border-top-right-radius: 20px;
}

/* 왼쪽 아래 둥글게 */
.request_table thead tr:first-child th:first-child {
    border-bottom-left-radius: 20px;
}

/* 오른쪽 아래 둥글게 */
.request_table thead tr:first-child th:last-child {
    border-bottom-right-radius: 20px;
}
</style>
