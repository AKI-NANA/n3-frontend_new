'use client'

import { Plus, Trash2 } from 'lucide-react'

interface DomesticShippingStepProps {
  formData: any
  carriers: any[]
  services: any[]
  onChange: (data: any) => void
}

export function DomesticShippingStep({
  formData,
  carriers,
  services,
  onChange
}: DomesticShippingStepProps) {
  function addDomesticService() {
    const newService = {
      id: Date.now(),
      optionType: 'DOMESTIC',
      costType: 'FLAT',
      carrierId: carriers[0]?.id || '',
      serviceId: services[0]?.id || '',
      baseShipping: 0,
      additionalShipping: 0,
    }
    
    onChange({
      domesticServices: [...formData.domesticServices, newService]
    })
  }

  function removeService(id: number) {
    onChange({
      domesticServices: formData.domesticServices.filter((s: any) => s.id !== id)
    })
  }

  function updateService(id: number, updates: any) {
    onChange({
      domesticServices: formData.domesticServices.map((s: any) =>
        s.id === id ? { ...s, ...updates } : s
      )
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-xl">🏠</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            国内配送設定 / Domestic Shipping
          </h2>
          <p className="text-sm text-gray-600">
            マーケットプレイス内の配送サービスを設定します
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">配送サービス</h3>
        <button
          onClick={addDomesticService}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          サービス追加
        </button>
      </div>

      {formData.domesticServices.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-600">国内配送サービスがありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {formData.domesticServices.map((service: any) => (
            <div key={service.id} className="border-2 rounded-lg p-4">
              <div className="flex justify-between mb-4">
                <span className="font-semibold">国内配送サービス</span>
                <button onClick={() => removeService(service.id)} className="text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">配送業者</label>
                  <select
                    value={service.carrierId}
                    onChange={(e) => updateService(service.id, { carrierId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {carriers.map((carrier: any) => (
                      <option key={carrier.id} value={carrier.id}>
                        {carrier.carrier_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">配送サービス</label>
                  <select
                    value={service.serviceId}
                    onChange={(e) => updateService(service.id, { serviceId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {services
                      .filter((s: any) => s.carrier_id === service.carrierId)
                      .map((svc: any) => (
                        <option key={svc.id} value={svc.id}>
                          {svc.service_name}
                        </option>
                      ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">基本送料</label>
                  <input
                    type="number"
                    value={service.baseShipping}
                    onChange={(e) => updateService(service.id, { baseShipping: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">追加送料</label>
                  <input
                    type="number"
                    value={service.additionalShipping}
                    onChange={(e) => updateService(service.id, { additionalShipping: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
