/**
 * NAGANO-3 B2B Partnership - Supabaseクライアントライブラリ
 *
 * 目的: 企業案件獲得のためのデータベース操作
 */

import { createClient } from '@/lib/supabase/client';
import type {
  SiteConfigMaster,
  PersonaMaster,
  OutreachLogMaster,
  PartnershipProposal,
  OutreachLogFilter,
  ProposalFilter,
  OutreachStatistics,
} from '@/types/b2b-partnership';

const supabase = createClient();

// ================================================================
// 1. Persona Master 操作
// ================================================================

/**
 * ペルソナ一覧を取得
 */
export async function fetchPersonas(status?: string) {
  let query = supabase
    .from('persona_master')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching personas:', error);
    throw error;
  }

  return data as PersonaMaster[];
}

/**
 * ペルソナをIDで取得
 */
export async function fetchPersonaById(id: string) {
  const { data, error } = await supabase
    .from('persona_master')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching persona:', error);
    throw error;
  }

  return data as PersonaMaster;
}

/**
 * ペルソナを作成
 */
export async function createPersona(persona: Partial<PersonaMaster>) {
  const { data, error } = await supabase
    .from('persona_master')
    .insert([persona])
    .select()
    .single();

  if (error) {
    console.error('Error creating persona:', error);
    throw error;
  }

  return data as PersonaMaster;
}

/**
 * ペルソナを更新
 */
export async function updatePersona(id: string, updates: Partial<PersonaMaster>) {
  const { data, error } = await supabase
    .from('persona_master')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating persona:', error);
    throw error;
  }

  return data as PersonaMaster;
}

// ================================================================
// 2. Site Config Master 操作
// ================================================================

/**
 * サイト一覧を取得
 */
export async function fetchSites(personaId?: string, status?: string) {
  let query = supabase
    .from('site_config_master')
    .select('*')
    .order('created_at', { ascending: false });

  if (personaId) {
    query = query.eq('persona_id', personaId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching sites:', error);
    throw error;
  }

  return data as SiteConfigMaster[];
}

/**
 * サイトをIDで取得
 */
export async function fetchSiteById(id: string) {
  const { data, error } = await supabase
    .from('site_config_master')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching site:', error);
    throw error;
  }

  return data as SiteConfigMaster;
}

/**
 * サイトを作成
 */
export async function createSite(site: Partial<SiteConfigMaster>) {
  const { data, error } = await supabase
    .from('site_config_master')
    .insert([site])
    .select()
    .single();

  if (error) {
    console.error('Error creating site:', error);
    throw error;
  }

  return data as SiteConfigMaster;
}

/**
 * サイトを更新
 */
export async function updateSite(id: string, updates: Partial<SiteConfigMaster>) {
  const { data, error } = await supabase
    .from('site_config_master')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating site:', error);
    throw error;
  }

  return data as SiteConfigMaster;
}

/**
 * サイトのメトリクスを更新
 */
