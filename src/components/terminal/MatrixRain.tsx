'use client'

import { useEffect, useRef } from 'react'

/**
 * Matrix Rain 애니메이션 컴포넌트
 * Canvas 기반 매트릭스 스타일 비 내리는 효과
 */

// Matrix 문자셋 (카타카나 + 숫자 + 알파벳)
const MATRIX_CHARS =
  'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const FONT_SIZE = 12
const TERMINAL_GREEN = '#33ff00'

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const charArray = MATRIX_CHARS.split('')

    // 캔버스 크기 조정
    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth
        canvas.height = canvas.parentElement.clientHeight
      }
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // 드롭 초기화
    const columns = Math.ceil(canvas.width / FONT_SIZE)
    const drops: number[] = []
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * -canvas.height)
    }

    // 애니메이션 그리기
    const draw = () => {
      // 반투명 검정색으로 트레일 효과
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = TERMINAL_GREEN
      ctx.font = `${FONT_SIZE}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)]
        const x = i * FONT_SIZE
        const y = drops[i] * FONT_SIZE

        ctx.fillText(text, x, y)

        // 하단에 도달하면 랜덤하게 리셋
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }

        drops[i]++
      }
    }

    const interval = setInterval(draw, 33) // ~30fps

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <div className="w-full h-20 relative overflow-hidden bg-black border-y border-brew-green/20 my-2">
      <canvas
        ref={canvasRef}
        className="block w-full h-full opacity-80"
      />
      <div className="absolute top-1 right-2 text-[8px] text-brew-green opacity-70 animate-pulse bg-black px-1">
        SYS.MATRIX // ACTIVE
      </div>
    </div>
  )
}
