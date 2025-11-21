<script setup>
import { ref, computed } from "vue";
import { api } from "@/api/index";
import { onMounted } from "vue";

const currentCarousel = ref(0);
const xaxisCategories = ref([]);
const series = ref([]);
const bestMenuList = ref([]);
const salesData = ref(null);
const bestMarketMenu = ref(null);
const totalStockChanges = ref(0);
const stockChangeItems = ref([]);

const inventoryStatus = ref({
  expiringCount: 0,
  reorderRequiredCount: 0,
  receivedTodayCount: 0,
});

// Computed properties for hall and delivery totals
const hallTotal = computed(() => {
  if (!salesData.value) return 0;
  return salesData.value.orderTodayTimeList.reduce((sum, entry) => sum + entry.timeHall, 0);
});

const deliveryTotal = computed(() => {
  if (!salesData.value) return 0;
  return salesData.value.orderTodayTimeList.reduce((sum, entry) => sum + entry.timeDelivery, 0);
});

const getInventoryStatus = async () => {
  try {
    const response = await api.getInventoryCall();

    if (response) {
      inventoryStatus.value = response.data;
    } else {
      console.error("재고 API 호출 실패:", response.message);
    }
  } catch (error) {
    console.error("재고 API 호출 중 오류 발생:", error);
  }
};

const chartOptions = ref({
  chart: {
    stacked: true, // 스택 형태가 아닌 그룹화된 막대 그래프로 변경
    id: "sales-chart",
    type: "bar",
    toolbar: { show: false },
  },
  xaxis: {
    categories: xaxisCategories.value,
    min: 0,
    tickAmount: 23, // 0~23시간 기준이면 24칸
    labels: {
      show: true,
      step: 1, // 1단위로 레이블 표시
      formatter: (value) => `${Math.floor(value)}시`,
    },
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: "40%", // 막대 간격 조절
    },
  },
  colors: ["#FFD666", "#7DC8B1"], // 각각 배달, 홀 색상
  stroke: {
    show: true,
    width: 2,
    colors: ["transparent"],
  },
  dataLabels: {
    enabled: false,
  },
  legend: {
    position: "top",
  },
});

const getTodaySales = async () => {
  try {
    // API 호출
    const response = await api.getTodaySales();

    if (response) {
      salesData.value = response.data;

      // xaxis와 series 데이터 업데이트
      xaxisCategories.value = salesData.value.orderTodayTimeList.map((entry) => entry.time); // 숫자 배열 유지
      series.value = [
        {
          name: "홀",
          data: salesData.value.orderTodayTimeList.map((entry) => ({
            x: entry.time, // x축 값
            y: entry.timeHall, // y축 값
          })),
        },
        {
          name: "배달",
          data: salesData.value.orderTodayTimeList.map((entry) => ({
            x: entry.time, // x축 값
            y: entry.timeDelivery, // y축 값
          })),
        },
      ];
    } else {
      console.error("API 호출 실패:", response.message);
    }
  } catch (error) {
    console.error("API 호출 중 오류 발생:", error);
  }
};

const getBestMenu = async () => {
  try {
    // API 호출
    const response = await api.getBestTop3(); // 실제 API 엔드포인트로 변경

    if (response) {
      const data = response.data;

      // bestMenuList 배열 업데이트
      bestMenuList.value = [data.top1, data.top2, data.top3];
    } else {
      console.error("API 호출 실패:", response.message);
    }
  } catch (error) {
    console.error("API 호출 중 오류 발생:", error);
  }
};

const getBestMarket = async () => {
  try {
    // API 호출
    const response = await api.getBestMarket(); // 실제 API 엔드포인트로 변경

    if (response) {
      // 응답 구조가 { code, message, data: { name, amount, unit } } 형태인 경우 처리
      if (response.code === 200 && response.data) {
        const { name, amount, unit } = response.data;
        bestMarketMenu.value = {
          name,
          amount,
          unit,
        };
      } else {
        // 기존 응답 구조인 경우 (직접 name, amount, unit이 있는 경우)
        const { name, amount, unit } = response;
        bestMarketMenu.value = {
          name,
          amount,
          unit,
        };
      }
    } else {
      console.error("API 호출 실패:", response.message);
    }
  } catch (error) {
    console.error("API 호출 중 오류 발생:", error);
  }
};

const getStockChange = async () => {
  try {
    const response = await api.getStockChange();

    if (response) {
      totalStockChanges.value = response.total;
      stockChangeItems.value = response.itemQuantityDtoList || [];
    } else {
      console.error("API 호출 실패 또는 응답 코드 문제:", response.message);
    }
  } catch (error) {
    console.error("API 호출 중 오류 발생:", error);
  }
};

