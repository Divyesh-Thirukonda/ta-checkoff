'use client'

import { useState, useEffect } from 'react'
import AuthGate from '@/components/AuthGate'
import Table from '@/components/Table'
import StatusBadge from '@/components/StatusBadge'
import VideoPlayer from '@/components/VideoPlayer'
import { supabase } from '@/lib/supabaseClient'

interface SubmissionWithDetails {
  id: string
  video_path: string
  notes: string
  repo_url: string
  status: 'submitted' | 'approved' | 'rejected' | 'needs_changes'
  created_at: string
  updated_at: string
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    section: string
  }
  lab: {
    id: string
    code: string
    title: string
    section: string
  }
  verifications: Array<{
    id: string
    decision: string
    points: number
    initials: string
    comment: string
    verified_at: string
  }>
}

interface ApprovalModalData {
  submissionId: string
  studentName: string
  labTitle: string
}

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<SubmissionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Filters
  const [selectedLab, setSelectedLab] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  
  // Video playback
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})
  const [loadingVideo, setLoadingVideo] = useState<Record<string, boolean>>({})
  
  // Approval modal
  const [approvalModal, setApprovalModal] = useState<ApprovalModalData | null>(null)
  const [approvalDecision, setApprovalDecision] = useState<'approved' | 'rejected' | 'needs_changes'>('approved')
  const [approvalPoints, setApprovalPoints] = useState(100)
  const [approvalComment, setApprovalComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadSubmissions()
  }, [])

  useEffect(() => {
    filterSubmissions()
  }, [submissions, selectedLab, selectedSection, selectedStatus])

  async function loadSubmissions() {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          user:users(*),
          lab:labs(*),
          verifications(*)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading submissions:', error)
        setError('Failed to load submissions')
        return
      }

      setSubmissions(data || [])
    } catch (error) {
      console.error('Error loading submissions:', error)
      setError('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  function filterSubmissions() {
    let filtered = submissions

    if (selectedLab) {
      filtered = filtered.filter(s => s.lab.code === selectedLab)
    }

    if (selectedSection) {
      filtered = filtered.filter(s => s.user.section === selectedSection)
    }

    if (selectedStatus) {
      filtered = filtered.filter(s => s.status === selectedStatus)
    }

    setFilteredSubmissions(filtered)
  }

  async function loadVideo(submissionId: string, videoPath: string) {
    if (videoUrls[submissionId]) return

    try {
      setLoadingVideo(prev => ({ ...prev, [submissionId]: true }))

      const response = await fetch('/api/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: videoPath })
      })

      if (!response.ok) {
        throw new Error('Failed to get signed URL')
      }

      const { signedUrl } = await response.json()
      setVideoUrls(prev => ({ ...prev, [submissionId]: signedUrl }))
    } catch (error) {
      console.error('Error loading video:', error)
      setError('Failed to load video')
    } finally {
      setLoadingVideo(prev => ({ ...prev, [submissionId]: false }))
    }
  }

  function openApprovalModal(submission: SubmissionWithDetails, decision: 'approved' | 'rejected' | 'needs_changes') {
    setApprovalModal({
      submissionId: submission.id,
      studentName: `${submission.user.first_name} ${submission.user.last_name}`,
      labTitle: submission.lab.title
    })
    setApprovalDecision(decision)
    setApprovalPoints(decision === 'approved' ? 100 : 0)
    setApprovalComment('')
  }

  async function handleApproval() {
    if (!approvalModal) return

    try {
      setSubmitting(true)

      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: approvalModal.submissionId,
          decision: approvalDecision,
          points: approvalDecision === 'approved' ? approvalPoints : null,
          comment: approvalComment.trim() || null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process approval')
      }

      // Reload submissions
      await loadSubmissions()
      
      // Close modal
      setApprovalModal(null)
    } catch (error) {
      console.error('Error processing approval:', error)
      setError('Failed to process approval')
    } finally {
      setSubmitting(false)
    }
  }

  const uniqueLabs = Array.from(new Set(submissions.map(s => s.lab.code))).sort()
  const uniqueSections = Array.from(new Set(submissions.map(s => s.user.section).filter(Boolean))).sort()

  if (loading) {
    return (
      <AuthGate requireRole="ta">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AuthGate>
    )
  }

  return (
    <AuthGate requireRole="ta">
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">TA Dashboard</h1>
                <p className="text-gray-600">Review and approve student lab submissions</p>
              </div>
              <div className="flex gap-3">
                <a href="/gradebook" className="btn-secondary">
                  View Gradebook
                </a>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lab</label>
                <select
                  value={selectedLab}
                  onChange={(e) => setSelectedLab(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Labs</option>
                  {uniqueLabs.map(lab => (
                    <option key={lab} value={lab}>{lab}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Sections</option>
                  {uniqueSections.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="needs_changes">Needs Changes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <Table headers={['Student', 'Lab', 'Section', 'Status', 'Submitted', 'Video', 'Actions']}>
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {submission.user.first_name} {submission.user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{submission.user.email}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{submission.lab.title}</div>
                    <div className="text-sm text-gray-500">{submission.lab.code}</div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {submission.user.section || '-'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={submission.status} />
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(submission.created_at).toLocaleDateString()}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {videoUrls[submission.id] ? (
                      <VideoPlayer signedUrl={videoUrls[submission.id]} className="max-w-xs" />
                    ) : (
                      <button
                        onClick={() => loadVideo(submission.id, submission.video_path)}
                        disabled={loadingVideo[submission.id]}
                        className="btn-secondary text-sm"
                      >
                        {loadingVideo[submission.id] ? 'Loading...' : 'Load Video'}
                      </button>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {submission.status !== 'approved' && (
                      <>
                        <button
                          onClick={() => openApprovalModal(submission, 'approved')}
                          className="btn-primary text-xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openApprovalModal(submission, 'rejected')}
                          className="btn-danger text-xs"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => openApprovalModal(submission, 'needs_changes')}
                          className="btn-secondary text-xs"
                        >
                          Needs Changes
                        </button>
                      </>
                    )}
                    
                    {submission.notes && (
                      <div className="mt-2 text-xs text-gray-600">
                        <strong>Notes:</strong> {submission.notes}
                      </div>
                    )}
                    
                    {submission.repo_url && (
                      <div className="mt-1">
                        <a 
                          href={submission.repo_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View Repository
                        </a>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
            
            {filteredSubmissions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No submissions found matching the current filters.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {approvalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {approvalDecision === 'approved' ? 'Approve' : 
               approvalDecision === 'rejected' ? 'Reject' : 'Request Changes'}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Student: <strong>{approvalModal.studentName}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Lab: <strong>{approvalModal.labTitle}</strong>
              </p>
            </div>

            {approvalDecision === 'approved' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={approvalPoints}
                  onChange={(e) => setApprovalPoints(parseInt(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment (optional)
              </label>
              <textarea
                rows={3}
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                className="input-field"
                placeholder="Add any feedback or comments..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApproval}
                disabled={submitting}
                className="btn-primary flex-1"
              >
                {submitting ? 'Processing...' : 'Confirm'}
              </button>
              <button
                onClick={() => setApprovalModal(null)}
                disabled={submitting}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGate>
  )
}