// Marca: um farol com o facho de luz sobre duas ondas.
export function Logo({ tamanho = 36 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <rect width="40" height="40" rx="11" fill="#11435b" />
      <path d="M17 9h6l2 15h-10z" fill="#fff" />
      <path d="M16.2 15h7.6l.4 3h-8.4z" fill="#f0b13b" />
      <path d="M17.5 7.5h5L20 5z" fill="#f0b13b" />
      <path d="M6 28q3.5-3 7 0t7 0t7 0t7 0" fill="none" stroke="#7fd0d8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 33q3.5-3 7 0t7 0t7 0t7 0" fill="none" stroke="#7fd0d8" strokeOpacity=".55" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
