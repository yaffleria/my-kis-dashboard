/**
 * 터미널 패널 컴포넌트
 * 터미널 스타일의 컨테이너 박스 (타이틀 바 + 콘텐츠 영역)
 */

export interface TerminalPanelProps {
  /** 패널 타이틀 */
  title: string;
  /** 패널 콘텐츠 */
  children: React.ReactNode;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 헤더 우측에 표시할 액션 컴포넌트 */
  headerAction?: React.ReactNode;
  /** 스크롤 가능 여부 */
  scrollable?: boolean;
}

export function TerminalPanel({
  title,
  children,
  className = "",
  scrollable = false,
  headerAction,
}: TerminalPanelProps) {
  return (
    <div
      className={`border border-brew-green bg-terminal-bg flex flex-col ${className}`}
    >
      <div className="border-b border-brew-green bg-brew-green/10 p-1 px-3 shrink-0 flex justify-between items-center">
        <h3 className="text-brew-green font-bold text-sm tracking-wide uppercase">
          {title}
        </h3>
        {headerAction && <div>{headerAction}</div>}
      </div>
      <div
        className={`p-3 flex-1 ${
          scrollable ? "overflow-y-auto custom-scrollbar" : "overflow-hidden"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
