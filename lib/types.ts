export type Tenant = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  display_name?: string | null;
  tagline?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  logo_url?: string | null;
  logo_wide_url?: string | null;
  favicon_url?: string | null;
  login_bg_url?: string | null;
};

export type Profile = {
  user_id: string;
  tenant_id: string | null;
  email: string;
  full_name: string | null;
  active: boolean;
  is_super_admin: boolean;
  is_tenant_admin?: boolean;
  created_at: string;
};

export type Contact = {
  id: string;
  tenant_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  source: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DealStage = {
  id: string;
  tenant_id: string;
  name: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
};

export type Deal = {
  id: string;
  tenant_id: string;
  name: string;
  value: number | null;
  stage_id: string | null;
  contact_id: string | null;
  expected_close: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  tenant_id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  priority: 'low' | 'medium' | 'high' | null;
  completed: boolean;
  contact_id: string | null;
  deal_id: string | null;
  created_at: string;
};

export type Campaign = {
  id: string;
  tenant_id: string;
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  body: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  sent_count: number;
  created_at: string;
  sent_at: string | null;
};

export type SeoKeyword = {
  id: string;
  tenant_id: string;
  keyword: string;
  target_url: string;
  current_rank: number | null;
  previous_rank: number | null;
  last_checked: string | null;
  notes: string | null;
  created_at: string;
};
