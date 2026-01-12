/**
 * 애플리케이션 상수 정의
 */

/**
 * 터미널 테마 차트 컬러 팔레트
 * Green-Teal 모노크로매틱 그라데이션 - 터미널 미학 유지
 */
export const TERMINAL_CHART_COLORS = [
  "#33ff00", // Neon Green (brightest)
  "#00ff88", // Mint Green
  "#00ddaa", // Teal
  "#00bbcc", // Cyan-Teal
  "#22cc66", // Medium Green
  "#44aa44", // Forest Green
  "#66dd88", // Light Green
  "#00ff55", // Spring Green
  "#11ee99", // Aquamarine
  "#33cc77", // Sea Green
  "#55ffaa", // Pale Green
  "#00aa66", // Dark Teal
] as const;

/**
 * Homebrew 테마 차트 컬러 팔레트
 * 다양한 색상 지원
 */
export const HOMEBREW_CHART_COLORS = [
  "#2ea44f", // brew-green (Primary)
  "#3fb950", // brew-neonGreen (Highlight)
  "#58a6ff", // brew-blue (Info)
  "#d29922", // brew-yellow (Warning)
  "#f85149", // brew-red (Error)
  "#a371f7", // Purple
  "#79c0ff", // Light Blue
  "#7ee787", // Light Green
  "#ffa657", // Orange
  "#ff7b72", // Light Red
] as const;

/**
 * 폴링 간격 설정 (밀리초)
 */
export const POLLING_INTERVALS = {
  /** 환율 캐시 유효 기간 */
  EXCHANGE_RATE: 300,
} as const;

/**
 * API 엔드포인트
 */
export const API_ENDPOINTS = {} as const;

/**
 * 기본 환율 (API 실패 시 폴백)
 */
export const DEFAULT_USD_KRW_RATE = 1450;
