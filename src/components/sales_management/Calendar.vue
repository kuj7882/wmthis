<script setup>
import { computed, ref } from "vue";
import { defineProps, defineEmits } from "vue";

const props = defineProps({
  currentMonth: {
    type: Number,
    required: true,
  },
  currentYear: {
    type: Number,
    required: true,
  },
  salesData: {
    type: Object,
    required: true,
  },
});

// 수정된 emit 정의 - 기간 정보도 함께 전달하기 위한 새 이벤트 추가
const emit = defineEmits(["update:currentMonth", "update:currentYear", "date-selected", "period-selected"]);

const rangeSelecting = ref(false);
const selectedRangeStart = ref(null);
const selectedRangeEnd = ref(null);

const selectedDate = ref(null);
const selectedRange = ref([]);
const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
const currentYearMonth = computed(() => {
  return `${props.currentYear}년 ${props.currentMonth + 1}월`;
});
// 달력 날짜 계산
const calendarDays = computed(() => {
  const days = [];
  const firstDay = new Date(props.currentYear, props.currentMonth, 1);
  const lastDay = new Date(props.currentYear, props.currentMonth + 1, 0);

  // 이전 달의 날짜 추가
  const firstDayOfWeek = firstDay.getDay();
  if (firstDayOfWeek > 0) {
    const prevMonthLastDay = new Date(props.currentYear, props.currentMonth, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(props.currentYear, props.currentMonth - 1, prevMonthLastDay - i);
      days.push({
        day: prevMonthLastDay - i,
        date,
        currentMonth: false,
        sales: getSalesForDate(date),
      });
    }
  }

  // 현재 달의 날짜 추가
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(props.currentYear, props.currentMonth, i);
    days.push({
      day: i,
      date,
      currentMonth: true,
      sales: getSalesForDate(date),
    });
  }

  // 다음 달의 날짜 추가
  const remainingDays = 42 - days.length; // 6주 x 7일 = 42
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(props.currentYear, props.currentMonth + 1, i);
    days.push({
      day: i,
      date,
      currentMonth: false,
      sales: getSalesForDate(date),
    });
  }

  return days;
});

const getSalesForDate = (date) => {
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const sales = props.salesData[formattedDate] || [];

  if (formattedDate === "2025-04-22") { // 특정 날짜에 대한 디버깅
    console.log(`${formattedDate}의 매출 데이터:`, sales);
  }

  return sales;
};

const startRangeSelection = () => {
  activeTab.value = "custom";
  rangeSelecting.value = true;
  selectedRangeStart.value = null;
  selectedRangeEnd.value = null;
  selectedRange.value = [];
};
// 오늘 날짜인지 확인
const isToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

// 선택된 날짜인지 확인
const isSelected = (date) => {
  return selectedRange.value.some(
    (selectedDate) =>
      date.getFullYear() === selectedDate.getFullYear() && date.getMonth() === selectedDate.getMonth() && date.getDate() === selectedDate.getDate()
  );
};

// 날짜 선택 핸들러
const selectDate = (date) => {
  if (!rangeSelecting.value) {
    activeTab.value = null;
    selectedDate.value = date;
    selectedRange.value = [date];
    emit("date-selected", date);
    // 단일 날짜 선택 시 period-selected 이벤트도 발생시킴
    emit("period-selected", "specific");
  } else {
    if (!selectedRangeStart.value) {
      selectedRangeStart.value = date;
    } else {
      selectedRangeEnd.value = date;

      const start = selectedRangeStart.value < date ? selectedRangeStart.value : date;
      const end = selectedRangeStart.value > date ? selectedRangeStart.value : date;

      selectedRange.value = getDateRange(start, end);
      selectedDate.value = start;

      emit("date-selected", start);
      emit("period-selected", {
        type: "custom",
        start,
        end,
      });

      // 선택 완료 후 초기화
      rangeSelecting.value = false;
    }
  }
};

// 매출액 포맷팅
const formatSales = (amount) => {
  return amount.toLocaleString() + "원";
};
const calculateTotal = (sales) => {
  if (!Array.isArray(sales)) {
    console.log("sales가 배열이 아님:", sales);
    return { amount: 0, count: 0 };
  }

  console.log("계산 전 sales:", sales);
  const totalAmount = sales.reduce((sum, item) => {
    if (typeof item.amount !== 'number') {
      console.log("amount가 숫자가 아님:", item);
      return sum;
    }
    return sum + item.amount;
  }, 0);

  console.log(`계산 결과: 금액=${totalAmount}, 건수=${sales.length}`);
  return {
    amount: totalAmount,
    count: sales.length,
  };
};

// 이전 달로 이동
const prevMonth = () => {
  if (props.currentMonth === 0) {
    emit("update:currentMonth", 11);
    emit("update:currentYear", props.currentYear - 1);
  } else {
    emit("update:currentMonth", props.currentMonth - 1);
  }
};

// 다음 달로 이동
const nextMonth = () => {
  if (props.currentMonth === 11) {
    emit("update:currentMonth", 0);
    emit("update:currentYear", props.currentYear + 1);
  } else {
    emit("update:currentMonth", props.currentMonth + 1);
  }
};

