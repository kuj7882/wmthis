<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Logo from '@/assets/image/icon.png'; // 로고 이미지 import
import { useSignupStore } from '@/stores/useSignupStore';
import { api } from "@/api/index";

const isLoading = ref(false);
const signupStore = useSignupStore();
const businessNumber = ref('');
const phoneNumber = ref('');
const ssn = computed(() => {
  if (!idNumberFront.value || !idNumberBack.value) {
    return '';
  }
  return `${idNumberFront.value}-${idNumberBack.value}`;
});

const idNumberFront = ref('');
const idNumberBack = ref('');
const isVerified = ref(false);
// 변수 선언
const router = useRouter();
const logoImage = ref(Logo); // 로고 이미지 참조 추가
const verificationCode = ref('');
const isVerificationSent = ref(false);
const verificationTimer = ref(180); // 3분 타이머 (초 단위)
const timerInterval = ref(null);
const errorMessage = ref('');

const isCompleteButtonEnabled = computed(() => {
  return (
    businessNumber.value.trim() !== '' &&
    phoneNumber.value.trim() !== '' &&
    verificationCode.value.trim() !== '' &&
    idNumberFront.value.trim() !== '' &&
    idNumberBack.value.trim() !== '' &&
    isVerified.value // 인증 완료 여부
  );
});

// 인증번호 발송
const sendVerificationCode = async () => {
  if (!phoneNumber.value) {
    errorMessage.value = '휴대폰 번호를 입력해주세요.';
    return;
  }

  if (isLoading.value) {
    return; // 이미 로딩 중이면 중복 호출 방지
  }

  try {
    isLoading.value = true; // 로딩 시작
    errorMessage.value = '';

    // ✅ 휴대폰 인증 API 호출
    const response = await api.phoneSend(phoneNumber.value.replace(/-/g, ''));

    // 성공 시 처리
    isVerificationSent.value = true;
    alert('인증번호가 전송되었습니다.');

    verificationCode.value = response.data;

    // 타이머 시작
    verificationTimer.value = 180;
    if (timerInterval.value) clearInterval(timerInterval.value);

    timerInterval.value = setInterval(() => {
      if (verificationTimer.value > 0) {
        verificationTimer.value--;
      } else {
        clearInterval(timerInterval.value);
        isVerificationSent.value = false;
      }
    }, 1000);
  } catch (err) {
    // 실패 시 에러 메시지 출력
    errorMessage.value = '인증번호 전송에 실패했습니다. 다시 시도해주세요.';
    console.error(err);
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

// 사업자 번호 포맷팅 (XXX-XX-XXXXX)
const formatBusinessNumber = (value) => {
  if (!value) return '';
  value = value.replace(/[^0-9]/g, '');

  if (value.length <= 3) {
    return value;
  } else if (value.length <= 5) {
    return value.slice(0, 3) + '-' + value.slice(3);
  } else {
    return value.slice(0, 3) + '-' + value.slice(3, 5) + '-' + value.slice(5, 10);
  }
};

// 휴대폰 번호 포맷팅 (010-XXXX-XXXX)
const formatPhoneNumber = (value) => {
  if (!value) return '';
  value = value.replace(/[^0-9]/g, '');

  if (value.length <= 3) {
    return value;
  } else if (value.length <= 7) {
    return value.slice(0, 3) + '-' + value.slice(3);
  } else {
    return value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
  }
};

// 사업자 번호 입력 처리
const handleBusinessNumberInput = (e) => {
  const formattedValue = formatBusinessNumber(e.target.value);
  businessNumber.value = formattedValue;
};

// 휴대폰 번호 입력 처리
const handlePhoneNumberInput = (e) => {
  const formattedValue = formatPhoneNumber(e.target.value);
  phoneNumber.value = formattedValue;
};
const verifyPhoneCode = async () => {
  if (!phoneNumber.value) {
    errorMessage.value = '휴대폰 번호를 입력해주세요.';
    return;
  }

  if (!verificationCode.value) {
    errorMessage.value = '인증번호를 입력해주세요.';
    return;
  }

  try {
    // ✅ 휴대폰 인증 확인 API 호출
    const response = await api.phoneAuth(verificationCode.value, phoneNumber.value.replace(/-/g, ''));

    // 성공 시 처리
    if (response) {
      alert('인증이 완료되었습니다.');
      errorMessage.value = '';
      isVerified.value = true; // 인증 완료 상태로 변경
    } else {
      errorMessage.value = '인증번호가 올바르지 않습니다.';
    }
  } catch (err) {
    // 실패 시 에러 메시지 출력
    errorMessage.value = '인증에 실패했습니다. 다시 시도해주세요.';
    console.error(err);
  }
};
// 완료 버튼 클릭
const submit = async () => {
  // 유효성 검사
  if (!businessNumber.value || businessNumber.value.replace(/[^0-9]/g, '').length !== 10) {
    errorMessage.value = '유효한 사업자 번호를 입력해주세요.';
    return;
  }

  if (!phoneNumber.value || phoneNumber.value.replace(/[^0-9]/g, '').length !== 11) {
    errorMessage.value = '유효한 휴대폰 번호를 입력해주세요.';
    return;
  }

  if (!verificationCode.value) {
    errorMessage.value = '인증번호를 입력해주세요.';
    return;
  }

  if (!idNumberFront.value || idNumberFront.value.length !== 6) {
    errorMessage.value = '주민번호 앞 6자리를 입력해주세요.'; Phone
    return;
  }

  if (!idNumberBack.value || idNumberBack.value.length !== 1) {
    errorMessage.value = '주민번호 뒷자리 1자리를 입력해주세요.';
    return;
  }

  // Step2 정보 저장
  signupStore.setStep2Data({
    businessNumber: businessNumber.value,
    phoneNumber: phoneNumber.value.replace(/-/g, ''),
    ssn: ssn.value,
  });

  // 최종 API에 넘길 formData 구성
  const formData = {
    name: signupStore.name,
    email: signupStore.email,
    password: signupStore.password,
    businessNumber: signupStore.businessNumber,
    phoneNumber: signupStore.phoneNumber,
    ssn: signupStore.ssn,
  };

  const response = await api.signUp(formData);


  if (response.success) {
    alert('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.');
    router.push({ name: 'login' })
  } else {
    alert(response.message || "회원가입에 실패하였습니다.");
    router.push({ name: 'signup1' });
  }
};

// 컴포넌트 언마운트 시 타이머 정리
onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
});

