export default function AdminBadge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] text-[#3A2417]/70",
    wine: "border-[#7A183D]/20 bg-[#FCE7EC] text-[#7A183D]",
    gold: "border-[#C9962D]/30 bg-[#FFF8EE] text-[#C9962D]",
    blue: "border-sky-500/20 bg-sky-50 text-sky-700",
    purple: "border-violet-500/20 bg-violet-50 text-violet-700",
    amber: "border-amber-500/24 bg-amber-50 text-amber-700",
    teal: "border-teal-500/20 bg-teal-50 text-teal-700",
    green: "border-emerald-500/20 bg-emerald-50 text-emerald-700",
    red: "border-rose-500/20 bg-rose-50 text-rose-700",
    muted: "border-[rgba(122,24,61,0.1)] bg-white text-[#3A2417]/46"
  };

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  );
}
