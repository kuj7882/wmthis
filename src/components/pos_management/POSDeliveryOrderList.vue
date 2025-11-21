<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const deliveryOrders = ref({});
const allDeliveryOrders = ref([]);

// 배달 서비스 이름 가져오기
const getDeliveryServiceName = (serviceCode) => {
    switch (serviceCode) {
        case "baemin":
            return "배민";
        case "yogiyo":
            return "요기요";
        case "coupang":
            return "쿠팡이츠";
        default:
            return serviceCode;
    }
};

// 모든 배달 주문 로드
const loadAllDeliveryOrders = () => {
    const savedOrders = JSON.parse(localStorage.getItem('delivery_orders') || '{}');
    deliveryOrders.value = savedOrders;

    // 모든 배달 주문을 하나의 배열로 변환
    const orders = [];

    Object.keys(savedOrders).forEach(service => {
        if (savedOrders[service] && savedOrders[service].length > 0) {
            // 각 주문에 서비스 정보 추가
            savedOrders[service].forEach(order => {
                // 주문 항목 정보 추출
                const items = order.items || [];
                const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

                orders.push({
                    id: order.id,
                    timestamp: order.timestamp,
                    service,
                    serviceName: getDeliveryServiceName(service),
                    items: items,
                    total: total
                });
            });
        }
    });

    allDeliveryOrders.value = orders;
};

// 서비스별 주문 그룹화
const ordersByService = computed(() => {
    const grouped = {};

    Object.keys(deliveryOrders.value).forEach(service => {
        if (deliveryOrders.value[service] && deliveryOrders.value[service].length > 0) {
            grouped[service] = {
                name: getDeliveryServiceName(service),
                orders: deliveryOrders.value[service],
                total: calculateServiceTotal(deliveryOrders.value[service])
            };
        }
    });

    return grouped;
});

// 서비스별 총액 계산
const calculateServiceTotal = (orders) => {
    return orders.reduce((sum, order) => {
        const items = order.items || [];
        return sum + items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
    }, 0);
};

// 개별 주문 총액 계산
const calculateOrderTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

// 개별 주문 삭제
const removeOrder = (service, orderIndex) => {
    if (confirm('이 주문을 삭제하시겠습니까?')) {
        // 해당 서비스의 주문 배열에서 해당 인덱스의 주문 제거
        const updatedOrders = [...deliveryOrders.value[service]];
        updatedOrders.splice(orderIndex, 1);

        // 주문 배열이 비어있으면 해당 서비스 키 자체를 삭제
        if (updatedOrders.length === 0) {
            const newDeliveryOrders = { ...deliveryOrders.value };
            delete newDeliveryOrders[service];
            deliveryOrders.value = newDeliveryOrders;
        } else {
            // 아니면 업데이트된 주문 배열로 설정
            deliveryOrders.value[service] = updatedOrders;
        }

        // 로컬 스토리지 업데이트
        localStorage.setItem('delivery_orders', JSON.stringify(deliveryOrders.value));

        // 주문이 모두 삭제되었으면 메인 화면으로 이동
        if (Object.keys(deliveryOrders.value).length === 0) {
            router.push('/pos');
        }
    }
};

// 서비스의 모든 주문 삭제
const removeAllServiceOrders = (service) => {
    if (confirm(`${getDeliveryServiceName(service)} 주문을 모두 삭제하시겠습니까?`)) {
        const newDeliveryOrders = { ...deliveryOrders.value };
        delete newDeliveryOrders[service];
        deliveryOrders.value = newDeliveryOrders;

        // 로컬 스토리지 업데이트
        localStorage.setItem('delivery_orders', JSON.stringify(deliveryOrders.value));

        // 주문이 모두 삭제되었으면 메인 화면으로 이동
        if (Object.keys(deliveryOrders.value).length === 0) {
            router.push('/pos');
        }
    }
};

// 결제 페이지로 이동
const goToPayment = (service, orderIndex) => {
    const order = deliveryOrders.value[service][orderIndex];
    if (!order || !order.items || order.items.length === 0) {
        alert('결제할 주문이 없습니다.');
        return;
    }

    router.push({
        path: '/pay',
        query: {
            orders: JSON.stringify(order.items),
            service,
            orderId: order.id
        }
    });
};

