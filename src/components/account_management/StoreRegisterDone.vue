<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Logo from '@/assets/image/icon.png'; // 로고 이미지 import

// 변수 선언
const router = useRouter();
const logoImage = ref(Logo); // 로고 이미지 참조 추가

// 함수 정의
const submit = () => {
    router.push({ name: 'dashboard' }); // 대시보드로 이동
};
</script>

<template>
    <div class="complete-card">
        <!-- 로고 -->
        <div class="logo-container">
            <img :src="logoImage" alt="로고" class="logo" />
        </div>

        <!-- 완료 메시지 -->
        <div class="complete-message">
            <h1 class="complete-title">
                가게 등록이 <br> 완료되었습니다!
            </h1>

            <!-- 체크 아이콘 -->
            <div class="check-icon-container">
                <div class="check-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            </div>
        </div>

        <!-- 버튼 -->
        <button class="start-button" @click="submit">
            시작하기
        </button>
    </div>
</template>

<style scoped>
.complete-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #f5f5f5;
    padding: 20px;
}

.complete-card {
    background-color: white;
    border-radius: 15px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    width: 100%;
    max-width: 400px;
    padding: 40px 30px;
    text-align: center;
}

.logo-container {
    display: flex;
    justify-content: center;
    margin-bottom: 30px;
}

.logo {
    max-width: 250px;
    height: auto;
}

.complete-message {
    margin-bottom: 40px;
}

.complete-title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 30px;
    color: #333;
    line-height: 1.4;
}

.check-icon-container {
    display: flex;
    justify-content: center;
    margin-top: 20px;
    margin-bottom: 20px;
}

.check-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    background-color: rgba(184, 192, 200, 0.2);
    border-radius: 50%;
    color: #708090;
}

.store-icon-container {
    display: flex;
    justify-content: center;
    margin-top: 20px;
}

.store-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 60px;
    background-color: rgba(184, 192, 200, 0.1);
    border-radius: 10px;
    color: #708090;
}

.start-button {
    width: 100%;
    padding: 14px;
    background-color: #B8C0C8;
    color: #333;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.3s;
    height: 56px;
}

.start-button:hover {
    background-color: #98A8B8;
}

/* 모바일 화면에서 이미지 표시 */
@media (max-width: 960px) {
    .complete-container {
        background-image: url('@/assets/image/background.png');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
    }

    .complete-card {
        background-color: rgba(255, 255, 255, 0.95);
        width: 90%;
        max-width: 400px;
        margin: 0 auto;
    }
}
</style>