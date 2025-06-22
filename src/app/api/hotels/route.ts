import { NextResponse } from 'next/server';
import { getAllHotels } from '@/lib/hotels';

export async function GET() {
  try {
    const hotels = getAllHotels();
    return NextResponse.json(hotels);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotels' },
      { status: 500 }
    );
  }
}