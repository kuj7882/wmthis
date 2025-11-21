<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// 테이블 데이터
const tables = ref([
    { id: 1, name: '테이블 01', status: 'empty', orders: [] },
    { id: 2, name: '테이블 02', status: 'empty', orders: [] },
    { id: 3, name: '테이블 03', status: 'empty', orders: [] },
    { id: 4, name: '테이블 04', status: 'empty', orders: [] },
    { id: 5, name: '테이블 05', status: 'empty', orders: [] },
    { id: 6, name: '테이블 06', status: 'empty', orders: [] },
    { id: 7, name: '테이블 07', status: 'empty', orders: [] },
    { id: 8, name: '테이블 08', status: 'empty', orders: [] },
    { id: 9, name: '테이블 09', status: 'empty', orders: [] },
]);

const deliveryOrdersCount = ref(0);

// 배달 주문 건수 계산 함수
const calculateDeliveryOrdersCount = () => {
    const deliveryOrders = JSON.parse(localStorage.getItem('delivery_orders') || '{}');
    let count = 0;

    // 각 배달 서비스의 주문 건수 합산
    Object.keys(deliveryOrders).forEach(service => {
        if (deliveryOrders[service] && Array.isArray(deliveryOrders[service])) {
            count += deliveryOrders[service].length;
        }
    });

    deliveryOrdersCount.value = count;
};

// 주문 건수를 주기적으로 업데이트
let intervalId;

onMounted(() => {
    const savedTables = localStorage.getItem('restaurant_tables');
    if (savedTables) {
        tables.value = JSON.parse(savedTables);
    } else {
        localStorage.setItem('restaurant_tables', JSON.stringify(tables.value)); // 💡 없을 때는 기본 테이블을 저장
    }

    // 배달 주문 건수 계산
    calculateDeliveryOrdersCount();

    // 5초마다 배달 주문 건수 업데이트
    intervalId = setInterval(calculateDeliveryOrdersCount, 5000);
});

onBeforeUnmount(() => {
    // 컴포넌트가 언마운트될 때 인터벌 정리
    if (intervalId) {
        clearInterval(intervalId);
    }
});

// 배달 주문 목록 페이지로 이동
const goToDeliveryOrders = () => {
    router.push('/deliverypositem');
};

// 배달 주문 모달 상태
const showDeliveryModal = ref(false);

// 주문 취소 모달 상태
const showCancelModal = ref(false);
const selectedTableForCancel = ref(null);

// 테이블 선택 처리
const selectTable = (tableId) => {
    // 선택한 테이블 ID를 로컬 스토리지에 저장
    console.log(tables.value)
    localStorage.setItem('selected_table_id', tableId);
    localStorage.setItem('order_type', 'table');

    // 메뉴 선택 페이지로 이동
    router.push(`/posmenu?table=${tableId}`);
};

// 배달 주문 모달 열기
const openDeliveryModal = () => {
    showDeliveryModal.value = true;
};

// 배달 주문 모달 닫기
const closeDeliveryModal = () => {
    showDeliveryModal.value = false;
};

// 배달 서비스 선택 처리
const selectDeliveryService = (service) => {
    // 선택한 배달 서비스를 로컬 스토리지에 저장
    localStorage.setItem('order_type', 'delivery');
    localStorage.setItem('delivery_service', service);

    // 메뉴 선택 페이지로 이동
    router.push(`/posmenu?delivery=${service}`);

    // 모달 닫기
    closeDeliveryModal();
};

// 테이블 상태에 따른 클래스 반환
const getTableClass = (status) => {
    switch (status) {
        case 'occupied':
            return 'table_occupied';
        case 'reserved':
            return 'table_reserved';
        case 'empty':
        default:
            return 'table_empty';
    }
};

// 테이블의 총 주문 금액 계산
const getTableTotal = (orders) => {
    if (!orders || orders.length === 0) return 0;

    return orders.reduce((sum, order) => {
        return sum + (order.price * order.quantity);
    }, 0);
};

// 주문 요약 텍스트 생성
const getOrderSummary = (orders) => {
    if (!orders || orders.length === 0) return '';

    // 가장 많은 수량의 메뉴 찾기
    const sortedOrders = [...orders].sort((a, b) => b.quantity - a.quantity);
    const mainOrder = sortedOrders[0];

    if (orders.length === 1) {
        return `${mainOrder.name} ${mainOrder.quantity}개`;
    } else {
        return `${mainOrder.name} 외 ${orders.length - 1}개 메뉴`;
    }
};

