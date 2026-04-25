'use client';

import { MentorProvider } from '@/lib/MentorContext';

export default function MentorLayout({ children }) {
  return <MentorProvider>{children}</MentorProvider>;
}
