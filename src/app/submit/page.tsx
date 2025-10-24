'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthGate from '@/components/AuthGate'
import FileDrop from '@/components/FileDrop'
import StatusBadge from '@/components/StatusBadge'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser, User } from '@/lib/auth'

interface Submission {
  id: string
  video_path: string
  notes: string
  repo_url: string
  status: 'submitted' | 'approved' | 'rejected' | 'needs_changes'
  created_at: string
  updated_at: string
}

interface Lab {
  id: string
  code: string
  title: string
  section: string
  due_date: string
}

export default function SubmitPage() {
  const searchParams = useSearchParams()
  const labNumber = searchParams.get('lab')
  const section = searchParams.get('section')
  
  const [user, setUser] = useState<User | null>(null)
  const [lab, setLab] = useState<Lab | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [notes, setNotes] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [labNumber])

  async function loadData() {
    try {
      setLoading(true)
      
      // Get current user
      const currentUser = await getCurrentUser()
      if (!currentUser) return
      
      setUser(currentUser)

      // Update user section if provided and empty
      if (section && !currentUser.section) {
        await supabase
          .from('users')
          .update({ section })
          .eq('id', currentUser.id)
      }

      if (!labNumber) {
        setError('Lab number is required')
        return
      }

      const labCode = `lab-${labNumber.padStart(2, '0')}`

      // Get lab
      const { data: labData, error: labError } = await supabase
        .from('labs')
        .select('*')
        .eq('code', labCode)
        .single()

      if (labError && labError.code !== 'PGRST116') {
        console.error('Error fetching lab:', labError)
        setError('Failed to load lab information')
        return
      }

      if (!labData) {
        // Create lab if it doesn't exist
        const { data: newLab, error: createError } = await supabase
          .from('labs')
          .insert({
            code: labCode,
            title: `Lab ${labNumber}`,
            section: section || null
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating lab:', createError)
          setError('Failed to create lab')
          return
        }

        setLab(newLab)

        // Get existing submission for the new lab
        const { data: submissionData } = await supabase
          .from('submissions')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('lab_id', newLab.id)
          .single()

        if (submissionData) {
          setSubmission(submissionData)
          setNotes(submissionData.notes || '')
          setRepoUrl(submissionData.repo_url || '')
        }
      } else {
        setLab(labData)

        // Get existing submission for the existing lab
        const { data: submissionData } = await supabase
          .from('submissions')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('lab_id', labData.id)
          .single()

        if (submissionData) {
          setSubmission(submissionData)
          setNotes(submissionData.notes || '')
          setRepoUrl(submissionData.repo_url || '')
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmission() {
    if (!user || !lab || !selectedFile) return

    try {
      setUploading(true)
      setError('')
      setSuccess('')

      const maxSizeMB = parseInt(process.env.NEXT_PUBLIC_MAX_VIDEO_MB || '200')
      if (selectedFile.size > maxSizeMB * 1024 * 1024) {
        setError(`File size must be less than ${maxSizeMB}MB`)
        return
      }

      // Upload file to Supabase Storage
      const timestamp = Date.now()
      const filePath = `${user.auth_user_id}/${lab.code}/${timestamp}.mp4`
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, selectedFile)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        setError('Failed to upload video')
        return
      }

      // Create or update submission
      const submissionData = {
        user_id: user.id,
        lab_id: lab.id,
        video_path: filePath,
        notes: notes.trim(),
        repo_url: repoUrl.trim(),
        status: 'submitted' as const
      }

      if (submission) {
        // Update existing submission
        const { error: updateError } = await supabase
          .from('submissions')
          .update(submissionData)
          .eq('id', submission.id)

        if (updateError) {
          console.error('Update error:', updateError)
          setError('Failed to update submission')
          return
        }
      } else {
        // Create new submission
        const { data: newSubmission, error: insertError } = await supabase
          .from('submissions')
          .insert(submissionData)
          .select()
          .single()

        if (insertError) {
          console.error('Insert error:', insertError)
          setError('Failed to create submission')
          return
        }

        setSubmission(newSubmission)
      }

      setSuccess('Lab submitted successfully!')
      setSelectedFile(null)
      
      // Reload submission data
      await loadData()
    } catch (error) {
      console.error('Submission error:', error)
      setError('Failed to submit lab')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <AuthGate>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AuthGate>
    )
  }

  return (
    <AuthGate>
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Submit {lab?.title || `Lab ${labNumber}`}
              </h1>
              {user && (
                <p className="text-gray-600">
                  Welcome, {user.first_name} {user.last_name} ({user.email})
                  {user.section && ` - Section ${user.section}`}
                </p>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-600">{success}</p>
              </div>
            )}

            {submission && (
              <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Current Submission</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-700">Status:</span>
                    <StatusBadge status={submission.status} />
                  </div>
                  <p className="text-blue-700">
                    Submitted: {new Date(submission.created_at).toLocaleString()}
                  </p>
                  {submission.status !== 'approved' && (
                    <p className="text-blue-600 text-sm">
                      You can resubmit to replace your current submission.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Video</h3>
                <FileDrop
                  onFileSelected={setSelectedFile}
                  maxSizeMB={parseInt(process.env.NEXT_PUBLIC_MAX_VIDEO_MB || '200')}
                />
                {selectedFile && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                    Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field"
                  placeholder="Any additional notes about your submission..."
                />
              </div>

              <div>
                <label htmlFor="repo" className="block text-sm font-medium text-gray-700 mb-2">
                  Repository URL (optional)
                </label>
                <input
                  id="repo"
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://github.com/username/repository"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSubmission}
                  disabled={!selectedFile || uploading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Submitting...' : submission ? 'Update Submission' : 'Submit Lab'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGate>
  )
}