import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// DELETE - テンプレート削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const id = parseInt(params.id)

    const { error } = await supabase
      .from('html_templates')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete template:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
