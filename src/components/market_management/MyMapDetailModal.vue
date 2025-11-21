<script setup>
import { api } from '@/api/MenuApi.js';
import { ref, watch } from "vue";
import { marketApi } from "@/api/MarketApi.js";

import dayjs from "dayjs";
const props = defineProps({
  isOpen: Boolean,
  item: {
    type: Object,
    required: true,
  },
});

const ingredient = ref("");

const form = ref({
  inventorySaleId: "",
  name: "",
  storeName: "",
  unit: "",
  price: "",
  quantity: "",
  description: "",
  expiryDate: "",
  createdDate: "",
  imageUrls: [],
  method: "만나서결제",
});

const methodMap = {
  만나서결제: "cash",
  카드결제: "credit_card",
};


const ingredients = ref([]);
const price = ref("");
const quantity = ref("");
const description = ref("");
const paymentMethod = ref("만나서결제");
const emit = defineEmits(["close"]);

const setItemData = (item) => {
  console.log("item" + item.value);
  form.value.inventorySaleId = item.id;
  form.value.name = item.inventoryName;
  form.value.storeName = item.sellerStoreName;
  form.value.price = item.price;
  form.value.unit = item.unit;
  form.value.quantity = item.quantity;
  form.value.description = item.content;
  form.value.expiryDate = item.expiryDate;
  form.value.createdDate = item.createdDate;
  form.value.imageUrls = item.imageUrls;
  console.log(form.value);
};

const isSubmitting = ref(false);
// 구매 요청 보내고 닫기
const sendTradeRequest = async () => {
  if (isSubmitting.value) return;
  const id = ingredient.value !== "" ? ingredient.value.id : null;

  const data = {
    inventorySaleId: form.value.inventorySaleId,
    inventoryName: form.value.name,
    storeInventoryId: id,
    quantity: form.value.quantity,
    price: form.value.price,
    method: methodMap[form.value.method] || "cash",
  };
  console.log(data);
  console.log(Number(data.quantity));
  console.log(Number(props.item.quantity));

  if (Number(data.quantity) > Number(props.item.quantity)) {
    alert("판매하는 양보다 많은 수량은 입력할 수 없습니다");
  }

  else {
    if (isSubmitting.value) return; // 중복 요청 방지
    isSubmitting.value = true;

    try {
      const response = await marketApi.registerPurchase(data); // 반드시 await 필요

      if (!response) {
        alert("서버 오류가 발생했습니다.");
      } else if (response.data.code === 200) {
        alert("거래 요청이 완료되었습니다.");
        handleClosePanel();
      } else {
        alert(`요청 실패 (코드: ${response.data.code})`);
      }
    }
    catch (error) {
      console.error("요청 중 에러 발생:", error);
      alert("요청 처리 중 오류가 발생했습니다.");
    } finally {
      isSubmitting.value = false;
    }
  }
};

const getDday = (expirationDate) => {
  const today = dayjs();
  const exp = dayjs(expirationDate);
  const diff = exp.diff(today, "day");

  if (diff > 0) return `D-${diff}`;
  else if (diff === 0) return "D-day";
  else return `D+${Math.abs(diff)}`;
};

const handleClosePanel = () => {
  emit("close");
};

const unitGroups = {
  weight: ['kg', 'g'],
  volume: ['ml', 'L'],
  count: ['개'],
};
function getUnitGroup(unit) {
  for (const [group, units] of Object.entries(unitGroups)) {
    if (units.includes(unit)) return group;
  }
  return null; // 해당 없는 경우
}


