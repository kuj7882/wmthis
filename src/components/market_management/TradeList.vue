<script setup>
import { ref, computed, onMounted } from "vue";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import TradeRequestModal from "./TradeRequestModal.vue";
import { marketApi } from "@/api/MarketApi";
import { api } from "@/api";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const statusMap = {
  available: "판매중",
  PENDING_APPROVAL: "승인대기중",
  waiting: "요청확인",
  isPaymentInProgress: "결제하기",
  isPaymentPending: "결제대기중",
  confirmDelivery: "배송확정",
  delivery: "배송중",
  sold: "거래완료",
  end: "거래완료",
  cancelled: "거래취소",
};

const form = ref({});

// 상태
const showRequestListModal = ref(false);
const selectedProductId = ref("");

const selectedProductName = ref("");
const tradeType = ref("전체");
const startDate = ref("");
const endDate = ref("");
const sortOrder = ref("desc");

// 드롭다운
const isOpen = ref(false);
const selectedTradeType = ref("전체");
const tradeTypes = ["전체", "판매", "구매"];

// 모달 관련
const showModal = ref(false);
const modalMessage = ref("");
const currentItemIndex = ref(null);
const responseItem = ref([]);

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

const selectType = (type) => {
  selectedTradeType.value = type;
  tradeType.value = type;
  isOpen.value = false;
};

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
};

// 샘플 거래 데이터
const trade_items = ref([]);

const handleButtonClick = async (status, index) => {
  currentItemIndex.value = index;

  if (status === "배송확정") {
    modalMessage.value = "배송을 확정하시겠습니까?";
    showModal.value = true;
  } else if (status === "요청확인") {
    selectedProductId.value = trade_items.value[index].inventorySaleId;
    selectedProductName.value = trade_items.value[index].name;
    console.log(index);
    console.log(selectedProductId.value);
    const response = await marketApi.getPurchaseList(selectedProductId.value);
    console.log(response);
    responseItem.value = response.map((item) => ({
      ...item,
    }));
    console.log(responseItem.value);
    showRequestListModal.value = true;
  } else {
    selectedProductId.value = trade_items.value[index].inventoryPurchaseId;
    console.log(selectedProductId.value);
    modalMessage.value = "결제를 진행하시겠습니까?";
    showModal.value = true;
  }
};

const confirmModal = async () => {
  const index = currentItemIndex.value;
  const item = trade_items.value[index];

  if (statusMap[item.status] === '배송확정') {
    const response = await marketApi.confirmDelivery(item.inventoryPurchaseId);
    console.log(response);
    trade_items.value[index].status = '거래완료';
    alert("배송이 확정되었습니다.");
    location.reload(); // 새로고침
  } else if (statusMap[item.status] === '결제하기') {
    requestPay(item, () => {
      // 결제 성공 시 상태 변경
      item.status = '배송확정';
      showModal.value = false;
      alert("결제가 완료되었습니다.");
      location.reload(); // 결제 완료 후 새로고침
    });
    return;
  }

  showModal.value = false;
};
// 모달 취소

const cancelModal = () => {
  showModal.value = false;
};

const filteredItems = computed(() => {
  return trade_items.value
    .filter((item) => {
      if (tradeType.value !== "전체") {
        const targetType = tradeType.value === "판매";
        if (item.type !== targetType) return false;
      }

      const itemDate = dayjs(item.createdAt).startOf("day");
      const start = startDate.value ? dayjs(startDate.value).startOf("day") : null;
      const end = endDate.value ? dayjs(endDate.value).startOf("day") : null;

      return (!start || itemDate.isSameOrAfter(start)) && (!end || itemDate.isSameOrBefore(end));
    })
    .sort((a, b) => {
      const dateA = dayjs(a.createdAt);
      const dateB = dayjs(b.createdAt);
      return sortOrder.value === "asc" ? dateA.diff(dateB) : dateB.diff(dateA);
    });
});

const requestPay = (item, onSuccess) => {
  console.log("결제 요청", item);
  if (!window.IMP) {
    const script = document.createElement("script");
    script.src = "https://cdn.iamport.kr/js/iamport.payment-1.2.0.js";
    script.onload = () => runPayment(item, onSuccess);
    document.head.appendChild(script);
  } else {
    runPayment(item, onSuccess);
  }
};

const runPayment = (item, onSuccess) => {
  const IMP = window.IMP;
  IMP.init("imp02121780"); // 가맹점 식별코드

  const now = new Date();
  const makeMerchantUid = "IMP" + now.getHours() + now.getMinutes() + now.getSeconds() + now.getMilliseconds();

  IMP.request_pay(
    {
      pg: "kakaopay",
      pay_method: "card",
      merchant_uid: makeMerchantUid,
      name: item.name,
      amount: item.price,
      buyer_name: "WHTHIS",
      buyer_tel: "010-1234-5678",
      buyer_addr: "서울특별시 보라매로 87",
    },
    async function (rsp) {
      if (rsp.success) {
        const data = {
          impUid: rsp.imp_uid,
          merchantUid: rsp.merchant_uid,
          inventoryPurchaseId: selectedProductId.value,
        };
        // 결제 성공 후 서버에 결제 정보 전송
        // 서버에서 결제 검증 후 성공 여부 확인
        if (await api.verify(data)) {
          onSuccess(); // 결제 성공 처리
        } else {
          alert("결제 검증에 실패했습니다.");
        }
      } else {
        console.log("결제 실패:", rsp);
        alert("결제가 취소되었습니다.");
      }
    }
  );
};
const getTransactionList = async () => {
  const response = await marketApi.getTransactionList();
  if (!response) {
  } else {
    const code = response.code;
    if (code === 200) {
      trade_items.value = response.data.map((item) => ({
        ...item,
      }));

      console.log(trade_items.value);
    } else {
    }
  }
};
onMounted(() => {
  // 초기화 작업
  getTransactionList();
});
</script>