// 주문 취소 모달 열기
const openCancelModal = (event, tableId) => {
    // 이벤트 전파 중지 (테이블 선택 방지)
    event.stopPropagation();

    // 취소할 테이블 설정
    selectedTableForCancel.value = tableId;

    // 모달 열기
    showCancelModal.value = true;
};

// 주문 취소 모달 닫기
const closeCancelModal = () => {
    showCancelModal.value = false;
    selectedTableForCancel.value = null;
};

// 테이블 주문 취소 처리
const cancelTableOrders = () => {
    if (selectedTableForCancel.value) {
        // 테이블 찾기
        const tableIndex = tables.value.findIndex(t => t.id === selectedTableForCancel.value);

        if (tableIndex !== -1) {
            // 테이블 상태 초기화
            tables.value[tableIndex].status = 'empty';
            tables.value[tableIndex].orders = [];

            // 로컬 스토리지 업데이트
            localStorage.setItem('restaurant_tables', JSON.stringify(tables.value));
        }
    }

    // 모달 닫기
    closeCancelModal();
};
</script>

<template>
    <div class="table_selection_container">
        <div class="header">
            <h1>테이블 선택</h1>
            <div class="header_buttons">
                <!-- 배달 주문 목록 버튼 - 항상 표시 -->
                <button class="delivery_orders_btn" @click="goToDeliveryOrders">
                    배달 주문 목록
                    <span class="order_badge" v-if="deliveryOrdersCount > 0">{{ deliveryOrdersCount }}</span>
                </button>
                <button class="delivery_btn" @click="openDeliveryModal">배달 주문</button>
            </div>
        </div>

        <div class="tables_grid">
            <div v-for="table in tables" :key="table.id" class="table_card" :class="getTableClass(table.status)"
                @click="selectTable(table.id)">
                <div class="table_header">
                    <div class="table_name">{{ table.name }}</div>
                    <!-- 주문이 있는 경우에만 취소 버튼 표시 -->
                    <button v-if="table.orders && table.orders.length > 0" class="cancel_btn"
                        @click="(event) => openCancelModal(event, table.id)">
                        ✕
                    </button>
                </div>
                <div v-if="table.orders && table.orders.length > 0" class="table_order_info">
                    <div class="order_summary">{{ getOrderSummary(table.orders) }}</div>
                    <div class="order_total">{{ getTableTotal(table.orders).toLocaleString() }}원</div>
                    <div class="order_count">주문: {{ table.orders.length }}개</div>
                </div>
            </div>
        </div>

        <!-- 배달 주문 모달 -->
        <div v-if="showDeliveryModal" class="modal_overlay" @click="closeDeliveryModal">
            <div class="modal_content" @click.stop>
                <h2>배달 서비스 선택</h2>
                <div class="delivery_options">
                    <div class="delivery_option" @click="selectDeliveryService('baemin')">
                        <div class="delivery_icon baemin_icon">
                            <span>B</span>
                        </div>
                        <p>배달의 민족</p>
                    </div>
                    <div class="delivery_option" @click="selectDeliveryService('yogiyo')">
                        <div class="delivery_icon yogiyo_icon">
                            <span>Y</span>
                        </div>
                        <p>요기요</p>
                    </div>
                    <div class="delivery_option" @click="selectDeliveryService('coupang')">
                        <div class="delivery_icon coupang_icon">
                            <span>C</span>
                        </div>
                        <p>쿠팡 이츠</p>
                    </div>
                </div>
                <button class="close_btn" @click="closeDeliveryModal">닫기</button>
            </div>
        </div>

        <!-- 주문 취소 확인 모달 -->
        <div v-if="showCancelModal" class="modal_overlay" @click="closeCancelModal">
            <div class="modal_content cancel_modal" @click.stop>
                <div class="modal_header">
                    <h2>주문 취소</h2>
                    <button class="modal_close_btn" @click="closeCancelModal">✕</button>
                </div>
                <p>테이블 정보를 모두 지우시겠습니까?</p>
                <div class="modal_actions">
                    <button class="cancel_confirm_btn" @click="cancelTableOrders">확인</button>
                    <button class="cancel_close_btn" @click="closeCancelModal">취소</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.table_selection_container {
    width: 100%;
    height: 100vh;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f5f5;
    display: flex;
    flex-direction: column;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}

