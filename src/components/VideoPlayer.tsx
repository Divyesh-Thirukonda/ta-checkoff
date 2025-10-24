'use client'

interface VideoPlayerProps {
  signedUrl: string
  className?: string
}

export default function VideoPlayer({ signedUrl, className = '' }: VideoPlayerProps) {
  return (
    <div className={`w-full ${className}`}>
      <video 
        controls 
        className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
        preload="metadata"
      >
        <source src={signedUrl} type="video/mp4" />
        <source src={signedUrl} type="video/webm" />
        <source src={signedUrl} type="video/mov" />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}