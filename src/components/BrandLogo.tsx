export function BrandLogo({
  theme = 'light',
}: {
  theme?: 'light' | 'dark';
}) {
  return (
    <span
      className={`font-display text-xl font-extrabold tracking-tight whitespace-nowrap shrink-0 select-none ${
        theme === 'dark' ? 'text-white' : 'text-[#182333]'
      }`}
    >
      Resto<span className="text-[#FF8738]">’</span>MAX
    </span>
  );
}
