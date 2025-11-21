import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
  },
  theme: {
    themes: {
      light: {
        colors: {
          primary: '#B1D5C2',   // 버튼 기본 색상
          chip: '#A7C779',     // 칩 색상
          layer: 'D1D5C2',  // 레이어 색상
          maintheme: '4D826C', // 메인 테마 색상
          background: 'FFFEFB', // 배경 색상
          accent: '#FFEB3B',
          error: '#F44336',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
        },
        typography: {
          fontFamily: 'Inter, sans-serif', // 폰트 설정
        },
      },
    },
  },
})

export default vuetify