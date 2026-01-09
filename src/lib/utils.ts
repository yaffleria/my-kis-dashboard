/**
 * 공통 유틸리티 함수
 */

/**
 * 계좌번호 마스킹 처리
 * 앞 3자리와 뒤 2자리만 노출, 나머지는 마스킹
 * @example maskAccountNo('12345678') // '123****78'
 */
export function maskAccountNo(accNo: string): string {
  if (!accNo) return ''
  if (accNo.startsWith('MANUAL_')) return 'Manual'
  const clean = accNo.replace(/[^0-9]/g, '')
  if (clean.length <= 5) return clean
  return `${clean.substring(0, 3)}****${clean.substring(clean.length - 2)}`
}

/**
 * 통화 포맷팅 (한국 원화)
 * @example formatCurrency(1234567) // '₩1,234,567'
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * 퍼센트 포맷팅 (부호 포함)
 * @example formatPercent(12.34) // '+12.34%'
 * @example formatPercent(-5.67) // '-5.67%'
 */
export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

/**
 * 숫자 포맷팅 (천 단위 콤마)
 * @example formatNumber(1234567) // '1,234,567'
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

/**
 * 숫자 축약 표기 (만, 억 단위)
 * @example formatCompactNumber(123456789) // '1.2억'
 * @example formatCompactNumber(12345) // '1.2만'
 */
export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`
  }
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(1)}만`
  }
  return value.toLocaleString('ko-KR')
}

/**
 * 값의 변화 타입 판별
 */
export function getChangeType(value: number): 'positive' | 'negative' | 'neutral' {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'neutral'
}

/**
 * 문자열을 숫자로 변환 (콤마 제거)
 * @example parseNumber('1,234,567') // 1234567
 */
export function parseNumber(value: string | undefined | null): number {
  if (!value) return 0
  const num = parseFloat(value.replace(/,/g, ''))
  return isNaN(num) ? 0 : num
}
