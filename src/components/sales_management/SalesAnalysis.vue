<script setup>
import { ref, computed, watch, onMounted } from "vue";
import Calendar from "@/components/sales_management/Calendar.vue";
import SalesDetail from "@/components/sales_management/SalesDetail.vue";
import { useSaleStore } from "@/stores/useSaleStore";
import { api } from "@/api/index.js";

// saleStore -> This hook is being called conditionally, but all hooks must be called in the exact same order in every component render.
const saleStore = useSaleStore();
const currentMonth = ref(new Date().getMonth());
const currentYear = ref(new Date().getFullYear());
const selectedDate = ref(new Date());
const selectedPeriod = ref("today"); // 추가: 선택된 기간 (today, yesterday, week, month)
const isLoading = ref(false);
const chartData = ref([]);
const salesData = ref({});

// 날짜 범위 계산
const dateRange = computed(() => {
  if (selectedPeriod.value?.type === "custom" && selectedPeriod.value.start && selectedPeriod.value.end) {
    const start = new Date(selectedPeriod.value.start);
    const end = new Date(selectedPeriod.value.end);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays === 1) return { type: "hour", days: 1 };
    if (diffDays <= 31) return { type: "day", days: diffDays };
    return { type: "month", days: diffDays };
  }

  if (typeof selectedPeriod.value === "string") {
    if (selectedPeriod.value === "today" || selectedPeriod.value === "yesterday" || selectedPeriod.value === null) {
      return { type: "hour", days: 1 };
    }
    if (selectedPeriod.value === "week") {
      return { type: "day", days: 7 };
    }
    if (selectedPeriod.value === "month") {
      return { type: "day", days: 31 };
    }
  }

  return { type: "hour", days: 1 }; // 기본값
});

const currentYearMonth = computed(() => {
  return `${currentYear.value}년 ${currentMonth.value + 1}월`;
});

const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
};

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
};

// 날짜를 문자열로 변환하는 헬퍼 함수
const formatDateToString = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const transformApiDataToSalesData = (apiData) => {
  const result = {};

  if (!apiData || !Array.isArray(apiData)) return result;

  apiData.forEach((item) => {
    // createdAt에서 날짜 부분만 추출 (YYYY-MM-DD 형식)
    const dateStr = item.createdAt.split(" ")[0];

    // 해당 날짜의 배열이 없으면 생성
    if (!result[dateStr]) {
      result[dateStr] = [];
    }

    // 데이터 형식 변환하여 추가
    result[dateStr].push({
      type: item.orderType,
      amount: item.totalPrice,
      paidAt: item.createdAt,
    });
  });

  return result;
};

// 모든 주문 목록 가져오기
const fetchAllOrders = async () => {
  isLoading.value = true;
  try {
    const response = await api.getOrdersList();

    if (response && response.data) {
      // API 응답 데이터를 salesData 형식으로 변환
      salesData.value = transformApiDataToSalesData(response.data);
    } else {
      console.error("API 응답 오류:", response);
      salesData.value = {};
    }
  } catch (error) {
    console.error("주문 목록 가져오기 오류:", error);
    salesData.value = {};
  } finally {
    isLoading.value = false;
  }
};

// 특정 날짜 범위의 매출 데이터 가져오기
const fetchChartData = async () => {
  isLoading.value = true;
  try {
    let startDate, endDate;

    if (selectedPeriod.value?.type === "custom") {
      startDate = formatDateToString(selectedPeriod.value.start);
      endDate = formatDateToString(selectedPeriod.value.end);
    } else if (selectedPeriod.value === "today") {
      const today = new Date();
      startDate = formatDateToString(today);
      endDate = startDate;
    } else if (selectedPeriod.value === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = formatDateToString(yesterday);
      endDate = startDate;
    } else if (selectedPeriod.value === "week") {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      startDate = formatDateToString(startOfWeek);
      endDate = formatDateToString(endOfWeek);
    } else if (selectedPeriod.value === "month") {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      startDate = formatDateToString(startOfMonth);
      endDate = formatDateToString(endOfMonth);
    } else {
      // 특정 날짜 선택
      startDate = formatDateToString(selectedDate.value);
      endDate = startDate;
    }

    // 요청 본문에 날짜 데이터를 JSON 형식으로 포함
    const requestData = {
      startDate: startDate,
      endDate: endDate,
    };

    const response = await api.getSalesData(requestData);

    if (response && response.data) {
      // 차트 데이터 설정 - 새로운 API 응답 구조에 맞게 변환
      const transformedData = transformChartData(response.data, dateRange.value.type);
      chartData.value = transformedData;
    } else {
      console.error("API 응답 오류:", response);
      chartData.value = [];
    }
  } catch (error) {
    console.error("데이터 가져오기 오류:", error);
    chartData.value = [];
  } finally {
    isLoading.value = false;
  }
};

