<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Logo from '@/assets/image/icon.png'; // 로고 이미지 import
import { api } from "@/api/index";
// 변수 선언
const router = useRouter();
const logoImage = ref(Logo); // 로고 이미지 참조 추가
const storeName = ref('');
const storeAddress = ref('');
const detailAddress = ref('');
const storePhone = ref('');
const errorMessage = ref('');
const storeLatitude = ref('');
const storeLongitude = ref('');

// 휴대폰 번호 포맷팅 (지역번호 및 휴대폰 번호 처리)
const formatPhoneNumber = (value) => {
    if (!value) return '';
    value = value.replace(/[^0-9]/g, ''); // 숫자만 남기기

    if (value.startsWith('02')) {
        // 지역번호가 02인 경우
        if (value.length <= 2) {
            return value;
        } else if (value.length <= 5) {
            return value.slice(0, 2) + '-' + value.slice(2);
        } else if (value.length <= 9) {
            return value.slice(0, 2) + '-' + value.slice(2, 5) + '-' + value.slice(5);
        } else {
            return value.slice(0, 2) + '-' + value.slice(2, 5) + '-' + value.slice(5, 9);
        }
    } else if (value.startsWith('010')) {
        // 휴대폰 번호인 경우
        if (value.length <= 3) {
            return value;
        } else if (value.length <= 7) {
            return value.slice(0, 3) + '-' + value.slice(3);
        } else {
            return value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
        }
    } else {
        // 다른 지역번호 (3자리 지역번호)
        if (value.length <= 3) {
            return value;
        } else if (value.length <= 7) {
            return value.slice(0, 3) + '-' + value.slice(3);
        } else {
            return value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6, 10);
        }
    }
};

// 휴대폰 번호 입력 처리
const handlePhoneInput = (e) => {
    const formattedValue = formatPhoneNumber(e.target.value);
    storePhone.value = formattedValue;
};

const waitForKakao = () => {
    return new Promise((resolve) => {
        const check = () => {
            if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
};

// 주소 검색
const searchAddress = async () => {
    console.log('주소 검색 시작');
    new window.daum.Postcode({
        oncomplete: async function (data) {
            const address = data.address;
            storeAddress.value = address;
            await waitForKakao(); // kakao.maps 로드 대기
            // Kakao Maps 좌표 변환 API 사용
            const geocoder = new window.kakao.maps.services.Geocoder();
            geocoder.addressSearch(address, function (result, status) {
                if (status === window.kakao.maps.services.Status.OK) {
                    const lat = result[0].y;
                    const lng = result[0].x;
                    console.log('위도:', lat, '경도:', lng);
                    storeLatitude.value = lat;
                    storeLongitude.value = lng;
                }
            });
        },
        width: '100%',
        height: '100%',
    }).open();
    console.log('주소 검색 완료');
    console.log('storeAddress:', storeLatitude.value, storeLongitude.value);
};

// 다음 단계로 이동
const submit = async () => {
    // 유효성 검사
    if (!storeName.value) {
        errorMessage.value = '매장명을 입력해주세요.';
        return;
    }

    if (!storeAddress.value) {
        errorMessage.value = '매장 주소를 입력해주세요.';
        return;
    }

    if (!storePhone.value) {
        errorMessage.value = '매장 전화번호를 입력해주세요.';
        return;
    }

    try {
        // 데이터를 매핑하여 API 호출
        const requestData = {
            name: storeName.value,
            address: `${storeAddress.value} ${detailAddress.value}`, // 주소와 상세 주소를 합침
            phoneNumber: storePhone.value,
            latitude: storeLatitude.value,
            longitude: storeLongitude.value
        };
        const response = await api.registerStore(requestData);

        if (response) {
            alert('매장 등록이 완료되었습니다.');
            router.push({ name: 'storedone' }); // 완료 페이지로 이동
        } else {
            errorMessage.value = response.message || '매장 등록에 실패했습니다.';
        }
    } catch (err) {
        errorMessage.value = err.response?.data?.message || '매장 등록 중 오류가 발생했습니다.';
        console.error('Error during store registration:', err);
    }
};
</script>

<template>
    <div class="store-card">
        <!-- 로고 -->
        <div class="logo-container">
            <img :src="logoImage" alt="로고" class="logo" />
        </div>

        <h1 class="store-title">가게 등록</h1>

        <!-- 에러 메시지 -->
        <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
        </div>

        <!-- 가게 등록 폼 -->
        <form @submit.prevent="submit" class="store-form">
            <div class="form-group">
                <label for="store-name">매장명</label>
                <input type="text" id="store-name" v-model="storeName" class="form-input" placeholder="매장명을 입력하세요" />
            </div>

            <div class="form-group">
                <label for="store-address">매장 주소</label>

                <div class="address-container">
                    <input type="text" id="store-address" v-model="storeAddress" class="form-input"
                        placeholder="매장 주소를 입력하세요" readonly />
                    <button type="button" class="search-btn" @click="searchAddress">
                        검색
                    </button>
                </div>
            </div>

            <div class="form-group address-group">
                <label for="detail-address">상세 주소</label>
                <input type="text" id="detail-address" v-model="detailAddress" class="form-input address-input"
                    placeholder="상세 주소를 입력하세요" />
            </div>

            <div class="form-group">
                <label for="store-phone">매장 전화번호</label>
                <input type="tel" id="store-phone" v-model="storePhone" @input="handlePhoneInput" class="form-input"
                    placeholder="매장 전화번호를 입력하세요" maxlength="13" />
            </div>

            <button type="submit" class="next-button">
                다음
            </button>
        </form>
    </div>
</template>

<style scoped>
.store-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #f5f5f5;
    padding: 20px;
}

.store-card {
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

.store-title {
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

.store-form {
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

.form-input[readonly] {
    background-color: #f9f9f9;
    cursor: default;
}

.address-group {
    position: relative;
}

.address-container {
    display: flex;
    gap: 10px;
}

.address-input {
    flex: 1;
}

.search-btn {
    padding: 0 15px;
    height: 46px;
    background-color: #B8C0C8;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    white-space: nowrap;
    min-width: 80px;
    color: #333;
}

.search-btn:hover {
    background-color: #98A8B8;
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
@media (max-width: 960px) {
    .store-container {
        background-image: url('@/assets/image/background.png');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
    }

    .store-card {
        background-color: rgba(255, 255, 255, 0.95);
        width: 90%;
        max-width: 400px;
        margin: 0 auto;
    }
}
</style>