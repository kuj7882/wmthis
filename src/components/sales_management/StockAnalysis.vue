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

    fetchAndSetTwoData();
    fetchAndSetStockData();
  }
});

const salesMenu = ref([]);
const salesMarket = ref([]);

async function fetchAndSetTwoData() {
  try {
    const payload = {
      startDate: startDate.value,
      endDate: endDate.value,
    };
    const data = await api.SearchMenuMarket(payload);

    if (data !== 404) {
      // 각각 초기화
      salesMenu.value = [];
      salesMarket.value = [];

      data.forEach((item) => {
        const fullDate = new Date(item.date);
        const date = fullDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
        const time = fullDate.toTimeString().slice(0, 8); // "HH:mm:ss"

        const record = {
          date,
          time,
          stockName: item.stockName,
          changeReason: item.changeReason,
          quantity: item.quantity,
          unit: item.unit,
        };

        if (item.changeReason === "메뉴") {
          salesMenu.value.push(record);
        } else {
          salesMarket.value.push(record);
        }
      });
    } else {
      console.error("판매 데이터를 불러오지 못했습니다.");
    }
  } catch (error) {
    console.error("에러 발생:", error);
  }
}

const changeStock = ref([]);
async function fetchAndSetStockData() {
  try {
    const payload = {
      startDate: startDate.value,
      endDate: endDate.value,
    };
    const data = await api.SearchInventoryUpdate(payload);

    if (data !== 404) {
      changeStock.value = data.map((item) => {
        const fullDate = new Date(item.date);
        const date = fullDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
        const time = fullDate.toTimeString().slice(0, 8); // "HH:mm:ss"

        return {
          date,
          time,
          stockName: item.stockName,
          changeReason: item.changeReason,
          quantity: item.quantity,
          unit: item.unit,
        };
      });
    } else {
      console.error("판매 데이터를 불러오지 못했습니다.");
    }
  } catch (error) {
    console.error("에러 발생:", error);
  }
}

const total = computed(() => [...salesMenu.value, ...changeStock.value, ...salesMarket.value]);

const flatList = ref([]);
async function fetchAndSetFlatList() {
  const data = await api.SearchStockList();

  if (data !== 404) {
    flatList.value = data.map((item) => ({
      stockName: item.name,
      quantity: item.quantity,
      unit: item.unit,
    }));
  } else {
    console.error("메뉴 데이터를 불러오지 못했습니다.");
  }
}

onMounted(() => {
  fetchAndSetFlatList();
  if (startDate.value && endDate.value) {
    fetchAndSetTwoData();
    fetchAndSetStockData();
  }
});

const selectedIndex = ref(0);
const selectedStockName = computed(() => filteredList.value[selectedIndex.value]?.stockName || "");

const selectItem = (index) => {
  selectedIndex.value = index;
};

const selectedTab = ref("total");
const currentDataSource = computed(() => {
  if (selectedTab.value === "menu") return salesMenu.value;
  if (selectedTab.value === "change") return changeStock.value;
  if (selectedTab.value === "market") return salesMarket.value;
  if (selectedTab.value === "total") return total.value;
  return [];
});

function changeTab(tabName) {
  selectedTab.value = tabName;
}

const filteredList = computed(() => {
  const query = keyword.value.trim();
  if (!query) return flatList.value;

  return flatList.value.filter((item) => item.stockName.includes(query));
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
const peroidData = computed(() => {
  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  const selectedName = selectedStockName.value;
  // 날짜 범위 필터링
  const filteredSales = currentDataSource.value.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate >= start && itemDate <= end;
  });

  // 선택된 stockName 기준 필터링
  const filteredByStock = filteredSales.filter((item) => item.stockName === selectedName);

  // 정렬
  filteredByStock.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  return filteredByStock;
});

// 선택된 재고의 단위 가져오기
const selectedStockUnit = computed(() => {
  if (peroidData.value.length > 0) {
    return peroidData.value[0].unit;
  }
  // 기본값 반환
  return "";
});

// 날짜/월별 증가량과 감소량을 분리하여 계산
const getQuantityByKey = computed(() => {
  const result = {};

  peroidData.value.forEach((item) => {
    const key = showByMonth.value ? item.date.slice(0, 7) : item.date;
    const quantity = parseFloat(item.quantity);

    if (!result[key]) {
      result[key] = {
        increase: 0,
        decrease: 0,
        total: 0,
      };
    }

    if (quantity >= 0) {
      result[key].increase += quantity;
    } else {
      result[key].decrease += Math.abs(quantity);
    }

    // 총 변동량 = 증가량 + 감소량의 절대값
    result[key].total = result[key].increase + result[key].decrease;
  });

  return result;
});

