<script setup>
defineProps({
    isOpen: Boolean
});
defineEmits(["confirm", "cancel"]);
</script>

<template>
    <div v-if="isOpen" class="modal_overlay" style="z-index: 2000;">
        <div class="modal">
            <p class="modal_message">현재 항목을 삭제하시겠습니까?</p>
            <div class="modal_buttons">
                <button class="confirm_btn" @click="$emit('confirm')">예</button>
                <button class="cancel_btn" @click="$emit('cancel')">아니오</button>
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
    background: rgba(0, 0, 0, 0.5);
    /* 어두운 배경 추가 */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    /* 다른 요소 위에 배치 */
}

.modal {
    background: white;
    padding: 25px;
    border-radius: 12px;
    text-align: center;
    width: 500px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
}

.modal_message {
    font-size: 25px;
    font-weight: bold;
    margin-bottom: 50px;
    color: #333;
}

.modal_buttons {
    display: flex;
    justify-content: space-between;
    gap: 12px;
}

/* 아니오 버튼 */
.cancel_btn {
    background: #B8C0C8;
    color: #333;
    padding: 10px 20px;
    border: none;
    cursor: pointer;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;

    transition: background 0.3s ease-in-out, transform 0.2s;
    width: 100px;
    height: 50px;
}

.cancel_btn:hover {
    background: #BFBFBF;
}

.cancel_btn:active {
    background: #A5A5A5;
}

/* 예 버튼 */
.confirm_btn {
    background: #E74C3C;
    color: white;
    padding: 10px 20px;
    border: none;
    cursor: pointer;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    transition: background 0.3s ease-in-out, transform 0.2s;
    width: 100px;
    height: 50px;
}

.confirm_btn:hover {
    background: #C0392B;
}

.confirm_btn:active {
    background: #A93226;
}
</style>
