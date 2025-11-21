import { defineStore } from "pinia";
import { api } from "@/api/index.js";
import useAuthStore from "@/stores/useAuthStore.js"; // 수정된 부분

export const useSaleStore = defineStore("saleStore", {
  state: () => ({
    monthSales: [], // 월별 매출 데이터 저장
    saleDetails: [], // 특정 기간동안 매출 상세 정보
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchMonthSales(yearMonthData) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await api.SearchMonthSales(yearMonthData); // index.js에 있는 함수
        if (result !== 404) {
          this.monthSales = result;
        } else {
          this.error = "매출 데이터를 불러오지 못했습니다.";
        }
      } catch (e) {
        this.error = "서버 요청 중 오류 발생";
        console.error("fetchMonthSales 오류:", e);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSaleDetail(periodRange) {
      this.isLoading = true;
      this.error = null;

      try {
        const result = await api.SearchSaleDetail(periodRange);
        if (result !== 404) {
          this.saleDetail = result;
        } else {
          this.error = "상세 매출 데이터를 불러오지 못했습니다.";
        }
      } catch (error) {
        this.error = "서버 요청 중 오류 발생";
        console.error("fetchSaleDetail 오류:", error);
      } finally {
        this.isLoading = false;
      }
    },
  },
});
