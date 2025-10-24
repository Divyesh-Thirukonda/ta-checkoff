'use client'

import { useState, useEffect } from 'react'
import AuthGate from '@/components/AuthGate'
import Table from '@/components/Table'
import { supabase } from '@/lib/supabaseClient'

interface GradebookEntry {
  id: string
  points: number
  max_points: number
  ta_initials: string
  verified_at: string
  notes: string
  user: {
    email: string
    first_name: string
    last_name: string
    section: string
  }
  lab: {
    code: string
    title: string
  }
}

export default function GradebookPage() {
  const [gradebook, setGradebook] = useState<GradebookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedLab, setSelectedLab] = useState('')
  const [exportFormat, setExportFormat] = useState<'summary' | 'detailed'>('summary')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadGradebook()
  }, [])

  async function loadGradebook() {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('gradebook')
        .select(`
          *,
          user:users(
            email,
            first_name,
            last_name,
            section
          ),
          lab:labs(
            code,
            title
          )
        `)
        .order('verified_at', { ascending: false })

      if (error) {
        console.error('Error loading gradebook:', error)
        setError('Failed to load gradebook')
        return
      }

      setGradebook(data || [])
    } catch (error) {
      console.error('Error loading gradebook:', error)
      setError('Failed to load gradebook')
    } finally {
      setLoading(false)
    }
  }

  async function exportGradebook() {
    try {
      setExporting(true)
      
      const params = new URLSearchParams()
      if (selectedSection) params.append('section', selectedSection)
      params.append('format', exportFormat)
      
      const response = await fetch(`/api/gradebook/export?${params}`)
      
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `gradebook-${exportFormat}-${new Date().toISOString().split('T')[0]}.csv`
      
      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting gradebook:', error)
      setError('Failed to export gradebook')
    } finally {
      setExporting(false)
    }
  }

  // Filter gradebook entries
  const filteredGradebook = gradebook.filter(entry => {
    if (selectedSection && entry.user.section !== selectedSection) return false
    if (selectedLab && entry.lab.code !== selectedLab) return false
    return true
  })

  // Get unique sections and labs for filters
  const uniqueSections = Array.from(new Set(gradebook.map(e => e.user.section).filter(Boolean))).sort()
  const uniqueLabs = Array.from(new Set(gradebook.map(e => e.lab.code))).sort()

  // Calculate summary stats
  const totalEntries = filteredGradebook.length
  const averageScore = filteredGradebook.length > 0 
    ? (filteredGradebook.reduce((sum, e) => sum + (e.points / e.max_points), 0) / filteredGradebook.length * 100).toFixed(1)
    : '0'

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
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Gradebook</h1>
                <p className="text-gray-600">View and export student lab completion records</p>
              </div>
              <div className="flex gap-3">
                <a href="/dashboard" className="btn-secondary">
                  Back to Dashboard
                </a>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Stats and Controls */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalEntries}</div>
                  <div className="text-sm text-gray-600">Completed Labs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{averageScore}%</div>
                  <div className="text-sm text-gray-600">Average Score</div>
                </div>
              </div>

              {/* Filters and Export */}
              <div className="flex flex-col sm:flex-row gap-4">
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

                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'summary' | 'detailed')}
                  className="input-field"
                >
                  <option value="summary">Summary Format</option>
                  <option value="detailed">Detailed Format</option>
                </select>

                <button
                  onClick={exportGradebook}
                  disabled={exporting}
                  className="btn-primary whitespace-nowrap"
                >
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>
          </div>

          {/* Gradebook Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <Table headers={['Student', 'Lab', 'Score', 'TA', 'Date', 'Notes']}>
              {filteredGradebook.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {entry.user.first_name} {entry.user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{entry.user.email}</div>
                      {entry.user.section && (
                        <div className="text-sm text-gray-500">Section {entry.user.section}</div>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{entry.lab.title}</div>
                    <div className="text-sm text-gray-500">{entry.lab.code}</div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {entry.points}/{entry.max_points}
                    </div>
                    <div className="text-sm text-gray-500">
                      {((entry.points / entry.max_points) * 100).toFixed(1)}%
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.ta_initials}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(entry.verified_at).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {entry.notes || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>

            {filteredGradebook.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No gradebook entries found matching the current filters.
              </div>
            )}
          </div>

          {/* Export Format Info */}
          <div className="mt-6 text-sm text-gray-600">
            <p><strong>Summary Format:</strong> One row per student with all lab scores in columns</p>
            <p><strong>Detailed Format:</strong> One row per completed lab with full details</p>
          </div>
        </div>
      </div>
    </AuthGate>
  )
}