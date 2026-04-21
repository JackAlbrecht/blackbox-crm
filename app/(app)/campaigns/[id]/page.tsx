import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { CampaignForm } from '../CampaignForm';

export default async function CampaignDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', params.id).maybeSingle();
  if (!campaign) notFound();

  return (
    <div className="max-w-3xl animate-fade-in">
      <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to campaigns
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-white">{campaign.name}</h1>
        <p className="mt-1 text-sm text-gray-400">Edit or send this campaign.</p>
      </header>
      <div className="card p-6">
        <CampaignForm campaign={campaign} />
      </div>
    </div>
  );
}
