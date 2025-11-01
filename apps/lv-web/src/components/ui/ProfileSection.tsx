'use client';

import { useEffect, useState } from 'react';

type Profile = { name?: string } & Record<string, unknown>;

export default function ProfileSection() {
  const [data, setData] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profile', { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;
  return <div>{data.name}</div>;
}