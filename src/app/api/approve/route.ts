import { NextRequest, NextResponse } from 'next/server'
import { requireTA } from '@/lib/serverAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    // Verify TA role
    const ta = await requireTA()
    
    const { submissionId, decision, points, comment } = await request.json()
    
    if (!submissionId || !decision) {
      return NextResponse.json(
        { error: 'submissionId and decision are required' },
        { status: 400 }
      )
    }

    if (!['approved', 'rejected', 'needs_changes'].includes(decision)) {
      return NextResponse.json(
        { error: 'Invalid decision value' },
        { status: 400 }
      )
    }

    // Get submission details
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .select(`
        *,
        user:users(*),
        lab:labs(*)
      `)
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Insert verification record
    const { error: verificationError } = await supabaseAdmin
      .from('verifications')
      .insert({
        submission_id: submissionId,
        ta_user_id: ta.id,
        decision,
        points: decision === 'approved' ? points : null,
        initials: ta.initials || (ta.first_name?.charAt(0) || '') + (ta.last_name?.charAt(0) || '') || 'TA',
        comment
      })

    if (verificationError) {
      console.error('Error inserting verification:', verificationError)
      return NextResponse.json(
        { error: 'Failed to create verification' },
        { status: 500 }
      )
    }

    // Update submission status
    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({ status: decision })
      .eq('id', submissionId)

    if (updateError) {
      console.error('Error updating submission:', updateError)
      return NextResponse.json(
        { error: 'Failed to update submission status' },
        { status: 500 }
      )
    }

    // If approved, add/update gradebook entry
    if (decision === 'approved') {
      try {
        const initials = ta.initials || (ta.first_name?.charAt(0) || '') + (ta.last_name?.charAt(0) || '') || 'TA'
        const finalPoints = points || 100
        
        const gradebookEntry = {
          user_id: submission.user.id,
          lab_id: submission.lab.id,
          points: finalPoints,
          max_points: 100,
          ta_initials: initials,
          notes: comment || null
        }

        // Upsert gradebook entry
        const { error: gradebookError } = await supabaseAdmin
          .from('gradebook')
          .upsert(gradebookEntry, { 
            onConflict: 'user_id,lab_id',
            ignoreDuplicates: false 
          })

        if (gradebookError) {
          console.error('Error updating gradebook:', gradebookError)
          // Don't fail the request, but log for retry
          await supabaseAdmin
            .from('audit_log')
            .insert({
              actor: ta.id,
              action: 'gradebook_update_failed',
              entity: 'submission',
              entity_id: submissionId,
              meta: {
                type: 'gradebook_update',
                payload: gradebookEntry,
                error: gradebookError.message
              }
            })
        }
      } catch (gradebookError) {
        console.error('Error updating gradebook:', gradebookError)
        
        // Log the error for retry but don't fail the request
        await supabaseAdmin
          .from('audit_log')
          .insert({
            actor: ta.id,
            action: 'gradebook_update_failed',
            entity: 'submission',
            entity_id: submissionId,
            meta: {
              type: 'gradebook_update',
              payload: {
                studentEmail: submission.user.email,
                labCode: submission.lab.code,
                points: points || 100,
                initials: ta.initials || 'TA'
              },
              error: (gradebookError as Error).message
            }
          })
      }
    }

    // Log the action
    await supabaseAdmin
      .from('audit_log')
      .insert({
        actor: ta.id,
        action: `submission_${decision}`,
        entity: 'submission',
        entity_id: submissionId,
        meta: { points, comment }
      })

    return NextResponse.json({ 
      success: true,
      verification: {
        decision,
        points,
        initials: ta.initials || 'TA'
      }
    })
  } catch (error) {
    console.error('Error in approve:', error)
    
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