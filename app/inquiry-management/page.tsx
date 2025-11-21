// app/inquiry-management/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ListFilter,
  MessageSquare,
  CheckCircle,
  Lightbulb,
  Clock,
  Mail,
  AlertTriangle,
  Loader2,
  Send,
  Save,
  BookOpen,
  ClipboardCheck,
  Package,
  ExternalLink,
  Bot,
  Cpu,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// -- データ型定義 --
interface Inquiry {
  id: string;
  inquiry_id: string;
  order_id: string;
  customer_name: string;
  received_at: string;
  status: "NEW" | "LEVEL0_PENDING" | "DRAFT_PENDING" | "DRAFT_GENERATED" | "APPROVED" | "SENT" | "COMPLETED";
  ai_category: string | null;
  customer_message_raw: string;
  level0_choice: string | null;
  ai_draft_text: string | null;
  final_response_text: string | null;
  tracking_number: string | null;
  shipping_status: string | null;
  response_score: number;
  response_date: string | null;
}

interface KnowledgeExample {
  id: string;
  inquiry_id: string;
  ai_category: string;
  customer_message_raw: string;
  final_response_text: string;
  response_score: number;
}

const STATUS_MAP = {
  NEW: { label: "新規", color: "bg-red-500", icon: Bell },
  LEVEL0_PENDING: { label: "分類待ち", color: "bg-yellow-500", icon: GitCommit },
  DRAFT_PENDING: { label: "AI分析中", color: "bg-blue-500", icon: Cpu },
  DRAFT_GENERATED: { label: "承認待ち", color: "bg-green-500", icon: ClipboardCheck },
  APPROVED: { label: "承認済み", color: "bg-purple-500", icon: CheckCircle },
  SENT: { label: "送信済み", color: "bg-gray-500", icon: Send },
  COMPLETED: { label: "完了", color: "bg-gray-400", icon: CheckCircle },
};

