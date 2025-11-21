<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue"

const props = defineProps({
    salesData: {
        type: Object,
        default: () => ({}),
    },
    selectedDate: {
        type: Object,
        default: null,
    },
    selectedCategory: {
        type: String,
        default: "all",
    },
    selectedPeriod: {
        type: [String, Object],
        required: true,
    },
    // 새로 추가된 props
    chartData: {
        type: Array,
        default: () => [],
    },
    dateRangeType: {
        type: String,
        default: 'hour',
    },
    isLoading: {
        type: Boolean,
        default: false,
    }
})

// 차트 시리즈 데이터 계산
// 차트 시리즈 데이터 계산 수정
const chartSeries = computed(() => {
    if (!props.chartData || props.chartData.length === 0) return [
        { name: "홀", data: [] },
        { name: "배민", data: [] },
        { name: "쿠팡", data: [] },
        { name: "요기요", data: [] }
    ];

    // 모든 x축 카테고리에 대해 초기값 0으로 설정
    const categories = xAxisCategories.value;
    const hallData = new Array(categories.length).fill(0);
    const baeminData = new Array(categories.length).fill(0);
    const coupangData = new Array(categories.length).fill(0);
    const yogiyoData = new Array(categories.length).fill(0);

    props.chartData.forEach(item => {
        let index = -1;

        if (props.dateRangeType === 'hour') {
            // 시간별 데이터
            const hour = item.createdAt.split(' ')[1].substring(0, 2);
            index = categories.findIndex(cat => cat === `${hour}시`);
        } else if (props.dateRangeType === 'day') {
            // 일별 데이터
            const day = item.createdAt.split(' ')[0].split('-')[2];
            index = categories.findIndex(cat => cat === `${parseInt(day)}일`);
        } else {
            // 월별 데이터
            const month = item.createdAt.split(' ')[0].split('-')[1];
            index = categories.findIndex(cat => cat === `${parseInt(month)}월`);
        }

        if (index !== -1) {
            if (item.orderType === "hall") {
                hallData[index] += item.totalPrice;
            } else if (item.orderType === "baemin") {
                baeminData[index] += item.totalPrice;
            } else if (item.orderType === "coupang") {
                coupangData[index] += item.totalPrice;
            } else if (item.orderType === "yogiyo") {
                yogiyoData[index] += item.totalPrice;
            }
        }
    });

    return [
        { name: "홀", data: hallData },
        { name: "배민", data: baeminData },
        { name: "쿠팡", data: coupangData },
        { name: "요기요", data: yogiyoData }
    ];
})

