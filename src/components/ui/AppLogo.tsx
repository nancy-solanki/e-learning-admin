export function AppLogo() {
  return (
    <span className="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-[-1px] text-slate-900">
      <img
        src="/icons/favicon.svg"
        alt=""
        width="32"
        height="32"
        className="h-8 w-8 drop-shadow-[0_3px_5px_rgba(108,85,255,0.25)]"
      />
      <span>Learninfy</span>
    </span>
  );
}
