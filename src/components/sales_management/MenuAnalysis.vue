<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from "vue";
import Calendar from "@/components/Calendar.vue";
import { api } from "@/api/index.js";

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");

// 이번 달의 첫째 날
const firstDay = `${yyyy}-${mm}-01`;

// 이번 달의 마지막 날 구하기
const lastDate = new Date(yyyy, today.getMonth() + 1, 0); // 다음 달 0일 = 이번 달 마지막 날
const lastDay = `${yyyy}-${mm}-${String(lastDate.getDate()).padStart(2, "0")}`;

// ref로 세팅
const keyword = ref("");
const startDate = ref(firstDay);
const endDate = ref(lastDay);

watch([startDate, endDate], ([newStart, newEnd]) => {
  if (newStart && newEnd) {
    const start = new Date(newStart);
    const end = new Date(newEnd);

    if (start > end) {
      alert("시작일이 종료일보다 빨라야 합니다");
      return;
    }

    fetchAndSetSalesData();
  }
});

const salesData = ref([]);
async function fetchAndSetSalesData() {
  try {
    const payload = {
      startDate: startDate.value,
      endDate: endDate.value,
    };
    const data = await api.SearchMenuSale(payload);

    if (data !== 404) {
      salesData.value = data.map((item) => {
        const fullDate = new Date(item.date);
        const date = fullDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
        const time = fullDate.toTimeString().slice(0, 8); // "HH:mm:ss"

        return {
          date,
          time,
          categoryName: item.category,
          menuName: item.menuName,
          quantity: item.quantity,
        };
      });
    } else {
      console.error("판매 데이터를 불러오지 못했습니다.");
    }
  } catch (error) {
    console.error("에러 발생:", error);
  }
}

const flatList = ref([]);
async function fetchAndSetFlatList() {
  const data = await api.SearchMenuList();

  if (data !== 404) {
    flatList.value = data.map((item) => ({
      menuName: item.menuName,
      category: item.category,
    }));
  } else {
    console.error("메뉴 데이터를 불러오지 못했습니다.");
  }
}

onMounted(() => {
  fetchAndSetFlatList();
  if (startDate.value && endDate.value) {
    fetchAndSetSalesData();
  }
});

const selectedIndex = ref(0);
const selectedMenuName = computed(() => filteredList.value[selectedIndex.value]?.menuName || "");
const selectItem = (index) => {
  selectedIndex.value = index;
};

const filteredList = computed(() => {
  const query = keyword.value.trim();
  if (!query) return flatList.value;

  return flatList.value.filter((item) => item.menuName.includes(query));
});

// 달력 관련 데이터
const showByMonth = computed(() => {
  if (!startDate.value || !endDate.value) return false;

  const start = new Date(startDate.value);
  const end = new Date(endDate.value);

  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();

  if (sameMonth) {
    // ✅ 같은 달이면 무조건 일별 표시
    return false;
  }

  const timeDiff = end.getTime() - start.getTime();
  const dayCount = timeDiff / (1000 * 60 * 60 * 24) + 1; // +1 해서 당일 포함

  // ✅ 다른 달인데 30일 초과면 월별 표시, 아니면 일별
  return dayCount > 30;
});

// 선택된 날짜의 판매 데이터
const periodSales = computed(() => {
  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  const selectedName = selectedMenuName.value;

  // 날짜 범위에 해당하는 데이터 필터링
  const filteredSales = salesData.value.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate >= start && itemDate <= end;
  });

  const filteredByMenu = filteredSales.filter((item) => item.menuName === selectedName);

  filteredByMenu.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  return Object.values(filteredByMenu);
});

