<script setup>
import { defineProps, defineEmits, ref, onMounted } from 'vue';
import { api } from '../../api/MenuApi';
const props = defineProps({
    selectedItem: Object
});
const emit = defineEmits(['close', 'addOrder']); // ✅ 주문 추가 이벤트 추가

// ✅ 옵션 리스트 (객체)
const availableOptions = ref([]);

const fetchCategoryOptions = async () => {
    const selectedItem = { ...props.selectedItem }; // Proxy 객체 해제
    console.log('Fetching category options for selectedItem:', selectedItem);

    if (!selectedItem || !selectedItem.category) {
        console.error('Invalid selectedItem or selectedItem.category:', selectedItem);
        return;
    }

    try {
        const response = await api.getPOSCategory(selectedItem.category); // category 값을 params로 전달
        if (response && response.data) {
            availableOptions.value = [
                {
                    name: response.data.name, // 카테고리 이름
                    choices: response.data.options.map(option => ({
                        label: option.name,
                        price: option.price,
                        id: option.id, // ID 추가
                    })),
                    selected: [] // 선택된 옵션 초기화
                }
            ];
            console.log('Available options loaded:', availableOptions.value);
        } else {
            console.error('옵션 데이터를 가져오는 데 실패했습니다.');
        }
    } catch (error) {
        console.error('Error in fetchCategoryOptions:', error);
    }
};

// 옵션 선택 처리
const handleSelection = (option, choice) => {
    if (!option.selected) {
        option.selected = []; // 선택된 옵션 초기화
    }

    const exists = option.selected.some(item => item.id === choice.id);
    if (exists) {
        option.selected = option.selected.filter(item => item.id !== choice.id); // 이미 선택된 경우 제거
    } else {
        option.selected.push(choice); // 선택되지 않은 경우 추가
    }

    console.log('Updated selected options:', option.selected); // 디버깅용 로그
};
// ✅ 옵션 선택 후 확인 버튼 클릭 시
const closeAndConfirm = () => {
    if (!props.selectedItem) return;

    const selectedOptions = availableOptions.value.flatMap(option => option.selected);
    const totalOptionPrice = selectedOptions.reduce((sum, opt) => sum + opt.price, 0);

    const orderData = {
        id: props.selectedItem.id,
        name: props.selectedItem.name,
        basePrice: props.selectedItem.price,
        price: props.selectedItem.price + totalOptionPrice, // 기본 가격 + 옵션 가격
        quantity: 1,
        optionIds: selectedOptions.map(opt => opt.id), // 선택된 옵션의 ID만 포함
        options: selectedOptions, // 선택된 옵션의 상세 정보 포함
    };

    console.log('Order Data:', orderData); // 디버깅용 로그

    emit('addOrder', orderData);
    emit('close');
};

// 컴포넌트 마운트 시 옵션 데이터 로드
onMounted(() => {
    fetchCategoryOptions();
});
</script>
<template>
    <div class="modal_overlay">
        <div class="modal">
            <h2>{{ selectedItem?.name }} 옵션 선택</h2>

            <div v-for="(option, index) in availableOptions" :key="index" class="option_group">
                <p class="option_title">{{ option.name }}</p>
                <div>
                    <label v-for="choice in option.choices" :key="choice.label">
                        <input type="checkbox" :value="choice" :checked="option.selected.includes(choice)"
                            @change="handleSelection(option, choice)" />
                        {{ `${choice.label} (+${choice.price.toLocaleString()}원)` }}
                    </label>
                </div>
            </div>

            <div class="modal_buttons">
                <button class="cancel_btn" @click="$emit('close')">취소</button>
                <button class="confirm_btn" @click="closeAndConfirm">확인</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.modal_overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
}

.modal {
    background: white;
    padding: 20px;
    border-radius: 10px;
    height: auto;
    width: 600px;
    text-align: center;
}

.modal h2 {
    font-size: 32px;
}

.option_title {
    text-align: left;
    margin: 2px 0 10px 20px;
    font-size: 26px;
    font-weight: bold;
}

.option_group {
    margin: 15px 0;
}

.option_group label {
    display: block;
    font-weight: bold;
    text-align: left;
    margin: 2px 0 20px 20px;
}

input[type="checkbox"] {
    margin-right: 5px;
}

.modal_buttons {
    display: flex;
    justify-content: space-between;
    margin-top: 15px;
}

.confirm_btn {
    background: #B8C0C8;
    color: black;
    font-weight: bold;
    padding: 8px 12px;
    border: none;
    border-radius: 16px;
    cursor: pointer;
    width: 100px;
    height: 50px;
    font-size: 16px;
}

.cancel_btn {
    background: #FFFFFF;
    color: black;
    padding: 8px 12px;
    border: #000000 solid 1px;
    border-radius: 16px;
    cursor: pointer;
    font-weight: bold;
    width: 100px;
    height: 50px;
    font-size: 16px;
}

.confirm_btn:hover {
    background: #9BC1AE;
}
</style>