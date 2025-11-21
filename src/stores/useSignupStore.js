import { defineStore } from "pinia";

export const useSignupStore = defineStore("user", {
  state: () => ({
    name: "",
    email: "",
    password: "",
    businessNumber: "",
    phoneNumber: "",
    ssn: "",
  }),
  actions: {
    // Step 1 데이터 저장
    setStep1Data({ name, email, password }) {
      this.name = name;
      this.email = email;
      this.password = password;
    },

    // Step 2 데이터 저장
    setStep2Data({ businessNumber, phoneNumber, ssn }) {
      this.businessNumber = businessNumber;
      this.phoneNumber = phoneNumber;
      this.ssn = ssn;
    },
  },
});