//차트 데이터
function getDateRange(start, end, byMonth = false) {
  const result = [];
  const current = new Date(start);

  while (current <= end) {
    let formatted;

    if (byMonth) {
      // YYYY.MM
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      formatted = `${year}.${month}`;
    } else {
      // MM.DD
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      formatted = `${month}.${day}`;
    }

    if (!result.includes(formatted)) {
      result.push(formatted);
    }

    if (byMonth) {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
  }

  return result;
}

// 날짜/월별 판매량 계산
const getSalesByKey = computed(() => {
  const result = {};

  periodSales.value.forEach((item) => {
    const key = showByMonth.value ? item.date.slice(0, 7) : item.date;
    const quantity = parseInt(item.quantity) || 1; // 수량이 없으면 1로 간주

    if (!result[key]) {
      result[key] = {
        count: 0, // 판매 건수
        totalQuantity: 0, // 총 판매 수량
      };
    }

    result[key].count += 1;
    result[key].totalQuantity += quantity;
  });

  return result;
});

// 최대 판매량을 가진 날짜/월 찾기
const maxSalesKey = computed(() => {
  const sales = getSalesByKey.value;
  let maxKey = null;
  let maxValue = -Infinity;

  for (const [key, value] of Object.entries(sales)) {
    if (value.totalQuantity > maxValue) {
      maxValue = value.totalQuantity;
      maxKey = key;
    }
  }

  return maxKey
    ? {
        key: maxKey,
        count: sales[maxKey].count,
        totalQuantity: sales[maxKey].totalQuantity,
      }
    : null;
});

const chartSeries = computed(() => {
  if (!startDate.value || !endDate.value) return [];

  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  const labels = getDateRange(start, end, showByMonth.value); // 포맷된 라벨

  const counts = {};

  periodSales.value.forEach((item) => {
    const itemDate = new Date(item.date);
    let key;

    if (showByMonth.value) {
      // YYYY.MM
      key = `${itemDate.getFullYear()}.${String(itemDate.getMonth() + 1).padStart(2, "0")}`;
    } else {
      // MM.DD
      key = `${String(itemDate.getMonth() + 1).padStart(2, "0")}.${String(itemDate.getDate()).padStart(2, "0")}`;
    }

    counts[key] = (counts[key] || 0) + (parseInt(item.quantity) || 1);
  });

  return [
    {
      name: "판매 수량",
      data: labels.map((label) => counts[label] || 0), // 라벨 기준으로 맞춤
    },
  ];
});

const chartOptions = computed(() => {
  if (!startDate.value || !endDate.value) return {};

  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  const labels = getDateRange(start, end, showByMonth.value);

  return {
    chart: {
      type: "bar",
      height: 350,
    },
    title: {
      text: showByMonth.value ? "월별 판매 수량" : "일별 판매 수량",
      align: "center",
    },
    xaxis: {
      categories: labels,
    },
    yaxis: {
      title: {
        text: "판매 수량",
      },
    },
    colors: ["#4CAF50"],
    dataLabels: {
      enabled: false,
    },
  };
});

// 날짜 포맷팅
const formatDate = (dateKey) => {
  if (!dateKey) return "";
  return showByMonth.value ? dateKey.replace("-", "년 ") + "월" : dateKey.slice(5).replace("-", "월 ") + "일";
};

// 캐러셀 관련 데이터
const currentCarousel = ref(0);
const carouselInterval = ref(null);

// 캐러셀 자동 전환 설정
onMounted(() => {
  carouselInterval.value = setInterval(() => {
    currentCarousel.value = (currentCarousel.value + 1) % summaries.value.length;
  }, 5000);
});

// 컴포넌트 언마운트 시 인터벌 정리
onUnmounted(() => {
  if (carouselInterval.value) {
    clearInterval(carouselInterval.value);
  }
});

// 캐러셀에 표시할 정보 수정
const summaries = computed(() => {
  // 데이터가 없는 경우
  if (periodSales.value.length === 0) {
    return [
      {
        line1: "선택된 기간에 ",
        highlight1: selectedMenuName.value,
        line2: "가 판매되지 않았습니다.",
        highlight2: "",
        line3: "",
        line4: "",
      },
    ];
  }

  // 최대 판매량 정보
  const maxInfo = maxSalesKey.value;

  if (!maxInfo) {
    return [
      {
        line1: "선택된 기간에 ",
        highlight1: selectedMenuName.value,
        line2: "가 판매되지 않았습니다.",
        highlight2: "",
        line3: "",
        line4: "",
      },
    ];
  }

  const formattedDate = formatDate(maxInfo.key);

  return [
    {
      line1: "선택된 기간 내 ",
      highlight1: selectedMenuName.value,
      line2: "는",
      highlight2: formattedDate,
      line3: "에 가장 많이 판매되었습니다.",
      line4: `총 ${maxInfo.totalQuantity}개가 판매되었습니다.`,
    },
  ];
});
</script>

<template>
  <div class="menu_analysis">
    <div class="menu_list">
      <div class="header">
        <h1>메뉴 분석</h1>
        <div class="search_container">
          <input v-model="keyword" type="text" placeholder="메뉴 검색" class="search_input" />
          <img src="@/assets/image/search_button.png" alt="검색" class="search_icon" />
        </div>
      </div>
      <table class="menu_table">
        <thead>
          <tr>
            <th>메뉴 명</th>
            <th>카테고리</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in filteredList" :key="idx" @click="selectItem(idx)"
            :class="{ selected: selectedIndex === idx }">
            <td>{{ item.menuName }}</td>
            <td>{{ item.category }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="chart_container">
      <div class="chart_header">
        <div class="date_selector">
          <Calendar v-model:startDate="startDate" v-model:endDate="endDate" />
        </div>
      </div>

      <div class="chart">
        <apexchart type="bar" height="350" :options="chartOptions" :series="chartSeries" />
      </div>
      <div class="carousel-container">
        <div class="carousel-wrapper">
          <div class="carousel-slides" :style="{ transform: `translateX(-${currentCarousel * 100}%)` }">
            <div v-for="(text, i) in summaries" :key="i" class="carousel-slide">
              <div class="carousel-content">
                <p class="carousel-line carousel-line-bold">
                  {{ text.line1 }}
                  <span class="highlight-text">{{ text.highlight1 }}</span>
                  {{ text.line2 }}
                  <span v-if="text.highlight2" class="highlight-text">{{ text.highlight2 }}</span>
                  {{ text.line3 }}
                </p>
                <p class="carousel-line carousel-line-bold" v-if="text.line4">
                  {{ text.line4 }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="carousel-indicators" v-if="summaries.length > 1">
          <span v-for="(_, i) in summaries" :key="i" class="carousel-indicator" :class="{ active: currentCarousel === i }" @click="currentCarousel = i"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu_table {
  width: 100%;
  border-collapse: collapse;
}

/* 헤더 고정, tbody 스크롤 처리 */
.menu_table thead {
  background: #f5f5f5;
  display: table;
  width: 100%;
  table-layout: fixed;
}

.menu_table tbody {
  display: block;
  max-height: 300px;
  /* 여기에서 스크롤 높이 지정 */
  overflow-y: auto;
  /* 세로 스크롤 */
  width: 100%;
  table-layout: fixed;
}

.menu_table th,
.menu_table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

/* tbody 안의 tr은 다시 table-layout 유지 */
.menu_table tbody tr {
  display: table;
  width: 100%;
  table-layout: fixed;
}

/* 선택된 행 스타일 */
.selected {
  background-color: #ffe58a;
}

.menu_analysis {
  width: 100%;
  height: 100%;
  background-color: white;
  display: flex;
}

.menu_list {
  width: 45%;
  height: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.header {
  margin-bottom: 20px;
}

.header h1 {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 15px;
}

.search_container {
  display: flex;
  align-items: center;
  background-color: white;
  border-radius: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid #ddd;
  width: 55%;
}

.search_input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #333;
}

.search_input::placeholder {
  color: #ccc;
}

.search_icon {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.menu_table {
  width: 100%;
  border-spacing: 0;
  margin-top: 10px;
  background-color: white;
}

.menu_table th,
.menu_table td {
  padding: 10px 10px 10px 50px;
  text-align: left;
}

.menu_table th {
  background-color: #b8c0c8;
  font-weight: bold;
}

.menu_table thead th:first-child {
  border-top-left-radius: 20px;
  border-bottom-left-radius: 20px;
}

.menu_table td {
  border-bottom: 1px solid #b8c0c8;
}

.menu_table thead th:last-child {
  border-top-right-radius: 20px;
  border-bottom-right-radius: 20px;
}

.menu_table tr.selected {
  background-color: #f9f9f9;
}

.menu_table tr:hover {
  background-color: #f9f9f9;
  cursor: pointer;
}

.chart_container {
  width: 55%;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.chart_header {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
}

.chart {
  flex: 1;
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.date_selector {
  position: relative;
  margin-left: auto;
}

/* 캐러셀 스타일 */
.carousel-container {
  background-color: #f5f5f5;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.carousel-wrapper {
  overflow: hidden;
  position: relative;
}

.carousel-slides {
  display: flex;
  transition: transform 0.5s ease;
}

.carousel-slide {
  min-width: 100%;
  box-sizing: border-box;
}

.carousel-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 10px;
}

.carousel-line {
  font-size: 18px;
  margin: 4px 0;
  color: #424242;
}

.carousel-line-bold {
  font-weight: 600;
}

.highlight-text {
  color: #e53935;
}

.carousel-indicators {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

.carousel-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #ccc;
  margin: 0 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.carousel-indicator.active {
  background-color: #333;
}
</style>
