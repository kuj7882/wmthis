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
  verify(data) {
    console.log("Verify data", data);
    return instance
      .post("/payments/verify", data)
      .then((res) => {
        console.log("verifyRes", res);
        return res.data.code === 200; // 성공 여부 반환
      })
      .catch((error) => {
        console.error("Error in verify:", error);
        return false; // 실패 시 false 반환
      });
  },

  signUp(data) {
    console.log("SignUp data", data);
    return instance
      .post("/user/signup", data)
      .then((res) => {
        console.log("signUpRes", res);
        return res.data.code === 200
          ? { success: true } // 성공 시 성공 정보를 반환
          : { success: false, message: res.data.message }; // 실패 시 실패 메시지 반환
      })
      .catch((error) => {
        console.error("Error in signUp:", error);
        return {
          success: false,
          message: error.response?.data?.message || "회원가입에 실패하였습니다.",
        }; // 기본 메시지 반환
      });
  },

  emailSend(data) {
    console.log("EmailSend data", data);
    return instance
      .post("/email/sendcode", { emailUrl: data })
      .then((res) => {
        console.log("emailSendRes", res);
        return res.data.code === 200; // 성공 여부 반환
      })
      .catch((error) => {
        console.error("Error in emailSend:", error);
        return false;
      });
  },

  emailSendifpwfind(data) {
    console.log("EmailSend data", data);
    return instance
      .post("/email/sendcodeifpwfind", { emailUrl: data })
      .then((res) => {
        console.log("emailSendRes", res);
        if (res.data.code === 200) {
          return true; // 성공
        } else if (res.data.code === 1016) {
          throw new Error("해당 이메일로 가입된 계정이 없습니다.");
        } else {
          throw new Error("알 수 없는 오류가 발생했습니다. 다시 시도해주세요.");
        }
      })
      .catch((error) => {
        console.error("Error in emailSend:", error);
        throw error; // 에러를 throw 해서 상위에서 처리할 수 있게 함
      });
  },

  emailAuth(code, emailUrl) {
    console.log("EmailAuth data", code, emailUrl);
    return instance
      .post("/email/authcode", { code, emailUrl })
      .then((res) => {
        console.log("emailAuthRes", res);
        return res.data.code === 200; // 성공 여부 반환
      })
      .catch((error) => {
        console.error("Error in emailAuth:", error);
        return false;
      });
  },

  phoneSend(data) {
    console.log("SMS Send data", data);
    return instance
      .post("/user/smssend", { phoneNum: data })
      .then((res) => {
        console.log("smsSendRes", res);
        return res.data; // 성공 여부 반환
      })
      .catch((error) => {
        console.error("Error in SMS Send:", error);
        return false;
      });
  },

  phoneAuth(code, phoneNum) {
    console.log("PhoneAuth data", code, phoneNum);
    return instance
      .post("/user/phoneverify", { code, phoneNum })
      .then((res) => {
        console.log("PhoneAuthRes", res);
        return res.data.code === 200; // 성공 여부 반환
      })
      .catch((error) => {
        console.error("Error in PhoneAuth:", error);
        return false;
      });
  },

  login(data) {
    console.log("Login data", data);
    return instance
      .post("/user/login", data)
      .then((res) => {
        console.log("LoginRes", res);
        return res.data;
      })
      .catch((error) => {
        console.error("Error in Login:", error);
        return res.response.data;
      });
  },

  isLogin() {
    return instance
      .get("/user/isLogin")
      .then((res) => {
        console.log("LoginRes");
        console.log("code:", res.data);
        return res.data;
      })
      .catch((error) => {
        return error.response.data;
      });
  },

  updatePassword(data) {
    console.log("Update password data", data);
    return instance
      .put("/user/updatepassword", data)
      .then((res) => {
        console.log("Update password Res", res);
        return res.data.code === 200; // 성공 여부 반환
      })
      .catch((error) => {
        console.error("Error in Update Password:", error);
        return false;
      });
  },

  registerStore(data) {
    console.log("Register store data", data);
    return instance
      .post("/store/register", data)
      .then((res) => {
        console.log("Store registration response:", res);
        return res.data;
      })
      .catch((error) => {
        console.error("Error in Store Registration:", error);
        throw error;
      });
  },

  registerInventory(storeInventoryData) {
    console.log("registerInventory storeInventoryData", storeInventoryData);
    return instance
      .post("/inventory/registerStoreInventory", storeInventoryData)
      .then((res) => {
        console.log("registerRes", res);
        console.log("code:", res.data.code);

        return res.data.code === 200 ? res.data.data : false; // 성공 시 데이터 반환
      })
      .catch((error) => {
        console.error("Error in registerInventory:", error);
        return false;
      });
  },
  updateInventory(storeInventoryData) {
    console.log("updateInventory storeInventoryData", storeInventoryData);

    try {
      const res = instance.put(`/inventory/storeInventory/${storeInventoryData.inventoryId}`, storeInventoryData);
      console.log("updateRes", res);
      console.log("code:", res.data.code);

      if (res.data.code === 200) {
        return res.data.data;
      } else {
        return 404;
      }
    } catch (error) {
      console.error("Error in updateInventory:", error);
      return 404;
    }
  },

  async SearchInventory(storeInventoryData) {
    try {
      const res = await instance.get(`/inventory/storeInventory/${storeInventoryData.inventoryId}`, storeInventoryData);
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
  async totalStoreInventory(storeInventoryData) {
    try {
      const response = await axios.post("/api/inventory", storeInventoryData); // API 요청 예시
      console.log("totalStoreInventoryRes", response);
      return response;
    } catch (error) {
      console.error("API 요청 실패", error);
      throw error;
    }
  },
  getMenuList() {
    return instance
      .get("/menu/list")
      .then((res) => {
        if (res.data.code !== 200) {
          return false;
        }
        return res.data.data;
      })
      .catch((error) => {
        console.error("Error in getMenuList: ", error);
        return false;
      });
  },
  registerMenu(data) {
    return instance
      .post("menu/register", data)
      .then((res) => {
        if (res.data.code !== 200) {
          return false;
        }
        return res.data.data;
      })
      .catch((error) => {
        console.error("Error in registerMenu:", error);
        return false;
      });
  },
  updateMenu(data) {
    return instance
      .post("menu/update", data)
      .then((res) => {
        if (res.data.code !== 200) {
          return false;
        }
        return res.data.data;
      })
      .catch((error) => {
        console.error("Error in updateMenu:", error);
        return false;
      });
  },

  getUserInfo() {
    return instance
      .get("user/searchinfo")
      .then((res) => {
        if (res.data.code !== 200) {
          return false;
        }
        return res.data;
      })
      .catch((error) => {
        console.error("Error in updateMenu:", error);
        return false;
      });
  },

  updateUserInfo(data) {
    console.log("Update user info data", data);
    return instance
      .put("/user/updateinfo", data)
      .then((res) => {
        console.log("Update user info response", res);
        return res.data; // 서버의 실제 데이터 반환
      })
      .catch((error) => {
        // 서버가 반환한 오류 메시지를 그대로 반환
        if (error.response && error.response.data) {
          return error.response.data; // 서버의 오류 메시지 반환
        }
      });
  },

  posOrder(data) {
    console.log("Sending order data:", data); // 데이터 전송 전에 콘솔 로그로 확인
    return instance
      .post("/order/create", data)
      .then((res) => {
        if (res.data.code !== 200) {
          throw new Error(res.data.message || "결제 처리 중 오류가 발생했습니다.");
        }
        return res.data; // 성공한 응답만 반환
      })
      .catch((error) => {
        const message = error?.response?.data?.message || error?.message || "결제 처리 중 오류가 발생했습니다."; // 서버 응답 메시지를 가져옴
        console.error(message); // 오류 메시지 출력
        throw new Error(message);
      });
  },

  getTodaySales() {
    return instance
      .get("order/todaySales")
      .then((res) => res.data)
      .catch((error) => {
        console.error("Error in TodaySales:", error);
        throw error;
      });
  },

  getBestTop3() {
    return instance
      .get("order/weekbestmenu")
      .then((res) => res.data)
      .catch((error) => {
        console.error("Error in Top3Menu(week):", error);
        throw error;
      });
  },

  getSalesData(data) {
    return instance
      .post("order/saleDetail", data)
      .then((res) => res.data)
      .catch((error) => {
        console.error("Error in SalesData:", error);
        throw error;
      });
  },

  getInventoryCall() {
    return instance
      .get("inventory/inventoryCall")
      .then((res) => res.data)
      .catch((error) => {
        console.error("Error in inventoryCall:", error);
        throw error;
      });
  },

  getOrdersList() {
    return instance
      .get("order/getList")
      .then((res) => res.data)
      .catch((error) => {
        console.error("Error in OrderListData:", error);
        throw error;
      });
  },

  getLogout() {
    return instance
      .post("user/logout")
      .then((res) => res.data)
      .catch((error) => {
        console.error("Error in Logout:", error);
        throw error;
      });
  },

  async SearchMonthSales(yearMonthData) {
    try {
      const res = await instance.post(`/order/monthSales`, yearMonthData);

      if (res.data.code === 200) {
        return res.data.data; // 데이터를 반환
      } else {
        return 404; // 오류 처리
      }
    } catch (error) {
      console.error("Error in searchMonthSales:", error);
      return 404; // 오류 처리
    }
  },

  async SearchSaleDetail(PeroidRange) {
    try {
      const res = await instance.post(`/order/saleDetail`, PeroidRange);

      if (res.data.code === 200) {
        return res.data.data; // 데이터를 반환
      } else {
        return 404; // 오류 처리
      }
    } catch (error) {
      console.error("Error in searchMonthSales:", error);
      return 404; // 오류 처리
    }
  },
  isRegistered() {
    return instance
      .get("/user/isRegistered")
      .then((res) => {
        if (res.data.code !== 200) {
          return false;
        }
        return;
      })
      .catch((error) => {
        console.error("Error in isRegistered:", error);
        return false;
      });
  },

  async SearchMenuList() {
    try {
      const res = await instance.get(`/menu/menuList`);

      if (res.data.code === 200) {
        return res.data.data; // 데이터를 반환
      } else {
        return 404; // 오류 처리
      }
    } catch (error) {
      console.error("Error in searchMonthSales:", error);
      return 404; // 오류 처리
    }
  },

  async SearchMenuSale(PeroidRange) {
    try {
      const res = await instance.post(`/menu/menuSale`, PeroidRange);

      if (res.data.code === 200) {
        return res.data.data; // 데이터를 반환
      } else {
        return 404; // 오류 처리
      }
    } catch (error) {
      console.error("Error in searchMonthSales:", error);
      return 404; // 오류 처리
    }
  },

  async SearchStockList() {
    try {
      const res = await instance.get(`/inventory/inventoryList`);

      if (res.data.code === 200) {
        return res.data.data; // 데이터를 반환
      } else {
        return 404; // 오류 처리
      }
    } catch (error) {
      console.error("Error in searchMonthSales:", error);
      return 404; // 오류 처리
    }
  },

  async SearchInventoryUpdate(PeroidRange) {
    try {
      const res = await instance.post(`/inventory/updateSolo`, PeroidRange);

      if (res.data.code === 200) {
        return res.data.data; // 데이터를 반환
      } else {
        return 404; // 오류 처리
      }
    } catch (error) {
      console.error("Error in searchMonthSales:", error);
      return 404; // 오류 처리
    }
  },

  async getBestMarket() {
    try {
      const res = await instance.get(`/inventory/marketAmount`);

      if (res.data.code === 200) {
        return res.data.data; // 데이터를 반환
      } else {
        return 404; // 오류 처리
      }
    } catch (error) {
      console.error("Error in searchMonthSales:", error);
      return 404; // 오류 처리
    }
  },

  async getOneTotalInventory() {
    try {
      const res = await instance.get(`/inventory/totalInventory`);

      if (res.data.code === 200) {
        return res.data.data; // 데이터를 반환
      } else {
        return 404; // 오류 처리
      }
    } catch (error) {
      console.error("Error in searchMonthSales:", error);
      return 404; // 오류 처리
    }
  },

  async getStockChange() {
    try {
      const res = await instance.get(`/inventory/inventoryAmount`);

      if (res.data.code === 200) {
        return res.data.data; // 데이터를 반환
      } else {
        return 404; // 오류 처리
      }
    } catch (error) {
      console.error("Error in searchMonthSales:", error);
      return 404; // 오류 처리
    }
  },

  async SearchMenuMarket(PeroidRange) {
    try {
      const res = await instance.post(`/inventory/menuMarket`, PeroidRange);

      if (res.data.code === 200) {
        return res.data.data; // 데이터를 반환
      } else {
        return 404; // 오류 처리
      }
    } catch (error) {
      console.error("Error in searchMonthSales:", error);
      return 404; // 오류 처리
    }
  },
};
