<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/index.js';

const route = useRoute();
const router = useRouter();
const orderList = ref([]);
const orderInfo = ref({
    type: '',
    tableId: null,
    deliveryService: ''
});

// 주문 ID 저장 (배달 주문 결제 시 사용)
const orderId = ref(null);
const isProcessing = ref(false);

onMounted(() => {
    try {
        // 주문 정보 가져오기
        if (route.query.orders) {
            orderList.value = JSON.parse(route.query.orders).map((item) => ({
                ...item,
                basePrice: item.basePrice || item.price,
                optionIds: item.optionIds || [], // optionIds 초기화
                options: item.options || [], // options 초기화
            }));
        }

        // 배달 주문 ID 가져오기 (있는 경우)
        if (route.query.orderId) {
            orderId.value = route.query.orderId;
        }

        // 로컬스토리지에서 옵션 데이터 가져오기
        const storedOptions = JSON.parse(localStorage.getItem('selected_options') || '{}');
        orderList.value.forEach(order => {
            if (storedOptions[order.id]) {
                order.optionIds = storedOptions[order.id]; // 옵션 ID만 반영
            }
        });

        // 주문 타입 정보 가져오기 (테이블 또는 배달)
        const orderType = localStorage.getItem('order_type');
        if (orderType === 'table') {
            orderInfo.value = {
                type: 'table',
                tableId: localStorage.getItem('selected_table_id'),
                deliveryService: '',
            };
        } else if (orderType === 'delivery') {
            orderInfo.value = {
                type: 'delivery',
                tableId: null,
                deliveryService: route.query.service || localStorage.getItem('delivery_service'), // baemin, yogiyo, coupang 중 하나
            };
        }
    } catch (error) {
        console.error('주문 데이터 파싱 오류:', error);
        orderList.value = [];
    }
});

// 총 수량 계산
const total_quantity = computed(() => {
    return orderList.value.reduce((sum, item) => sum + item.quantity, 0);
});

// 총 가격 계산
const total_price = computed(() => {
    return orderList.value.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
    }, 0);
});

// 선택된 결제 방법
const selectedPayment = ref(null);

// 결제 방법 선택
const selectPayment = (method) => {
    selectedPayment.value = method;
};

// 결제 처리
const processPayment = async () => {
    if (isProcessing.value) return; // 중복 클릭 방지
    isProcessing.value = true;

    try {
        if (!selectedPayment.value) {
            alert('결제 방법을 선택해주세요.');
            return;
        }

        const requestData = {
            tableNumber: orderInfo.value.type === 'table' ? orderInfo.value.tableId : null,
            orderType: orderInfo.value.type === 'table' ? 'hall' : orderInfo.value.deliveryService,
            orderMenus: orderList.value.map((item) => ({
                menuId: item.id,
                quantity: item.quantity,
                price: item.basePrice,
                optionIds: item.optionIds || [],
            })),
        };

        const response = await api.posOrder(requestData);

        alert(`${selectedPayment.value} 방식으로 ${total_price.value.toLocaleString()}원 결제가 완료되었습니다.`);

        if (orderInfo.value.type === 'table') {
            clearTableOrders(orderInfo.value.tableId);
        } else if (orderInfo.value.type === 'delivery') {
            clearDeliveryOrders(orderInfo.value.deliveryService);
        }

        localStorage.removeItem('selected_options');
        router.push('/pos');
    } catch (error) {
        console.error('결제 처리 중 오류:', error);
        alert(error.message);
    } finally {
        isProcessing.value = false;
    }
};

// 테이블 주문 초기화
const clearTableOrders = (tableId) => {
    const tables = JSON.parse(localStorage.getItem('restaurant_tables') || '[]');
    const tableIndex = tables.findIndex(t => t.id == tableId);

    if (tableIndex !== -1) {
        // 테이블 상태 초기화
        tables[tableIndex].status = 'empty';
        tables[tableIndex].orders = [];
        localStorage.setItem('restaurant_tables', JSON.stringify(tables));
    }
};

// 배달 주문 초기화 - 특정 주문만 삭제하도록 수정
const clearDeliveryOrders = (service) => {
    const deliveryOrders = JSON.parse(localStorage.getItem('delivery_orders') || '{}');

    // 특정 주문 ID가 있는 경우 해당 주문만 삭제
    if (orderId.value && deliveryOrders[service]) {
        const orderIndex = deliveryOrders[service].findIndex(order => order.id === orderId.value);
        if (orderIndex !== -1) {
            deliveryOrders[service].splice(orderIndex, 1);

            // 해당 서비스의 주문이 모두 삭제된 경우 서비스 키 자체를 삭제
            if (deliveryOrders[service].length === 0) {
                delete deliveryOrders[service];
            }

            localStorage.setItem('delivery_orders', JSON.stringify(deliveryOrders));
        }
    } else if (deliveryOrders[service]) {
        // 주문 ID가 없는 경우 해당 서비스의 모든 주문 삭제 (기존 동작)
        delete deliveryOrders[service];
        localStorage.setItem('delivery_orders', JSON.stringify(deliveryOrders));
    }

    // 현재 작업 중인 배달 주문도 삭제
    const currentDeliveryOrder = JSON.parse(localStorage.getItem('current_delivery_order') || '{}');
    if (currentDeliveryOrder[service]) {
        delete currentDeliveryOrder[service];
        localStorage.setItem('current_delivery_order', JSON.stringify(currentDeliveryOrder));
    }
};

