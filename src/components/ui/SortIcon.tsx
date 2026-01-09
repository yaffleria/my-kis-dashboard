/**
 * 정렬 아이콘 컴포넌트
 * 테이블 헤더에서 정렬 상태를 표시하는 아이콘
 */

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export interface SortIconProps {
  /** 현재 컬럼의 키 */
  colKey: string
  /** 현재 정렬 설정 */
  sortConfig: SortConfig | null
}

export function SortIcon({ colKey, sortConfig }: SortIconProps) {
  if (sortConfig?.key !== colKey) {
    return <span className="text-terminal-muted ml-1 opacity-0 group-hover:opacity-50">⇅</span>
  }
  return <span className="text-brew-green ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
}
