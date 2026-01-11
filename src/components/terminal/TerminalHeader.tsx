/**
 * 터미널 헤더 컴포넌트
 * 상단에 타이틀, 상태, IP를 표시하는 터미널 스타일 헤더
 */

export interface TerminalHeaderProps {
  /** 헤더 타이틀 */
  title: string;
  /** IP 주소 */
  ip: string;
  /** 시스템 상태 */
  status: string;
}

export function TerminalHeader({ title, ip, status }: TerminalHeaderProps) {
  return (
    <div className="border border-brew-green bg-terminal-bg p-1 px-3 mb-2 md:mb-6 flex justify-between items-center text-brew-green font-mono select-none text-sm shrink-0">
      <div className="font-bold tracking-wider uppercase px-2 bg-brew-green text-terminal-bg">
        {title}
      </div>
      <div className="flex gap-4 text-xs opacity-80">
        <span>STATUS: {status}</span>
        <span>IP: {ip}</span>
      </div>
    </div>
  );
}
