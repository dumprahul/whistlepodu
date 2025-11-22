import { NextRequest, NextResponse } from 'next/server';
import { transferWhistleTokens } from '@/lib/hts';

/**
 * API Route: Transfer WHISTLE tokens to a receiver account
 * POST /api/hts/transfer-tokens
 * Body: { receiverAccountId: string, amount?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { receiverAccountId, amount = 10 } = body;

    if (!receiverAccountId) {
      return NextResponse.json(
        { success: false, error: 'Receiver account ID is required' },
        { status: 400 }
      );
    }

    // Validate account ID format (basic validation: should be like "0.0.1234567")
    if (!/^0\.0\.\d+$/.test(receiverAccountId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Hedera Account ID format. Expected format: 0.0.1234567' },
        { status: 400 }
      );
    }

    // Transfer tokens
    const result = await transferWhistleTokens(receiverAccountId, amount);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in transfer-tokens API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to transfer tokens'
      },
      { status: 500 }
    );
  }
}

