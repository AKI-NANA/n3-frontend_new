/**
 * NAGANO-3 B2B Partnership Dashboard
 *
 * 企業案件（タイアップ）獲得の自動化管理ダッシュボード
 */

'use client';

import { useState } from 'react';

export default function B2BPartnershipPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'personas' | 'proposals' | 'outreach'>(
    'overview'
  );

  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          💰 企業案件（タイアップ）獲得自動化
        </h1>
        <p className="text-gray-600">
          AI自動生成されたコンテンツを活用し、企業案件を自動で獲得します
        </p>
      </header>

      {/* タブナビゲーション */}
      <nav className="flex space-x-4 mb-6 border-b">
        <TabButton
          label="概要"
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        />
        <TabButton
          label="ペルソナ管理"
          active={activeTab === 'personas'}
          onClick={() => setActiveTab('personas')}
        />
        <TabButton
          label="提案書"
          active={activeTab === 'proposals'}
          onClick={() => setActiveTab('proposals')}
        />
        <TabButton
          label="アウトリーチ"
          active={activeTab === 'outreach'}
          onClick={() => setActiveTab('outreach')}
        />
      </nav>

      {/* コンテンツエリア */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'personas' && <PersonasTab />}
        {activeTab === 'proposals' && <ProposalsTab />}
        {activeTab === 'outreach' && <OutreachTab />}
      </div>
    </div>
  );
}

// ================================================================
// タブボタンコンポーネント
// ================================================================

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-medium transition-colors ${
        active
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-600 hover:text-gray-800'
      }`}
    >
      {label}
    </button>
  );
}

// ================================================================
// 概要タブ
// ================================================================

function OverviewTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">システム概要</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* フロー図 */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">自動化フロー</h3>
          <div className="space-y-3">
            <FlowStep number={1} title="影響力証明" description="トラフィック・エンゲージメントを自動集積" />
            <FlowStep number={2} title="企業リード生成" description="親和性の高い候補企業を自動リサーチ" />
            <FlowStep number={3} title="企画書生成" description="Gemini Proで提案書を自動生成" />
            <FlowStep number={4} title="メール送信" description="提案メールを自動送信" />
          </div>
        </div>

        {/* 統計情報 */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">統計情報</h3>
          <div className="space-y-3">
            <StatCard label="総送信数" value="0" />
            <StatCard label="返信率" value="0%" />
            <StatCard label="成約率" value="0%" />
            <StatCard label="総獲得金額" value="¥0" />
          </div>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">クイックアクション</h3>
        <div className="flex flex-wrap gap-3">
          <ActionButton label="新規ペルソナ作成" icon="👤" />
          <ActionButton label="企業をリサーチ" icon="🔍" />
          <ActionButton label="提案書を生成" icon="📝" />
          <ActionButton label="メトリクス更新" icon="📊" />
        </div>
      </div>
    </div>
  );
}

function FlowStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
        {number}
      </div>
      <div>
        <div className="font-semibold text-gray-800">{title}</div>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
      <span className="text-gray-600">{label}</span>
      <span className="text-xl font-bold text-gray-800">{value}</span>
    </div>
  );
}

function ActionButton({ label, icon }: { label: string; icon: string }) {
  return (
    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ================================================================
// ペルソナ管理タブ
// ================================================================

function PersonasTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">ペルソナ管理</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 新規ペルソナ作成
        </button>
      </div>

      <div className="border rounded-lg p-4">
        <p className="text-gray-600 text-center py-8">
          ペルソナがまだ登録されていません。<br />
          「新規ペルソナ作成」ボタンから最初のペルソナを作成しましょう。
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">💡 ペルソナとは？</h3>
        <p className="text-blue-700 text-sm">
          ペルソナは、AI生成コンテンツの発信者としてのキャラクター設定です。
          専門分野、口調、強みを設定することで、より説得力のある提案書を自動生成できます。
        </p>
      </div>
    </div>
  );
}

// ================================================================
// 提案書タブ
// ================================================================

function ProposalsTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">提案書</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 新規提案書生成
        </button>
      </div>

      <div className="border rounded-lg p-4">
        <p className="text-gray-600 text-center py-8">
          提案書がまだ生成されていません。<br />
          「新規提案書生成」ボタンから最初の提案書を作成しましょう。
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-800 mb-2">🤖 AI自動生成</h3>
        <p className="text-green-700 text-sm">
          Gemini Proが企業情報とペルソナの影響力データを分析し、
          最適なタイアップ企画を自動で提案します。
        </p>
      </div>
    </div>
  );
}

// ================================================================
// アウトリーチタブ
// ================================================================

function OutreachTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">アウトリーチ</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 新規アウトリーチ
        </button>
      </div>

      <div className="border rounded-lg p-4">
        <p className="text-gray-600 text-center py-8">
          アウトリーチ履歴がまだありません。<br />
          提案書を作成後、「新規アウトリーチ」から企業へメールを送信できます。
        </p>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-purple-800 mb-2">📧 自動送信機能</h3>
        <p className="text-purple-700 text-sm">
          提案メールを自動で作成・送信し、開封率や返信状況を追跡します。
          フォローアップメールも自動でスケジュールできます。
        </p>
      </div>
    </div>
  );
}
