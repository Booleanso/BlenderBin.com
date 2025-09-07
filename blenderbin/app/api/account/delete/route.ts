import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { stripe } from '../../../lib/stripe'
import { initializeApp, getApps, cert } from 'firebase-admin/app'

function ensureAdmin() {
  if (!getApps().length) {
    if (!process.env.FIREBASE_PRIVATE_KEY) throw new Error('Missing FIREBASE_PRIVATE_KEY')
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey
      })
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureAdmin()
    const auth = getAuth()
    const db = getFirestore()

    const authHeader = req.headers.get('authorization') || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null
    if (!idToken) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

    const decoded = await auth.verifyIdToken(idToken)
    const { uid } = await req.json()
    if (!uid || uid !== decoded.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Lookup Stripe customer
    const custRef = db.collection('customers').doc(uid)
    const custDoc = await custRef.get()
    const custData: any = custDoc.exists ? custDoc.data() : {}
    const stripeId: string | undefined = custData?.stripeId

    // Cancel active/trialing subs
    if (stripeId) {
      try {
        const subs = await stripe.subscriptions.list({ customer: stripeId, status: 'all', limit: 100 })
        for (const sub of subs.data) {
          if (['trialing', 'active', 'incomplete', 'past_due', 'unpaid'].includes(sub.status)) {
            try { await stripe.subscriptions.cancel(sub.id) } catch {}
          }
        }
      } catch {}
    }

    // Delete Firestore data (best effort)
    try {
      const batch = db.batch()
      // delete nested subscriptions
      const subsSnap = await custRef.collection('subscriptions').get()
      subsSnap.forEach(d => batch.delete(d.ref))
      // delete checkout sessions
      const csSnap = await custRef.collection('checkout_sessions').get()
      csSnap.forEach(d => batch.delete(d.ref))
      // delete emails_sent
      const esSnap = await custRef.collection('emails_sent').get()
      esSnap.forEach(d => batch.delete(d.ref))
      // delete root customer doc
      batch.delete(custRef)
      // delete user profile doc if present
      const userRef = db.collection('users').doc(uid)
      const uaSnap = await userRef.get()
      if (uaSnap.exists) batch.delete(userRef)
      await batch.commit()
    } catch {}

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}