onMounted(() => {
  getBestMenu(); // BEST Menu TOP3
  getTodaySales(); // 오늘의 판매량
  getInventoryStatus(); // 대시보드 안 재고 관련
  getBestMarket(); // 장터에 판 물품
  getStockChange(); // 재고 수정
});

// 재고 변경 정보를 위한 computed 속성
const stockChangeInfo = computed(() => {
  // total이 0인 경우
  if (totalStockChanges.value === 0) {
    return {
      line1: "한달동안 재고 수정이 없었습니다.",
      highlight1: "",
      line2: "",
      highlight2: "",
      line3: "",
      highlight3: "",
      line4: "",
      highlight4: "",
      line5: "",
      highlight5: "",
    };
  }

  // itemQuantityDtoList가 비어있는 경우
  if (!stockChangeItems.value || stockChangeItems.value.length === 0) {
    return {
      line1: "한달 동안 재고를 총",
      highlight1: `${totalStockChanges.value}`,
      line2: "회 수정했습니다",
      highlight2: "",
      line3: "",
      highlight3: "",
      line4: "",
      highlight4: "",
      line5: "",
      highlight5: "",
    };
  }

  // itemQuantityDtoList에 항목이 있는 경우
  const mostChangedItems = stockChangeItems.value; // 첫 번째 항목이 가장 많이 변경된 항목이라고 가정
  const itemNames = mostChangedItems.map((item) => item.itemName).join(", ");
  const totalQuantity = mostChangedItems.map((item) => item.totalQuantity).join(", ");

  return {
    line1: "한달 동안 재고를 총",
    highlight1: `${totalStockChanges.value}`,
    line2: "회 수정했습니다",
    highlight2: itemNames,
    line3: "이",
    highlight3: totalQuantity,
    line4: "만큼 수정되었습니다",
    highlight4: "",
    line5: "",
    highlight5: "",
  };
});

const summaries = computed(() => {
  if (!bestMarketMenu.value) return [];

  // name이 null인 경우 처리
  if (bestMarketMenu.value.name === null) {
    return [
      {
        line1: "한달동안 장터에 판 품목이 없습니다",
        highlight1: "",
        line2: "",
        highlight2: "",
        line3: "",
        highlight3: "",
        line4: "",
        highlight4: "",
        line5: "",
        highlight5: "",
      },
      stockChangeInfo.value, // 두 번째 캐러셀 항목을 재고 변경 정보로 교체
    ];
  }

  return [
    {
      line1: "한달동안 가장 많이 장터에 판 물품은",
      highlight1: bestMarketMenu.value.name,
      line2: "입니다.",
      highlight2: bestMarketMenu.value.amount,
      line3: "",
      highlight3: bestMarketMenu.value.unit,
      line4: "가 장터에 판매 되었습니다.",
      highlight4: "",
      line5: "발주양을 조금 적게하는건 어떨까요?",
      highlight5: "",
    },
    stockChangeInfo.value, // 두 번째 캐러셀 항목을 재고 변경 정보로 교체
  ];
});

// 숫자 포맷팅 함수 (천 단위 콤마 추가)
const formatNumber = (number) => {
  return number.toLocaleString("ko-KR");
};
</script>

