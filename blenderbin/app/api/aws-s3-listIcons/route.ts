import { NextResponse } from 'next/server';
import { getIconsMap } from '../../lib/S3';

export async function GET() {
  try {
    const iconMap = await getIconsMap(
      process.env.AWS_BUCKET_NAME!,
      'BACKEND/ADDON_REFERENCES/ADDON_ICONS/'
    );

    return NextResponse.json(iconMap);
  } catch (error) {
    console.error('S3 Icon Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch icons' },
      { status: 500 }
    );
  }
}