<script setup>
import { defineProps, defineEmits, ref, onMounted, computed, watch } from 'vue';
import { api } from '@/api/MenuApi.js';
import { useMenuStore } from '@/stores/useMenuStore';
const menuStore = useMenuStore();

const props = defineProps({
    isOpen: Boolean
});

const emit = defineEmits(['close']);
const isSubmitting = ref(false);

const price = ref('');
const optionName = ref('');
const ingredientName = ref('');
const ingredientAmount = ref('');
const ingredients = ref([]);
const categoryList = ref([]);
const category = ref('');

const selectedUnit = computed(() => {
    const selected = menuStore.inventoryOptions.find(item => item.name === ingredientName.value.name);
    if (!selected) return '';
    return selected.unit === 'unit' ? '개' : selected.unit;
});
// 카테고리 목록 로딩
const loadCategories = async () => {
    const result = await api.getCategoryList();
    if (result) {
        categoryList.value = result;
    } else {
        console.log("카테고리 목록을 불러오는 데 실패했습니다.");
    }
};

const ingredientOptions = ref([]);

const addIngredient = () => {
    if (!ingredientName.value || !ingredientAmount.value) {
        alert('재료와 수량을 모두 입력해주세요.');
        return;
    }
    const alreadyExists = ingredients.value.some(
        (ingredient) => ingredient.id === ingredientName.value.id
    );

    if (alreadyExists) {
        alert('이미 추가된 재료입니다.');
        return;
    }
    if (ingredientName.value && ingredientAmount.value) {
        ingredients.value.push({
            id: ingredientName.value.id,
            name: ingredientName.value.name,
            amount: ingredientAmount.value,
            unit: selectedUnit.value,
        });
        ingredientName.value = '';
        ingredientAmount.value = '';
    }
};

const removeIngredient = (index) => {
    ingredients.value.splice(index, 1);
};

const handleRegisterOption = async () => {
    if (isSubmitting.value) return;
    if (!optionName.value || !price.value) {
        alert('옵션명, 가격을 모두 입력해주세요.');
        return;
    }

    isSubmitting.value = true;

    const requestData = {
        name: optionName.value,
        price: parseInt(price.value),
        inventoryQuantities: ingredients.value.map((ingredient) => ({
            inventoryId: ingredient.id,
            quantity: parseFloat(ingredient.amount),
        })),
    };

    try {
        const response = await api.registerOption(requestData);
        if (response.success) {
            alert('옵션 등록 성공');
            emit('refresh');
            emit('close');
        } else {
            alert(response.message || '옵션 등록 실패');
        }
    } catch (error) {
        console.error('옵션 등록 중 예외 발생:', error);
        alert('오류가 발생했습니다.');
    } finally {
        isSubmitting.value = false;
    }
};

const getStoreInventoryList = async () => {
    const result = await api.getStoreInventoryList();
    if (result) {
        ingredientOptions.value = result.map(item => ({
            id: item.id,
            name: item.name,
            unit: item.unit,
        }));
        console.log('재고 목록:', ingredientOptions.value);
    } else {
        console.log("재고 목록을 불러오는 데 실패했습니다.");
    }
};

watch(() => props.isOpen, (newVal) => {
    if (!newVal) {
        optionName.value = '';
        price.value = '';
        ingredientName.value = '';
        ingredientAmount.value = '';
        ingredients.value = [];
    }
});

</script>

<template>
    <div v-if="isOpen" class="modal_overlay" style="z-index: 2000;">
        <div class="modal">
            <div class="modal_content">
                <div class="modal_header">
                    <button class="close_btn" @click="emit('close')">✕</button>

                    <h2 class="modal_title">옵션 등록</h2>

                    <p class="modal_desc">카테고리에 사용가능한 옵션을 등록해주세요</p>
                </div>
                <div class="input_group">
                    <div class="modal_title2">
                        <label>옵션명</label>
                        <p class="title_warn">(필수)</p>
                    </div>
                    <p class="sub_title"> 판매 시 사용되는 옵션명을 입력해주세요.</p>
                    <input type="text" v-model="optionName" placeholder="옵션1" />
                </div>


                <div class="input_group">
                    <label>재고 소요량</label>
                    <p class="sub_title"> 옵션를 만드는 데 필요한 재고의 종류와 양을 입력해 주세요.</p>
                    <div class="ingredient_inputs">
                        <select v-model="ingredientName">
                            <option value="" disabled selected>재료 선택</option>
                            <option v-for="item in menuStore.inventoryOptions" :key="item" :value="item">{{ item.name }}
                            </option>
                        </select>
                        <input type="number" v-model="ingredientAmount" min="1" placeholder="수량" />
                        <label>{{ selectedUnit }}</label>
                        <button class="add_btn" @click="addIngredient()">추가</button>
                    </div>
                </div>

                <div class="tag_container">
                    <span v-for="(ingredient, index) in ingredients" :key="index" class="tag">
                        {{ ingredient.name }} {{ ingredient.amount }}{{ ingredient.unit }}
                        <button class="remove_btn" @click="removeIngredient(index)">✕</button>
                    </span>
                </div>

                <div class="input_group">
                    <label>가격</label>
                    <p class="sub_title">옵션의 가격을 입력해주세요.</p>
                    <input type="number" v-model="price" min="1" placeholder="(ex) 50000" />
                </div>


            </div>
            <div class="modal_footer">
                <button class="confirm_btn" @click="handleRegisterOption" :disabled="isSubmitting">
                    {{ isSubmitting ? '등록 중...' : '등록' }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
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


.modal_title2 {
    display: flex;
    align-items: center;
    gap: 8px;
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
    margin-top: 10px;
    margin-bottom: 10px;
    color: #666
}

.modal_desc {
    font-size: 14px;
    color: #666;
    margin-bottom: 20px;
}

.tab_menu {
    display: flex;
    border-bottom: none;
    margin-bottom: 15px;
    gap: 10px;
    justify-content: center;
    width: 100%;
}

.tab_menu button {
    flex: 1;
    /* 버튼을 가로로 균등하게 배치 */
    padding: 6px 30px;
    /* 높이를 줄이고 가로 길이를 늘림 */
    background-color: #B8C0C8;
    /* 기본 색 */
    border: 2px solid #B8C0C8;
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

.tab_menu button:hover {
    background-color: #9FA6AD;
}

.tab_menu button.active {
    background-color: #858B91;
    color: white;
    border-color: #858B91;
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
    background: #C8C8C8;
    color: white;
    border: none;
    border-radius: 18px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    white-space: nowrap;
}

.add_btn:hover {
    background: #9FA6AD;
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
    background: #B1D5C2;
    color: black;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    width: 100%;
}

.confirm_btn:hover {
    background: #8CBFA4;
}
</style>
