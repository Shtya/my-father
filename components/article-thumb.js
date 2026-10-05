"use client";

import { useState } from "react";

export function ArticleThumb({ src }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="h-14 w-14 shrink-0 bg-soft" />;
  return <img src={src} alt="" width={56} height={56} className="h-14 w-14 shrink-0 bg-soft object-cover" onError={() => setFailed(true)} />;
}
