import clsx from 'clsx'

/**
 * Ilustración "cancha de noche" para cuando la cancha no tiene foto (photoUrl = null):
 * césped con franjas en perspectiva, líneas blancas y dos reflectores, en la gama verde botella.
 */
export default function CourtArt({ className, variant = 0 }: { className?: string; variant?: number }) {
  const flip = variant % 2 === 1
  return (
    <div aria-hidden className={clsx('relative overflow-hidden bg-[#061f1b]', className)}>
      {/* cielo y reflectores */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#14564a_0%,#0a2c26_55%,#061f1b_100%)]" />
      <div
        className={clsx(
          'absolute -top-10 h-[130%] w-[38%] origin-top bg-[linear-gradient(180deg,rgba(226,247,238,0.30),rgba(226,247,238,0)_75%)] blur-md',
          flip ? 'right-[12%] rotate-[18deg]' : 'left-[12%] -rotate-[18deg]'
        )}
      />
      <div
        className={clsx(
          'absolute -top-10 h-[130%] w-[30%] origin-top bg-[linear-gradient(180deg,rgba(226,247,238,0.22),rgba(226,247,238,0)_70%)] blur-md',
          flip ? 'left-[18%] -rotate-[14deg]' : 'right-[18%] rotate-[14deg]'
        )}
      />
      <span
        className={clsx(
          'absolute top-[6%] size-2.5 rounded-full bg-white shadow-[0_0_24px_10px_rgba(226,247,238,0.55)]',
          flip ? 'right-[24%]' : 'left-[24%]'
        )}
      />
      <span
        className={clsx(
          'absolute top-[9%] size-2 rounded-full bg-white shadow-[0_0_20px_8px_rgba(226,247,238,0.45)]',
          flip ? 'left-[30%]' : 'right-[30%]'
        )}
      />

      {/* césped en perspectiva */}
      <div className="absolute inset-x-[-30%] bottom-[-8%] h-[72%] [perspective:520px]">
        <svg
          viewBox="0 0 400 240"
          preserveAspectRatio="none"
          className="h-full w-full origin-bottom [transform:rotateX(58deg)]"
        >
          <defs>
            <pattern id="rc-stripes" width="50" height="240" patternUnits="userSpaceOnUse">
              <rect width="25" height="240" fill="#0f5c4e" />
              <rect x="25" width="25" height="240" fill="#0b4a40" />
            </pattern>
          </defs>
          <rect width="400" height="240" fill="url(#rc-stripes)" />
          <g fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="2.5">
            <rect x="12" y="12" width="376" height="216" />
            <line x1="200" y1="12" x2="200" y2="228" />
            <circle cx="200" cy="120" r="34" />
            <rect x="12" y="70" width="52" height="100" />
            <rect x="336" y="70" width="52" height="100" />
          </g>
          <circle cx="200" cy="120" r="3" fill="#ffffff" fillOpacity="0.7" />
        </svg>
      </div>

      <div className="absolute inset-x-0 bottom-[30%] h-1/3 bg-[radial-gradient(60%_60%_at_50%_100%,rgba(111,211,168,0.14),transparent)]" />

      {/* lectura del texto encima */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,31,27,0)_0%,rgba(6,31,27,0.15)_50%,rgba(6,31,27,0.85)_100%)]" />
    </div>
  )
}
