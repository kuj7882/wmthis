import { defineStore } from "pinia";

export const useFindFwdStore = defineStore("pwd", {
  state: () => ({
    email: "",
    password: "",
  }),
  actions: {
    setStep1Data(email) {
      this.email = email;
    },

    // Step 2 데이터 저장
    setStep2Data(password) {
      this.password = password;
    },
  },
});