// 주문 수정 페이지로 이동
const editOrder = (service, orderIndex) => {
    const order = deliveryOrders.value[service][orderIndex];
    if (!order || !order.items || order.items.length === 0) {
        alert('수정할 주문이 없습니다.');
        return;
    }

    // 현재 작업 중인 배달 주문에 해당 주문 항목 복사
    const currentDeliveryOrder = JSON.parse(localStorage.getItem("current_delivery_order") || "{}");
    currentDeliveryOrder[service] = [...order.items];
    localStorage.setItem("current_delivery_order", JSON.stringify(currentDeliveryOrder));

    // 수정 중인 주문 정보 저장 (원본 주문 ID와 서비스)
    localStorage.setItem("editing_delivery_order", JSON.stringify({
        service: service,
        orderId: order.id,
        orderIndex: orderIndex
    }));

    // 메뉴 화면으로 이동
    localStorage.setItem('order_type', 'delivery');
    localStorage.setItem('delivery_service', service);
    router.push(`/posmenu?delivery=${service}`);
};

// 메인 화면으로 돌아가기
const goBack = () => {
    router.push('/pos');
};

// 메뉴 화면으로 이동
const goToMenu = (service) => {
    // 현재 작업 중인 배달 주문이 있는지 확인
    const currentDeliveryOrder = JSON.parse(localStorage.getItem("current_delivery_order") || "{}");

    // 이미 작업 중인 주문이 있으면 경고
    if (currentDeliveryOrder[service] && currentDeliveryOrder[service].length > 0) {
        if (!confirm(`${getDeliveryServiceName(service)}에 작업 중인 주문이 있습니다. 계속하시겠습니까?`)) {
            return;
        }
    }

    localStorage.setItem('order_type', 'delivery');
    localStorage.setItem('delivery_service', service);

    router.push(`/posmenu?delivery=${service}`);
};

// 배달 서비스 선택 화면으로 이동하는 함수 추가
const goToDeliverySelection = () => {
    router.push('/delivery-selection');
};

