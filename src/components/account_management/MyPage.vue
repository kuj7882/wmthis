<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import SuccessModal from '@/components/alerts/SuccessModal.vue';
import { api } from '@/api/index.js';
import { useRouter } from 'vue-router';

const router = useRouter();

const isSubmitting = ref(false);
const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()\-_=+{};:,<.>]).{8,}$/;

const isLoading = ref(false);
// 사용자 정보 상태
const userProfile = reactive({
    name: '',
    email: '',
    phone: '',
    idNumber: '',
    profileImage: null
});
// 인증 관련 상태
const verificationCode = ref('');
const isVerificationSent = ref(false);
const isVerified = ref(false);
const verificationTimer = ref(180); // 3분 타이머 (초 단위)
const timerInterval = ref(null);
const isFormEditable = computed(() => {
    return false;
});

const isPasswordEditable = computed(() => {
    return isVerified.value; // 인증 완료 시 비밀번호 필드만 활성화
});

const passwordsMatch = computed(() => {
    if (!confirmPassword.value) return null;
    return newPassword.value === confirmPassword.value;
});

const passwordValid = computed(() => {
    if (!newPassword.value) return null; // 아직 입력 안 했으면 메시지 출력 안 함
    return passwordRegex.test(newPassword.value);
});

const isSaveButtonEnabled = computed(() => {
    const isPasswordChanging = currentPassword.value || newPassword.value || confirmPassword.value;

    const passwordConditionsMet = !isPasswordChanging || (
        passwordValid.value && passwordsMatch.value
    );

    return isVerified.value && passwordConditionsMet && (
        isPasswordChanging ||
        userProfile.name !== originalProfile.name ||
        userProfile.email !== originalProfile.email ||
        userProfile.phone !== originalProfile.phone
    );
});
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

// 원본 데이터 백업 (취소 시 복원용)
const originalProfile = reactive({});

// 모달 상태
const isSuccessModalOpen = ref(false);

// 프로필 이미지 업로드 처리
const profileImageRef = ref(null);
const previewImage = ref(null);

const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        userProfile.profileImage = file;
        previewImage.value = URL.createObjectURL(file);
    }
};

const triggerImageUpload = () => {
    profileImageRef.value.click();
};


// 인증번호 발송
const sendVerificationCode = async () => {
    if (isLoading.value) return; // 이미 로딩 중이면 중복 호출 방지

    try {
        isLoading.value = true; // 로딩 시작
        const phoneNum = userProfile.phone; // 전화번호는 문자열이어야 함
        const response = await api.phoneSend(phoneNum); // phone 필드에 문자열 전달

        if (response) {
            alert('인증번호가 발송되었습니다.');
            isVerificationSent.value = true;
            // 타이머 시작
            verificationTimer.value = 180;
            if (timerInterval.value) clearInterval(timerInterval.value);

            timerInterval.value = setInterval(() => {
                if (verificationTimer.value > 0) {
                    verificationTimer.value--;
                } else {
                    clearInterval(timerInterval.value);
                    isVerificationSent.value = false; // 타이머가 끝나면 재발송 가능
                }
            }, 1000);

            verificationCode.value = response.data; // 인증번호 초기화
            console.log('인증번호:', verificationCode.value); // 인증번호 확인을 위한 로그
        } else {
            alert('인증번호 발송에 실패했습니다. 다시 시도해주세요.');
        }
    } catch (error) {
        console.error('Error in sendVerificationCode:', error);
        alert('인증번호 발송 중 오류가 발생했습니다.');
    } finally {
        isLoading.value = false; // 로딩 종료
    }
};

// 인증번호 확인
const verifyCode = async () => {
    try {
        const code = verificationCode.value; // 입력된 인증번호
        const phoneNum = userProfile.phone; // 사용자 전화번호

        if (!code || code.length !== 6) {
            alert('유효한 인증번호를 입력해주세요.');
            return;
        }

        // API 호출
        const response = await api.phoneAuth(code, phoneNum);

        if (response) {
            isVerified.value = true;
            clearInterval(timerInterval.value);
            alert('인증이 완료되었습니다. 비밀번호를 수정할 수 있습니다.');
        } else {
            alert('인증번호가 유효하지 않습니다. 다시 시도해주세요.');
        }
    } catch (error) {
        console.error('Error in verifyCode:', error);
        alert('인증번호 확인 중 오류가 발생했습니다.');
    }
};