// 탭 상태 관리
const activeTab = ref("today"); // 기본값: '일별'
const setActiveTab = (tab) => {
  activeTab.value = tab;

  const today = new Date();

  if (tab === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    selectedDate.value = yesterday;
    selectedRange.value = [yesterday]; // 어제 날짜만 선택
    emit("date-selected", yesterday);
    emit("period-selected", "yesterday");
  } else if (tab === "today") {
    selectedDate.value = today;
    selectedRange.value = [today]; // 오늘 날짜만 선택
    emit("date-selected", today);
    emit("period-selected", "today");
  } else if (tab === "thisweek") {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // 이번 주 시작일 (일요일)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // 이번 주 종료일 (토요일)

    selectedDate.value = startOfWeek;
    selectedRange.value = getDateRange(startOfWeek, endOfWeek); // 이번 주 범위
    emit("date-selected", startOfWeek);
    emit("period-selected", "week");
  } else if (tab === "thismonth") {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); // 이번 달 시작일
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // 이번 달 종료일

    selectedDate.value = startOfMonth;
    selectedRange.value = getDateRange(startOfMonth, endOfMonth); // 이번 달 범위
    emit("date-selected", startOfMonth);
    emit("period-selected", "month");
  }
};
const getDateRange = (startDate, endDate) => {
  const range = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    range.push(new Date(currentDate)); // 날짜를 배열에 추가
    currentDate.setDate(currentDate.getDate() + 1); // 하루씩 증가
  }

  return range;
};
</script>

<template>
  <div class="calendar">
    <div class="calendar-header-function">
      <div class="header-controls">
        <button class="month-nav" @click="prevMonth">
          <span class="arrow">◀</span>
        </button>
        <span class="current-month">{{ currentYearMonth }}</span>
        <button class="month-nav" @click="nextMonth">
          <span class="arrow">▶</span>
        </button>
      </div>
      <div class="view-tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'yesterday' }"
          @click="setActiveTab('yesterday')">어제</button>
        <button class="tab-btn" :class="{ active: activeTab === 'today' }" @click="setActiveTab('today')">오늘</button>
        <button class="tab-btn" :class="{ active: activeTab === 'thisweek' }"
          @click="setActiveTab('thisweek')">이번주</button>
        <button class="tab-btn" :class="{ active: activeTab === 'thismonth' }"
          @click="setActiveTab('thismonth')">이번달</button>
      </div>

      <button class="tab-btn" :class="{ active: activeTab === 'custom' }" @click="startRangeSelection">날짜선택</button>
    </div>
    <div class="calendar-header">
      <div class="weekday" v-for="day in weekdays" :key="day">{{ day }}</div>
    </div>
    <div class="calendar-body">
      <div v-for="(day, index) in calendarDays" :key="index"
        :class="['calendar-day', { 'other-month': !day.currentMonth }, { today: isToday(day.date) }, { selected: isSelected(day.date) }]"
        @click="selectDate(day.date)">
        <div class="day-number">{{ day.day }}</div>
        <div v-if="day.sales && day.sales.length" class="sales-indicator">
          <div class="sales-box1">{{ formatSales(calculateTotal(day.sales).amount) }}</div>
          <div class="sales-box2">{{ calculateTotal(day.sales).count }}건</div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.calendar {
  width: 100%;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 10px;
}

.weekday {
  font-weight: 500;
  padding: 10px;
  color: #666;
}

.calendar-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-gap: 5px;
}

.calendar-day {
  aspect-ratio: 1;
  padding: 5px;
  border-radius: 5px;
  cursor: pointer;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: background-color 0.2s;
}

.calendar-day:hover {
  background-color: #f0f0f0;
}

.other-month {
  opacity: 0.5;
}

.today {
  background-color: #f0f8ff;
}

.selected {
  background-color: #e6f7ff;
  border: 1px solid #1890ff;
}

.day-number {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 5px;
}

.sales-indicator {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
}

.sales-box1 {
  padding: 2px 0px;
  background-color: #b1d5c2;
  border-radius: 4px;
  color: #333;
  font-weight: 500;
  text-align: center;
}

.sales-box2 {
  padding: 2px 4px;
  background-color: #f8d7a9;
  border-radius: 4px;
  color: #333;
  font-weight: 500;
  text-align: center;
}

.sales-categories {
  display: flex;
  gap: 2px;
  margin-top: 2px;
}

.category-box {
  flex: 1;
  height: 4px;
  border-radius: 2px;
}

.food {
  background-color: #ffd666;
}

.beverage {
  background-color: #87e8de;
}

.other {
  background-color: #ff9c6e;
}

.calendar-header-function {
  display: flex;
  flex-direction: row;
  gap: 10px;
  margin-bottom: 20px;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.current-month {
  font-size: 16px;
  font-weight: bold;
}

.month-nav {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
}

.view-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 6px 12px;
  border: none;
  background-color: #eee;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.3s ease;
}

.tab-btn.active {
  background-color: #333;
  /* 활성화된 버튼의 배경색 */
  color: #fff;
  /* 활성화된 버튼의 텍스트 색상 */
}
</style>
