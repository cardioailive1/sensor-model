export default function AlertBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
      {count > 9 ? "9+" : count}
    </span>
  );
}