// 타이머 포맷팅 (mm:ss)
const formattedTimer = computed(() => {
    const minutes = Math.floor(verificationTimer.value / 60);
    const seconds = verificationTimer.value % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// 폼 제출 처리
const handleSubmit = async () => {
    if (isSubmitting.value) return;

    if (!isVerified.value) {
        alert('비밀번호 수정을 위해 핸드폰 인증이 필요합니다.');
        return;
    }

    if ((newPassword.value || confirmPassword.value || currentPassword.value) &&
        (newPassword.value !== confirmPassword.value)) {
        alert('새 비밀번호와 확인이 일치하지 않습니다.');
        return;
    }

    if (newPassword.value && !passwordRegex.test(newPassword.value)) {
        alert('비밀번호는 8자리 이상이며, 대문자와 특수문자를 포함해야 합니다.');
        return;
    }

    const data = {
        email: userProfile.email,
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
    };

    isSubmitting.value = true;
    try {
        const response = await api.updateUserInfo(data);

        if (response.code === 200) {
            alert('비밀번호가 성공적으로 변경되었습니다.');

            currentPassword.value = '';
            newPassword.value = '';
            confirmPassword.value = '';
            await loadUserInfo();

            isVerified.value = false;
            isVerificationSent.value = false;
            verificationCode.value = '';
            clearInterval(timerInterval.value);
        } else {
            alert(response.message || '비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
        }
    } catch (error) {
        const message =
            error?.response?.data?.message || '비밀번호 변경 중 오류가 발생했습니다.';
        alert(message);
    } finally {
        isSubmitting.value = false;
    }
};

// 변경사항 취소
const handleCancel = () => {
    // 원본 데이터로 복원
    Object.assign(userProfile, originalProfile);
    previewImage.value = null;
    isVerified.value = false;
    isVerificationSent.value = false;
    verificationCode.value = '';
    clearInterval(timerInterval.value);

    router.push('/');
};

// 성공 모달 닫기
const closeSuccessModal = () => {
    isSuccessModalOpen.value = false;
};

const maskedIdNumber = computed(() => {
    if (!userProfile.idNumber) return '';
    return userProfile.idNumber.slice(0, 8) + '******'; // 앞 8자리 + 별표 6개
});

// 사용자 정보 로드
const loadUserInfo = async () => {
    try {
        const response = await api.getUserInfo();
        if (response && response.data) {
            userProfile.name = response.data.name;
            userProfile.email = response.data.email;
            userProfile.phone = response.data.phoneNumber;
            userProfile.idNumber = response.data.ssn;

            // 원본 데이터 백업
            Object.assign(originalProfile, userProfile);
            console.log('User info loaded:', userProfile);
        } else {
            console.error('사용자 정보를 가져오는 데 실패했습니다.');
        }
    } catch (error) {
        console.error('Error in loadUserInfo:', error);
    }
};

// 컴포넌트 마운트 시 사용자 정보 로드
onMounted(() => {
    loadUserInfo();
});
</script>

<template>
    <div class="body">
        <h1 class="page_title">회원정보 수정</h1>

        <div class="verification-notice" v-if="!isVerified">
            <div class="notice-icon">!</div>
            <p>비밀번호 수정을 위해 핸드폰 인증이 필요합니다.</p>
        </div>

        <form @submit.prevent="handleSubmit" class="profile-form">

            <!-- 회원정보 입력 폼 -->
            <div class="form-container">
                <!-- 전화번호 인증 섹션 -->
                <div class="verification-section">
                    <div class="form-group">
                        <label>전화번호</label>
                        <div class="phone-container">
                            <input type="tel" v-model="userProfile.phone" class="form-input phone-input"
                                :disabled="!isFormEditable" />
                            <button type="button" class="verification-btn" @click="sendVerificationCode"
                                :disabled="isLoading || (isVerificationSent && verificationTimer.value > 0)">
                                <span v-if="isLoading">전송 중</span>
                                <span v-else>{{ isVerificationSent && verificationTimer.value > 0 ? '재발송' : '인증번호 발송'
                                    }}</span>
                            </button>
                        </div>
                    </div>

                    <div class="form-group" v-if="isVerificationSent && !isVerified">
                        <label>인증번호</label>
                        <div class="verification-code-container">
                            <input type="text" v-model="verificationCode" class="form-input verification-input"
                                placeholder="인증번호 6자리 입력" maxlength="6" />
                            <span class="timer">{{ formattedTimer }}</span>
                            <button type="button" class="verify-btn" @click="verifyCode">확인</button>
                        </div>
                        <p class="verification-hint">인증번호가 발송되었습니다. 3분 이내에 입력해주세요.</p>
                    </div>
                </div>

                <div class="form-group">
                    <label>이름</label>
                    <input type="text" v-model="userProfile.name" class="form-input" :disabled="!isFormEditable" />
                </div>

                <div class="form-group">
                    <label>이메일</label>
                    <input type="email" v-model="userProfile.email" class="form-input" :disabled="!isFormEditable" />
                </div>

                <div class="form-group">
                    <label>주민등록번호</label>
                    <input type="text" :value="isFormEditable ? userProfile.idNumber : maskedIdNumber"
                        class="form-input" :disabled="!isFormEditable" />
                    <p class="id-number-hint">주민등록번호는 보안상의 이유로 뒷자리는 일부만 표시됩니다.</p>
                </div>

                <!-- 비밀번호 변경 섹션 -->
                <div class="password-section">
                    <h2 class="section-title">비밀번호 변경</h2>

                    <div class="form-group">
                        <label>현재 비밀번호</label>
                        <input type="password" v-model="currentPassword" class="form-input"
                            :disabled="!isPasswordEditable" />
                    </div>

                    <div class="form-group">
                        <label>새 비밀번호</label>
                        <input type="password" v-model="newPassword" class="form-input"
                            :disabled="!isPasswordEditable" />
                        <div v-if="passwordValid === false" class="password-invalid">
                            비밀번호는 8자리 이상이며, 대문자와 특수문자를 포함해야 합니다.
                        </div>
                    </div>

                    <div class="form-group">
                        <label>새 비밀번호 확인</label>
                        <input type="password" v-model="confirmPassword" class="form-input"
                            :disabled="!isPasswordEditable" />
                        <div v-if="passwordsMatch === false" class="password-mismatch">
                            비밀번호가 일치하지 않습니다.
                        </div>
                    </div>
                </div>
            </div>

            <!-- 버튼 그룹 -->
            <div class="action_buttons">
                <button type="submit" class="save_btn" :disabled="!isSaveButtonEnabled || isSubmitting"
                    :class="{ 'disabled-btn': !isSaveButtonEnabled || isSubmitting }" @click="handleSave">
                    저장
                </button>
                <button type="button" @click="handleCancel" class="cancel_btn">취소</button>
            </div>
        </form>
        <!-- 성공 모달 -->
        <SuccessModal :isOpen="isSuccessModalOpen" @close="closeSuccessModal" message="회원정보가 성공적으로 수정되었습니다." />
    </div>
</template>

<style scoped>
.body {
    padding: 20px;
}

/* 제목 */
.page_title {
    font-size: 28px;
    font-weight: bold;
    margin-top: 10px;
    margin-bottom: 30px;
}

.section-title {
    font-size: 20px;
    font-weight: bold;
    margin-top: 30px;
    margin-bottom: 20px;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
}

/* 인증 알림 */
.verification-notice {
    background-color: #f8f9fa;
    border-left: 4px solid #708090;
    padding: 15px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    border-radius: 5px;
}

.notice-icon {
    background-color: #708090;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    margin-right: 15px;
}

/* 프로필 폼 */
.profile-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* 프로필 이미지 섹션 */
.profile-image-section {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
}

.profile-image-container {
    position: relative;
    width: 150px;
    height: 150px;
    border-radius: 50%;
    overflow: hidden;
    cursor: pointer;
    border: 3px solid #B8C0C8;
}

.profile-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.image-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(184, 192, 200, 0.7);
    padding: 8px;
    text-align: center;
    color: white;
    font-size: 14px;
    opacity: 0;
    transition: opacity 0.3s;
}

.profile-image-container:hover .image-overlay {
    opacity: 1;
}

/* 폼 컨테이너 */
.form-container {
    max-width: 600px;
    margin: 0 auto;
    width: 100%;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: bold;
}

.form-input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 16px;
}

.form-input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
}