const InquiryManagementPage: React.FC = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filter, setFilter] = useState<string>("DRAFT_GENERATED");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [knowledgeExamples, setKnowledgeExamples] = useState<KnowledgeExample[]>([]);
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [loading, setLoading] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedForBulk, setSelectedForBulk] = useState<string[]>([]);

  // データ取得
  useEffect(() => {
    fetchInquiries();
  }, [filter]);

  useEffect(() => {
    if (selectedInquiry?.ai_category) {
      fetchKnowledgeExamples(selectedInquiry.ai_category);
    }
  }, [selectedInquiry?.ai_category]);

  const fetchInquiries = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.append("status", filter);
      }

      const response = await fetch(`/api/inquiry/list?${params}`);
      const result = await response.json();

      if (result.success) {
        setInquiries(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch inquiries:", error);
    }
  };

  const fetchKnowledgeExamples = async (category: string) => {
    try {
      const response = await fetch(`/api/inquiry/knowledge-base?category=${category}&limit=5`);
      const result = await response.json();

      if (result.success) {
        setKnowledgeExamples(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch knowledge examples:", error);
    }
  };

  // フィルタリング
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((q) => filter === "all" || q.status === filter);
  }, [inquiries, filter]);

  // Level 0 フィルター処理
  const handleLevel0Choice = async (inquiryId: string, choice: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/inquiry/process-level0", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId, choice }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Level 0 フィルターを処理しました`);
        await fetchInquiries();

        // 選択肢が4以外の場合、自動でAI分類へ
        if (choice !== "4") {
          await handleClassify(inquiryId);
        }
      }
    } catch (error) {
      console.error("Level 0 processing error:", error);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // AI分類
  const handleClassify = async (inquiryId: string) => {
    setLoading(true);
    try {
      const inquiry = inquiries.find(i => i.inquiry_id === inquiryId);
      if (!inquiry) return;

      const response = await fetch("/api/inquiry/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId,
          customerMessage: inquiry.customer_message_raw,
          level0Choice: inquiry.level0_choice,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchInquiries();
        // 自動でドラフト生成
        await handleGenerateDraft(inquiryId);
      }
    } catch (error) {
      console.error("Classification error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ドラフト生成
  const handleGenerateDraft = async (inquiryId: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/inquiry/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId }),
      });

      const result = await response.json();

      if (result.success) {
        alert("AIドラフトを生成しました");
        await fetchInquiries();
      }
    } catch (error) {
      console.error("Draft generation error:", error);
      alert("ドラフト生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // 一括ドラフト生成
  const handleBulkGenerateDraft = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/inquiry/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulkGenerate: true }),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        await fetchInquiries();
      }
    } catch (error) {
      console.error("Bulk draft generation error:", error);
      alert("一括ドラフト生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // 一括承認
  const handleBulkApprove = async () => {
    if (selectedForBulk.length === 0) {
      alert("承認する問い合わせを選択してください");
      return;
    }

    if (!confirm(`${selectedForBulk.length}件の回答を一括送信しますか？`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/inquiry/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryIds: selectedForBulk }),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        setSelectedForBulk([]);
        setBulkModalOpen(false);
        await fetchInquiries();
      }
    } catch (error) {
      console.error("Bulk approve error:", error);
      alert("一括承認に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // カテゴリに応じたベストプラクティス
  const getBestPractice = (category: string | null) => {
    const practices: { [key: string]: { title: string; content: string } } = {
      Shipping_Delay: {
        title: "配送遅延/追跡番号の問い合わせ",
        content:
          "「現在確認中」ではなく、「いつまでに」「誰が」対応するかを明記。追跡番号は必ず受注管理DBと連携して取得する。",
      },
      Product_Defect: {
        title: "返品・不具合の問い合わせ",
        content:
          "謝罪から始め、具体的な対応ステップ（返送先住所、写真の添付依頼）を箇条書きで分かりやすく提示する。",
      },
      Product_Question: {
        title: "商品仕様の問い合わせ",
        content:
          "FAQを参照し、具体的な仕様情報を提供する。不明な場合は担当者に確認後、再度連絡する旨を伝える。",
      },
    };

    return (
      practices[category || ""] || {
        title: "マニュアルの利用",
        content: "左側のマニュアルタブから詳細を参照してください。",
      }
    );
  };

  const draftCount = inquiries.filter((q) => q.status === "DRAFT_GENERATED").length;
  const currentBestPractice = getBestPractice(selectedInquiry?.ai_category);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <Card className="border-t-4 border-t-purple-600">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-purple-700">
            <MessageSquare className="h-6 w-6" /> AI対応最適化ハブ
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={handleBulkGenerateDraft}
              variant="outline"
              disabled={loading}
              className="flex items-center"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Cpu className="h-4 w-4 mr-2" />}
              AI一括ドラフト生成
            </Button>
            <Button
              onClick={() => setBulkModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center"
              disabled={draftCount === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" /> AIドラフトを一括承認・送信
              ({draftCount}件)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. 問い合わせリスト */}
            <div className="lg:col-span-1 space-y-4">
              <Select onValueChange={setFilter} defaultValue="DRAFT_GENERATED">
                <SelectTrigger className="w-full bg-white border-purple-300">
                  <ListFilter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="ステータスでフィルタ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT_GENERATED">AIドラフト承認待ち</SelectItem>
                  <SelectItem value="NEW">新規（未処理）</SelectItem>
                  <SelectItem value="LEVEL0_PENDING">Level 0 分類待ち</SelectItem>
                  <SelectItem value="DRAFT_PENDING">AI分析中</SelectItem>
                  <SelectItem value="SENT">送信済み</SelectItem>
                  <SelectItem value="COMPLETED">対応完了</SelectItem>
                  <SelectItem value="all">全て</SelectItem>
                </SelectContent>
              </Select>

              <ScrollArea className="h-[70vh] rounded-md border bg-white">
                {filteredInquiries.map((inq) => {
                  const statusInfo = STATUS_MAP[inq.status] || STATUS_MAP.NEW;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div
                      key={inq.inquiry_id}
                      className={`p-3 border-b cursor-pointer hover:bg-purple-50 transition ${
                        selectedInquiry?.inquiry_id === inq.inquiry_id
                          ? "bg-purple-100 border-l-4 border-l-purple-600"
                          : ""
                      }`}
                      onClick={() => setSelectedInquiry(inq)}
                    >
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold">
                          {inq.customer_name || "顧客"} - {inq.order_id}
                        </span>
                        <Badge className={`${statusInfo.color} text-white`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 truncate mt-1">
                        {inq.customer_message_raw}
                      </p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-400 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(inq.received_at).toLocaleString('ja-JP')}
                        </span>
                        {inq.ai_category && (
                          <Badge variant="outline" className="text-xs">
                            {inq.ai_category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredInquiries.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    該当する問い合わせはありません。
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* 2. 詳細パネルとAIドラフト */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">
                    {selectedInquiry
                      ? `【${selectedInquiry.ai_category || "未分類"}】${selectedInquiry.customer_name || "顧客"} 様からのメッセージ`
                      : "問い合わせを選択してください"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedInquiry && (
                    <>
                      {/* 受注連携情報 */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-blue-800 flex items-center">
                            <Package className="w-4 h-4 mr-2" /> 受注連携情報 ({selectedInquiry.order_id})
                          </h4>
                          <button className="text-blue-600 text-xs font-medium hover:text-blue-800 transition">
                            <ExternalLink className="w-3 h-3 inline-block mr-1" /> 受注詳細
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <p>
                            <span className="font-medium text-gray-600">追跡番号:</span>{" "}
                            <span className="font-mono text-gray-800">
                              {selectedInquiry.tracking_number || "未発行"}
                            </span>
                          </p>
                          <p>
                            <span className="font-medium text-gray-600">出荷ステータス:</span>{" "}
                            <span
                              className={`font-bold ${
                                selectedInquiry.shipping_status === "未出荷"
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {selectedInquiry.shipping_status || "確認中"}
                            </span>
                          </p>
                        </div>

                        {/* 仕入れ漏れアラート */}
                        {selectedInquiry.shipping_status === "未出荷" &&
                          selectedInquiry.ai_category === "Shipping_Delay" && (
                            <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded-md">
                              <h5 className="text-sm font-bold text-red-700 flex items-center">
                                <AlertTriangle className="w-4 h-4 mr-2" /> 仕入れ漏れアラート
                              </h5>
                              <p className="text-xs text-red-600 mt-1">
                                この注文は未出荷で配送遅延の問い合わせです。至急、仕入れ状況を確認してください。
                              </p>
                            </div>
                          )}
                      </div>

                      {/* 顧客メッセージ */}
                      <div className="p-4 bg-gray-100 rounded-lg border-l-4 border-l-purple-500">
                        <p className="font-medium text-gray-700">
                          顧客メッセージ (受注ID: {selectedInquiry.order_id})
                        </p>
                        <p className="mt-1 text-sm whitespace-pre-wrap">
                          {selectedInquiry.customer_message_raw}
                        </p>
                      </div>

                      {/* Level 0 フィルター */}
                      {selectedInquiry.status === "NEW" && (
                        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                          <p className="font-bold text-sm text-yellow-800 mb-2 flex items-center">
                            <Bot className="w-4 h-4 mr-2" /> Level 0 フィルター: 自動質問送信済
                          </p>
                          <p className="text-xs text-yellow-700 mb-2">
                            顧客の応答をシミュレートし、AI分析キューへ移行させます。
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {["1. 配送", "2. 返品", "3. 仕様", "4. その他"].map((choice, index) => (
                              <Button
                                key={index}
                                onClick={() =>
                                  handleLevel0Choice(selectedInquiry.inquiry_id, String(index + 1))
                                }
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                disabled={loading}
                              >
                                {choice}を選択
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Level 0 選択結果 */}
                      {selectedInquiry.level0_choice && (
                        <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 border border-blue-200">
                          <span className="font-bold">顧客の選択:</span>{" "}
                          {
                            ["1. 追跡・配送", "2. 返品・不具合", "3. 商品の使用方法・仕様", "4. その他"][
                              parseInt(selectedInquiry.level0_choice) - 1
                            ]
                          }
                        </div>
                      )}

                      {/* AI分析ボタン */}
                      {selectedInquiry.status === "LEVEL0_PENDING" && (
                        <div className="text-center p-4 border rounded-lg bg-indigo-50">
                          <Button
                            onClick={() => handleClassify(selectedInquiry.inquiry_id)}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700"
                          >
                            {loading ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Cpu className="w-4 h-4 mr-2" />
                            )}
                            AIに回答ドラフトを生成させる
                          </Button>
                        </div>
                      )}

                      {/* AIドラフト表示 */}
                      {(selectedInquiry.ai_draft_text || selectedInquiry.status === "DRAFT_GENERATED") && (
                        <div className="p-4 border-2 border-dashed border-green-400 bg-green-50 rounded-lg">
                          <p className="font-medium text-green-700 flex items-center">
                            <Mail className="h-4 w-4 mr-2" /> AI生成回答ドラフト
                            {selectedInquiry.ai_category && (
                              <Badge className="ml-2 bg-blue-100 text-blue-700">
                                {selectedInquiry.ai_category}
                              </Badge>
                            )}
                          </p>
                          <Textarea
                            rows={10}
                            value={selectedInquiry.ai_draft_text || "AIによる回答ドラフトを生成中です..."}
                            className="mt-2 bg-white"
                            readOnly
                          />
                          <div className="flex justify-end gap-2 mt-3">
                            <Button variant="outline" size="sm">
                              <Save className="w-4 h-4 mr-2" />
                              手動で編集
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedForBulk([selectedInquiry.inquiry_id]);
                                handleBulkApprove();
                              }}
                              disabled={loading}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              この回答を送信
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 3. ナレッジベース統合 */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-yellow-700">
                    <Lightbulb className="h-5 w-5" /> ナレッジサポート
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual">
                        <BookOpen className="w-4 h-4 mr-2" />
                        対応マニュアル
                      </TabsTrigger>
                      <TabsTrigger value="examples">
                        <ClipboardCheck className="w-4 h-4 mr-2" />
                        成功事例
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-base">{currentBestPractice.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{currentBestPractice.content}</p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-bold text-gray-700 text-sm">FAQ & 対応原則</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 pl-2">
                          <li>在庫がない場合: 仕入れ漏れアラートを確認し、直ちに仕入れ担当者に連絡</li>
                          <li>配送遅延の場合: 必ず受注IDから追跡番号をシステム連携で取得</li>
                          <li>AIドラフト利用率: 90%以上を目指すこと</li>
                        </ul>
                      </div>
                    </TabsContent>

                    <TabsContent value="examples" className="space-y-3">
                      {knowledgeExamples.length > 0 ? (
                        <>
                          <p className="text-sm text-gray-600 mb-2">
                            カテゴリ「{selectedInquiry?.ai_category}」の成功事例 Top {knowledgeExamples.length}
                          </p>
                          {knowledgeExamples.map((ex, index) => (
                            <div key={ex.id} className="p-3 border rounded-lg bg-gray-50 shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-xs font-semibold text-gray-600">#{index + 1} 類似顧客メッセージ</p>
                                <Badge variant="outline" className="text-xs">
                                  スコア: {ex.response_score}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-800 mb-2 whitespace-pre-wrap italic">
                                &quot;{ex.customer_message_raw}&quot;
                              </p>
                              <p className="text-xs font-semibold text-green-600 mb-1">
                                最終回答文 (ベストプラクティス)
                              </p>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                {ex.final_response_text}
                              </p>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="text-center text-gray-400 p-4">
                          問い合わせを選択するか、AIがカテゴリ分類するまでお待ちください。
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 一括承認モーダル */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">AI回答ドラフト 一括承認ビュー</h3>
              <Button variant="ghost" size="sm" onClick={() => setBulkModalOpen(false)}>
                ✕
              </Button>
            </div>

            <div className="p-4 flex-grow overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">
                AIが生成した回答ドラフトを確認し、問題なければチェックを入れて一括送信してください。
              </p>

              <div className="space-y-3">
                {inquiries
                  .filter((i) => i.status === "DRAFT_GENERATED")
                  .map((inquiry) => (
                    <div
                      key={inquiry.inquiry_id}
                      className="p-4 border rounded-lg bg-gray-50 flex items-start space-x-3"
                    >
                      <input
                        type="checkbox"
                        checked={selectedForBulk.includes(inquiry.inquiry_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedForBulk([...selectedForBulk, inquiry.inquiry_id]);
                          } else {
                            setSelectedForBulk(selectedForBulk.filter((id) => id !== inquiry.inquiry_id));
                          }
                        }}
                        className="mt-1 h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />

                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-gray-800">
                            {inquiry.order_id} - {inquiry.inquiry_id}
                          </span>
                          <Badge className="bg-blue-100 text-blue-700">
                            {inquiry.ai_category}
                          </Badge>
                        </div>

                        <p className="text-xs font-medium text-gray-500 mb-1">顧客メッセージ:</p>
                        <p className="text-sm text-gray-700 mb-3 italic truncate">
                          {inquiry.customer_message_raw}
                        </p>

                        <p className="text-xs font-medium text-green-600 mb-1">AIドラフト (承認対象):</p>
                        <div className="p-2 bg-white rounded border border-gray-200 text-sm whitespace-pre-wrap max-h-24 overflow-y-auto">
                          {inquiry.ai_draft_text || "AIドラフトなし"}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <Button
                onClick={handleBulkApprove}
                disabled={selectedForBulk.length === 0 || loading}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                チェックした{selectedForBulk.length}件を一括送信・対応完了
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// アイコン不足の補完
function Bell(props: React.SVGProps<SVGSVGElement>) {
  return <MessageSquare {...props} />;
}

function GitCommit(props: React.SVGProps<SVGSVGElement>) {
  return <ListFilter {...props} />;
}

export default InquiryManagementPage;
