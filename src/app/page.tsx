import React from 'react';
import { getAllComponents } from '@/lib/db';
import { LandingHeroClient } from '@/components/LandingHeroClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const catalog = await getAllComponents();

  return <LandingHeroClient catalog={catalog} />;
}
