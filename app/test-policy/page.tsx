import { CreateTestPolicy } from '@/components/shipping-policy/CreateTestPolicy'

export default function TestPolicyPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">配送ポリシーテスト作成</h1>
      <CreateTestPolicy />
    </div>
  )
}
