import axios from "axios";
import routes from "@/router";

const instance = axios.create({
  baseURL: "/api", // 백엔드 API 주소로 변경
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // 필요 시 (ex: 쿠키 인증)
});

let redirecting = false;
instance.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const errorCode = err.response?.headers["error-code"];
    console.log("errorCode", errorCode);
    if (errorCode === "NO_STORE_ID") {
      routes.push({ name: "storeRegister" });
    } else if (status === 401 || status === 403) {
      routes.push({ name: "login" });
    }
    return Promise.reject(err);
  }
);

export const api = {
  registerCategory(data) {
    console.log("registerCategory data", data);
    return instance
      .post("/category/register", data)
      .then((res) => {
        console.log("registerRes", res);
        console.log("code:", res.data.code);

        if (res.data.code !== 200) {
          return {
            success: false,
            message: res.data.message || "카테고리 등록 실패",
          };
        }
        return { success: true };
      })
      .catch((error) => {
        console.error("Error in registerCategory:", error);
        const message =
          error.response?.data?.message || "서버 오류가 발생했습니다.";
        return { success: false, message };
      });
  },

  getCategoryList(page = 0, size = 10, keyword = "") {
    console.log("getCategoryList");

    let url = `/category/getList?page=${page}&size=${size}`;
    if (keyword && keyword.trim() !== "") {
      url += `&keyword=${encodeURIComponent(keyword)}`;
    }

    return instance
      .get(url)
      .then((res) => {
        console.log("registerRes", res);
        console.log("code:", res.data.code);
        if (res.data.code !== 200) {
          return false; // 실패 시 false 반환
        }
        return res.data.data; // 성공 시 데이터 반환
      })
      .catch((error) => {
        console.error("Error in getCategoryList:", error);
        return false;
      });
  },
  deleteCategory(data) {
    return instance.delete("/category/delete", {
      data: data,
    });
  },
  getCategory(data) {
    return instance.get("/category/detail", {
      params: data,
    });
  },

  getPOSCategory(categoryId) {
    return instance
      .get("/category/detail", {
        params: { id: categoryId }, // categoryId를 params로 전달
      })
      .then((res) => res.data)
      .catch((error) => {
        console.error("Error in getPOSCategory:", error);
        throw error;
      });
  },

  registerOption(data) {
    console.log("registerOption data", data);
    return instance
      .post("/option/register", data)
      .then((res) => {
        if (res.data.code !== 200) {
          return {
            success: false,
            message: res.data.message || "옵션 등록 실패",
          };
        }
        return { success: true };
      })
      .catch((error) => {
        console.error("Error in registerOption:", error);
        return {
          success: false,
          message: error.response?.data?.message || "옵션 등록 중 오류 발생",
        };
      });
  },

  getOptionList(page = 0, size = 10, keyword = "") {
    let url = `/option/list?page=${page}&size=${size}`;
    if (keyword && keyword.trim() !== "") {
      url += `&keyword=${encodeURIComponent(keyword)}`;
    }
    return instance
      .get(url)
      .then((res) => {
        if (res.data.code !== 200) {
          return false;
        }
        return res.data.data;
      })
      .catch((error) => {
        console.error("Error in getOptionList:", error);
        return false;
      });
  },
  deleteOptions(optionIdList) {
    return instance
      .post("/option/delete/batch", optionIdList)
      .then((res) => {
        console.log("deleteOptions res", res);
        return res.data.code === 200;
      })
      .catch((error) => {
        console.error("Error in deleteOptions:", error);
        return false;
      });
  },

  updateCategory(requestData) {
    return instance
      .put("/category/update", requestData)
      .then((res) => {
        if (res.data.code !== 200) {
          return {
            success: false,
            message: res.data.message || "카테고리 수정 실패",
          };
        }
        return { success: true, data: res.data.data };
      })
      .catch((error) => {
        console.error("Error in updateOption:", error);
        const message =
          error.response?.data?.message || "서버 오류가 발생했습니다.";
        return { success: false, message };
      });
  },

  updateOption(requestData) {
    return instance
      .put("/option", requestData)
      .then((res) => {
        if (res.data.code !== 200) {
          return {
            success: false,
            message: res.data.message || "옵션 수정 실패",
          };
        }
        return { success: true, data: res.data.data };
      })
      .catch((error) => {
        console.error("Error in updateOption:", error);
        const message =
          error.response?.data?.message || "서버 오류가 발생했습니다.";
        return { success: false, message };
      });
  },

  getOptionById(optionId) {
    return instance
      .get(`/option/${optionId}`)
      .then((res) => {
        console.log("getOptionById res", res);
        if (res.data.code !== 200) {
          return false;
        }
        return res.data.data;
      })
      .catch((error) => {
        console.error("Error in getOptionById:", error);
        return false;
      });
  },
  getMenuList(page = 0, size = 5, keyword = "") {
    console.log("메뉴목록 요청", page, "size", size);

    let url = `/menu/getList?page=${page}&size=${size}`;
    if (keyword && keyword.trim() !== "") {
      url += `&keyword=${encodeURIComponent(keyword)}`;
    }
    return instance
      .get(url)
      .then((res) => {
        console.log("getMenuList res", res);
        return res.data;
      })
      .catch((error) => {
        return error.response.data;
      });
  },
  getPOSMenuList() {
    return instance
      .get("/menu/getPOSList")
      .then((res) => {
        console.log("getMenuList res", res);
        return res.data;
      })
      .catch((error) => {
        console.error("Error in getMenuList: ", error);
        return false;
      });
  },

  getPOSCategoryList() {
    return instance
      .get("/category/getPOSCategoryList")
      .then((res) => {
        console.log("getPOSCategoryList res", res);
        return res.data;
      })
      .catch((error) => {
        console.error("Error in getPOSCategoryList: ", error);
        return false;
      });
  },

  registerStoreInventory(storeInventoryData) {
    console.log("registerInventory storeInventoryData", storeInventoryData);
    return instance
      .post("/inventory/registerStoreInventory", storeInventoryData)
      .then((res) => {
        console.log("registerRes", res);
        console.log("code:", res.data.code);

        return res.data;
      })
      .catch((error) => {
        console.error("Error in registerInventory:", error);
        return error.response.data;
      });
  },
  updateStoreInventory(storeInventoryData) {
    return instance
      .put("/inventory/storeInventory", storeInventoryData)
      .then((res) => {
        console.log("updateRes", res);
        console.log("code:", res.data.code);

        return res.data;
      })
      .catch((error) => {
        return error.response.data;
      });
  },
  getInvenList() {
    return instance
      .get("/inventory/inventoryList")
      .then((res) => {
        console.log("getInvenList res", res);
        return res.data;
      })
      .catch((error) => {
        console.error("Error in getInvenList: ", error);
        return false;
      });
  },
  getPartiInvenList(storeInventoryId) {
    return instance
      .get(`/inventory/totalInventory/${storeInventoryId}`, {
        withCredentials: true, // 꼭 넣어야 쿠키 전송됨
      })
      .then((res) => {
        console.log("getPartiInvenList res", res);
        return res;
      })
      .catch((error) => {
        console.error("Error in getPartiInvenList: ", error);
        return false;
      });
  },

  async SearchInventory(storeInventoryData) {
    try {
      const res = await instance.get(
        `/inventory/storeInventory/${storeInventoryData.inventoryId}`,
        storeInventoryData
      );
      console.log("searchRes", res);
      console.log("code:", res.data.code);

      if (res.data.code === 200) {
        return res.data.data; // 데이터를 반환
      } else {
        return 404; // 오류 처리
      }
    } catch (error) {
      console.error("Error in searchInventory:", error);
      return 404; // 오류 처리
    }
  },

  totalStoreInventory(storeInventoryData) {
    return instance
      .post("/inventory/totalInventory", storeInventoryData)
      .then((res) => {
        return res.data.code === 200 ? res.data.data : false;
      })
      .catch((error) => {
        console.error("Error in totalInventory:", error);
        return false;
      });
  },
  getMenuDetail(menuId) {
    console.log("getMenuDetail menuId", menuId);
    return instance
      .get(`/menu/${menuId}`)
      .then((res) => {
        console.log("getMenuDetail res", res);
        if (res.data.code !== 200) return false;
        return res.data.data;
      })
      .catch((err) => {
        console.error(err);
        return null;
      });
  },

  registerMenu(data) {
    return instance
      .post("/menu/register", data)
      .then((res) => {
        if (res.data.code !== 200) {
          return {
            success: false,
            message: res.data.message || "메뉴 등록 실패",
          };
        }
        return { success: true, data: res.data.data };
      })
      .catch((error) => {
        console.error("Error in registerMenu:", error);

        const message =
          error.response?.data?.message || "서버 오류가 발생했습니다.";

        return { success: false, message };
      });
  },

  updateMenu(data) {
    return instance
      .put("/menu/update", data)
      .then((res) => {
        if (res.data.code !== 200) {
          return {
            success: false,
            message: res.data.message || "메뉴 수정 실패",
          };
        }
        return { success: true, data: res.data.data };
      })
      .catch((error) => {
        console.error("Error in updateMenu:", error);
        const message =
          error.response?.data?.message || "서버 오류가 발생했습니다.";
        return { success: false, message };
      });
  },

  getStoreInventoryList(page = 0, size = 10, keyword = "") {
    return instance
      .get("/inventory/storeInventory/getList", {
        params: { page, size, keyword },
      })
      .then((res) => {
        console.log("getStoreInventoryList res", res);
        if (res.data.code !== 200) return false;
        return res.data.data.content;
      })
      .catch((error) => {
        console.error("Error in getStoreInventoryList: ", error);
        return false;
      });
  },
  getStoreInventoryPageList(page = 0, size = 10, keyword = "") {
    return instance
      .get("/inventory/storeInventory/getList", {
        params: { page, size, keyword },
      })
      .then((res) => {
        console.log("getStoreInventoryList res", res);
        if (res.data.code !== 200) return false;
        return res.data;
      })
      .catch((error) => {
        console.error("Error in getStoreInventoryList: ", error);
        return false;
      });
  },

  deleteMenus(menuIdList) {
    return instance
      .delete("/menu", {
        data: menuIdList,
      })
      .then((res) => {
        console.log("deleteMenus res", res);
        return res.data.code === 200;
      })
      .catch((error) => {
        console.error("Error in deleteMenus:", error);
        return false;
      });
  },
  getRecipes(inventoryId) {
    const payload =
      typeof inventoryId === "object"
        ? inventoryId
        : { inventoryId: inventoryId };

    return instance
      .post("/inventory/getRecipes", payload)
      .then((res) => {
        if (res.data.code !== 200) return { menuItems: [] };
        return res.data.data;
      })
      .catch((error) => {
        console.error("Error in getRecipes: ", error);
        return { menuItems: [] };
      });
  },

  checkStockAvailability(data) {
    return instance
      .post("/order/validateOrder", data)
      .then((res) => {
        return res.data; // 그냥 res.data 통째로 반환 (code, message, data 모두)
      })
      .catch((error) => {
        console.error("Error in checkStockAvailability:", error);
        return {
          code: 500,
          message: "서버 오류가 발생했습니다.",
          data: null,
        };
      });
  },

  deleteStoreInventorys(storeInventoryIdList) {
    return instance
      .delete("/inventory/storeInventory", {
        data: storeInventoryIdList,
      })
      .then((res) => {
        console.log("deleteStoreInventorys res", res);
        return res.data;
      })
      .catch((error) => {
        console.error("Error in deleteStoreInventorys:", error);
        return error.response.data;
      });
  },
  registerInventory(data) {
    return instance
      .post("/inventory/registerInventory", data)
      .then((res) => {
        console.log("registerInventory res", res);
        return res.data;
      })
      .catch((error) => {
        console.error("Error in registerInventory:", error);
        return error.response.data;
      });
  },
  getInventory(inventoryId) {
    return instance
      .get(`/inventory/DetailInventory/${inventoryId}`)
      .then((res) => {
        console.log("getInventory res", res);

        return res.data;
      })
      .catch((error) => {
        console.error("Error in getInventory:", error);
        return error.response.data;
      });
  },
  updateInventory(data) {
    return instance
      .put("/inventory/inventory", data)
      .then((res) => {
        console.log("updateInventory res", res);
        return res.data;
      })
      .catch((error) => {
        console.error("Error in updateInventory:", error);
        return error.response.data;
      });
  },
  deleteListInventory(data) {
    return instance
      .delete("/inventory/inventory", { data })
      .then((res) => {
        console.log("deleteListInventory res", res);
        return res.data;
      })
      .catch((error) => {
        console.error("Error in deleteListInventory:", error);
        return error.response.data;
      });
  },
};