// 새로운 API 응답 구조에 맞게 차트 데이터 변환
const transformChartData = (apiData, rangeType) => {
  if (!apiData || !Array.isArray(apiData)) return [];

  const result = [];

  // 시간별 데이터 처리 (하루 이내)
  if (rangeType === "hour") {
    // API 데이터 처리 - 이미 시간별로 정렬되어 있음
    apiData.forEach((item) => {
      // monthDateTime은 시간을 나타냄 (00-23)
      const hour = item.monthDateTime;

      // 각 판매 방법에 대한 데이터 추가
      item.oneTimeResponseList.forEach((sale) => {
        result.push({
          createdAt: `2025-04-23 ${hour}:00`, // 날짜는 현재 날짜로 고정, 시간은 API에서 받은 값 사용
          orderType: sale.saleMethod,
          totalPrice: sale.salePrice,
        });
      });
    });
  }
  // 일별 데이터 처리 (한달 이내)
  else if (rangeType === "day") {
    // 모든 날짜에 대한 맵 생성
    const dateMap = {};
    apiData.forEach((item) => {
      const date = item.monthDateTime;
      if (!dateMap[date]) {
        dateMap[date] = {
          hall: 0,
          baemin: 0,
          coupang: 0,
          yogiyo: 0,
        };
      }

      item.oneTimeResponseList.forEach((sale) => {
        dateMap[date][sale.saleMethod] = sale.salePrice;
      });
    });

    // 모든 날짜에 대해 데이터 포인트 생성
    Object.keys(dateMap)
      .sort()
      .forEach((date) => {
        const dateData = dateMap[date];

        Object.keys(dateData).forEach((method) => {
          // 0 값도 명시적으로 포함
          result.push({
            createdAt: `${date} 00:00`,
            orderType: method,
            totalPrice: dateData[method],
          });
        });
      });
  }
  // 월별 데이터 처리 (일년 이내)
  else if (rangeType === "month") {
    // 모든 월에 대한 맵 생성
    const monthMap = {};
    apiData.forEach((item) => {
      const month = item.monthDateTime;
      if (!monthMap[month]) {
        monthMap[month] = {
          hall: 0,
          baemin: 0,
          coupang: 0,
          yogiyo: 0,
        };
      }

      item.oneTimeResponseList.forEach((sale) => {
        monthMap[month][sale.saleMethod] = sale.salePrice;
      });
    });

    // 모든 월에 대해 데이터 포인트 생성
    Object.keys(monthMap)
      .sort()
      .forEach((month) => {
        const monthData = monthMap[month];

        Object.keys(monthData).forEach((method) => {
          // 0 값도 명시적으로 포함
          result.push({
            createdAt: `${month}-01 00:00`,
            orderType: method,
            totalPrice: monthData[method],
          });
        });
      });
  }

  return result;
};

// 날짜 선택 핸들러
const handleDateSelected = (date) => {
  selectedDate.value = date;
  // 날짜를 직접 클릭했을 때는 selectedPeriod를 null로 설정
  selectedPeriod.value = null;
  fetchChartData();
};

// 기간 선택 핸들러 추가
const handlePeriodSelected = (period) => {
  selectedPeriod.value = period;
  fetchChartData();
};

// 컴포넌트 마운트 시 모든 주문 목록 가져오기
onMounted(() => {
  fetchAllOrders();
  fetchChartData(); // 초기 차트 데이터도 가져오기
});

// 날짜 범위가 변경될 때마다 차트 데이터 다시 가져오기
watch(
  dateRange,
  () => {
    fetchChartData();
  },
  { deep: true }
);
</script>

<template>
  <div class="app-container">
    <header class="header">
      <h1>매출 분석 상세</h1>
    </header>

    <main class="main-content">
      <div class="calendar-container">
        <Calendar
          :current-month="currentMonth"
          :current-year="currentYear"
          :sales-data="salesData"
          @update:currentMonth="currentMonth = $event"
          @update:currentYear="currentYear = $event"
          @date-selected="handleDateSelected"
          @period-selected="handlePeriodSelected"
        />
      </div>
      <div class="sales-detail-container">
        <SalesDetail
          :selected-date="selectedDate"
          :sales-data="salesData"
          :selected-period="selectedPeriod"
          :chart-data="chartData"
          :date-range-type="dateRange.type"
          :is-loading="isLoading"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.header-div {
  display: flex;
  gap: 200px;
}

.header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.view-tabs {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 6px 12px;
  border: none;
  background-color: #eee;
  cursor: pointer;
  border-radius: 6px;
}

.tab-btn.active {
  background-color: #333;
  color: #fff;
}

.main-content {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.calendar-container {
  flex: 1;
  max-width: 50%;
}

.sales-detail-container {
  flex: 1;
  max-width: 50%;
}
</style>
