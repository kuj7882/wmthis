<script setup>
import { defineProps, defineEmits, watch } from 'vue';
import { CheckCircle } from 'lucide-vue-next';

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true,
        default: false
    },
    message: {
        type: String,
        required: true,
        default: '성공적으로 처리되었습니다.'
    },
    autoClose: {
        type: Boolean,
        default: true
    },
    autoCloseTime: {
        type: Number,
        default: 3000 // 3초 후 자동 닫힘
    }
});

const emit = defineEmits(['close']);

// 모달 닫기 함수
const closeModal = () => {
    emit('close');
};

// 자동 닫힘 기능
watch(() => props.isOpen, (newValue) => {
    if (newValue && props.autoClose) {
        setTimeout(() => {
            closeModal();
        }, props.autoCloseTime);
    }
});

// ESC 키로 모달 닫기
const handleKeyDown = (e) => {
    if (e.key === 'Escape' && props.isOpen) {
        closeModal();
    }
};

// 컴포넌트가 마운트될 때 이벤트 리스너 추가
if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
}

// 컴포넌트가 언마운트될 때 이벤트 리스너 제거
const cleanup = () => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
    }
};

// Vue 3에서는 onUnmounted 훅을 사용하지만, 
// 여기서는 defineExpose를 사용하여 cleanup 메서드를 노출
defineExpose({ cleanup });
</script>

<template>
    <Teleport to="body">
        <div v-if="isOpen" class="modal-overlay" @click="closeModal">
            <div class="modal-container" @click.stop>
                <div class="modal-content">
                    <div class="success-icon">
                        <CheckCircle size="48" class="check-icon" />
                    </div>

                    <div class="modal-message">
                        {{ message }}
                    </div>

                    <div class="modal-actions">
                        <button @click="closeModal" class="confirm-button">
                            확인
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.modal-overlay {
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

.modal-container {
    background-color: white;
    border-radius: 15px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    width: 90%;
    max-width: 400px;
    padding: 30px;
    animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.modal-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.success-icon {
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 80px;
    height: 80px;
    background-color: rgba(184, 192, 200, 0.2);
    border-radius: 50%;
}

.check-icon {
    color: #708090;
}

.modal-message {
    font-size: 18px;
    margin-bottom: 25px;
    color: #333;
    line-height: 1.5;
}

.modal-actions {
    display: flex;
    justify-content: center;
    width: 100%;
}

.confirm-button {
    padding: 10px 30px;
    background-color: #708090;
    color: white;
    border: none;
    border-radius: 20px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
}

.confirm-button:hover {
    background-color: #5A6978;
}
</style>