// X축 카테고리 계산
const xAxisCategories = computed(() => {
    if (props.dateRangeType === 'hour') {
        // 시간별 표시 (0~23시)
        return Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}시`);
    } else if (props.dateRangeType === 'day') {
        // 일별 표시 - 데이터에서 고유한 날짜 추출
        const dateMap = {};

        if (props.chartData && props.chartData.length > 0) {
            props.chartData.forEach(item => {
                const date = item.createdAt.split(' ')[0].split('-')[2]; // "YYYY-MM-DD" 형식에서 "DD" 추출
                dateMap[date] = true;
            });
        }

        // 날짜가 없으면 현재 월의 모든 날짜 표시
        if (Object.keys(dateMap).length === 0) {
            const today = new Date();
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            for (let i = 1; i <= lastDay; i++) {
                dateMap[String(i).padStart(2, '0')] = true;
            }
        }

        const dates = Object.keys(dateMap).sort((a, b) => parseInt(a) - parseInt(b));
        return dates.map(date => `${parseInt(date)}일`);
    } else {
        // 월별 표시
        const monthMap = {};

        if (props.chartData && props.chartData.length > 0) {
            props.chartData.forEach(item => {
                const month = item.createdAt.split(' ')[0].split('-')[1]; // "YYYY-MM-DD" 형식에서 "MM" 추출
                monthMap[month] = true;
            });
        }

        // 월 데이터가 없으면 1~12월 표시
        if (Object.keys(monthMap).length === 0) {
            for (let i = 1; i <= 12; i++) {
                monthMap[String(i).padStart(2, '0')] = true;
            }
        }

        const months = Object.keys(monthMap).sort((a, b) => parseInt(a) - parseInt(b));
        return months.map(month => `${parseInt(month)}월`);
    }
})

const chartOptions = computed(() => ({
    chart: {
        type: "bar",
        stacked: true,
        toolbar: {
            show: false,
            tools: {
                download: false,
                selection: false,
                zoom: false,
                zoomin: false,
                zoomout: false,
                pan: false,
                reset: false
            }
        },
        animations: {
            enabled: false
        }
    },
    plotOptions: {
        bar: {
            horizontal: false,
            columnWidth: "60%",
            dataLabels: {
                enabled: false, // 데이터 라벨 비활성화
            },
        },
    },
    dataLabels: {
        enabled: false,
        formatter: function (val) {
            if (val === 0) return '0';
            return val >= 1000 ? Math.floor(val).toLocaleString() : val;
        },
        offsetY: -20,
        style: {
            fontSize: '10px',
            colors: ["#304758"]
        }
    },
    xaxis: {
        categories: xAxisCategories.value,
        title: {
            text: props.dateRangeType === 'hour' ? '시간' :
                props.dateRangeType === 'day' ? '일자' : '월',
        },
        tickPlacement: 'on',
        labels: {
            rotate: 0,
            trim: false,
            hideOverlappingLabels: false,
            style: {
                fontSize: '7px',
                fontWeight: 300,
                colors: '#333333'
            }
        }
    },
    yaxis: {
        title: {
            text: '매출액 (원)'
        },
        labels: {
            formatter: (val) => {
                // 백원 단위로 반올림 (예: 1,250원 -> 1,300원)
                const roundedValue = Math.round(val / 100) * 100;
                const formattedValue = roundedValue.toLocaleString();
                return `${formattedValue} 원`;
            },
        },
        min: 0,
        max: function (max) {
            return max + max * 0.1;
        }
    },
    tooltip: {
        y: {
            formatter: (val) => {
                // 툴팁에도 백원 단위로 반올림 표시
                const roundedValue = Math.round(val / 100) * 100;
                const formattedValue = roundedValue.toLocaleString();
                return `${formattedValue} 원`;
            },
        },
        intersect: false,
        shared: true
    },
    legend: {
        position: "top",
    },
    colors: ["#FFD666", "#87E8DE", "#FF9C6E", "#B37FEB"],
    noData: {
        text: '데이터가 없습니다',
        align: 'center',
        verticalAlign: 'middle',
        offsetX: 0,
        offsetY: 0,
        style: {
            color: '#999',
            fontSize: '14px',
            fontFamily: 'sans-serif'
        }
    },
    stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
    },
    markers: {
        size: 4,
        colors: ["#FFD666", "#87E8DE", "#FF9C6E", "#B37FEB"],
        strokeColors: "#fff",
        strokeWidth: 2,
        hover: {
            size: 6
        }
    },
    states: {
        hover: {
            filter: {
                type: 'none'
            }
        },
        active: {
            filter: {
                type: 'none'
            }
        }
    }
}))


// 차트 렌더링 관련 상태
const chartKey = ref(0);
const chartReady = ref(false);

// 차트 데이터가 변경될 때마다 차트 다시 렌더링
watch(() => props.chartData, async () => {
    chartReady.value = false;
    chartKey.value++; // 차트 컴포넌트 강제 재렌더링
    await nextTick();
    chartReady.value = true;
}, { deep: true });

// 날짜 범위 타입이 변경될 때도 차트 다시 렌더링
watch(() => props.dateRangeType, async () => {
    chartReady.value = false;
    chartKey.value++; // 차트 컴포넌트 강제 재렌더링
    await nextTick();
    chartReady.value = true;
});

// 날짜를 문자열로 변환하는 헬퍼 함수
const formatDateToString = (date) => {
    if (!date) return ""
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

const filteredSalesData = computed(() => {
    if (!props.salesData || !props.selectedDate) return []

    const salesData = props.salesData

    // 커스텀 날짜 범위 선택 처리
    if (props.selectedPeriod?.type === "custom" && props.selectedPeriod.start && props.selectedPeriod.end) {
        const start = new Date(props.selectedPeriod.start)
        const end = new Date(props.selectedPeriod.end)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)

        const result = []
        const date = new Date(start)

        while (date <= end) {
            const dateStr = formatDateToString(date)
            if (salesData[dateStr]) {
                result.push(...salesData[dateStr])
            }
            date.setDate(date.getDate() + 1)
        }

        return result
    }

    // 특정 기간 선택 처리
    if (typeof props.selectedPeriod === "string") {
        if (props.selectedPeriod === "today") {
            const today = formatDateToString(new Date())
            return salesData[today] || []
        }

        if (props.selectedPeriod === "yesterday") {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayStr = formatDateToString(yesterday)
            return salesData[yesterdayStr] || []
        }

        if (props.selectedPeriod === "week") {
            const today = new Date()
            const currentDay = today.getDay() // 0(일) ~ 6(토)
            const startOfWeek = new Date(today)
            startOfWeek.setDate(today.getDate() - currentDay)

            let weekData = []
            for (let i = 0; i < 7; i++) {
                const date = new Date(startOfWeek)
                date.setDate(startOfWeek.getDate() + i)
                const dateStr = formatDateToString(date)
                if (salesData[dateStr]) {
                    weekData = [...weekData, ...salesData[dateStr]]
                }
            }
            return weekData
        }

        if (props.selectedPeriod === "month") {
            const today = new Date()
            const year = today.getFullYear()
            const month = today.getMonth()
            const lastDay = new Date(year, month + 1, 0).getDate()

            let monthData = []
            for (let i = 1; i <= lastDay; i++) {
                const date = new Date(year, month, i)
                const dateStr = formatDateToString(date)
                if (salesData[dateStr]) {
                    monthData = [...monthData, ...salesData[dateStr]]
                }
            }
            return monthData
        }
    }

    // 기본: 선택된 날짜의 데이터 반환 (단일 날짜 선택)
    const dateStr = formatDateToString(props.selectedDate)
    return salesData[dateStr] || []
})

// 현재 표시되는 데이터 수정
const currentDateData = computed(() => {
    return filteredSalesData.value
})

// 표시되는 날짜 텍스트 수정
const formattedDate = computed(() => {
    if (!props.selectedDate) return ""

    const selectedDate = new Date(props.selectedDate)
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth() + 1
    const date = selectedDate.getDate()

    if (props.selectedPeriod === "today") {
        const today = new Date()
        return `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (오늘)`
    } else if (props.selectedPeriod === "yesterday") {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        return `${yesterday.getFullYear()}년 ${yesterday.getMonth() + 1}월 ${yesterday.getDate()}일 (어제)`
    } else if (props.selectedPeriod === "week") {
        const today = new Date()
        const currentDay = today.getDay()
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - currentDay)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)

        const startMonth = startOfWeek.getMonth() + 1
        const startDate = startOfWeek.getDate()
        const endMonth = endOfWeek.getMonth() + 1
        const endDate = endOfWeek.getDate()
        const year = startOfWeek.getFullYear()

        return `${year}년 ${startMonth}월 ${startDate}일 ~ ${endMonth}월 ${endDate}일 (이번주)`
    } else if (props.selectedPeriod === "month") {
        const today = new Date()
        const year = today.getFullYear()
        const month = today.getMonth() + 1
        const lastDay = new Date(year, month, 0).getDate()
        return `${year}년 ${month}월 1일 ~ ${month}월 ${lastDay}일 (이번달)`
    } else if (props.selectedPeriod?.type === "custom" && props.selectedPeriod.start && props.selectedPeriod.end) {
        const start = new Date(props.selectedPeriod.start)
        const end = new Date(props.selectedPeriod.end)

        const startStr = `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일`
        const endStr = `${end.getFullYear()}년 ${end.getMonth() + 1}월 ${end.getDate()}일`

        return `${startStr} ~ ${endStr} (사용자 선택 기간)`
    }

    return `${year}년 ${month}월 ${date}일`
})

const dateString = computed(() => {
    if (!props.selectedDate) return ""

    const year = props.selectedDate.getFullYear()
    const month = String(props.selectedDate.getMonth() + 1).padStart(2, "0")
    const date = String(props.selectedDate.getDate()).padStart(2, "0")

    return `${year}-${month}-${date}`
})

const totalOrders = computed(() => {
    return currentDateData.value.length
})

const totalSales = computed(() => {
    return currentDateData.value.reduce((sum, item) => sum + item.amount, 0)
})

const deliveryTotal = computed(() => {
    return categorySales.value.baemin + categorySales.value.coupang + categorySales.value.yogiyo
})

const categorySales = computed(() => {
    const result = {
        hall: 0,
        baemin: 0,
        coupang: 0,
        yogiyo: 0,
    }

    currentDateData.value.forEach((item) => {
        if (result[item.type] !== undefined) {
            result[item.type] += item.amount
        }
    })

    return result
})

const categoryOrderCount = computed(() => {
    const result = {
        hall: 0,
        baemin: 0,
        coupang: 0,
        yogiyo: 0,
    }

    currentDateData.value.forEach((item) => {
        if (result[item.type] !== undefined) {
            result[item.type] += 1
        }
    })

    return result
})

// 배달 주문 건수 계산
const deliveryOrderCount = computed(() => {
    return categoryOrderCount.value.baemin + categoryOrderCount.value.coupang + categoryOrderCount.value.yogiyo
})

const formatCurrency = (amount) => {
    return amount.toLocaleString() + "원"
}

// 컴포넌트 마운트 후 차트 준비
onMounted(() => {
    nextTick(() => {
        chartReady.value = true;
    });
});
</script>

<template>
    <div class="sales-detail">
        <div v-if="props.selectedDate" class="date-info">
            <h2>{{ formattedDate }} 매출 정보</h2>

            <div class="summary-cards">
                <div class="total-summary">
                    <p>총 매출</p><span>{{ formatCurrency(totalSales) }}</span>
                </div>

                <div class="total-summary">
                    <p>주문건수</p><span>{{ totalOrders }}건</span>
                </div>
                <hr>
                <div>
                    <div class="delivery-summary-title">
                        <p>홀</p><span>{{ formatCurrency(categorySales.hall) }} ({{ categoryOrderCount.hall }}건)</span>
                    </div>
                    <div class="delivery-summary-title">
                        <p>배달</p> <span>총 {{ formatCurrency(deliveryTotal) }} ({{ deliveryOrderCount }}건)</span>
                    </div>

                    <hr>
                    <div class="delivery-summary">
                        <p>배민</p><span>{{ formatCurrency(categorySales.baemin) }} ({{ categoryOrderCount.baemin
                        }}건)</span>
                    </div>
                    <div class="delivery-summary">
                        <p>쿠팡</p><span>{{ formatCurrency(categorySales.coupang) }} ({{ categoryOrderCount.coupang
                        }}건)</span>
                    </div>
                    <div class="delivery-summary">
                        <p>요기요</p><span>{{ formatCurrency(categorySales.yogiyo) }} ({{ categoryOrderCount.yogiyo
                        }}건)</span>
                    </div>
                </div>
            </div>

            <div class="sales-detail" v-if="selectedDate">
                <div class="date-info">
                    <div class="chart-container">
                        <div class="chart-header">
                            <div class="chart-title">
                                {{ dateRangeType === 'hour' ? '시간대별 매출' :
                                    dateRangeType === 'day' ? '일별 매출' : '월별 매출' }}
                            </div>
                        </div>

                        <div v-if="isLoading" class="loading-indicator">
                            데이터를 불러오는 중...
                        </div>

                        <div v-else-if="chartData && chartData.length > 0 && chartReady">
                            <apexchart :key="chartKey" type="bar" height="350" :options="chartOptions"
                                :series="chartSeries" />
                        </div>
                        <div v-else class="no-data-message">
                            데이터가 없습니다
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="no-data">
            <p>날짜를 선택하여 매출 정보를 확인하세요.</p>
        </div>
    </div>
</template>

<style scoped>
.sales-detail {
    height: 100%;
}

.date-info {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.date-info h2 {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 15px;
    color: #333;
}

.summary-cards {
    gap: 10px;
    border: #B0B0B0 solid 1px;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 30px;
}

.summary-cards hr {
    margin-bottom: 15px;
}

.total-summary {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 16px;
}

.total-summary span {
    font-weight: bold;
}

.delivery-summary {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-size: 16px;
}

.delivery-summary-title {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-size: 16px;
}

.delivery-summary-title p {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-size: 20px;
    font-weight: bold;
}

.chart-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 15px;
    padding-bottom: 50px;
    position: relative;
    min-height: 350px;
}

.chart-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
}

.chart-title {
    margin-top: 10px;
    font-size: 16px;
    font-weight: bold;
}

.loading-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 350px;
    color: #666;
}

.no-data-message {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 350px;
    color: #999;
    font-size: 14px;
}

.no-data {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: #999;
}

@media (max-width: 768px) {
    .summary-cards {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>