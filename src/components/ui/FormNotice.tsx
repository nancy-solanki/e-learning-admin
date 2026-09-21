export type Notice = { type: 'error' | 'success'; text: string };

export function FormNotice({ notice }: { notice: Notice | null }) {
  if (!notice) {
    return null;
  }

  return (
    <div
      className={`rounded-lg px-3.5 py-3 text-[13px] leading-snug ${
        notice.type === 'error'
          ? 'bg-red-50 text-red-800'
          : 'bg-green-50 text-green-800'
      }`}
      role="alert"
    >
      {notice.text}
    </div>
  );
}
