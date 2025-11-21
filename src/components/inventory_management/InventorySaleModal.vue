<script setup>
import { defineProps, defineEmits, ref, watch, onMounted } from "vue";
import { api } from "@/api/MenuApi.js";
import { marketApi } from "@/api/MarketApi";

const props = defineProps({
  isOpen: Boolean,
});

const isSubmitting = ref(false); // 중복 클릭 방지
const emit = defineEmits(["close"]);
const files = ref([]);
const ingredient = ref(""); // 선택된 재료명
const ingredients = ref([]); // 재료 목록 저장하는 변수
const price = ref(""); // 희망가격
const quantity = ref(""); // 수량
const content = ref(""); // 물품 설명
const imagePaths = ref([]); // 서버에서 반환한 경로 저장

watch(files, async (newFiles) => {
  if (!newFiles?.length) return;

  // 1) presign URL 요청을 위해 파일명·타입 리스트 만들기
  const reqs = newFiles.map(file => ({
    filename: file.name,
    contentType: file.type,
  }));
  const presigns = await marketApi.getPresignedUrls(reqs);
  // presigns: [{ key, url }, …]

  // 2) S3로 파일 PUT
  const uploadedKeys = [];
  await Promise.all(presigns.map(async ({ key, url }, idx) => {
    const file = newFiles[idx];
    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file
    });
    uploadedKeys.push(key);
  }));

  // 3) 업로드된 키(객체 경로)를 DB에 저장하거나
  //    그대로 이미지 URL로 사용
  imagePaths.value = uploadedKeys.map(k =>
    `https://wmthis-2025.s3.ap-northeast-2.amazonaws.com/${k}`
  );
});


// 최대 3장까지 업로드 허용s
const maxFileRule = (value) => {
  if (!value) return true;
  return value.length <= 3 || "최대 3장까지 등록할 수 있어요.";
};
const fetchIngredients = async () => {
  try {
    const response = await api.getStoreInventoryList();
    console.log("Fetched ingredients:", response);
    ingredients.value = response.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
    }));
    console.log("Fetched ingredients:", ingredients.value);
  } catch (error) {
    console.error("Error fetching ingredients:", error);
  }
};
const register = async () => {
  if (isSubmitting.value) return; // 중복 클릭 방지
  if (!ingredient.value || !ingredient.value.id) {
    alert("재고명을 선택해주세요.");
    return;
  }
  if (!price.value || isNaN(price.value)) {
    alert("희망가격을 입력해주세요.");
    return;
  }
  if (!quantity.value || isNaN(quantity.value)) {
    alert("수량을 입력해주세요.");
    return;
  }
  if (files.value.length === 0) {
    alert("사진을 최소 1장 이상 등록해주세요.");
    return;
  }
  if (!content.value.trim()) {
    alert("물품 설명을 입력해주세요.");
    return;
  }
  isSubmitting.value = true; // 중복 클릭 방지
  const data = {
    storeInventoryId: ingredient.value.id,
    quantity: quantity.value,
    price: price.value,
    content: content.value,
    imageUrls: imagePaths.value,
  };
  console.log("Registering inventory sale with data:", data);
  const response = await marketApi.registerInventorySale(data);
  if (response.code === 200) {
    alert("판매 등록이 완료되었습니다.");
  } else {
    alert("판매 등록에 실패했습니다. 다시 시도해주세요.");
  }

  emit("close");
  isSubmitting.value = false; // 중복 클릭 방지
};

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      // 모달이 열릴 때 재료 목록을 가져옴
      console.log("Modal opened, fetching ingredients...");
      fetchIngredients();
    } else {
      // 모달이 닫힐 때 입력값 초기화
      ingredient.value = "";
      price.value = "";
      quantity.value = "";
      files.value = [];
    }
  }
);
onMounted(() => {
  // 컴포넌트가 마운트될 때 재료 목록을 가져옴
  console.log("Component mounted, fetching ingredients...");
  fetchIngredients();
});
</script>

