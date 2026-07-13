import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 순수 로직 단위 테스트만 — DB/네트워크 불필요한 lib/ 계산 함수들.
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
})