// 뒤로가기
const goBack = () => {
    router.back();
};
</script>

<template>
    <div class="payment_container">
        <!-- 결제 섹션 -->
        <div class="payment_section">
            <div class="payment_header">
                <button class="back_btn" @click="goBack">← 뒤로가기</button>
                <h2>총 결제금액</h2>
                <p class="payment_amount">{{ total_price.toLocaleString() }}원을 결제할게요</p>
            </div>

            <!-- 결제 방법 컨테이너 -->
            <div class="payment_methods">
                <!-- 카드 결제 -->
                <div class="payment_method" :class="{ 'selected': selectedPayment === '카드' }"
                    @click="selectPayment('카드')">
                    <div class="payment_icon">
                        <img src="@/assets/image/creditpay.png" alt="카드 결제 아이콘" />
                    </div>
                    <p>카드 결제</p>
                </div>

                <!-- 현금 결제 -->
                <div class="payment_method" :class="{ 'selected': selectedPayment === '현금' }"
                    @click="selectPayment('현금')">
                    <div class="payment_icon">
                        <img src="@/assets/image/cashpay.png" alt="현금 결제 아이콘" />
                    </div>
                    <p>현금 결제</p>
                </div>

                <!-- QR 결제 -->
                <div class="payment_method" :class="{ 'selected': selectedPayment === 'QR' }"
                    @click="selectPayment('QR')">
                    <div class="payment_icon">
                        <!-- SVG 아이콘으로 대체 (이미지 경로 문제 해결) -->
                        <div class="payment_icon">
                            <img src="@/assets/image/qrpay.png" alt="QR 결제 아이콘" />
                        </div>
                    </div>
                    <p>QR 결제</p>
                </div>
            </div>
            <button class="pay_button" @click="processPayment" :disabled="isProcessing">
                <span v-if="isProcessing">처리 중...</span>
                <span v-else>결제하기</span>
            </button>
        </div>

        <!-- 주문 목록 -->
        <div class="order_container">
            <div class="order_list">
                <h3>주문 목록</h3>
                <ul>
                    <li v-for="(order, index) in orderList" :key="index">
                        <div>
                            <strong>{{ order.name }}</strong> ({{ order.quantity }}개) -
                            <span>{{ (order.price * order.quantity).toLocaleString() }}원</span>
                        </div>

                        <div v-if="order.options && order.options.length">
                            <ul>
                                <li v-for="opt in order.options" :key="opt.label">
                                    <span>{{ `${opt.label} (+${opt.price.toLocaleString()}원)` }}</span>
                                </li>
                            </ul>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<style scoped>
.payment_container {
    display: flex;
    width: 100%;
    min-height: 80vh;
    background-color: #f5f5f5;
    padding: 20px;
    gap: 20px;
}

/* 결제 섹션 스타일 */
.payment_section {
    flex: 2;
    background-color: #f9f9f9;
    border-radius: 15px;
    padding: 30px;
    display: flex;
    flex-direction: column;
}

.payment_header {
    margin-bottom: 30px;
}

.back_btn {
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 8px 15px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-bottom: 15px;
}

.back_btn:hover {
    background-color: #5a6268;
}

.payment_header h2 {
    font-size: 24px;
    font-weight: bold;
    color: #333;
    margin-bottom: 10px;
}

.payment_amount {
    font-size: 28px;
    font-weight: bold;
    color: #333;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #ddd;
}

/* 결제 방법 컨테이너 - 가로 정렬 */
.payment_methods {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 40px;
}

.payment_method {
    flex: 1;
    background-color: white;
    border-radius: 15px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
}

.payment_method:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.payment_method.selected {
    border-color: #6c3ce9;
    background-color: #f0e8ff;
}



.payment_icon img {
    width: 40px;
    height: 40px;
    object-fit: contain;
}

.payment_method p {
    font-size: 16px;
    font-weight: bold;
    margin: 0;
}

.pay_button {
    background-color: #6c3ce9;
    color: white;
    border: none;
    border-radius: 10px;
    padding: 15px;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-top: auto;
}

.pay_button:hover {
    background-color: #5c2cd9;
}

/* 주문 목록 스타일 */
.order_container {
    flex: 1;
    max-width: 400px;
}

.order_list {
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border: 2px solid #ddd;
    padding: 15px;
    height: 100%;
    overflow-y: auto;
}

.order_list h3 {
    text-align: center;
    font-size: 18px;
    font-weight: bold;
    color: #333;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 2px solid #ddd;
}

.order_list ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.order_list li {
    background: #FFFFFF;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 10px;
    border: 2px solid #ccc;
}

.order_list li ul {
    margin-top: 5px;
    padding-left: 10px;
    font-size: 14px;
}

.order_list li ul li {
    color: #666;
    border: none;
    margin-bottom: 2px;
    padding: 2px;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
    .payment_container {
        flex-direction: column;
    }

    .payment_section {
        order: 1;
    }

    .order_container {
        order: 2;
        max-width: 100%;
    }

    /* 모바일에서도 가로 정렬 유지 */
    .payment_methods {
        flex-direction: row;
        flex-wrap: wrap;
    }

    /* 모바일에서 결제 방법 카드 크기 조정 */
    .payment_method {
        min-width: 100px;
    }
}

/* 매우 작은 화면에서는 세로 정렬로 변경 */
@media (max-width: 480px) {
    .payment_methods {
        flex-direction: column;
    }
}
</style>