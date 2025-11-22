import {
  AccountId,
  PrivateKey,
  Client,
  TransferTransaction,
  TokenId
} from "@hashgraph/sdk";

// Hedera Configuration (same as HCS)
const MY_ACCOUNT_ID = AccountId.fromString("0.0.5161124");
const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA("0x65daa5b4616b0af96bea690f5c4afc0337a002bc7f5c3f2e28e575b9a253d31e");

// WHISTLE Token ID from transfer.js
const WHISTLE_TOKEN_ID = TokenId.fromString("0.0.7304457");

/**
 * Initialize and return a Hedera client for testnet
 */
export function getHederaClient(): Client {
  const client = Client.forTestnet();
  client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
  return client;
}

/**
 * Transfer WHISTLE tokens to a receiver account
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
  let client;
  try {
    client = getHederaClient();

    // Convert string inputs to proper types
    const token = TokenId.fromString(WHISTLE_TOKEN_ID.toString());
    const sender = MY_ACCOUNT_ID;
    const receiver = AccountId.fromString(receiverAccountId);
    const transferAmount = amount;

    if (transferAmount <= 0) {
      throw new Error("Transfer amount must be greater than 0");
    }

    // Create the transfer transaction
    // Negative amount for sender (debit), positive amount for receiver (credit)
    const txTransfer = await new TransferTransaction()
      .addTokenTransfer(token, sender, -transferAmount) // Sender loses tokens
      .addTokenTransfer(token, receiver, transferAmount) // Receiver gains tokens
      .freezeWith(client);

    // Sign with the sender account private key
    const signTxTransfer = await txTransfer.sign(MY_PRIVATE_KEY);

    // Sign with the client operator private key and submit to a Hedera network
    const txTransferResponse = await signTxTransfer.execute(client);

    // Request the receipt of the transaction
    const receiptTransferTx = await txTransferResponse.getReceipt(client);

    // Obtain the transaction consensus status
    const statusTransferTx = receiptTransferTx.status;

    // Get the Transaction ID
    const txTransferId = txTransferResponse.transactionId.toString();

    console.log("--------------------------------- Token Transfer ---------------------------------");
    console.log("Token ID                 :", token.toString());
    console.log("From Account             :", sender.toString());
    console.log("To Account               :", receiver.toString());
    console.log("Amount                   :", transferAmount);
    console.log("Receipt status           :", statusTransferTx.toString());
    console.log("Transaction ID           :", txTransferId);
    console.log("Hashscan URL             :", "https://hashscan.io/testnet/transaction/" + txTransferId);

    return {
      tokenId: token.toString(),
      fromAccount: sender.toString(),
      toAccount: receiver.toString(),
      amount: transferAmount,
      transactionId: txTransferId,
      status: statusTransferTx.toString(),
      hashscanUrl: "https://hashscan.io/testnet/transaction/" + txTransferId
    };
  } catch (error) {
    console.error("Error transferring tokens:", error);
    throw error;
  } finally {
    if (client) client.close();
  }
}

