import { NextResponse } from 'next/server';
import { db } from '../../lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const scriptNames = request.headers.get('script-names')?.split(',');
    if (!scriptNames?.length) {
      return NextResponse.json({ error: 'Script names are required' }, { status: 400 });
    }

    const fullScriptNames = scriptNames.map(name => 
      name.endsWith('.py') ? name : `${name}.py`
    );
    
    const clickPromises = fullScriptNames.map(scriptName => 
      db.collection('script_clicks')
        .doc('BACKEND')
        .collection('SCRIPTS')
        .doc(scriptName)
        .get()
    );

    const snapshots = await Promise.all(clickPromises);
    const clickData: { [key: string]: number } = {};

    snapshots.forEach((snap, index) => {
      const originalName = scriptNames[index];
      clickData[originalName] = snap.exists ? (snap.data()?.clicks || 0) : 0;
    });

    return NextResponse.json({ clickData });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}