watch(() => props.item, (newItem) => {
  console.log('새로 받은 아이템:', newItem);
  getStoreInventoryList();
  if (newItem) setItemData(newItem);
});
watch(ingredient, (newValue) => {
  if (newValue) {
    console.log('선택된 재료:', newValue);
    console.log(form.value.unit);

    const ingredientUnitGroup = getUnitGroup(newValue.unit);
    const formUnitGroup = getUnitGroup(form.value.unit);

    if (ingredientUnitGroup !== formUnitGroup) {
      console.log(
        '단위가 다릅니다. 재고 단위:',
        newValue.unit,
        '물품 단위:',
        form.value.unit
      );
      // 예: 사용자에게 알림 표시

      alert("같은 종류의 단위를 가진 재고만 선택가능합니다.");
      ingredient.value = ""; // 선택 초기화
    }
    console.log(ingredient.value);
  }
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

const itemLabel = (item) => {
  if (!item) return '';
  return `${item.name} (단위: ${item.unit})`;
};
</script>

<template>
  <div v-if="isOpen" class="modal_overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="detail_modal">
        <div class="title">
          <h1 class="title_left">{{ form.name }}</h1>
          <div class="title_right">
            <button class="close_btn" @click="handleClosePanel"><img src="@/assets/image/xMark.png"
                class="x_button" /></button>
            <p class="title_store">{{ form.storeName }}</p>
          </div>
        </div>

        <div class="price_quantity">
          <div>
            <label>희망가격 <span style="color: red">(필수)</span></label>
            <div class="detail_message">구입 희망가격을 입력해주세요</div>
          </div>
          <div><input type="number" class="no_spinner number_insert" v-model="form.price" /> 원</div>
        </div>

        <div class="price_quantity">
          <div>
            <label>수량 <span style="color: red">(필수)</span></label>
            <div class="detail_message">물품의 수량을 입력해주세요</div>
          </div>
          <div><input type="number" class="no_spinner number_insert" v-model="form.quantity" /> {{ item.unit }}</div>
        </div>

        <!-- 이미지 영역 -->
        <div class="image_area">
          <img v-if="form.imageUrls.length" :src="form.imageUrls[0]" alt="대표 이미지" class="main_image" />
          <div class="thumbnail_area">
            <img v-for="(img, index) in form.imageUrls.slice(1)" :key="index" :src="img" :alt="`썸네일 ${index + 1}`" />
          </div>
        </div>

        <!-- 설명 -->
        <div class="description_area">
          <label>물품 설명</label>
          <div class="description_item">{{ form.description }}</div>
        </div>

        <!-- 결제 방법 및 날짜 -->
        <div class="payment_section">
          <label>결제방법 <span style="color: red">(필수)</span></label>
          <select v-model="form.method" class="method_select">
            <option>만나서결제</option>
            <option>카드결제</option>
          </select>
          <div class="date_info">
            <div>
              유통기한<span>{{ form.expiryDate }} {{ getDday(form.expiryDate) }}</span>
            </div>
            <div>
              등록날짜<span>{{ form.createdDate }}</span>
            </div>
          </div>
        </div>
        <div class="input_group">
          <label>연결 재고 </label>
          <p class="sub_title">구매한 재료와 연결될 내 재고를 선택해주세요.<br>같은 종류의 단위를 사용해야합니다. 예시) kg과 g<br>미선택시 새로운 재고로 추가됩니다.</p>
          <div class="ingredient_inputs">
            <select v-model="ingredient">
              <option value="" disabled>재료 선택</option>
              <option v-for="item in ingredients" :key="item" :value="item">{{ item.name }} 단위 : {{ item.unit }}
              </option>
            </select>
          </div>
        </div>
        <button class="request_button" @click=sendTradeRequest>거래 요청</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input_group input,
.input_group select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 18px;
  font-size: 14px;
}

.input_group label {
  font-size: 16px;
  color: #222;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.ingredient_inputs {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.ingredient_inputs select,
.ingredient_inputs input {
  flex: 1;
  min-width: 0;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 14px;
}

.sub_title {
  font-size: 12px;
  margin-top: 10px;
  margin-bottom: 10px;
  color: #666
}

.input_group {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
}

.modal_overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: flex-end;
  opacity: 0;
  animation: fadeIn 0.3s forwards;
  z-index: 2000;
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

.modal {
  height: 100vh;
  background: white;
  border-left: 1px solid #ddd;
  box-shadow: -5px 0 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  animation: slideIn 0.3s forwards;
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

.title {
  display: flex;
  width: 100%;
  height: 10%;
}

.title_left {
  width: 15%;
}

.title_right {
  width: 85%;
  position: relative;
}

.x_button {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 10000;
  /* 다른 요소보다 위로 */
  width: 20px;
  height: 20px;
}

.title_store {
  margin-left: 20px;
}

.price_quantity {
  display: flex;
  width: 100%;
  height: 5%;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  margin-bottom: 10px;
}

.detail_modal {
  width: 520px;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
  background-color: white;
  font-family: sans-serif;
}

.price_quantity input,
input.no_spinner {
  width: 200px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid #ccc;
  text-align: right;
  padding: 0 10px;
}

input.no_spinner {
  margin-right: 10px;
}

.detail_modal input[type="number"] {
  -moz-appearance: textfield;
}

.image_area {
  width: 100%;
  height: 20%;
  margin-top: 20px;
  display: flex;
}

.image_area .main_image {
  width: 70%;
  border: 1px solid #ddd;
  border-radius: 10px;
}

.thumbnail_area {
  width: 30%;
  display: flex;
  flex-direction: column;
  margin: 8px;
  margin-left: 15px;
  justify-content: space-between;
}

.thumbnail_area img {
  width: 100%;
  height: 45%;
  border: 1px solid #ddd;
  border-radius: 10px;
}

.description_area {
  margin-top: 20px;
  height: 20%;
}

.description_item {
  width: 100%;
  height: 80%;
  border-radius: 10px;
  border: 1px solid #ccc;
  padding: 10px;
  resize: none;
  box-sizing: border-box;
  margin-top: 10px;
}

.payment_section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  flex-wrap: wrap;
}

.method_select {
  border-radius: 10px;
  padding: 7px 30px 7px 15px;
  border: 1px solid #ccc;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  background-image: url('data:image/svg+xml;utf8,<svg fill="gray" height="12" viewBox="0 0 24 24" width="12" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 25px;
}

.date_info {
  margin-top: 10px;
  font-size: 14px;
  color: black;
}

.date_info span {
  margin-left: 15px;
  color: #6d6d6d;
}

.request_button {
  width: 100%;
  height: 40px;
  background-color: #b1d5c2;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  margin-top: 20px;
}

.detail_message {
  font-size: 13px;
  color: #6d6d6d;
}

input.no_spinner::-webkit-outer-spin-button,
input.no_spinner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
