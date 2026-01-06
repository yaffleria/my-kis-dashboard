import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // 모든 폰트를 강제로 고정폭으로 통일
        mono: ['"D2Coding"', '"JetBrains Mono"', 'monospace'],
        sans: ['"D2Coding"', '"JetBrains Mono"', 'monospace'],
      },
      colors: {
        terminal: {
          bg: '#000000', // 배경: 리얼 블랙
          card: '#0d1117', // 카드: 배경과 미세한 차이
          border: '#30363d', // 테두리
          text: '#c9d1d9', // 본문
          muted: '#484f58', // 부가 정보
        },
        brew: {
          green: '#2ea44f',
          neonGreen: '#3fb950',
          yellow: '#d29922',
          red: '#f85149',
          blue: '#58a6ff',
        },
        success: '#2ea44f',
        warning: '#d29922',
        error: '#f85149',
        info: '#58a6ff',
        chart: {
          1: '#2ea44f',
          2: '#3fb950',
          3: '#58a6ff',
          4: '#d29922',
          5: '#f85149',
          6: '#a371f7',
        },
        card: {
          DEFAULT: '#0d1117',
          border: '#30363d',
        },
        sidebar: {
          bg: '#000000',
          active: 'rgba(46, 164, 79, 0.15)',
          hover: 'rgba(255, 255, 255, 0.05)',
        },
      },
      // 그림자 대신 테두리/글로우 효과
      boxShadow: {
        none: 'none',
        card: '0 0 0 1px #30363d',
        'card-glow': '0 0 0 1px #2ea44f, 0 0 10px rgba(46, 164, 79, 0.2)',
        'glow-green': '0 0 8px rgba(46, 164, 79, 0.4)',
        'glow-red': '0 0 8px rgba(248, 81, 73, 0.4)',
        'glow-blue': '0 0 8px rgba(88, 166, 255, 0.4)',
      },
      // 둥글림 완전 제거 (직각 터미널 스타일)
      borderRadius: {
        lg: '0px',
        md: '0px',
        sm: '0px',
        none: '0px',
        full: '9999px', // 원형 차트용으로만 유지
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
        blink: 'blink 1s step-end infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 1px #2ea44f' },
          '50%': { boxShadow: '0 0 0 1px #2ea44f, 0 0 12px rgba(46, 164, 79, 0.4)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
