'use client'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  itemsPerPage?: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i)
        pages.push('ellipsis-1')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 3) {
        pages.push(1)
        pages.push('ellipsis-2')
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('ellipsis-3')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
        pages.push('ellipsis-4')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-secondary rounded-lg">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {totalItems && itemsPerPage && (
          <span>
            {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems}件
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded border border-border bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          最初
        </button>
        
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded border border-border bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          前へ
        </button>
        
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            const isEllipsis = typeof page === 'string' && page.startsWith('ellipsis')
            const uniqueKey = isEllipsis ? page : `page-${page}`
            
            return isEllipsis ? (
              <span key={uniqueKey} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <button
                key={uniqueKey}
                onClick={() => onPageChange(page as number)}
                className={`px-3 py-1 rounded border text-sm ${
                  currentPage === page
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border bg-background hover:bg-accent'
                }`}
              >
                {page}
              </button>
            )
          })}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded border border-border bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          次へ
        </button>
        
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded border border-border bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          最後
        </button>
      </div>
    </div>
  )
}
