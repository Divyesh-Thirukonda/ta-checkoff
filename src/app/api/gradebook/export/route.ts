import { NextRequest, NextResponse } from 'next/server'
import { requireTA } from '@/lib/serverAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    // Verify TA role
    await requireTA()
    
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')
    const format = searchParams.get('format') || 'summary' // 'summary' or 'detailed'

    // Get all students and their lab completions
    const { data: gradebookData, error } = await supabaseAdmin
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
      .order('user.last_name')

    if (error) {
      console.error('Error fetching gradebook for export:', error)
      return NextResponse.json(
        { error: 'Failed to fetch gradebook data' },
        { status: 500 }
      )
    }

    // Filter by section if provided
    const filteredData = section 
      ? gradebookData.filter(entry => entry.user.section === section)
      : gradebookData

    if (format === 'detailed') {
      // Detailed format: One row per gradebook entry
      const csvHeaders = [
        'Student Email',
        'First Name',
        'Last Name',
        'Section',
        'Lab Code',
        'Lab Title',
        'Points',
        'Max Points',
        'Percentage',
        'TA Initials',
        'Verified Date',
        'Notes'
      ]

      const csvRows = filteredData.map(entry => [
        entry.user.email,
        entry.user.first_name || '',
        entry.user.last_name || '',
        entry.user.section || '',
        entry.lab.code,
        entry.lab.title,
        entry.points.toString(),
        entry.max_points.toString(),
        ((entry.points / entry.max_points) * 100).toFixed(1) + '%',
        entry.ta_initials,
        new Date(entry.verified_at).toLocaleDateString(),
        entry.notes || ''
      ])

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n')

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="gradebook-detailed-${section || 'all'}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else {
      // Summary format: One row per student with all labs as columns
      
      // Get all unique students and labs
      const students = new Map()
      const labs = new Set()

      filteredData.forEach(entry => {
        const studentKey = entry.user.email
        labs.add(entry.lab.code)
        
        if (!students.has(studentKey)) {
          students.set(studentKey, {
            email: entry.user.email,
            firstName: entry.user.first_name || '',
            lastName: entry.user.last_name || '',
            section: entry.user.section || '',
            labs: new Map()
          })
        }
        
        students.get(studentKey).labs.set(entry.lab.code, {
          points: entry.points,
          maxPoints: entry.max_points,
          initials: entry.ta_initials,
          date: new Date(entry.verified_at).toLocaleDateString()
        })
      })

      const sortedLabs = Array.from(labs).sort()
      
      // Build CSV headers
      const csvHeaders = [
        'Student Email',
        'First Name', 
        'Last Name',
        'Section'
      ]
      
      // Add columns for each lab
      sortedLabs.forEach(lab => {
        csvHeaders.push(`${lab} Points`)
        csvHeaders.push(`${lab} TA`)
        csvHeaders.push(`${lab} Date`)
      })
      
      csvHeaders.push('Total Points')
      csvHeaders.push('Total Possible')
      csvHeaders.push('Overall Percentage')

      // Build CSV rows
      const csvRows = Array.from(students.values()).map(student => {
        const row = [
          student.email,
          student.firstName,
          student.lastName,
          student.section
        ]
        
        let totalPoints = 0
        let totalPossible = 0
        
        sortedLabs.forEach(lab => {
          const labData = student.labs.get(lab)
          if (labData) {
            row.push(labData.points.toString())
            row.push(labData.initials)
            row.push(labData.date)
            totalPoints += labData.points
            totalPossible += labData.maxPoints
          } else {
            row.push('0')
            row.push('')
            row.push('')
            totalPossible += 100 // Assume 100 points max per lab
          }
        })
        
        row.push(totalPoints.toString())
        row.push(totalPossible.toString())
        row.push(totalPossible > 0 ? ((totalPoints / totalPossible) * 100).toFixed(1) + '%' : '0%')
        
        return row
      })

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n')

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="gradebook-summary-${section || 'all'}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }
    
  } catch (error) {
    console.error('Error in gradebook export:', error)
    
    if ((error as Error).message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if ((error as Error).message === 'TA or admin role required') {
      return NextResponse.json(
        { error: 'TA or admin role required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}