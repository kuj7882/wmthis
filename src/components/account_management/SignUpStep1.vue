<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Logo from '@/assets/image/icon.png'; // 로고 이미지 import
import { useSignupStore } from '@/stores/useSignupStore';
import { api } from "@/api/index"; // API 호출을 위한 import

const signupStore = useSignupStore();

const username = ref('');
const email = ref('');
const password = ref('');
// 변수 선언
const router = useRouter();
const logoImage = ref(Logo); // 로고 이미지 참조 추가
const passwordConfirm = ref('');
const verificationCode = ref('');
const isVerificationSent = ref(false);
const verificationTimer = ref(180); // 3분 타이머 (초 단위)
const timerInterval = ref(null);
const errorMessage = ref('');
const isVerified = ref(false);
const isLoading = ref(false);
const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()\-_=+{};:,<.>]).{8,}$/;
const passwordValid = computed(() => passwordRegex.test(password.value));
const passwordConfirmValid = computed(() => passwordRegex.test(passwordConfirm.value));
const resetForm = () => {
  username.value = '';
  email.value = '';
  password.value = '';
  passwordConfirm.value = '';
  verificationCode.value = '';
  isVerificationSent.value = false;
  verificationTimer.value = 180;
  errorMessage.value = '';
  isVerified.value = false;

  // 타이머 초기화
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
};
// 비밀번호 일치 여부 확인
const passwordsMatch = computed(() => {
  if (!password.value || !passwordConfirm.value) return true;
  return password.value === passwordConfirm.value;
});

const isNextButtonEnabled = computed(() => {
  return (
    username.value.trim() !== "" &&
    email.value.trim() !== "" &&
    password.value.trim() !== "" &&
    passwordConfirm.value.trim() !== "" &&
    passwordValid.value &&
    passwordConfirmValid.value &&
    passwordsMatch.value &&
    isVerified.value
  );
});
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const sendVerificationCode = async () => {
  if (!email.value) {
    errorMessage.value = '이메일을 입력해주세요.';
    return;
  }

  if (!emailPattern.test(email.value)) {
    errorMessage.value = '이메일 형식을 제대로 입력하세요.';
    return;
  }

  if (isLoading.value) {
    return; // 이미 로딩 중이면 중복 호출 방지
  }

  try {
    isLoading.value = true; // 로딩 시작
    errorMessage.value = '';

    // ✅ 이메일 인증 API 호출
    const response = await api.emailSend(email.value);

    if (response) {
      // 성공 시 처리
      isVerificationSent.value = true;
      errorMessage.value = '';
      alert('인증번호가 전송되었습니다.');

      // ⏱️ 타이머 3분 설정
      verificationTimer.value = 300;

      if (timerInterval.value) {
        clearInterval(timerInterval.value);
      }

      timerInterval.value = setInterval(() => {
        if (verificationTimer.value > 0) {
          verificationTimer.value--;
        } else {
          clearInterval(timerInterval.value);
          isVerificationSent.value = false;
        }
      }, 1000);

    } else {
      errorMessage.value = '인증번호 발송에 실패했습니다. 다시 시도해주세요.';
    }
  } catch (err) {
    // 실패 시 에러 메시지 출력
    errorMessage.value = '인증번호 발송에 실패했습니다. 다시 시도해주세요.';
  } finally {
    isLoading.value = false; // 로딩 종료
  }
};

// 타이머 포맷팅 (mm:ss)
const formattedTimer = computed(() => {
  const minutes = Math.floor(verificationTimer.value / 60);
  const seconds = verificationTimer.value % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});
// 인증번호 확인
const verifyCode = async () => {
  if (!verificationCode.value) {
    errorMessage.value = "인증번호를 입력해주세요.";
    return;
  }

  if (!email.value) {
    errorMessage.value = "이메일을 입력해주세요.";
    return;
  }

  try {
    // ✅ 이메일 인증 확인 API 호출
    const response = await api.emailAuth(verificationCode.value, email.value);

    // 성공 시 처리
    if (response) {
      alert("인증이 완료되었습니다.");
      errorMessage.value = "";
      isVerified.value = true; // 인증 완료 상태로 변경

      // 타이머 멈춤
      if (timerInterval.value) {
        clearInterval(timerInterval.value);
      }
    } else {
      errorMessage.value = "인증번호가 올바르지 않습니다.";
    }
  } catch (err) {
    // 실패 시 에러 메시지 출력
    errorMessage.value = "인증에 실패했습니다. 다시 시도해주세요.";
    console.error(err);
  }
};
// 다음 단계로 이동
const submit = () => {
  // 유효성 검사
  if (!username.value) {
    errorMessage.value = '사용자 이름을 입력해주세요.';
    return;
  }

  if (!email.value) {
    errorMessage.value = '이메일을 입력해주세요.';
    return;
  }

  if (!verificationCode.value) {
    errorMessage.value = '인증번호를 입력해주세요.';
    return;
  }

  if (!password.value) {
    errorMessage.value = '비밀번호를 입력해주세요.';
    return;
  }

  if (!passwordConfirm.value) {
    errorMessage.value = '비밀번호 확인을 입력해주세요.';
    return;
  }

  if (password.value !== passwordConfirm.value) {
    errorMessage.value = '비밀번호가 일치하지 않습니다.';
    return;
  }

  // 실제 구현에서는 회원가입 API 호출 후 다음 단계로 이동
  signupStore.setStep1Data({
    name: username.value,
    email: email.value,
    password: password.value,
  });

  router.push({ name: 'signup2' });
};
onMounted(() => {
  username.value = signupStore.name || '';
  email.value = signupStore.email || '';
  password.value = signupStore.password || '';
  passwordConfirm.value = signupStore.password || '';
});
// 컴포넌트 언마운트 시 타이머 정리
onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
});
</script>

