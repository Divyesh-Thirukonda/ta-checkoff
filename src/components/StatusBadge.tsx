interface StatusBadgeProps {
  status: 'submitted' | 'approved' | 'rejected' | 'needs_changes'
  className?: string
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
  
  const statusConfig = {
    submitted: {
      classes: 'bg-yellow-100 text-yellow-800',
      text: 'Submitted'
    },
    approved: {
      classes: 'bg-green-100 text-green-800',
      text: 'Approved'
    },
    rejected: {
      classes: 'bg-red-100 text-red-800',
      text: 'Rejected'
    },
    needs_changes: {
      classes: 'bg-orange-100 text-orange-800',
      text: 'Needs Changes'
    }
  }

  const config = statusConfig[status]

  return (
    <span className={`${baseClasses} ${config.classes} ${className}`}>
      {config.text}
    </span>
  )
}