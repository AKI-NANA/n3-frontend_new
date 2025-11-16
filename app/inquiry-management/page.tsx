// app/inquiry-management/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ListFilter,
  MessageSquare,
  CheckCircle,
  Lightbulb,
  Clock,
  Mail,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// -- データ型定義 --
interface Inquiry {
  id: string;
  orderId: string;
  customerName: string;
  receivedAt: Date;
  status: "PENDING" | "AI_DRAFTED" | "APPROVED" | "SENT";
  category: "DELIVERY" | "RETURN" | "PRODUCT" | "OTHER";
  customerMessage: string;
  aiDraft: string | null;
}

// -- モックデータ --
const MOCK_INQUIRIES: Inquiry[] = [
  {
    id: "IQ-001",
    orderId: "ORD-1005",
    customerName: "佐藤",
    receivedAt: new Date(Date.now() - 3600000),
    status: "AI_DRAFTED",
    category: "DELIVERY",
    customerMessage: "注文した商品がまだ届きません。追跡番号を教えてください。",
    aiDraft:
      "佐藤様、お世話になります。ご注文の品ですが、現在システムで確認したところ、本日中に[追跡番号]にて発送が完了する予定です。追跡番号: [追跡番号] ",
  },
  {
    id: "IQ-002",
    orderId: "ORD-1002",
    customerName: "田中",
    receivedAt: new Date(Date.now() - 7200000),
    status: "PENDING",
    category: "RETURN",
    customerMessage:
      "届いた商品に傷がありました。返品または交換は可能でしょうか？",
    aiDraft: null,
  },
  {
    id: "IQ-003",
    orderId: "ORD-1010",
    customerName: "山田",
    receivedAt: new Date(Date.now() - 86400000),
    status: "AI_DRAFTED",
    category: "PRODUCT",
    customerMessage: "この商品の色違いはありますか？",
    aiDraft:
      "山田様、お問い合わせありがとうございます。恐れ入りますが、現在[商品名]の色違いの在庫はございません。",
  },
];

const InquiryManagementPage: React.FC = () => {
  const [inquiries, setInquiries] = useState(MOCK_INQUIRIES);
  const [filter, setFilter] = useState("AI_DRAFTED");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  // フィルタリング
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((q) => filter === "all" || q.status === filter);
  }, [inquiries, filter]);

  // AI一括承認
  const handleApproveAll = () => {
    const draftsToApprove = inquiries.filter((q) => q.status === "AI_DRAFTED");
    if (draftsToApprove.length === 0) {
      alert("承認待ちのAIドラフトはありません。");
      return;
    }

    const approvedIds = draftsToApprove.map((d) => d.id);
    setInquiries(
      inquiries.map((q) =>
        approvedIds.includes(q.id) ? { ...q, status: "SENT" } : q
      )
    );
    console.log(
      `[ACTION] ${draftsToApprove.length} 件のAIドラフトを一括承認・送信しました。`
    );
    alert(
      `${draftsToApprove.length} 件のAIドラフトを一括承認し、顧客に送信しました。`
    );
  };

  // カテゴリに応じたナレッジベースの動的表示
  const getBestPractice = (category: Inquiry["category"]) => {
    switch (category) {
      case "DELIVERY":
        return {
          title: "配送遅延/追跡番号の問い合わせ",
          content:
            "「現在確認中」ではなく、「いつまでに」「誰が」対応するかを明記。追跡番号は必ず受注管理DBと連携して取得する。",
        };
      case "RETURN":
        return {
          title: "返品・不具合の問い合わせ",
          content:
            "謝罪から始め、具体的な対応ステップ（返送先住所、写真の添付依頼）を箇条書きで分かりやすく提示する。",
        };
      default:
        return {
          title: "マニュアルの利用",
          content: "左側のマニュアルタブから詳細を参照してください。",
        };
    }
  };

  const currentBestPractice = selectedInquiry
    ? getBestPractice(selectedInquiry.category)
    : getBestPractice("OTHER");

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <Card className="border-t-4 border-t-purple-600">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-purple-700">
            <MessageSquare className="h-6 w-6" /> 問い合わせ・通知管理ツール
          </CardTitle>
          <Button
            onClick={handleApproveAll}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center"
          >
            <CheckCircle className="h-4 w-4 mr-2" /> AIドラフトを一括承認・送信
            ({inquiries.filter((q) => q.status === "AI_DRAFTED").length}件)
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. 問い合わせリスト */}
            <div className="lg:col-span-1 space-y-4">
              <Select onValueChange={setFilter} defaultValue="AI_DRAFTED">
                <SelectTrigger className="w-full bg-white border-purple-300">
                  <ListFilter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="ステータスでフィルタ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AI_DRAFTED">AIドラフト承認待ち</SelectItem>
                  <SelectItem value="PENDING">未処理（AI処理待ち）</SelectItem>
                  <SelectItem value="SENT">対応完了（送信済み）</SelectItem>
                  <SelectItem value="all">全て</SelectItem>
                </SelectContent>
              </Select>

              <ScrollArea className="h-[70vh] rounded-md border bg-white">
                {filteredInquiries.map((inq) => (
                  <div
                    key={inq.id}
                    className={`p-3 border-b cursor-pointer hover:bg-purple-50 ${
                      selectedInquiry?.id === inq.id
                        ? "bg-purple-100 border-l-4 border-l-purple-600"
                        : ""
                    }`}
                    onClick={() => setSelectedInquiry(inq)}
                  >
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold">
                        {inq.customerName} - {inq.orderId}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          inq.status === "AI_DRAFTED"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {inq.status === "AI_DRAFTED"
                          ? "AI承認待ち"
                          : inq.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate mt-1">
                      {inq.customerMessage}
                    </p>
                    <span className="text-xs text-gray-400 flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {inq.receivedAt.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                {filteredInquiries.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    該当する問い合わせはありません。
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* 2. 詳細パネルとAIドラフト */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">
                    {selectedInquiry
                      ? `【${selectedInquiry.category}】${selectedInquiry.customerName} 様からのメッセージ`
                      : "問い合わせを選択してください"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedInquiry && (
                    <>
                      <div className="p-4 bg-gray-100 rounded-lg border-l-4 border-l-purple-500">
                        <p className="font-medium text-gray-700">
                          顧客メッセージ (受注ID: {selectedInquiry.orderId})
                        </p>
                        <p className="mt-1 text-sm">
                          {selectedInquiry.customerMessage}
                        </p>
                      </div>

                      {/* AIドラフト表示 */}
                      <div className="p-4 border-2 border-dashed border-green-400 bg-green-50 rounded-lg">
                        <p className="font-medium text-green-700 flex items-center">
                          <Mail className="h-4 w-4 mr-2" /> AI生成回答ドラフト
                          <span className="ml-auto text-xs text-green-600">
                            最終生成: {new Date().toLocaleTimeString()}
                          </span>
                        </p>
                        <Textarea
                          rows={8}
                          defaultValue={
                            selectedInquiry.aiDraft ||
                            "AIによる回答ドラフトを生成中です..."
                          }
                          className="mt-2 bg-white"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline">手動で承認</Button>
                        <Button className="bg-red-500 hover:bg-red-600">
                          顧客へ送信
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* 3. ナレッジベース統合 (外注サポート) */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-yellow-700">
                    <Lightbulb className="h-5 w-5" /> 対応マニュアル / サンプル
                    (AI動的表示)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold text-base">
                    {currentBestPractice.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {currentBestPractice.content}
                  </p>
                  <div className="mt-3 text-xs text-blue-500 cursor-pointer hover:underline">
                    → 全ナレッジベースを検索
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InquiryManagementPage;