// 최대 변동량을 가진 날짜/월 찾기 (증가량 + 감소량의 절대값이 가장 큰 날짜)
const maxTotalChangeKey = computed(() => {
  const changes = getQuantityByKey.value;
  let maxKey = null;
  let maxValue = -Infinity;

  for (const [key, value] of Object.entries(changes)) {
    if (value.total > maxValue) {
      maxValue = value.total;
      maxKey = key;
    }
  }

  return maxKey
    ? {
        key: maxKey,
        increase: changes[maxKey].increase,
        decrease: changes[maxKey].decrease,
        total: changes[maxKey].total,
      }
    : null;
});

//차트 데이터 - 메뉴
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

//차트 데이터 - 메뉴
const chartSeries = computed(() => {
  if (!startDate.value || !endDate.value) return [];

  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  const labels = getDateRange(start, end, showByMonth.value); // 포맷된 라벨

  // 양수와 음수 값을 분리하여 저장할 객체
  const positiveCounts = {};
  const negativeCounts = {};

  peroidData.value.forEach((item) => {
    const itemDate = new Date(item.date);
    let key;

    if (showByMonth.value) {
      // YYYY.MM
      key = `${itemDate.getFullYear()}.${String(itemDate.getMonth() + 1).padStart(2, "0")}`;
    } else {
      // MM.DD
      key = `${String(itemDate.getMonth() + 1).padStart(2, "0")}.${String(itemDate.getDate()).padStart(2, "0")}`;
    }

    const quantity = parseFloat(item.quantity);

    // 양수와 음수 값을 분리하여 저장
    if (quantity >= 0) {
      positiveCounts[key] = parseFloat(((positiveCounts[key] || 0) + quantity).toFixed(2));
    } else {
      // 음수 값은 절대값으로 저장 (차트에서는 양수로 표시하고 색상으로 구분)
      negativeCounts[key] = parseFloat(((negativeCounts[key] || 0) + Math.abs(quantity)).toFixed(2));
    }
  });

  return [
    {
      name: "증가",
      data: labels.map((label) => positiveCounts[label] || 0),
    },
    {
      name: "감소",
      data: labels.map((label) => negativeCounts[label] || 0),
    },
  ];
});

// 차트 제목 가져오기
const getChartTitle = computed(() => {
  const prefix = showByMonth.value ? "" : "";

  switch (selectedTab.value) {
    case "menu":
      return prefix + "메뉴 판매로 인한 재고 변동량";
    case "change":
      return prefix + "재고 수정으로 인한 재고 변동량";
    case "market":
      return prefix + "장터 거래로 인한 재고 변동량";
    default:
      return prefix + "재고 변동량";
  }
});

// 차트 옵션
const chartOptions = computed(() => {
  if (!startDate.value || !endDate.value) return {};

  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  const labels = getDateRange(start, end, showByMonth.value);

  return {
    chart: {
      type: "bar",
      height: 350,
      stacked: false,
    },
    title: {
      text: getChartTitle.value,
      align: "center",
    },
    xaxis: {
      categories: labels,
    },
    yaxis: {
      title: {
        text: selectedStockUnit.value || "수량",
      },
    },
    colors: ["#4CAF50", "#F44336"], // 증가는 녹색, 감소는 빨간색
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      position: "top",
    },
  };
});

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

// 탭에 따른 메시지 설정
const getTabMessage = computed(() => {
  switch (selectedTab.value) {
    case "menu":
      return "메뉴 판매로 인한";
    case "change":
      return "재고 수정으로 인한";
    case "market":
      return "장터 거래로 인한";
    default:
      return "";
  }
});

// 날짜 포맷팅
const formatDate = (dateKey) => {
  if (!dateKey) return "";
  return showByMonth.value ? dateKey.replace("-", "년 ") + "월" : dateKey.slice(5).replace("-", "월 ") + "일";
};

