import { defineStore } from "pinia";
import { api } from "@/api/MenuApi.js";

export const useMenuStore = defineStore("menu", {
  state: () => ({
    categories: [], // 카테고리 배열
    inventoryOptions: [], // 재고 옵션 배열
    optionList: [], // 옵션 목록
    loadingCategories: false,
    loadingInventory: false,
    loadingOptions: false,
    error: null,
  }),
  actions: {
    async loadCategories() {
      this.loadingCategories = true;
      this.error = null;
      try {
        const result = await api.getCategoryList();
        if (result) {
          this.categories = [
            ...result.content,
            { id: null, name: "카테고리 없음" },
          ];
        }
      } catch (e) {
        console.error("카테고리 로딩 실패", e);
        this.error = "카테고리 로딩 실패";
      } finally {
        this.loadingCategories = false;
      }
    },

    async loadInventoryOptions() {
      this.loadingInventory = true;
      this.error = null;
      try {
        const result = await api.getStoreInventoryList();
        if (result) {
          this.inventoryOptions = result.map((item) => ({
            id: item.id,
            name: item.name,
            unit: item.unit,
          }));
        }
        console.log("재고 목록 store:", this.inventoryOptions);
      } catch (e) {
        console.error("재고 목록 로딩 실패", e);
        this.error = "재고 목록 로딩 실패";
      } finally {
        this.loadingInventory = false;
      }
    },

    async loadOptionList() {
      this.loadingOptions = true;
      this.error = null;
      try {
        const result = await api.getOptionList();
        if (result) {
          console.log("옵션 목록:", result);
          this.optionList = result.content;
        }
      } catch (e) {
        console.error("옵션 목록 로딩 실패", e);
        this.error = "옵션 목록 로딩 실패";
      } finally {
        this.loadingOptions = false;
      }
    },

    async initialize() {
      this.error = null;
      await Promise.all([this.loadCategories(), this.loadInventoryOptions()]);
    },
    async initializeOptions() {
      this.error = null;
      await Promise.all([this.loadOptionList()]);
    },
  },
});
