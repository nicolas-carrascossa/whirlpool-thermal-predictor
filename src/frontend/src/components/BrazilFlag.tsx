/**
 * Bandeira do Brasil em SVG. Emoji de bandeira não renderiza no Windows (vira
 * as letras "BR"), então o desenho vai inline. Decorativa: quem lê tela recebe
 * o nome do país pelo `label`.
 */
export function BrazilFlag({ label = 'Brasil', className }: { label?: string; className?: string }) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 28 20"
      className={className ?? 'h-4 w-[22px] rounded-[2px] shadow-[0_0_0_1px_rgba(17,18,20,0.12)]'}
    >
      <rect width="28" height="20" fill="#229e45" />
      <polygon points="14,2.2 25.2,10 14,17.8 2.8,10" fill="#f8e509" />
      <circle cx="14" cy="10" r="4.3" fill="#2b3f87" />
      <path d="M9.9 9.2c2.6-.8 5.6-.2 8.3 1.6" stroke="#fff" strokeWidth="0.9" fill="none" />
    </svg>
  )
}