// 캐러셀에 표시할 정보 수정
const summaries = computed(() => {
  // 데이터가 없는 경우
  if (peroidData.value.length === 0) {
    return [
      {
        line1: "선택된 기간에 ",
        highlight1: selectedStockName.value,
        line2: "의 변동 데이터가 없습니다.",
        highlight2: "",
        highlight3: "",
        line3: "",
        line4: "",
      },
    ];
  }

  // 최대 변동량 정보
  const maxInfo = maxTotalChangeKey.value;

  if (!maxInfo) {
    return [
      {
        line1: "선택된 기간에 ",
        highlight1: selectedStockName.value,
        line2: "의 변동이 없습니다.",
        highlight2: "",
        highlight3: "",
        line3: "",
        line4: "",
      },
    ];
  }

  const formattedDate = formatDate(maxInfo.key);
  const tabMsg = getTabMessage.value;

  // 증가와 감소가 모두 있는 경우
  if (maxInfo.increase > 0 && maxInfo.decrease > 0) {
    return [
      {
        line1: "선택된 기간 내 ",
        highlight1: selectedStockName.value,
        line2: "의 " + (tabMsg ? tabMsg + " " : "") + "재고 변동량은 ",
        highlight2: formattedDate,
        highlight3: "",
        line3: "에 가장 높습니다.",
        line4: `${maxInfo.increase.toFixed(2)}${selectedStockUnit.value}이 증가했고, ${maxInfo.decrease.toFixed(2)}${selectedStockUnit.value}이 감소했습니다.`,
      },
    ];
  }

  // 증가만 있는 경우
  if (maxInfo.increase > 0 && maxInfo.decrease === 0) {
    return [
      {
        line1: "선택된 기간 내 ",
        highlight1: selectedStockName.value,
        line2: "의 " + (tabMsg ? tabMsg + " " : "") + "재고 변동량은 ",
        highlight2: formattedDate,
        highlight3: "",
        line3: "에 가장 높습니다.",
        line4: `${maxInfo.increase.toFixed(2)}${selectedStockUnit.value}이 증가했습니다.`,
      },
    ];
  }

  // 감소만 있는 경우
  if (maxInfo.increase === 0 && maxInfo.decrease > 0) {
    return [
      {
        line1: "선택된 기간 내 ",
        highlight1: selectedStockName.value,
        line2: "의 " + (tabMsg ? tabMsg + " " : "") + "재고 변동량은 ",
        highlight2: formattedDate,
        highlight3: "",
        line3: "에 가장 높습니다.",
        line4: `${maxInfo.decrease.toFixed(2)}${selectedStockUnit.value}이 감소했습니다.`,
      },
    ];
  }

  // 기본 메시지 (이 경우는 발생하지 않아야 함)
  return [
    {
      line1: "선택된 기간에 ",
      highlight1: selectedStockName.value,
      line2: "의 변동이 있습니다.",
      highlight2: "",
      highlight3: "",
      line3: "",
      line4: "",
    },
  ];
});
</script>

<template>
  <div class="menu_analysis">
    <div class="menu_list">
      <div class="header">
        <h1>재고 소요량 분석</h1>
        <div class="search_container">
          <input v-model="keyword" type="text" placeholder="재고 검색" class="search_input" />
          <img src="@/assets/image/search_button.png" alt="검색" class="search_icon" />
        </div>
      </div>
      <table class="menu_table">
        <thead>
          <tr>
            <th>재고 명</th>
            <th>용량</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in filteredList" :key="idx" @click="selectItem(idx)"
            :class="{ selected: selectedIndex === idx }">
            <td>{{ item.stockName }}</td>
            <td>{{ item.quantity }}{{ item.unit }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="chart_container">
      <div class="chart_header">
        <div class="date_selector">
          <div class="stock_list">
            <span @click="changeTab('total')" :class="{ active: selectedTab === 'total' }">전체</span>
            <span @click="changeTab('menu')" :class="{ active: selectedTab === 'menu' }">판매</span>
            <span @click="changeTab('change')" :class="{ active: selectedTab === 'change' }">수정</span>
            <span @click="changeTab('market')" :class="{ active: selectedTab === 'market' }">장터</span>
          </div>
          <Calendar v-model:startDate="startDate" v-model:endDate="endDate" />
        </div>
      </div>

      <div class="chart">
        <apexchart type="bar" height="350" :options="chartOptions" :series="chartSeries"></apexchart>
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
                </p>
                <p class="carousel-line carousel-line-bold">
                  <span v-if="text.highlight2" class="highlight-text">{{ text.highlight2 }}</span>
                  <span v-if="text.highlight3" class="highlight-text">{{ text.highlight3 }}</span>
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

/* 달력 스타일 */
.date_selector {
  display: flex;
  justify-content: space-between;
  align-items: end;
  position: relative;
  width: 100%;
}

.stock_list span {
  padding: 5px 15px 5px 15px;
}

.stock_list span:hover {
  cursor: pointer;
  background-color: #f9f9f9;
}

.stock_list span.active {
  background-color: #b8c0c8;
  /* 진한 인디고 */
}

/* 판매 데이터 테이블 스타일 */
.sales_detail {
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  max-height: 200px;
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
