<script setup>
import { ref, computed, onMounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import POSOption from "@/components/pos_management/POSOption.vue"
import { api } from "@/api/MenuApi.js"

const route = useRoute()
const router = useRouter()

// 주문 정보 (테이블 또는 배달)
const orderInfo = ref({
  type: "",
  tableId: null,
  deliveryService: "",
})
const checkStockAvailability = async (orderList) => {
  try {
    const formattedOrder = {
      orderMenus: orderList.map((order) => ({
        menuId: order.id,
        quantity: order.quantity,
        optionIds: order.options ? order.options.map((option) => option.id) : [],
      })),
    }

    const response = await api.checkStockAvailability(formattedOrder)

    if (response.code !== 200) {
      alert(response.message)
      return null
    }

    return response.data // 정상일 때만 data 반환
  } catch (error) {
    console.error("재고 확인 오류:", error)
    return null
  }
}

// 주문 완료 모달
const showOrderCompleteModal = ref(false)

// 결제 완료 모달
const showPaymentCompleteModal = ref(false)

// 주문 목록
const orderList = ref([])

// 카테고리 목록
const categories = ref([])
// 선택된 카테고리 ID (null은 전체 메뉴, -1은 카테고리 없음)
const selectedCategoryId = ref(null)

// 메뉴 아이템 목록
const menu_items = ref([])

// 메뉴 아이템 가져오기
const fetchMenuItems = async () => {
  try {
    const response = await api.getPOSMenuList()
    if (response && response.data) {
      menu_items.value = response.data // API 응답 데이터를 menu_items에 저장
      console.log("Menu items loaded:", menu_items.value)

      // 메뉴 아이템에서 고유한 카테고리 ID 추출
      //extractCategoriesFromMenuItems();
    } else {
      console.error("메뉴 데이터를 가져오는 데 실패했습니다.")
      menu_items.value = [] // 실패 시 빈 배열로 설정
    }
  } catch (error) {
    console.error("Error in fetchMenuItems:", error)
    menu_items.value = [] // 실패 시 빈 배열로 설정
  }
}

// Add a new function to fetch categories
const fetchCategories = async () => {
  try {
    const response = await api.getPOSCategoryList()
    if (response && response.data) {
      return response.data
    } else {
      console.error("카테고리 데이터를 가져오는 데 실패했습니다.")
      return []
    }
  } catch (error) {
    console.error("Error in fetchCategories:", error)
    return []
  }
}

// Modify the extractCategoriesFromMenuItems function to use actual category names
const extractCategoriesFromMenuItems = async () => {
  if (!menu_items.value || !Array.isArray(menu_items.value)) {
    return
  }

  // Fetch categories from API
  const categoryList = await fetchCategories()

  // Create a map of category id to name for quick lookup
  const categoryNameMap = {}
  categoryList.forEach((category) => {
    categoryNameMap[category.id] = category.name
  })

  // Category ID map creation (for deduplication)
  const categoryMap = new Map()

  menu_items.value.forEach((item) => {
    if (item.category !== null && item.category !== undefined) {
      // Convert category ID to string for consistency
      const categoryId = String(item.category)

      // Only add if not already in the map
      if (!categoryMap.has(categoryId)) {
        // Use the actual category name if available, otherwise fallback to default
        const categoryName = categoryNameMap[item.category] || `카테고리 ${categoryId}`

        categoryMap.set(categoryId, {
          id: item.category,
          name: categoryName,
        })
      }
    }
  })

  // Convert map to array of categories
  categories.value = Array.from(categoryMap.values())
  console.log("Extracted categories with names:", categories.value)
}

// 컴포넌트 마운트 시 주문 정보 로드
onMounted(async () => {
  loadOrderInfo()
  loadExistingOrders()
  await fetchMenuItems() // First fetch menu items
  await extractCategoriesFromMenuItems() // Then extract categories with names
})

// 라우트 변경 감지
watch(
  () => route.query,
  () => {
    loadOrderInfo()
    loadExistingOrders()
  },
  { deep: true },
)

// 주문 정보 로드
const loadOrderInfo = () => {
  // URL 쿼리 파라미터 또는 로컬 스토리지에서 주문 정보 가져오기
  const orderType = localStorage.getItem("order_type")

  if (orderType === "table") {
    const tableId = route.query.table || localStorage.getItem("selected_table_id")
    orderInfo.value = {
      type: "table",
      tableId: tableId,
      deliveryService: "",
    }
  } else if (orderType === "delivery") {
    const service = route.query.delivery || localStorage.getItem("delivery_service")
    orderInfo.value = {
      type: "delivery",
      tableId: null,
      deliveryService: service,
    }
  }
}

// 기존 주문 불러오기
const loadExistingOrders = () => {
  if (orderInfo.value.type === "table") {
    const tables = JSON.parse(localStorage.getItem("restaurant_tables") || "[]")
    const table = tables.find((t) => t.id == orderInfo.value.tableId)

    if (table && table.orders && table.orders.length > 0) {
      orderList.value = JSON.parse(JSON.stringify(table.orders)) // 깊은 복사
    } else {
      orderList.value = []
    }
  } else if (orderInfo.value.type === "delivery") {
    // 현재 작업 중인 배달 주문 불러오기
    const currentDeliveryOrder = JSON.parse(localStorage.getItem("current_delivery_order") || "{}")
    const service = orderInfo.value.deliveryService

    if (currentDeliveryOrder[service] && currentDeliveryOrder[service].length > 0) {
      orderList.value = JSON.parse(JSON.stringify(currentDeliveryOrder[service])) // 깊은 복사
    } else {
      orderList.value = []
    }
  }
}

// 주문 정보 표시 텍스트
const orderInfoText = computed(() => {
  if (orderInfo.value.type === "table") {
    return `테이블 ${orderInfo.value.tableId} 주문`
  } else if (orderInfo.value.type === "delivery") {
    const serviceName = getDeliveryServiceName(orderInfo.value.deliveryService)
    return `${serviceName} 배달 주문`
  }
  return "주문 정보 없음"
})

// 배달 서비스 이름 가져오기
const getDeliveryServiceName = (serviceCode) => {
  switch (serviceCode) {
    case "baemin":
      return "배민"
    case "yogiyo":
      return "요기요"
    case "coupang":
      return "쿠팡이츠"
    default:
      return serviceCode
  }
}

// 카테고리별로 필터링된 메뉴 아이템
const filteredMenuItems = computed(() => {
  if (!menu_items.value || !Array.isArray(menu_items.value)) {
    return []
  }

  console.log("Filtering with selectedCategoryId:", selectedCategoryId.value)

  // 전체 메뉴 선택 시
  if (selectedCategoryId.value === null) {
    return menu_items.value
  }

  // 카테고리 없음 선택 시
  if (selectedCategoryId.value === -1) {
    return menu_items.value.filter((item) => item.category === null)
  }

  // 특정 카테고리 선택 시 (문자열 변환 후 비교)
  return menu_items.value.filter((item) => {
    // 디버깅을 위한 로그
    console.log("Comparing item.category:", item.category, "with selectedCategoryId:", selectedCategoryId.value)

    // 타입 변환 없이 직접 비교 (===)
    return item.category === selectedCategoryId.value
  })
})

const currentPage = ref(1) // 현재 페이지
const itemsPerPage = 16 // 한 페이지에 표시할 아이템 개수

// 총 페이지 수 계산
const totalPages = computed(() => {
  const count = filteredMenuItems.value.length
  return count > 0 ? Math.ceil(count / itemsPerPage) : 1
})

// 현재 페이지의 아이템만 보여주도록 필터링
const paginatedMenuItems = computed(() => {
  if (!filteredMenuItems.value || filteredMenuItems.value.length === 0) {
    // 아직 로드 안 되었거나 필터링된 아이템이 없을 경우
    return Array(itemsPerPage).fill(null) // null로 16개 채워서 리턴
  }

  const start = (currentPage.value - 1) * itemsPerPage
  const items = filteredMenuItems.value.slice(start, start + itemsPerPage)

  // 항상 16개의 아이템을 보여주기 위해 빈 슬롯으로 채우기
  const filledItems = [...items]
  while (filledItems.length < itemsPerPage) {
    filledItems.push(null)
  }

  return filledItems
})

// 카테고리 변경 시 페이지 초기화
const changeCategory = (categoryId) => {
  console.log("Changing category to:", categoryId)
  selectedCategoryId.value = categoryId
  currentPage.value = 1 // 페이지 초기화
}

const total_quantity = computed(() => {
  return orderList.value.reduce((sum, item) => sum + item.quantity, 0)
})

const total_price = computed(() => {
  return orderList.value.reduce((sum, item) => {
    return sum + item.price * item.quantity
  }, 0)
})

const showModal = ref(false)
const selectedItem = ref(null)

const openModal = (item) => {
  if (!item) {
    console.error("Invalid item passed to openModal:", item)
    return
  }
  selectedItem.value = { ...item }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedItem.value = null
}

const addOrder = (newOrder) => {
  const existingOrder = orderList.value.find(
    (order) =>
      order.id === newOrder.id &&
      order.optionIds.length === newOrder.optionIds.length &&
      order.optionIds.every((id, index) => id === newOrder.optionIds[index]),
  )

  if (existingOrder) {
    existingOrder.quantity += 1
  } else {
    orderList.value.push(newOrder)
  }

  // 주문 목록이 변경될 때마다 로컬 스토리지 업데이트
  saveOrdersToLocalStorage()
}

// 주문 목록을 로컬 스토리지에 저장
const saveOrdersToLocalStorage = () => {
  if (orderInfo.value.type === "table") {
    const tables = JSON.parse(localStorage.getItem("restaurant_tables") || "[]")
    const tableIndex = tables.findIndex((t) => t.id == orderInfo.value.tableId)

    if (tableIndex !== -1) {
      tables[tableIndex].orders = [...orderList.value]
      tables[tableIndex].status = orderList.value.length > 0 ? "occupied" : "empty"
      localStorage.setItem("restaurant_tables", JSON.stringify(tables))
    }
  } else if (orderInfo.value.type === "delivery") {
    // 현재 작업 중인 배달 주문 저장
    const currentDeliveryOrder = JSON.parse(localStorage.getItem("current_delivery_order") || "{}")
    currentDeliveryOrder[orderInfo.value.deliveryService] = [...orderList.value]
    localStorage.setItem("current_delivery_order", JSON.stringify(currentDeliveryOrder))
  }
}

// 이전 페이지로 이동
const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

// 다음 페이지로 이동
const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

// 수량 증가/감소 함수
const increaseQuantity = (index) => {
  orderList.value[index].quantity += 1
  saveOrdersToLocalStorage()
}

const decreaseQuantity = (index) => {
  if (orderList.value[index].quantity > 1) {
    orderList.value[index].quantity -= 1
  } else {
    orderList.value.splice(index, 1)
  }
  saveOrdersToLocalStorage()
}

// 테이블 선택 화면으로 돌아가기
const goBack = () => {
  // 배달 주문인 경우
  if (orderInfo.value.type === "delivery") {
    // 수정 중인 주문인지 확인
    const editingOrderInfo = localStorage.getItem("editing_delivery_order")

    if (editingOrderInfo) {
      console.log("수정 중인 주문 - 상태 유지")
      localStorage.removeItem("editing_delivery_order")
      router.push("/deliverypositem")
    } else {
      // 새 주문인 경우, 현재 작업 중인 배달 주문 삭제
      const currentDeliveryOrder = JSON.parse(localStorage.getItem("current_delivery_order") || "{}")

      const deliveryKey = orderInfo.value.deliveryService
      if (deliveryKey && currentDeliveryOrder[deliveryKey]) {
        delete currentDeliveryOrder[deliveryKey]
      }

      localStorage.setItem("current_delivery_order", JSON.stringify(currentDeliveryOrder))
      router.push("/pos")
    }
  } else {
    // 테이블 주문인 경우 기존처럼 주문 목록 저장
    saveOrdersToLocalStorage()
    router.push("/pos")
  }
}

// 주문 완료 후 테이블 선택 화면으로 이동
const completeOrder = () => {
  showOrderCompleteModal.value = false
  router.push("/pos")
}

// 주문 처리
const processOrder = async () => {
  if (orderList.value.length === 0) {
    alert("주문할 메뉴를 선택해주세요.")
    return
  }

  await checkStockAvailability(orderList.value)

  // 배달 주문인 경우
  if (orderInfo.value.type === "delivery") {
    const service = orderInfo.value.deliveryService

    // 수정 중인 주문인지 확인
    const editingOrderInfo = localStorage.getItem("editing_delivery_order")

    if (editingOrderInfo) {
      // 수정 중인 주문인 경우
      const editingOrder = JSON.parse(editingOrderInfo)

      if (editingOrder.service === service) {
        // 수정된 주문을 원래 주문 목록에 업데이트
        const deliveryOrders = JSON.parse(localStorage.getItem("delivery_orders") || "{}")

        if (deliveryOrders[service] && Array.isArray(deliveryOrders[service])) {
          // 원본 주문 찾기
          const orderIndex = editingOrder.orderIndex

          if (orderIndex >= 0 && orderIndex < deliveryOrders[service].length) {
            // 수정된 주문 항목으로 업데이트
            deliveryOrders[service][orderIndex].items = [...orderList.value]
            localStorage.setItem("delivery_orders", JSON.stringify(deliveryOrders))
          }
        }
      }

      // 수정 중인 주문 정보 삭제
      localStorage.removeItem("editing_delivery_order")
    } else {
      // 새 주문인 경우 - 기존 코드와 동일하게 처리
      const deliveryOrders = JSON.parse(localStorage.getItem("delivery_orders") || "{}")

      // 서비스별 주문 배열이 없으면 초기화
      if (!deliveryOrders[service]) {
        deliveryOrders[service] = []
      }

      // 타임스탬프와 주문 ID 추가하여 각 주문을 고유하게 만듦
      const timestamp = new Date().getTime()
      const orderWithMeta = {
        id: `order_${timestamp}`,
        timestamp: timestamp,
        service: service,
        items: [...orderList.value],
      }

      // 새 주문을 배열에 추가
      deliveryOrders[service].push(orderWithMeta)
      localStorage.setItem("delivery_orders", JSON.stringify(deliveryOrders))
    }

    // 현재 작업 중인 배달 주문 삭제
    const currentDeliveryOrder = JSON.parse(localStorage.getItem("current_delivery_order") || "{}")
    if (currentDeliveryOrder[service]) {
      delete currentDeliveryOrder[service]
      localStorage.setItem("current_delivery_order", JSON.stringify(currentDeliveryOrder))
    }

    // 배달 주문도 주문 완료 모달 표시
    showOrderCompleteModal.value = true
    return
  }

  // 테이블 주문인 경우 주문 목록 저장 후 주문 완료 모달 표시
  saveOrdersToLocalStorage()
  showOrderCompleteModal.value = true
}

// 결제 처리 - 결제 페이지로 이동
const processPayment = async () => {
  if (orderList.value.length === 0) {
    alert("결제할 메뉴가 없습니다.")
    return
  }

  // 재고 확인 (프론트에서는 알림을 띄우지 않음)
  await checkStockAvailability(orderList.value)

  // 주문 목록 저장
  saveOrdersToLocalStorage()

  // 결제 페이지로 이동 (주문 목록 전달)
  router.push({
    path: "/pay",
    query: { orders: JSON.stringify(orderList.value) },
  })
}

</script>

<template>
  <div class="menu_container">
    <!-- 메뉴 목록 -->
    <div class="menu_section">
      <div class="menu_header">
        <button class="back_btn" @click="goBack">← 뒤로가기</button>
        <h2 class="order_info">{{ orderInfoText }}</h2>
      </div>

      <!-- 카테고리 탭 추가 -->
      <div class="category_tabs">
        <button class="category_tab" :class="{ active: selectedCategoryId === null }"
          @click="changeCategory(null)">전체</button>
        <button v-for="category in categories" :key="category.id" class="category_tab"
          :class="{ active: selectedCategoryId === category.id }" @click="changeCategory(category.id)">
          {{ category.name }}
        </button>
        <button class="category_tab" :class="{ active: selectedCategoryId === -1 }" @click="changeCategory(-1)">카테고리
          없음</button>
      </div>

      <!-- 디버깅 정보 (개발 중에만 표시) -->
      <div v-if="false" class="debug-info">
        <p>선택된 카테고리: {{ selectedCategoryId === null ? "전체" : selectedCategoryId === -1 ? "카테고리 없음" : selectedCategoryId
        }}</p>
        <p>필터링된 메뉴 수: {{ filteredMenuItems.length }}</p>
        <p>총 페이지: {{ totalPages }}</p>
        <p>현재 페이지: {{ currentPage }}</p>
      </div>

      <div class="menu_grid">
        <div v-for="(item, index) in paginatedMenuItems" :key="index" class="menu_item" @click="openModal(item)"
          :class="{ 'empty-item': !item }">
          <div v-if="item">
            <div class="menu_name">{{ item.name }}</div>
            <div class="menu_price">{{ item?.price?.toLocaleString() || "가격 없음" }}원</div>
          </div>
        </div>
      </div>

      <!-- 페이지네이션 -->
      <div class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1">◀ 이전</button>
        <span>{{ currentPage }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage === totalPages || totalPages === 0">다음 ▶</button>
      </div>
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
              <ul v-if="order.options && order.options.length">
                <li v-for="opt in order.options" :key="opt.label">
                  <span>{{ `${opt.label} (+${opt.price.toLocaleString()}원)` }}</span>
                </li>
              </ul>
            </div>

            <div class="quantity_controls">
              <button @click="decreaseQuantity(index)">➖</button>
              <span>{{ order.quantity }}</span>
              <button @click="increaseQuantity(index)">➕</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- 주문 버튼 & 결제 버튼 -->
      <div class="order_actions">
        <button class="order_btn" @click="processOrder">주문</button>
        <button class="cart_btn" :disabled="orderList.length === 0" @click="processPayment">
          <span class="cart_icon">{{ total_quantity }}</span>
          {{ total_price.toLocaleString() }}원 결제
        </button>
      </div>
    </div>

    <!-- 메뉴 옵션 모달 -->
    <POSOption v-if="showModal" :selectedItem="selectedItem" @close="closeModal" @addOrder="addOrder" />

    <!-- 주문 완료 모달 -->
    <div v-if="showOrderCompleteModal" class="modal_overlay">
      <div class="modal_content order_complete_modal">
        <h2>주문이 완료되었습니다</h2>
        <p>{{ orderInfoText }}이(가) 성공적으로 등록되었습니다.</p>
        <button class="confirm_btn" @click="completeOrder">확인</button>
      </div>
    </div>
  </div>
</template>


<style scoped>
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu_container {
  display: flex;
  flex-direction: row;
  width: 100%;
  margin: 0 auto;
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 80vh;
  gap: 20px;
}

/* 메뉴 영역을 감싸는 새로운 컨테이너 */
.menu_section {
  display: flex;
  flex-direction: column;
  width: 80%;
}

/* 메뉴 헤더 (뒤로가기 버튼 및 주문 정보) */
.menu_header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 20px;
}

.back_btn {
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

.back_btn:hover {
  background-color: #5a6268;
}

.order_info {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin: 0;
  flex-grow: 1;
}

/* 카테고리 탭 스타일 */
.category_tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.category_tab {
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #555;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category_tab:hover {
  background-color: #e0e0e0;
}

.category_tab.active {
  background-color: #6c3ce9;
  color: white;
  border-color: #6c3ce9;
}

/* 메뉴 목록 */
.menu_grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  grid-template-rows: repeat(4, minmax(100px, 1fr));
  gap: 10px;
  flex-grow: 1;
}

.menu_item {
  background-color: #a9b0bc;
  border-radius: 15px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  min-height: 100px;
  cursor: pointer;
  transition: transform 0.2s;
}

.menu_item:hover:not(.empty-item) {
  transform: scale(1.02);
  background-color: #8e99ab;
}

.empty-item {
  background-color: transparent;
  cursor: default;
}

.menu_name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.menu_price {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-top: auto;
}

/* 주문 영역 */
.order_container {
  display: flex;
  flex-direction: column;
  width: 500px;
  border: 2px solid #bbb;
  background: #f9f9f9;
  border-radius: 10px;
  max-height: calc(100vh - 40px);
  overflow: hidden;
}

/* 주문 목록 전체 스타일 */
.order_list {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 2px solid #ddd;
}

/* 주문 목록 제목 */
.order_list h3 {
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 2px solid #ddd;
}

/* 주문 항목 스타일 */
.order_list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.order_list li {
  background: #ffffff;
  border-radius: 8px;
  padding: 5px;
  margin-bottom: 10px;
  border: 2px solid #ccc;
}

.order_list li ul {
  margin-top: 3px;
  padding-left: 10px;
  font-size: 14px;
}

.order_list li ul li {
  color: #666;
  border: none;
  margin-bottom: 2px;
  padding: 2px;
}

/* 수량 조절 버튼 스타일 */
.quantity_controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.quantity_controls button {
  background: #b8c0c8;
  color: white;
  border: none;
  padding: 5px 10px;
  font-size: 14px;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.quantity_controls button:hover {
  background: #a5b0b8;
  transform: scale(1.05);
}

/* 주문 버튼 & 결제 버튼 (아래 고정) */
.order_actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border-top: 1px solid #ddd;
  background: white;
}

/* 버튼 스타일 */
.order_btn,
.cart_btn {
  width: 100%;
  height: 50px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 10px;
  cursor: pointer;
}

.order_btn {
  background-color: #d1d5c2;
  color: #333;
  border: none;
}

.order_btn:hover {
  background-color: #c1c5b2;
}

.cart_btn {
  background-color: #6c3ce9;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.cart_btn:hover {
  background-color: #5c2cd9;
}

/* 장바구니 아이콘 */
.cart_icon {
  background-color: white;
  color: #6c3ce9;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}

/* 페이지네이션 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  margin-bottom: 20px;
}

.pagination button {
  background-color: #6c3ce9;
  color: white;
  border: none;
  padding: 10px 15px;
  font-size: 16px;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.2s;
}

.pagination button:hover {
  background-color: #5c2cd9;
}

.pagination button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.pagination span {
  font-size: 16px;
  font-weight: bold;
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

.order_complete_modal {
  text-align: center;
}

.order_complete_modal h2 {
  color: blue;
  margin-bottom: 15px;
}

.order_complete_modal p {
  font-size: 16px;
  margin-bottom: 20px;
}

.confirm_btn {
  background-color: #b8c0c8;
  color: black;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.confirm_btn:hover {
  background-color: #9ea7b0;
}

/* 반응형 디자인 */
@media (max-width: 1200px) {
  .menu_container {
    flex-direction: column;
  }

  .menu_section {
    width: 100%;
  }

  .order_container {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }
}

@media (max-width: 768px) {
  .menu_grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(8, minmax(100px, 1fr));
  }

  .category_tabs {
    overflow-x: auto;
    padding-bottom: 15px;
  }
}

@media (max-width: 480px) {
  .menu_grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(16, minmax(100px, 1fr));
  }

  .menu_header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .category_tab {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>