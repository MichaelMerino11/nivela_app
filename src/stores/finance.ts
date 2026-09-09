import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useFinanceStore = defineStore('finance', () => {
  const revision = ref(0)

  function notifyFinancialChange() {
    revision.value += 1
  }

  return {
    revision,
    notifyFinancialChange,
  }
})