import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const greetings = await db.query(
      'SELECT * FROM greetings ORDER BY created_at DESC'
    );
    return NextResponse.json(greetings.rows);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch greetings' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { text, description, isActive } = await req.json();
    
    const result = await db.query(
      `INSERT INTO greetings (text, description, is_active)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [text, description, isActive]
    );
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create greeting' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { id, text, description, isActive } = await req.json();
    
    const result = await db.query(
      `UPDATE greetings
       SET text = $1, description = $2, is_active = $3
       WHERE id = $4
       RETURNING *`,
      [text, description, isActive, id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Greeting not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update greeting' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    
    const result = await db.query(
      'DELETE FROM greetings WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Greeting not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete greeting' },
      { status: 500 }
    );
  }
}