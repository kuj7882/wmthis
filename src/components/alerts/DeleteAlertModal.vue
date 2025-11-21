<script setup>
defineProps({
    isOpen: Boolean
});
defineEmits(["close"]);
</script>

<template>
    <div v-if="isOpen" class="modal_overlay" style="z-index: 2000;">
        <div class="modal">
            <p class="modal_message">삭제할 항목을 선택해주세요.</p>
            <button class="confirm_btn" @click="$emit('close')">확인</button>
        </div>
    </div>
</template>

<style scoped>
/* 모달 전체 배경 */
.modal_overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(5px);
}

/* 모달 박스 */
.modal {
    background: white;
    padding: 25px;
    border-radius: 15px;
    text-align: center;
    width: 400px;
    box-shadow: 0px 10px 30px rgba(0, 0, 0, 0.2);
    opacity: 0;
    transform: translateY(-20px);
    animation: fadeIn 0.3s forwards;
}

/* 모달 텍스트 */
.modal_message {
    font-size: 25px;
    font-weight: bold;
    color: #333;
    margin-bottom: 50px;
}

/* 확인 버튼 */
.confirm_btn {
    background: #B8C0C8;
    color: black;
    padding: 10px 20px;
    border: none;
    cursor: pointer;
    border-radius: 16px;
    font-weight: bold;
    font-size: 16px;
    transition: background 0.3s ease-in-out, transform 0.2s;

    width: 100px;
    height: 50px;
}

/* 버튼 호버 효과 */
.confirm_btn:hover {
    background: #9BC1AE;
}


/* 등장 애니메이션 */
@keyframes fadeIn {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