<template>
  <div class="signup-card">
    <!-- 로고 -->
    <div class="logo-container">
      <img :src="logoImage" alt="로고" class="logo" />
    </div>

    <h1 class="signup-title">회원 가입</h1>

    <!-- 에러 메시지 -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <!-- 회원가입 폼 -->
    <form @submit.prevent="submit" class="signup-form">
      <div class="form-group">
        <label for="username">사용자 이름</label>
        <input type="text" id="username" v-model="username" class="form-input" placeholder="이름을 입력하세요" />
      </div>

      <div class="form-group">
        <label for="email">이메일</label>

        <div class="verification-container">
          <input type="email" id="email" v-model="email" class="form-input" placeholder="이메일을 입력하세요"
            autocomplete="email" :disabled="isVerified" />
          <button type="button" class="verification-btn" @click="sendVerificationCode"
            :disabled="isLoading || isVerified">
            <span v-if="isLoading">전송 중</span>
            <span v-else>{{ isVerificationSent ? '재발송' : '전송' }}</span>
          </button>
        </div>
      </div>

      <div class="form-group verification-group">
        <label for="verification-code">인증번호</label>
        <div class="verification-container">
          <input type="text" id="verification-code" v-model="verificationCode" class="form-input verification-input"
            placeholder="인증번호 입력" maxlength="6" :disabled="isVerified" />
          <button type="button" class="verification-btn" @click="verifyCode" :disabled="isVerified">
            인증번호 확인
          </button>
        </div>
        <div v-if="isVerificationSent && !isVerified" class="verification-timer">
          인증번호 유효시간: <span class="timer">{{ formattedTimer }}</span>
        </div>
      </div>

      <div class="form-group">
        <label for="password">비밀번호</label>
        <input type="password" id="password" v-model="password" class="form-input" placeholder="비밀번호를 입력하세요"
          autocomplete="new-password" />

        <div v-if="!passwordValid && password" class="password-invalid">
          비밀번호는 8자리 이상이며, 대문자와 특수문자를 포함해야 합니다.
        </div>
      </div>

      <div class="form-group">
        <label for="password-confirm">비밀번호 확인</label>
        <input type="password" id="password-confirm" v-model="passwordConfirm" class="form-input"
          :class="{ 'input-error': !passwordsMatch && passwordConfirm }" placeholder="비밀번호를 다시 입력하세요"
          autocomplete="new-password" />
        <div v-if="!passwordsMatch && passwordConfirm" class="password-mismatch">
          비밀번호가 일치하지 않습니다.
        </div>
      </div>
      <div class="button_layout">
        <button type="submit" class="next-button" :disabled="!isNextButtonEnabled">
          다음
        </button>
        <button type="button" class="reset-button" @click="resetForm">
          초기화
        </button>
        <button type="button" class="next-button" @click="router.push({ name: 'login' })">
          로그인 화면으로
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.signup-card {
  background-color: white;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 400px;
  padding: 20px 30px;
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.logo {
  max-width: 250px;
  height: auto;
}

.signup-title {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
  color: #333;
}

.error-message {
  background-color: #fff0f0;
  color: #e74c3c;
  padding: 12px;
  border-radius: 5px;
  margin-bottom: 20px;
  font-size: 14px;
  text-align: center;
}

.signup-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  margin-bottom: 5px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  font-size: 14px;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 16px;
  transition: border-color 0.3s;
  background-color: white;
}

.form-input:focus {
  border-color: #708090;
  outline: none;
}

.input-error {
  border-color: #e74c3c;
}

.password-mismatch {
  color: #e74c3c;
  font-size: 14px;
  margin-top: 5px;
}

.verification-group {
  position: relative;
}

.verification-container {
  display: flex;
  gap: 10px;
}

.verification-input {
  flex: 1;
}

.verification-btn {
  padding: 0 15px;
  height: 48px;
  background-color: #B8C0C8;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  white-space: nowrap;
  min-width: 80px;
  color: #333;
}

.verification-btn:hover {
  background-color: #98A8B8;
}

.verification-timer {
  font-size: 14px;
  color: #666;
  margin-top: 8px;
}

.timer {
  color: #ff6b6b;
  font-weight: bold;
}

.next-button {
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
  margin-top: 10px;
  height: 56px;
}

.next-button:hover {
  background-color: #98A8B8;
}

/* 모바일 화면에서 이미지 표시 */
@media (max-width: "960px") {
  .signup-container {
    background-image: url('@/assets/image/background.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  .signup-card {
    background-color: rgba(255, 255, 255, 0.95);
    width: 90%;
    max-width: 400px;
    margin: 0 auto;
  }
}

.verification-btn:disabled {
  background-color: #d3d3d3;
  cursor: not-allowed;
  color: #999;
}

/* 비활성화된 입력 필드 */
.form-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  color: #999;
}

.next-button:disabled {
  background-color: #d3d3d3;
  cursor: not-allowed;
  color: #999;
}

.reset-button {
  width: 100%;
  padding: 14px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-top: 10px;
  height: 56px;
}

.reset-button:hover {
  background-color: #c0392b;
}

.button_layout {
  justify-content: space-between;
  margin-top: 20px;
}

.password-invalid {
  color: red
}
</style>