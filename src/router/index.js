import { createRouter, createWebHistory } from "vue-router";
import { api } from "@/api";

const routes = createRouter({
  history: createWebHistory(),
  routes: [
    // AccountMain 관련 라우트
    {
      path: "/account",
      component: () => import("@/components/AccountMain.vue"),
      children: [
        {
          path: "login",
          component: () => import("@/components/account_management/Login.vue"),
          name: "login",
        },
        {
          path: "signup1",
          component: () =>
            import("@/components/account_management/SignUpStep1.vue"),
          name: "signup1",
        },
        {
          path: "signup2",
          component: () =>
            import("@/components/account_management/SignUpStep2.vue"),
          name: "signup2",
        },
        {
          path: "sdone",
          component: () =>
            import("@/components/account_management/SignUpDone.vue"),
          name: "signupDone",
        },
        {
          path: "register",
          component: () =>
            import("@/components/account_management/StoreRegister.vue"),
          name: "storeRegister",
        },
        {
          path: "rdone",
          component: () =>
            import("@/components/account_management/StoreRegisterDone.vue"),
          name: "storedone",
        },
        {
          path: "findpwd1",
          component: () =>
            import("@/components/account_management/FindPwdStep1.vue"),
          name: "findpwd1",
        },
        {
          path: "findpwd2",
          component: () =>
            import("@/components/account_management/FindPwdStep2.vue"),
          name: "findpwd2",
        },
      ],
    },
    // UserMain 관련 라우트
    {
      path: "/",
      component: () => import("@/components/UserMain.vue"),
      children: [
        {
          path: "",
          component: () =>
            import("@/components/sales_management/SalesStatus.vue"),
          name: "dashboard",
        },
        {
          path: "menu",
          component: () =>
            import("@/components/menu_management/menu/MyMenu.vue"),
          name: "MenuMain",
        },
        {
          path: "category",
          component: () =>
            import("@/components/menu_management/category/MyCategory.vue"),
          name: "MenuCategory",
        },
        {
          path: "option",
          component: () =>
            import("@/components/menu_management/option/MyOption.vue"),
          name: "MenuOption",
        },
        {
          path: "menuAnalysis",
          component: () =>
            import("@/components/sales_management/MenuAnalysis.vue"),
          name: "MenuAnalysis",
        },
        {
          path: "inventoryAnalysis",
          component: () =>
            import("@/components/sales_management/StockAnalysis.vue"),
          name: "InventoryAnalysis",
        },
        {
          path: "salesAnalysis",
          component: () =>
            import("@/components/sales_management/SalesAnalysis.vue"),
          name: "SalesAnalysis",
        },
        {
          path: "inventory",
          component: () =>
            import("@/components/inventory_management/Inventory.vue"),
          name: "InventoryMain",
        },
        {
          path: "inventoryregi",
          component: () =>
            import("@/components/inventory_management/InventoryManagement.vue"),
          name: "InventoryRegister",
        },
        {
          path: "map",
          component: () => import("@/components/market_management/MyMap.vue"),
          name: "CommunityMap",
        },
        {
          path: "list",
          component: () =>
            import("@/components/market_management/MarketPostList.vue"),
          name: "CommunityList",
        },
        {
          path: "transactions",
          component: () =>
            import("@/components/market_management/TradeList.vue"),
          name: "CommunityTransactions",
        },
        {
          path: "mypage",
          component: () => import("@/components/account_management/MyPage.vue"),
          name: "MyPage",
        },
        {
          path: "pos",
          component: () => import("@/components/pos_management/POSMain.vue"),
          name: "POSMain",
        },
        {
          path: "posmenu",
          component: () => import("@/components/pos_management/POSMenu.vue"),
          name: "POSMenu",
        },
        {
          path: "pay",
          component: () => import("@/components/pos_management/POSPay.vue"),
          name: "POSPay",
        },
        {
          path: "deliverypositem",
          component: () =>
            import("@/components/pos_management/POSDeliveryOrderList.vue"),
          name: "POSDelivery",
        },
      ],
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    return false;
  },
});

export default routes;
