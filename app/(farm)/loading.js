export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="h-8 w-40 animate-pulse bg-line" />
      <div className="h-28 animate-pulse bg-paper" />
      <div className="h-40 animate-pulse bg-paper" />
    </div>
  );
}
