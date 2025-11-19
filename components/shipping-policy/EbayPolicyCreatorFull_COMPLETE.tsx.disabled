'use client'

import { useState, useEffect } from 'react'
import { Plus, X, ChevronDown, ChevronRight, Search, MoreVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RateTableCreator } from './RateTableCreator'

// ... (前半部分は同じなので省略。SHIPPING_METHODSとALL_SHIPPING_SERVICESの定義)

// ファイルの残りの部分
                        <label
                          key={dest}
                          className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedDestinations.has(dest)}
                            onChange={(e) => {
                              const newSet = new Set(selectedDestinations)
                              if (e.target.checked) {
                                newSet.add(dest)
                              } else {
                                newSet.delete(dest)
                              }
                              setSelectedDestinations(newSet)
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{dest}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