// 날짜 포맷팅 함수
const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${date.getMonth() + 1}/${date.getDate()} ${hours}:${minutes}`;
};

onMounted(() => {
    loadAllDeliveryOrders();
});
</script>

<template>
    <div class="delivery-orders-container">
        <div class="header">
            <button class="back-btn" @click="goBack">← 뒤로가기</button>
            <h1>배달 주문 목록</h1>
        </div>

        <div v-if="Object.keys(ordersByService).length === 0" class="no-orders">
            <p>현재 배달 주문이 없습니다.</p>
        </div>

        <div v-else class="service-orders">
            <div v-for="(serviceData, service) in ordersByService" :key="service" class="service-card">
                <div class="service-header">
                    <div class="service-icon" :class="`${service}-icon`">
                        <span>{{ serviceData.name.charAt(0) }}</span>
                    </div>
                    <h2>{{ serviceData.name }} 주문</h2>
                    <div class="service-total">총 {{ serviceData.total.toLocaleString() }}원</div>
                    <button class="remove-all-btn" @click="removeAllServiceOrders(service)" title="모든 주문 삭제">✕</button>
                </div>

                <div class="order-list">
                    <div v-for="(order, index) in serviceData.orders" :key="order.id || index" class="order-item">
                        <div class="order-header">
                            <div class="order-time">
                                {{ order.timestamp ? formatDate(order.timestamp) : '시간 정보 없음' }}
                            </div>
                            <div class="order-total">
                                {{ calculateOrderTotal((order.items || [])).toLocaleString() }}원
                            </div>
                            <button class="remove-order-btn" @click="removeOrder(service, index)"
                                title="주문 삭제">✕</button>
                        </div>

                        <div v-for="(item, itemIndex) in (order.items || [])" :key="itemIndex" class="order-details">
                            <div class="order-name">{{ item.name }}</div>
                            <div class="order-quantity">{{ item.quantity }}개</div>
                            <div class="order-price">{{ (item.price * item.quantity).toLocaleString() }}원</div>

                            <div v-if="item.options && item.options.length" class="order-options">
                                <div v-for="opt in item.options" :key="opt.label" class="option-item">
                                    {{ opt.label }} (+{{ opt.price.toLocaleString() }}원)
                                </div>
                            </div>
                        </div>

                        <div class="order-actions">
                            <button class="edit-btn" @click="editOrder(service, index)">수정하기</button>
                            <button class="pay-btn" @click="goToPayment(service, index)">결제하기</button>
                        </div>
                    </div>
                </div>

                <div class="service-actions">
                    <button class="menu-btn" @click="goToMenu(service)">새 주문 추가</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.delivery-orders-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 80vh;
    padding: 20px;
    background-color: #f5f5f5;
}

.header {
    display: flex;
    align-items: center;
    margin-bottom: 30px;
    gap: 20px;
}

.back-btn {
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 10px 15px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
}

.back-btn:hover {
    background-color: #5a6268;
}

.header h1 {
    font-size: 24px;
    font-weight: bold;
    color: #333;
    margin: 0;
}

.no-orders {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 250px;
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.no-orders p {
    font-size: 18px;
    color: #6c757d;
    margin-bottom: 20px;
}

.new-order-btn {
    background-color: #6c3ce9;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 12px 20px;
    font-size: 16px;
    font-weight: bold;
    margin-top: 20px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.new-order-btn:hover {
    background-color: #5c2cd9;
}

.service-orders {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
}

.service-card {
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: fit-content;
}

.service-header {
    display: flex;
    align-items: center;
    padding: 15px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    position: relative;
}

.service-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 15px;
    font-size: 18px;
    font-weight: bold;
    color: white;
}

.baemin-icon {
    background-color: #2AC1BC;
}

.yogiyo-icon {
    background-color: #FA0050;
}

.coupang-icon {
    background-color: #0074E9;
}

.service-header h2 {
    font-size: 18px;
    font-weight: bold;
    margin: 0;
    flex-grow: 1;
}

.service-total {
    font-size: 16px;
    font-weight: bold;
    color: #6c3ce9;
    margin-right: 10px;
}

.remove-all-btn {
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
}

.remove-all-btn:hover {
    background-color: #c82333;
    transform: scale(1.1);
}

.order-list {
    padding: 15px;
    flex-grow: 1;
    max-height: 500px;
    overflow-y: auto;
}

.order-item {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 15px;
    position: relative;
    border: 1px solid #e9ecef;
}

.order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px dashed #dee2e6;
}

.order-time {
    font-size: 14px;
    color: #6c757d;
    font-style: italic;
}

.order-total {
    font-size: 16px;
    font-weight: bold;
    color: #6c3ce9;
    margin: 0 10px;
}

.order-details {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f1f1f1;
}

.order-name {
    font-weight: bold;
    flex-grow: 1;
    margin-right: 10px;
}

.order-quantity {
    margin: 0 15px;
    color: #6c757d;
}

.order-price {
    font-weight: bold;
    margin-right: 10px;
}

.remove-order-btn {
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.remove-order-btn:hover {
    background-color: #c82333;
    transform: scale(1.1);
}

.order-options {
    width: 100%;
    margin-top: 8px;
    padding-left: 15px;
}

.option-item {
    font-size: 14px;
    color: #6c757d;
    margin-bottom: 4px;
}

.order-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
    gap: 10px;
}

.service-actions {
    display: flex;
    padding: 15px;
    gap: 10px;
    border-top: 1px solid #e9ecef;
}

.menu-btn,
.pay-btn,
.edit-btn {
    padding: 8px 15px;
    border: none;
    border-radius: 5px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
}

.menu-btn {
    background-color: #e9ecef;
    color: #495057;
    flex: 1;
}

.menu-btn:hover {
    background-color: #dee2e6;
}

.edit-btn {
    background-color: #ffc107;
    color: #212529;
}

.edit-btn:hover {
    background-color: #e0a800;
}

.pay-btn {
    background-color: #6c3ce9;
    color: white;
}

.pay-btn:hover {
    background-color: #5c2cd9;
}

@media (max-width: 1200px) {
    .service-orders {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .service-orders {
        grid-template-columns: 1fr;
    }

    .service-header {
        flex-wrap: wrap;
    }

    .service-total {
        margin-right: auto;
        margin-left: 55px;
        margin-top: 5px;
    }

    .remove-all-btn {
        position: absolute;
        top: 15px;
        right: 15px;
    }
}

@media (max-width: 480px) {
    .order-details {
        flex-direction: column;
        align-items: flex-start;
    }

    .order-quantity,
    .order-price {
        margin: 5px 0 0 0;
    }

    .service-actions {
        flex-direction: column;
    }
}
</style>