<template>
  <div class="body">
    <h1 class="page_title">거래 내역</h1>

    <!-- 필터 -->
    <div class="search_container">
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

    <!-- 거래 내역 테이블 -->
    <table class="menu_table">
      <thead>
        <tr>
          <th>
            <div class="dropdown_wrapper">
              <div class="dropdown_button" @click="toggleDropdown">
                {{ selectedTradeType }}
                <span class="arrow">{{ isOpen ? "▲" : "▼" }}</span>
              </div>
              <ul v-if="isOpen" class="dropdown_menu">
                <li v-for="type in tradeTypes" :key="type" @click.stop="selectType(type)">
                  {{ type }}
                </li>
              </ul>
            </div>
          </th>
          <th>판매물품</th>
          <th>거래가격</th>
          <th>수량</th>
          <th>거래상태</th>
          <th>
            <div class="sortable_header" @click="toggleSortOrder">
              거래날짜
              <span v-if="sortOrder === 'asc'">🔼</span>
              <span v-else>🔽</span>
            </div>
          </th>
          <th>거래매장</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in filteredItems" :key="index">
          <td>{{ item.type ? "판매" : "구매" }}</td>
          <td class="bold_text">{{ item.name }}</td>
          <td>{{ item.price.toLocaleString() }}원</td>
          <td>{{ item.quantity }} {{ item.unit }}</td>
          <td>
            <button v-if="['요청확인', '결제하기', '배송확정'].includes(statusMap[item.status])"
              @click="handleButtonClick(statusMap[item.status], index)" class="detail_btn">
              {{ statusMap[item.status] }}
            </button>
            <span v-else>{{ statusMap[item.status] }}</span>
          </td>
          <td>{{ item.createdAt }}</td>
          <td>{{ item.otherStoreName }}</td>
        </tr>
      </tbody>
    </table>

    <!-- 확인/취소 모달 - 중앙 정렬 -->
    <div v-if="showModal" class="center_modal_overlay">
      <div class="modal_content">
        <p>{{ modalMessage }}</p>
        <div class="modal_buttons">
          <button @click="confirmModal" class="modal_btn confirm">확인</button>
          <button @click="cancelModal" class="modal_btn cancel">취소</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 요청 목록 모달 - 별도 컴포넌트로 분리 -->
  <TradeRequestModal :isOpen="showRequestListModal" :productName="selectedProductName" :items="responseItem"
    :saleId="selectedProductId" @close="showRequestListModal = false" />
</template>

<style scoped>
/* 중앙 정렬 모달 오버레이 - 확인/취소 모달용 */
.center_modal_overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
}

.modal_content {
  background-color: white;
  padding: 24px;
  border-radius: 12px;
  width: 400px;
  text-align: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.modal_content p {
  font-size: 25px;
  font-weight: bold;
}

.modal_buttons {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}

.modal_btn {
  padding: 8px 16px;
  font-weight: bold;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.modal_btn.confirm {
  background-color: #b8c0c8;
  color: black;
}

.modal_btn.confirm:hover {
  background: #9bc1ae;
}

.modal_btn.cancel {
  background-color: #ccc;
}

.modal_btn.cancel:hover {
  background-color: #b3b3b3;
}

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
  justify-content: flex-end;
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

.trade_type_select {
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 10px;
  font-size: 14px;
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
  background-color: #b1d5c2;
  color: black;
  width: 90px;
  border: 1px solid #ccc;
  font-size: 14px;
  border-radius: 20px;
  font-weight: bold;
  cursor: pointer;
}

.detail_btn:hover {
  background-color: #90bdaa;
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

.dropdown_wrapper {
  position: relative;
  display: inline-block;
}

.dropdown_button {
  padding: 6px 12px;
  background-color: #b8c0c8;
  border-radius: 10px;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-size: 18px;
  user-select: none;
  gap: 4px;
  white-space: nowrap;
}

.arrow {
  font-size: 12px;
}

.dropdown_menu {
  position: absolute;
  list-style: none;
  padding: 0;
  top: 100%;
  left: 0;
  width: 100px;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 100;
  margin-top: 4px;
}

.dropdown_menu li {
  padding: 8px;
  font-size: 14px;
  cursor: pointer;
}

.dropdown_menu li:hover {
  background-color: #f0f0f0;
}
</style>