/* 전화번호 인증 */
.phone-container {
    display: flex;
    gap: 10px;
}

.phone-input {
    flex: 1;
}

.verification-btn {
    padding: 8px 12px;
    background-color: #B8C0C8;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-weight: bold;
    white-space: nowrap;
    min-width: 120px;
}

.verification-btn:hover:not(:disabled) {
    background-color: #98A8B8;
}

.verification-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

/* 인증번호 입력 */
.verification-code-container {
    display: flex;
    gap: 10px;
    align-items: center;
}

.verification-input {
    flex: 1;
}

.timer {
    color: #ff6b6b;
    font-weight: bold;
    min-width: 50px;
}

.verify-btn {
    padding: 8px 15px;
    background-color: #708090;
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-weight: bold;
}

.verify-btn:hover {
    background-color: #5A6978;
}

.verification-hint {
    font-size: 14px;
    color: #666;
    margin-top: 8px;
}

.id-number-hint {
    font-size: 14px;
    color: #666;
    margin-top: 8px;
}

/* 비밀번호 섹션 */
.password-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #eee;
}

/* 버튼 */
.action_buttons {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 30px;
}

.save_btn,
.cancel_btn {
    padding: 10px 20px;
    background-color: #B8C0C8;
    border: none;
    border-radius: 20px;
    width: 120px;
    cursor: pointer;
    font-weight: bold;
    font-size: 16px;
}

.save_btn {
    background-color: #708090;
    color: white;
}

.save_btn:hover:not(:disabled) {
    background-color: #5A6978;
}

.cancel_btn:hover {
    background-color: #98A8B8;
}

.disabled-btn {
    opacity: 0.5;
    cursor: not-allowed;
}

.password-mismatch {
    color: #e74c3c;
    font-size: 14px;
    margin-top: 5px;
}

.password-invalid {
    color: #e74c3c;
    font-size: 14px;
    margin-top: 5px;
}
</style>