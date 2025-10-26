export default function TestPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">テストページ</h1>
      <p className="mb-4">このページが表示されれば、Next.jsは正常に動作しています。</p>
      
      <div className="space-y-4">
        <div className="p-4 bg-green-100 border border-green-300 rounded">
          <h2 className="font-bold">✅ Next.js動作確認</h2>
          <p>ページが正常にレンダリングされています</p>
        </div>

        <div className="p-4 bg-blue-100 border border-blue-300 rounded">
          <h2 className="font-bold">環境変数チェック</h2>
          <p>SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 設定済み' : '❌ 未設定'}</p>
          <p>SUPABASE_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 設定済み' : '❌ 未設定'}</p>
        </div>

        <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">
          <h2 className="font-bold">次のステップ</h2>
          <p>このページが表示されたら、Supabase接続ページに戻ってください</p>
          <a href="/tools/supabase-connection" className="text-blue-600 underline">
            Supabase接続ページへ
          </a>
        </div>
      </div>
    </div>
  )
}
