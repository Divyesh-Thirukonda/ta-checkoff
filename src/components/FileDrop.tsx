'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface FileDropProps {
  onFileSelected: (file: File) => void
  maxSizeMB: number
  accept?: string
  className?: string
}

export default function FileDrop({ 
  onFileSelected, 
  maxSizeMB, 
  accept = 'video/*',
  className = '' 
}: FileDropProps) {
  const [error, setError] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError('')
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`File is too large. Maximum size is ${maxSizeMB}MB.`)
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please select a video file.')
      } else {
        setError('File rejected. Please try again.')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setIsUploading(true)
      setUploadProgress(0)
      
      // Simulate progress for user feedback
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval)
            return prev
          }
          return prev + 10
        })
      }, 100)
      
      onFileSelected(file)
      
      // Complete progress after file is selected
      setTimeout(() => {
        setUploadProgress(100)
        setIsUploading(false)
      }, 1000)
    }
  }, [onFileSelected, maxSizeMB])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm']
    },
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: false
  })

  return (
    <div className={`w-full ${className}`}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          {isUploading ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Uploading...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">{uploadProgress}%</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isDragActive ? 'Drop the video here' : 'Upload your lab video'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Maximum file size: {maxSizeMB}MB
              </p>
            </div>
          )}
        </div>
      </div>
      
      {error && (
        <div className="mt-2 text-sm text-red-600 text-center">
          {error}
        </div>
      )}
    </div>
  )
}