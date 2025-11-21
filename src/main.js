import { createApp } from "vue";
import "@mdi/font/css/materialdesignicons.css";
import "./style.css";
import App from "./App.vue";
import axios from "axios";
import router from "./router";
import { createPinia } from "pinia";
import vuetify from "./plugins/vuetify";
import VueKonva from "vue-konva";
import VueApexCharts from "vue3-apexcharts";

const pinia = createPinia();

const app = createApp(App);

app.use(pinia);
app.use(vuetify);
app.use(router);
app.use(VueKonva);
app.component("apexchart", VueApexCharts);
app.config.globalProperties.$axios = axios;
app.mount("#app");
