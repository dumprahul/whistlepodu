/**
 * Client-side HTS (Hedera Token Service) functions
 * These functions call the Next.js API routes to interact with Hedera HTS
 */

/**
 * Transfer 10 WHISTLE tokens to a receiver account
 * @param receiverAccountId - The receiver's Hedera Account ID (e.g., "0.0.5161124")
 * @param amount - The amount of WHISTLE tokens to transfer (default: 10)
 * @returns Promise with transfer transaction details
 */
export async function transferWhistleTokens(
  receiverAccountId: string,
  amount: number = 10
): Promise<{
  tokenId: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  transactionId: string;
  status: string;
  hashscanUrl: string;
}> {
  try {
    console.log('Transferring WHISTLE tokens to:', receiverAccountId, 'Amount:', amount);
    
    const response = await fetch('/api/hts/transfer-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiverAccountId,
        amount,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to transfer tokens');
    }

    console.log('Token transfer successful:', result.data);
    return result.data;
  } catch (error: any) {
    console.error('Error transferring tokens:', error);
    throw error;
  }
}