export async function updateSiteMetrics(id: string, metrics: Record<string, any>) {
  const { data, error } = await supabase
    .from('site_config_master')
    .update({
      metrics,
      last_metrics_update: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating site metrics:', error);
    throw error;
  }

  return data as SiteConfigMaster;
}

// ================================================================
// 3. Partnership Proposals 操作
// ================================================================

/**
 * 提案書一覧を取得
 */
export async function fetchProposals(filter?: ProposalFilter) {
  let query = supabase
    .from('partnership_proposals')
    .select('*')
    .order('created_at', { ascending: false });

  if (filter?.persona_id) {
    query = query.eq('persona_id', filter.persona_id);
  }

  if (filter?.status && filter.status.length > 0) {
    query = query.in('status', filter.status);
  }

  if (filter?.proposal_type && filter.proposal_type.length > 0) {
    query = query.in('proposal_type', filter.proposal_type);
  }

  if (filter?.target_company) {
    query = query.ilike('target_company', `%${filter.target_company}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching proposals:', error);
    throw error;
  }

  return data as PartnershipProposal[];
}

/**
 * 提案書をIDで取得
 */
export async function fetchProposalById(id: string) {
  const { data, error } = await supabase
    .from('partnership_proposals')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching proposal:', error);
    throw error;
  }

  return data as PartnershipProposal;
}

/**
 * 提案書を作成
 */
export async function createProposal(proposal: Partial<PartnershipProposal>) {
  const { data, error } = await supabase
    .from('partnership_proposals')
    .insert([proposal])
    .select()
    .single();

  if (error) {
    console.error('Error creating proposal:', error);
    throw error;
  }

  return data as PartnershipProposal;
}

/**
 * 提案書を更新
 */
export async function updateProposal(
  id: string,
  updates: Partial<PartnershipProposal>
) {
  const { data, error } = await supabase
    .from('partnership_proposals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating proposal:', error);
    throw error;
  }

  return data as PartnershipProposal;
}

// ================================================================
// 4. Outreach Log Master 操作
// ================================================================

/**
 * アウトリーチログ一覧を取得
 */
export async function fetchOutreachLogs(filter?: OutreachLogFilter) {
  let query = supabase
    .from('outreach_log_master')
    .select('*')
    .order('outreach_date', { ascending: false });

  if (filter?.persona_id) {
    query = query.eq('persona_id', filter.persona_id);
  }

  if (filter?.status && filter.status.length > 0) {
    query = query.in('status', filter.status);
  }

  if (filter?.company_name) {
    query = query.ilike('company_name', `%${filter.company_name}%`);
  }

  if (filter?.date_from) {
    query = query.gte('outreach_date', filter.date_from);
  }

  if (filter?.date_to) {
    query = query.lte('outreach_date', filter.date_to);
  }

  if (filter?.ai_generated !== undefined) {
    query = query.eq('ai_generated', filter.ai_generated);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching outreach logs:', error);
    throw error;
  }

  return data as OutreachLogMaster[];
}

/**
 * アウトリーチログをIDで取得
 */
export async function fetchOutreachLogById(id: string) {
  const { data, error } = await supabase
    .from('outreach_log_master')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching outreach log:', error);
    throw error;
  }

  return data as OutreachLogMaster;
}

/**
 * アウトリーチログを作成
 */
export async function createOutreachLog(log: Partial<OutreachLogMaster>) {
  const { data, error } = await supabase
    .from('outreach_log_master')
    .insert([log])
    .select()
    .single();

  if (error) {
    console.error('Error creating outreach log:', error);
    throw error;
  }

  return data as OutreachLogMaster;
}

/**
 * アウトリーチログを更新
 */
export async function updateOutreachLog(
  id: string,
  updates: Partial<OutreachLogMaster>
) {
  const { data, error } = await supabase
    .from('outreach_log_master')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating outreach log:', error);
    throw error;
  }

  return data as OutreachLogMaster;
}

/**
 * アウトリーチログのステータスを更新
 */
export async function updateOutreachStatus(
  id: string,
  status: OutreachLogMaster['status'],
  responseContent?: string
) {
  const updates: Partial<OutreachLogMaster> = {
    status,
  };

  if (responseContent) {
    updates.response_content = responseContent;
    updates.response_date = new Date().toISOString();
  }

  return updateOutreachLog(id, updates);
}

// ================================================================
// 5. 統計・分析機能
// ================================================================

/**
 * アウトリーチ統計を取得
 */
export async function getOutreachStatistics(
  personaId?: string
): Promise<OutreachStatistics> {
  let query = supabase.from('outreach_log_master').select('*');

  if (personaId) {
    query = query.eq('persona_id', personaId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching outreach statistics:', error);
    throw error;
  }

  const logs = data as OutreachLogMaster[];

  const total_sent = logs.filter((log) => log.status !== 'draft').length;
  const total_replied = logs.filter((log) =>
    ['replied', 'accepted', 'rejected'].includes(log.status)
  ).length;
  const total_accepted = logs.filter((log) => log.status === 'accepted').length;
  const total_rejected = logs.filter((log) => log.status === 'rejected').length;

  const response_rate = total_sent > 0 ? (total_replied / total_sent) * 100 : 0;
  const acceptance_rate = total_replied > 0 ? (total_accepted / total_replied) * 100 : 0;

  const total_value_jpy = logs
    .filter((log) => log.partnership_value_jpy)
    .reduce((sum, log) => sum + (log.partnership_value_jpy || 0), 0);

  const avg_value_jpy = total_accepted > 0 ? total_value_jpy / total_accepted : 0;

  return {
    total_sent,
    total_replied,
    total_accepted,
    total_rejected,
    response_rate: Math.round(response_rate * 10) / 10,
    acceptance_rate: Math.round(acceptance_rate * 10) / 10,
    total_value_jpy,
    avg_value_jpy: Math.round(avg_value_jpy),
  };
}

/**
 * ペルソナの全サイトのメトリクスを集計
 */
export async function aggregatePersonaMetrics(personaId: string) {
  const sites = await fetchSites(personaId, 'active');

  const aggregated = {
    total_followers: 0,
    total_monthly_visitors: 0,
    total_monthly_pageviews: 0,
    avg_engagement_rate: 0,
    platforms: [] as string[],
  };

  let engagementRateSum = 0;
  let engagementRateCount = 0;

  sites.forEach((site) => {
    const metrics = site.metrics || {};

    if (metrics.followers) {
      aggregated.total_followers += metrics.followers;
    }

    if (metrics.monthly_visitors) {
      aggregated.total_monthly_visitors += metrics.monthly_visitors;
    }

    if (metrics.monthly_pageviews) {
      aggregated.total_monthly_pageviews += metrics.monthly_pageviews;
    }

    if (metrics.avg_engagement_rate) {
      engagementRateSum += metrics.avg_engagement_rate;
      engagementRateCount++;
    }

    if (!aggregated.platforms.includes(site.site_type)) {
      aggregated.platforms.push(site.site_type);
    }
  });

  if (engagementRateCount > 0) {
    aggregated.avg_engagement_rate =
      Math.round((engagementRateSum / engagementRateCount) * 10) / 10;
  }

  return aggregated;
}

/**
 * フォローアップが必要なアウトリーチログを取得
 */
export async function getOutreachLogsNeedingFollowUp() {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('outreach_log_master')
    .select('*')
    .in('status', ['sent', 'opened'])
    .lte('next_follow_up_date', today)
    .order('next_follow_up_date', { ascending: true });

  if (error) {
    console.error('Error fetching follow-up needed logs:', error);
    throw error;
  }

  return data as OutreachLogMaster[];
}

/**
 * 企業名で既存のアウトリーチログを検索
 */
export async function findExistingOutreach(companyName: string) {
  const { data, error } = await supabase
    .from('outreach_log_master')
    .select('*')
    .ilike('company_name', companyName)
    .order('outreach_date', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error finding existing outreach:', error);
    throw error;
  }

  return data as OutreachLogMaster[];
}
