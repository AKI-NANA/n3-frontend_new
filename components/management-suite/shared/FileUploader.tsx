'use client'

import React, { useCallback, useState } from 'react'
import { Upload, X, FileText, Image, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'

interface FileUploaderProps {
  accept?: string
  multiple?: boolean
  maxSize?: number // in MB
  onUpload: (files: File[]) => void | Promise<void>
  onError?: (error: string) => void
  className?: string
  uploadText?: string
  processingText?: string
}

export function FileUploader({
  accept = '.csv,.xlsx,.xls',
  multiple = false,
  maxSize = 10,
  onUpload,
  onError,
  className = '',
  uploadText = 'ファイルをドラッグ&ドロップまたはクリックして選択',
  processingText = '処理中...'
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const validateFile = (file: File): string | null => {
    // サイズチェック
    if (file.size > maxSize * 1024 * 1024) {
      return `ファイルサイズが${maxSize}MBを超えています`
    }

    // 拡張子チェック
    if (accept) {
      const acceptedExtensions = accept.split(',').map(ext => ext.trim())
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!acceptedExtensions.includes(fileExtension)) {
        return `許可されていないファイル形式です。(${accept}のみ)`
      }
    }

    return null
  }

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList)
    const validFiles: File[] = []
    const errors: string[] = []

    filesArray.forEach(file => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    })

    if (errors.length > 0 && onError) {
      errors.forEach(error => onError(error))
    }

    if (validFiles.length > 0) {
      if (!multiple) {
        setFiles([validFiles[0]])
      } else {
        setFiles(validFiles)
      }
    }
  }, [accept, maxSize, multiple, onError])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles)
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setProgress(0)

    try {
      // プログレスをシミュレート
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      await onUpload(files)
      
      clearInterval(progressInterval)
      setProgress(100)
      
      setTimeout(() => {
        setFiles([])
        setProgress(0)
        setUploading(false)
      }, 1000)
    } catch (error) {
      setUploading(false)
      setProgress(0)
      if (onError) {
        onError(error instanceof Error ? error.message : 'アップロードに失敗しました')
      }
    }
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <Image className="h-5 w-5" />
    }
    if (['csv', 'xlsx', 'xls'].includes(extension || '')) {
      return <FileText className="h-5 w-5" />
    }
    return <File className="h-5 w-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className={className}>
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8
          transition-colors cursor-pointer
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={uploading}
        />
        
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            {uploading ? processingText : uploadText}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {accept && `対応形式: ${accept}`}
            {maxSize && ` (最大${maxSize}MB)`}
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}

          {uploading && (
            <Progress value={progress} className="w-full" />
          )}

          {!uploading && (
            <Button
              onClick={handleUpload}
              className="w-full"
              disabled={files.length === 0}
            >
              <Upload className="mr-2 h-4 w-4" />
              アップロード
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