<template>
  <v-row>
    <v-col cols="12" md="4">
      <v-card>
        <v-card-title>매출 현황</v-card-title>
        <v-card-text>
          <div class="amount">{{ salesData ? formatNumber(salesData.todayTotal) : 0 }}원</div>
          <div class="comment_main">
            <p>저번주 오늘보다</p>
            <p class="amount_highlight">{{ salesData ? formatNumber(salesData.interval) : 0 }}원</p>
          </div>
          <div class="comment_sub">
            <div class="comment_sub1">
              <p class="hall_box">■</p>
              <div class="flex-between">
                <p>홀</p>
                <p>{{ formatNumber(hallTotal) }}원</p>
              </div>
            </div>
            <div class="comment_sub1">
              <p class="delivery_box">■</p>
              <div class="flex-between">
                <p>배달</p>
                <p>{{ formatNumber(deliveryTotal) }}원</p>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" md="8">
      <v-card>
        <apexchart type="bar" :options="chartOptions" :series="series" height="200"></apexchart>
      </v-card>
    </v-col>
  </v-row>

  <v-row>
    <v-col cols="12" md="9">
      <v-carousel class="carousel-root" show-arrows="hover" cycle hide-delimiter-background v-model="currentCarousel">
        <v-carousel-item v-for="(text, i) in summaries" :key="i">
          <v-sheet class="carousel-sheet">
            <div class="carousel-content">
              <p class="carousel-line carousel-line-bold">
                {{ text.line1 }}
                <span class="highlight-text">{{ text.highlight1 }}</span>
                {{ text.line2 }}
              </p>
              <p class="carousel-line">
                <span class="highlight-text font-bold">{{ text.highlight2 }} </span>
                {{ text.line3 }}
                <span class="highlight-text font-bold">{{ text.highlight3 }}</span>
                {{ text.line4 }}
                <span class="highlight-text font-bold">{{ text.highlight4 }}</span>
              </p>
              <p class="carousel-line">
                {{ text.line5 }}
                <span class="highlight-text font-bold">{{ text.highlight5 }}</span>
              </p>
            </div>
          </v-sheet>
        </v-carousel-item>
      </v-carousel>
    </v-col>

    <v-col cols="12" md="3">
      <div class="best_menu_title">이번 주 메뉴 TOP 3</div>
      <div class="best_menu_item">
        <img src="@/assets/image/1st.png" alt="1등 아이콘" class="best_menu_icon" />
        <div class="best_menu_list">{{ bestMenuList[0] }}</div>
      </div>
      <div class="best_menu_item">
        <div class="best_menu_rank">2</div>
        <div class="best_menu_list">{{ bestMenuList[1] }}</div>
      </div>
      <div class="best_menu_item">
        <div class="best_menu_rank">3</div>
        <div class="best_menu_list">{{ bestMenuList[2] }}</div>
      </div>
    </v-col>
  </v-row>

  <div class="status-wrapper">
    <div class="status-item">
      <span class="status-label">만료임박</span>
      <div class="icon_place">
        <img src="@/assets/image/calendar.png" alt="만료임박 아이콘" class="status-icon" />
        <span class="status-number text-red">{{ inventoryStatus.expiringCount }}</span>
      </div>
    </div>

    <div class="status-item">
      <span class="status-label">발주 필요</span>
      <div class="icon_place">
        <img src="@/assets/image/stock.png" alt="발주 필요 아이콘" class="status-icon" />
        <span class="status-number text-yellow">{{ inventoryStatus.reorderRequiredCount }}</span>
      </div>
    </div>

    <div class="status-item">
      <span class="status-label">금일 입고</span>
      <div class="icon_place">
        <img src="@/assets/image/completed.png" alt="금일 입고 아이콘" class="status-icon" />
        <span class="status-number text-gray">{{ inventoryStatus.receivedTodayCount }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.v-card {
  height: 100%;
}

.v-card-title {
  font-size: 20px;
  font-weight: bold;
}

.amount {
  font-size: 36px;
  font-weight: bold;
  margin: 10px 0 10px 0;
}

.comment_main {
  display: flex;
  gap: 5px;
}

.amount_highlight {
  color: blue;
  font-weight: bold;
}

.comment_sub {
  flex-direction: column;
  margin-top: 16px;
}

.comment_sub1 {
  display: flex;
  gap: 5px;
  margin-top: 8px;
}

.hall_box {
  color: #191970;
}

.delivery_box {
  color: #7dc8b1;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.carousel-root {
  height: 100% !important;
  width: 100%;
}

.carousel-sheet {
  background-color: #f5f5f5;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  height: 100%;
}

.carousel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.carousel-line {
  font-size: 20px;
  margin: 4px 0;
  color: #424242;
}

.carousel-line-bold {
  font-weight: 600;
}

.highlight-text {
  color: #e53935;
}

.font-bold {
  font-weight: bold;
}

.carousel_title {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
}

.status-wrapper {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 20px 0;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 150px;
  gap: 10px;
}

.status-label {
  font-size: 14px;
  color: #888;
  margin-bottom: 4px;
}

.status-icon {
  width: 60px;
  height: 60px;
  margin-bottom: 4px;
}

.status-number {
  font-size: 30px;
  font-weight: bold;
}

.text-red {
  color: #e53935;
}

.text-yellow {
  color: #fbc02d;
}

.text-gray {
  color: #757575;
}

.icon_place {
  display: flex;
  gap: 10px;
  align-items: center;
}

.best_menu_title {
  font-size: 20px;
  font-weight: bold;
  margin: 15px 0 15px 0;
  text-align: center;
  color: black;
}

.best_menu_item {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 10px;
}

.best_menu_icon {
  width: 40px;
  height: 40px;
  object-fit: cover;
}

.best_menu_rank {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  font-size: 18px;
  font-weight: bold;
  color: #424242;
}

.best_menu_list {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  flex: 1;
  text-align: left;
}

::v-deep(.v-carousel__controls .mdi-circle) {
  color: gray !important;
  /* 기본 회색 */
  opacity: 1 !important;
}

::v-deep(.v-carousel__controls .v-btn--active .mdi-circle) {
  color: black !important;
  /* 현재 선택된 인덱스일 때 진하게 */
}
</style>
