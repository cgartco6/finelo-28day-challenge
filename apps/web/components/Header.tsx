'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export function Header() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const userId = 'demo-user-123';

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingCount = async () => {
    try {
      const res = await fetch(`/api/autotrader/pending/${userId}`);
      const data = await res.json();
      setPendingCount(data.length);