const goBack = () => {
  router.push({ name: 'signup1' });
};
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
        <label for="business-number">사업자 번호</label>
        <input type="text" id="business-number" v-model="businessNumber" @input="handleBusinessNumberInput"
          class="form-input" placeholder="사업자 번호를 입력하세요" maxlength="12" />
      </div>

      <div class="form-group">
        <label for="phone-number">휴대폰 번호</label>

        <div class="verification-container">
          <input type="tel" id="phone-number" v-model="phoneNumber" @input="handlePhoneNumberInput" class="form-input"
            placeholder="휴대폰 번호를 입력하세요" maxlength="13" :disabled="isVerified" />
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
          <button type="button" class="verification-btn" @click="verifyPhoneCode" :disabled="isVerified">
            인증번호 확인
          </button>
        </div>
        <div v-if="isVerificationSent && !isVerified" class="verification-timer">
          인증번호 유효시간: <span class="timer">{{ formattedTimer }}</span>
        </div>
      </div>

      <div class="form-group">
        <label>주민등록번호</label>
        <div class="id-number-container">
          <input type="text" v-model="idNumberFront" class="form-input id-front" placeholder="앞 6자리" maxlength="6"
            inputmode="numeric" pattern="[0-9]*" />
          <span class="id-separator">-</span>
          <input type="text" v-model="idNumberBack" class="form-input id-back" placeholder="1자리" maxlength="1"
            inputmode="numeric" pattern="[0-9]*" />
          <span class="id-masked">******</span>
        </div>
      </div>
      <!-- 뒤로 가기 버튼 -->
      <button type="button" class="back-button" @click="goBack">
        뒤로 가기
      </button>

      <button type="submit" class="complete-button" :disabled="!isCompleteButtonEnabled">
        완료
      </button>
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
  padding: 40px 30px;
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.logo {
  max-width: 250px;
  height: auto;
}

.signup-title {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 30px;
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
  gap: 20px;
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

/* 주민등록번호 입력 스타일 */
.id-number-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.id-front {
  flex: 1;
}

.id-back {
  width: 65px;
}

.id-separator {
  font-size: 18px;
  color: #666;
}

.id-masked {
  font-size: 16px;
  color: #666;
  letter-spacing: 2px;
}

.complete-button {
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

.complete-button:hover {
  background-color: #98A8B8;
}

/* 모바일 화면에서 이미지 표시 */
@media (max-width: 960px) {
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

.back-button {
  width: 100%;
  padding: 14px;
  background-color: #d3d3d3;
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

.back-button:hover {
  background-color: #b0b0b0;
}

.form-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  color: #999;
}

.verification-btn:disabled,
.complete-button:disabled {
  background-color: #d3d3d3;
  cursor: not-allowed;
  color: #999;
}

.verification-btn:disabled:hover,
.complete-button:disabled:hover {
  background-color: #d3d3d3;
}

.complete-button:disabled {
  background-color: #d3d3d3;
  cursor: not-allowed;
  color: #999;
}
</style>