<template>
  <div v-if="isOpen" class="sale_modal_container" style="z-index: 2000">
    <div class="modal">
      <div class="modal_content">
        <div class="modal_header">
          <button class="close_btn" @click="emit('close')">✕</button>

          <h2 class="modal_title">재고 판매</h2>
        </div>
        <!-- 라벨 + 입력 영역 감싸는 부모 div -->
        <div class="input_row">
          <!-- 재고명 영역 -->
          <div class="input_group" style="flex: 1">
            <div class="modal_title2">
              <label>재고명</label>
              <p class="title_warn">(필수)</p>
            </div>
            <p class="sub_title">판매할 재고명을 선택해주세요.</p>
            <div class="unit-container">
              <select v-model="ingredient" class="unit-select" style="width: 200px">
                <option value="" disabled selected>재료 선택</option>
                <option v-for="item in ingredients" :key="item" :value="item">
                  {{ item.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- 희망가격 영역 -->
          <div class="input_group" style="flex: 1">
            <div class="input-label-group">
              <label>희망가격</label>
              <p class="title_warn">(필수)</p>
            </div>
            <p class="sub_title">물품의 희망가격을 입력해주세요.</p>
            <div class="unit-container">
              <input type="text" v-model="price" style="width: 200px" placeholder="ex) 3000" class="min-qty-input" />
              <p style="margin-right: 10px">원</p>
            </div>
          </div>
        </div>
        <div class="input_group">
          <div class="input_row">
            <!-- 왼쪽: 라벨 + 설명 -->
            <div class="input_info">
              <label class="modal_title2">수량</label>
              <p class="sub_title">물품의 수량을 입력해주세요.</p>
            </div>

            <!-- 오른쪽: 수량 입력 + 단위 -->
            <div class="input-inline-row">
              <input type="text" v-model="quantity" placeholder="ex) 5" class="min-qty-input" />
              <span class="unit-text" style="margin-left: 10px; margin-right: 10px">{{ ingredient.unit }}</span>
            </div>
          </div>
        </div>

        <div class="input_group" style="margin-right: 10px">
          <div class="modal_title2">
            <label>사진등록</label>
          </div>
          <p class="sub_title">
            물품의 상태를 파악 가능한 사진을 올려주세요. (3장까지 등록
            가능해요.)
          </p>
          <div class="unit-container">
            <v-file-input v-model="files" variant="outlined" accept="image/*" multiple :counter="true"
              :rules="[maxFileRule]" :show-size="true" hide-details="auto" />
          </div>
          <div class="input_group">
            <div class="modal_title2">
              <label>물품설명</label>
            </div>
            <p class="sub_title">물품의 상태를 자세히 설명해주세요.</p>
            <div class="unit-container">
              <v-textarea v-model="content" placeholder="상태가 아주 좋아용" variant="outlined"></v-textarea>
            </div>
          </div>
        </div>
      </div>
      <div class="modal_footer">
        <button class="confirm_btn" :disabled="isSubmitting" @click="register">
          {{ isSubmitting ? "판매 중..." : "판매하기" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sale_modal_container {
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
}

.modal_header {
  border-bottom: #ccc solid 1px;
  margin-bottom: 10px;
}

/* 모달 슬라이드 애니메이션 */
.modal {
  width: 33.33%;
  height: 100vh;
  background: white;
  padding: 20px;
  border-left: 1px solid #ddd;
  box-shadow: -5px 0 10px rgba(0, 0, 0, 0.1);
  justify-content: space-between;
  /* 상단-하단 요소 분리 */
  position: relative;
  display: flex;
  flex-direction: column;

  transform: translateX(100%);
  animation: slideIn 0.3s forwards;
}

/* 모달 안의 스크롤 영역 */
.modal_content {
  width: auto;
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

.modal_header {
  border-bottom: #ccc solid 1px;
  padding-bottom: 5px;
  /* 👈 선 위 아래 여백 */
  margin-bottom: 45px;
  /* 👈 선 아래 전체 여백 (원하시는 만큼 늘리세요) */
}

.modal_title2 {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal_title2.between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.min-qty-input {
  width: 80px;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 18px;
  font-size: 14px;
  text-align: right;
}

.title_warn {
  font-size: 14px;
  color: red;
  font-weight: bold;
}

.close_btn {
  position: absolute;
  top: 15px;
  right: 15px;
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

.sub_title {
  font-size: 12px;
  margin-top: 4px;
  margin-bottom: 4px;
  color: #666;
  justify-content: flex-end;
  /* 🌟 오른쪽 정렬 */
}

.modal_desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
}

.tab_inventory {
  display: flex;
  border-bottom: none;
  margin-bottom: 15px;
  gap: 10px;
  justify-content: center;
  width: 100%;
}

.tab_inventory button {
  flex: 1;
  /* 버튼을 가로로 균등하게 배치 */
  padding: 6px 30px;
  /* 높이를 줄이고 가로 길이를 늘림 */
  background-color: #b8c0c8;
  /* 기본 색 */
  border: 2px solid #b8c0c8;
  border-radius: 30px;
  /* 더 길쭉한 느낌 */
  font-size: 14px;
  /* 폰트 크기도 살짝 줄임 */
  cursor: pointer;
  color: black;
  font-weight: bold;
  transition: background-color 0.3s, color 0.3s, transform 0.2s;
  text-align: center;
}

.tab_inventory button:hover {
  background-color: #9fa6ad;
}

.input_row {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.tab_inventory button.active {
  background-color: #858b91;
  color: white;
  border-color: #858b91;
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

.add_btn {
  flex-shrink: 0;
  padding: 10px 14px;
  background: #c8c8c8;
  color: white;
  border: none;
  border-radius: 18px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
}

.add_btn:hover {
  background: #9fa6ad;
}

/* 추가된 재료 리스트 스타일 */
.tag_container {
  margin-top: 5px;
  margin-bottom: 30px;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  display: inline-flex;
  align-items: center;
  background-color: #dbe2ea;
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 14px;
  color: #333;
}

.remove_btn {
  background: none;
  border: none;
  color: black;
  margin-left: 8px;
  cursor: pointer;
  font-weight: bold;
}

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

.input_group {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
}

.confirm_btn {
  margin-top: auto;
  padding: 10px;
  background: #b1d5c2;
  color: black;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  width: 100%;
}

.confirm_btn:hover {
  background: #8cbfa4;
}

.custom-solid-autocomplete {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 18px;
  font-size: 14px;
}

.unit-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.unit-input,
.unit-select {
  width: 500px;
  height: 45px;
  /* 동일한 높이 */
  border-radius: 20px;
  /* 둥근 모서리 */
  border: 1px solid #ccc;
  padding: 0 12px;
  font-size: 16px;
  text-align: center;
  display: flex;
  justify-content: flex-end;
}

.unit-input {
  width: 80px;
  /* 숫자 입력 필드 크기 */
}

.unit-select {
  width: 80px;
  /* 드롭다운 크기 */
  appearance: none;
  /* 기본 스타일 제거 */
  background: white url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24' fill='gray'%3E%3Cpath d='M7 10l5 5 5-5H7z'/%3E%3C/svg%3E") no-repeat right 10px center;
  background-size: 16px;
}

.button_group {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 🌟 가운데 정렬 */
  gap: 8px;
}

.v-btn {
  min-width: 60px;
  /* 모든 버튼 크기 일정하게 */
  height: 40px;
  border-radius: 20px;
  font-size: 14px;
}

.selected-btn {
  background-color: #c8c8c8 !important;
  font-weight: bold;
}

.custom_input {
  width: 10px !important;
  /* 직접입력 칸의 가로 크기 */
  height: 40px !important;
  /* 버튼과 동일한 높이 */
  text-align: center;
  font-size: 14px;
  padding: 0;
}

.fixed-text {
  margin-left: 8px;
  font-size: 14px;
}

.input-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.input-label-group {
  display: flex;
  align-items: center;
  gap: 6px;
  /* label과 (필수) 사이 간격 조절 */
}

.min-qty-input {
  width: 80px;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 18px;
  font-size: 14px;
  text-align: right;
}

.input_with_unit {
  display: flex;
  justify-content: flex-end;
  /* 오른쪽 정렬 */
  align-items: center;

  gap: 8px;
  /* 입력창과 단위 사이 간격 */
  text-align: right;
}

.min-qty-input {
  width: 100px;
  /* 필요에 따라 조정 가능 */
  text-align: right;
}

.unit-text {
  margin: 0;
  text-align: right;
}
</style>
