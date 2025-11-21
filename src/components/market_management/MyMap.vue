<script setup>
import { onMounted, ref, computed } from "vue";
import Detail from "@/components/market_management/MyMapDetailModal.vue";
import { marketApi } from "@/api/MarketApi.js";
import bluePing from '@/assets/image/bluePing.png';
import redPing from '@/assets/image/redPing.png';

const aList = ref([]);
const markerList = ref([]);
let normalImage = null;
let largeImage = null;
const nearbyStores = ref([]);
const selectedBoard = ref(null);
const showModal = ref(false);
const selectedStore = ref(null);
const map = ref(null);

onMounted(async () => {
  await getNearbyStores();
  if (window.kakao && window.kakao.maps) {
    initMap();
  } else {
    const script = document.createElement("script");
    script.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=88cbef76e6b13419aaba248f6e344b59&autoload=false&libraries=services";
    script.onload = () => {
      window.kakao.maps.load(() => {
        initMap();
      });
    };
    document.head.appendChild(script);
  }
});

const handleClosePanel = () => {
  selectedStore.value = null;
  markerList.value.forEach((m) => m.setImage(normalImage)); // 모두 작게
};

const handleOpenDetail = async (item) => {
  console.log(item);
  const response = await marketApi.getInventorySaleDetail(item.inventorySaleId);
  console.log('response', response);

  selectedBoard.value = response.data;
  console.log('selectedBoard', selectedBoard.value);
  showModal.value = true;
};

const getNearbyStores = async () => {
  const nearbyStore = await marketApi.getNearbyStore();
  console.log(nearbyStore);
  nearbyStores.value = nearbyStore;
  console.log('주변가게', nearbyStores.value);
  aList.value = nearbyStores.value.map((store) => {
    return {
      label: store.name,
      address: store.address,
      boardList: store.boardList,
    };
  });

  console.log('alist ', aList.value);
};

async function initMap() {
  const geocoder = new window.kakao.maps.services.Geocoder();
  const myStore = await marketApi.getMyStore();
  console.log(myStore);

  navigator.geolocation.getCurrentPosition((position) => {
    const lat = myStore.data.latitude;
    const lng = myStore.data.longitude;
    const mapContainer = document.getElementById("map");
    const mapOption = {
      center: new window.kakao.maps.LatLng(lat, lng),
      level: 4,
    };

    map.value = new window.kakao.maps.Map(mapContainer, mapOption);
    const myMarker = new window.kakao.maps.Marker({
      map: map.value,
      position: new window.kakao.maps.LatLng(lat, lng),
      title: "내 위치",
    });

    normalImage = new window.kakao.maps.MarkerImage(
      bluePing,
      new window.kakao.maps.Size(30, 30) // 일반 사이즈
    );

    largeImage = new window.kakao.maps.MarkerImage(
      redPing,
      new window.kakao.maps.Size(50, 50) // 클릭 시 크게!
    );

    // 2. 주소 리스트
    const addressList = aList.value.map((store) => {
      return {
        label: store.label,
        address: store.address,
        boardList: store.boardList,
      };
    });

    console.log('addres ', addressList);

    addressList.forEach(({ label, address, boardList }) => {
      geocoder.addressSearch(address, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);

          const marker = new window.kakao.maps.Marker({
            map: map.value,
            position: coords,
            title: label,
            image: normalImage,
          });

          markerList.value.push(marker);

          // 마커 클릭 이벤트 - Vue 방식으로 처리
          window.kakao.maps.event.addListener(marker, "click", () => {
            selectedStore.value = { label, boardList };
            markerList.value.forEach((m) => m.setImage(normalImage)); // 모두 작게
            marker.setImage(largeImage); // 클릭된 것만 크게
          });
        }
      });
    });
  });
}
</script>

<template>
  <div>
    <div id="map" style="width: 100%; height: 65vh; margin"></div>

    <!-- 고정 패널 - Vue 템플릿 방식으로 변경 -->
    <div class="fixed_panel_wrapper" :class="{ hidden: !selectedStore }">
      <div id="fixedPanel" class="fixed_panel">
        <button class="close_btn" @click="handleClosePanel">
          <img src="@/assets/image/xMark.png" class="panel_button" />
        </button>

        <div v-if="selectedStore">
          <h1>{{ selectedStore.label }}</h1>
          <table class="custom_board_table">
            <thead>
              <tr>
                <th>판매 물품</th>
                <th>수량</th>
                <th>유통기한</th>
                <th>희망가격</th>
                <th>등록날짜</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in selectedStore.boardList" :key="index">
                <td>{{ item.inventoryName }}</td>
                <td>{{ item.quantity }}</td>
                <td>{{ item.expirationDate }}</td>
                <td>{{ item.price }}</td>
                <td>{{ item.createdDate }}</td>
                <td>
                  <button class="btn" @click="handleOpenDetail(item)">상세보기</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 모달 컴포넌트 - 심플하게 수정 -->
    <Detail :isOpen="showModal" :item="selectedBoard" @close="showModal = false" />
  </div>
</template>

<style scoped>
:deep(.custom_overlay_header) {
  font-size: 15px;
}

:deep(.custom_overlay) {
  padding: 10px 10px 0px 10px;
  border-radius: 8px;
  font-size: 14px;
}

:deep(.custom_overlay_board_title) {
  font-size: 15px;
  color: #0068c3;
  width: 120px;
}

:deep(.custom_overlay_board_goods) {
  width: 30px;
  font-size: 10px;
}

:deep(.custom_overlay_board_date) {
  width: 90px;
  font-size: 10px;
}

:deep(.custom_overlay_rule) {
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fixed_panel_wrapper {
  position: fixed;
  bottom: 5vh;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
}

.fixed_panel {
  position: relative;
  width: 50vw;
  height: 11.25rem;
  overflow-y: auto;
  background-color: #fffefb;
  border: 1px solid #ccc;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  z-index: 9999;
}

/* 모달 관련 스타일 제거하고 심플하게 유지 */
:deep(.modal_overlay) {
  z-index: 10001;
  /* 높은 z-index 값 유지 */
}

.hidden {
  display: none;
}

.close_btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10000;
}

.panel_button {
  width: 20px;
  height: 20px;
}

.custom_board_table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: center;
  overflow: hidden;
  margin-top: 15px;
}

.custom_board_table thead th {
  background-color: #b8c0c8;
  font-weight: bold;
  color: #333;
}

.custom_board_table thead th:first-child {
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}

.custom_board_table thead th:last-child {
  border-top-right-radius: 12px;
  border-bottom-right-radius: 12px;
}

.custom_board_table th,
.custom_board_table td {
  padding: 8px;
  border-bottom: 1px solid #ddd;
}

.custom_board_table td {
  padding: 10px;
}

.btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: white;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn:hover {
  background-color: #f0f0f0;
}
</style>