.header h1 {
    font-size: 24px;
    font-weight: bold;
    color: #333;
}

.header_buttons {
    display: flex;
    gap: 10px;
}

.delivery_btn {
    background-color: #6c3ce9;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 10px 20px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
}

.delivery_btn:hover {
    background-color: #5c2cd9;
}

/* 배달 주문 목록 버튼 스타일 */
.delivery_orders_btn {
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 10px 20px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
    position: relative;
}

.delivery_orders_btn:hover {
    background-color: #c82333;
}

/* 주문 건수 배지 스타일 */
.order_badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: #ffc107;
    color: #212529;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    border: 2px solid white;
}

.tables_grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 40px;
    flex: 1;
    justify-items: center;
    align-items: center;
}

.table_card {
    background-color: #bbbfc4;
    border-radius: 10px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    cursor: pointer;
    min-width: 300px;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    min-height: 150px;
    position: relative;
}

.table_card:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

/* 테이블 헤더 (이름과 취소 버튼) */
.table_header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.table_name {
    font-size: 18px;
    font-weight: bold;
    color: #333;
}

/* 취소 버튼 스타일 */
.cancel_btn {
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 10;
}

.cancel_btn:hover {
    background-color: #c82333;
    transform: scale(1.1);
}

.table_order_info {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.order_summary {
    font-size: 16px;
    font-weight: bold;
    color: #333;
}

.order_total {
    font-size: 18px;
    font-weight: bold;
    color: #dc3545;
}

.order_count {
    font-size: 14px;
    color: #333;
    background-color: rgba(255, 255, 255, 0.3);
    padding: 4px 8px;
    border-radius: 4px;
    display: inline-block;
    margin-top: 5px;
}

/* 테이블 상태별 스타일 */
.table_empty {
    background-color: #bbbfc4;
}

.table_occupied {
    background-color: #f8d7da;
    border: 2px solid #dc3545;
}

.table_reserved {
    background-color: #d1ecf1;
    border: 2px solid #17a2b8;
}

/* 모달 스타일 */
.modal_overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal_content {
    background-color: white;
    border-radius: 10px;
    padding: 30px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.modal_content h2 {
    text-align: center;
    margin-bottom: 20px;
    font-size: 22px;
    color: #333;
}

/* 취소 모달 스타일 */
.cancel_modal {
    max-width: 400px;
}

.modal_header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.modal_header h2 {
    margin: 0;
    text-align: left;
}

.modal_close_btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #6c757d;
}

.modal_close_btn:hover {
    color: #343a40;
}

.cancel_modal p {
    font-size: 18px;
    margin-bottom: 20px;
    text-align: center;
}

.modal_actions {
    display: flex;
    justify-content: space-between;
    gap: 10px;
}

.cancel_confirm_btn,
.cancel_close_btn {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
}

.cancel_confirm_btn {
    background-color: #dc3545;
    color: white;
}

.cancel_confirm_btn:hover {
    background-color: #c82333;
}

.cancel_close_btn {
    background-color: #B8C0C8;
    color: black;
}

.cancel_close_btn:hover {
    background-color: #5a6268;
}

.delivery_options {
    display: flex;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 30px;
}

.delivery_option {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 15px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
}

.delivery_option:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.delivery_icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
    font-size: 24px;
    font-weight: bold;
    color: white;
}

.baemin_icon {
    background-color: #2AC1BC;
}

.yogiyo_icon {
    background-color: #FA0050;
}

.coupang_icon {
    background-color: #0074E9;
}

.delivery_option p {
    font-size: 16px;
    font-weight: bold;
    margin: 0;
}

.close_btn {
    width: 100%;
    padding: 10px;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.close_btn:hover {
    background-color: #5a6268;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
    .tables_grid {
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(5, 1fr);
    }

    .delivery_options {
        flex-direction: column;
    }

    .header_buttons {
        flex-direction: column;
    }
}

@media (max-width: 480px) {
    .tables_grid {
        grid-template-columns: 1fr;
        grid-template-rows: repeat(9, 1fr);
    }

    .header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }

    .header_buttons {
        width: 100%;
    }

    .delivery_btn,
    .delivery_orders_btn {
        width: 100%;
    }
}
</style>