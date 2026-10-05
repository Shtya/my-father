"use client";

export default function Error({ reset }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-xl font-semibold">حصلت مشكلة في تحميل الصفحة</h1>
      <button type="button" onClick={() => reset()} className="mt-4 h-12 bg-green px-4 font-semibold text-white">حاول تاني</button>
    </div>
  );
}
