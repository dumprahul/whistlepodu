const {
  AccountId,
  PrivateKey,
  Client,
  TopicCreateTransaction,
  TopicUpdateTransaction,
  TopicMessageSubmitTransaction,
  TopicDeleteTransaction
} = require("@hashgraph/sdk"); // v2.64.5

// Configuration
const MY_ACCOUNT_ID = AccountId.fromString("0.0.5161124");
const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA("0x65daa5b4616b0af96bea690f5c4afc0337a002bc7f5c3f2e28e575b9a253d31e");

/**
 * Initialize and return a Hedera client for testnet
 */
function getClient() {
  const client = Client.forTestnet();
  client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);
  return client;
}

/**
 * 1. CREATE A TOPIC
 * Creates a new HCS topic on the Hedera network
 * @returns {Promise<Object>} Object containing topicId, transactionId, status, and hashscanUrl
 */
async function createTopic() {
  let client;
  try {
    client = getClient();

    // Create the transaction
    const txCreateTopic = new TopicCreateTransaction();

    // Sign with the client operator private key and submit the transaction to a Hedera network
    const txCreateTopicResponse = await txCreateTopic.execute(client);

    // Request the receipt of the transaction
    const receiptCreateTopicTx = await txCreateTopicResponse.getReceipt(client);

    // Get the transaction consensus status
    const statusCreateTopicTx = receiptCreateTopicTx.status;

    // Get the Transaction ID
    const txCreateTopicId = txCreateTopicResponse.transactionId.toString();

    // Get the topic ID
    const topicId = receiptCreateTopicTx.topicId.toString();

    console.log("------------------------------ Create Topic ------------------------------ ");
    console.log("Receipt status           :", statusCreateTopicTx.toString());
    console.log("Transaction ID           :", txCreateTopicId);
    console.log("Hashscan URL             :", "https://hashscan.io/testnet/transaction/" + txCreateTopicId);
    console.log("Topic ID                 :", topicId);

    return {
      topicId,
      transactionId: txCreateTopicId,
      status: statusCreateTopicTx.toString(),
      hashscanUrl: "https://hashscan.io/testnet/transaction/" + txCreateTopicId
    };
  } catch (error) {
    console.error("Error creating topic:", error);
    throw error;
  } finally {
    if (client) client.close();
  }
}

/**
 * 2. UPDATE A TOPIC
 * Updates a topic (e.g., adds a submit key)
 * @param {string} topicId - The topic ID to update
 * @param {PrivateKey} adminPrivateKey - The admin private key for the topic
 * @param {PrivateKey} submitPrivateKey - The submit private key to add (optional)
 * @returns {Promise<Object>} Object containing transactionId, status, and hashscanUrl
 */
async function updateTopic(topicId, adminPrivateKey, submitPrivateKey = null) {
  let client;
  try {
    client = getClient();

    // Create a transaction to add a submit key
    const txTopicUpdate = await new TopicUpdateTransaction()
      .setTopicId(topicId);

    // If submit key is provided, add it
    if (submitPrivateKey) {
      txTopicUpdate.setSubmitKey(submitPrivateKey);
    }

    const txTopicUpdateFrozen = await txTopicUpdate.freezeWith(client);

    // Sign the transaction with the admin key to authorize the update
    const signTxTopicUpdate = await txTopicUpdateFrozen.sign(adminPrivateKey);

    // Sign with the client operator private key and submit to a Hedera network
    const txTopicUpdateResponse = await signTxTopicUpdate.execute(client);

    // Request the receipt of the transaction
    const receiptTopicUpdateTx = await txTopicUpdateResponse.getReceipt(client);

    // Get the transaction consensus status
    const statusTopicUpdateTx = receiptTopicUpdateTx.status;

    // Get the Transaction ID
    const txTopicUpdateId = txTopicUpdateResponse.transactionId.toString();

    console.log("-------------------------------- Update Topic -------------------------------- ");
    console.log("Receipt status           :", statusTopicUpdateTx.toString());
    console.log("Transaction ID           :", txTopicUpdateId);
    console.log("Hashscan URL             :", "https://hashscan.io/testnet/transaction/" + txTopicUpdateId);

    return {
      transactionId: txTopicUpdateId,
      status: statusTopicUpdateTx.toString(),
      hashscanUrl: "https://hashscan.io/testnet/transaction/" + txTopicUpdateId
    };
  } catch (error) {
    console.error("Error updating topic:", error);
    throw error;
  } finally {
    if (client) client.close();
  }
}

/**
 * 3. SUBMIT A MESSAGE
 * Submits a message to a topic
 * @param {string} topicId - The topic ID to submit the message to
 * @param {string} message - The message content to submit
 * @param {PrivateKey} submitPrivateKey - Optional submit private key if topic requires it
 * @returns {Promise<Object>} Object containing transactionId, status, message, and hashscanUrl
 */
async function submitMessage(topicId, message, submitPrivateKey = null) {
  let client;
  try {
    client = getClient();

    // Create the transaction
    const txTopicMessageSubmit = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message);

    // If submit key is required, sign with it
    if (submitPrivateKey) {
      await txTopicMessageSubmit.freezeWith(client);
      await txTopicMessageSubmit.sign(submitPrivateKey);
    }

    // Sign with the client operator private key and submit to a Hedera network
    const txTopicMessageSubmitResponse = await txTopicMessageSubmit.execute(client);

    // Request the receipt of the transaction
    const receiptTopicMessageSubmitTx = await txTopicMessageSubmitResponse.getReceipt(client);

    // Get the transaction consensus status
    const statusTopicMessageSubmitTx = receiptTopicMessageSubmitTx.status;

    // Get the transaction message
    const getTopicMessage = txTopicMessageSubmit.getMessage();

    // Get the transaction ID
    const txTopicMessageSubmitId = txTopicMessageSubmitResponse.transactionId.toString();

    console.log("-------------------------------- Submit Message -------------------------------- ");
    console.log("Receipt status           :", statusTopicMessageSubmitTx.toString());
    console.log("Transaction ID           :", txTopicMessageSubmitId);
    console.log("Hashscan URL             :", "https://hashscan.io/testnet/transaction/" + txTopicMessageSubmitId);
    console.log("Topic Message            : " + getTopicMessage.toString());

    return {
      transactionId: txTopicMessageSubmitId,
      status: statusTopicMessageSubmitTx.toString(),
      message: getTopicMessage.toString(),
      hashscanUrl: "https://hashscan.io/testnet/transaction/" + txTopicMessageSubmitId,
      consensusTimestamp: receiptTopicMessageSubmitTx.consensusTimestamp
    };
  } catch (error) {
    console.error("Error submitting message:", error);
    throw error;
  } finally {
    if (client) client.close();
  }
}

/**
 * 4. DELETE A TOPIC
 * Deletes a topic from the Hedera network
 * @param {string} topicId - The topic ID to delete
 * @param {PrivateKey} adminPrivateKey - The admin private key for the topic
 * @returns {Promise<Object>} Object containing transactionId, status, and hashscanUrl
 */
async function deleteTopic(topicId, adminPrivateKey) {
  let client;
  try {
    client = getClient();

    // Create the transaction
    const txTopicDelete = await new TopicDeleteTransaction()
      .setTopicId(topicId)
      .freezeWith(client);

    // Sign the transaction with the private admin key
    const signTxTopicDelete = await txTopicDelete.sign(adminPrivateKey);

    // Sign with the client operator private key and submit to a Hedera network
    const txTopicDeleteResponse = await signTxTopicDelete.execute(client);

    // Request the receipt of the transaction
    const receiptTopicDeleteTx = await txTopicDeleteResponse.getReceipt(client);

    // Get the transaction consensus status
    const statusTopicDeleteTx = receiptTopicDeleteTx.status;

    // Get the Transaction ID
    const txTopicDeleteId = txTopicDeleteResponse.transactionId.toString();

    console.log("-------------------------------- Delete Topic -------------------------------- ");
    console.log("Receipt status           :", statusTopicDeleteTx.toString());
    console.log("Transaction ID           :", txTopicDeleteId);
    console.log("Hashscan URL             :", "https://hashscan.io/testnet/transaction/" + txTopicDeleteId);

    return {
      transactionId: txTopicDeleteId,
      status: statusTopicDeleteTx.toString(),
      hashscanUrl: "https://hashscan.io/testnet/transaction/" + txTopicDeleteId
    };
  } catch (error) {
    console.error("Error deleting topic:", error);
    throw error;
  } finally {
    if (client) client.close();
  }
}

/**
 * 5. GET TOPIC BY ID
 * Retrieves topic information by ID using the mirror node API
 * @param {string} topicId - The topic ID to retrieve
 * @returns {Promise<Object>} Object containing topic information
 */
async function getTopicById(topicId) {
  try {
    // Configure query parameters
    const getTopicByIdResponse = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}`
    );

    if (!getTopicByIdResponse.ok) {
      throw new Error(`HTTP error! status: ${getTopicByIdResponse.status}`);
    }

    const getTopicByIdData = await getTopicByIdResponse.json();

    console.log("------------------------------ Get Topic by ID ------------------------------ ");
    console.log("Response status         :", getTopicByIdResponse.status);
    console.log("Topic Info              :", JSON.stringify(getTopicByIdData, null, 2));

    return {
      status: getTopicByIdResponse.status,
      topicInfo: getTopicByIdData
    };
  } catch (error) {
    console.error("Error getting topic by ID:", error);
    throw error;
  }
}

/**
 * 6. GET TOPIC MESSAGES
 * Retrieves messages from a topic using the mirror node API
 * @param {string} topicId - The topic ID to get messages from
 * @param {number} limit - Maximum number of items to return (default: 10)
 * @param {string} order - Order in which items are listed: "asc" or "desc" (default: "desc")
 * @returns {Promise<Object>} Object containing messages array
 */
async function getTopicMessages(topicId, limit = 10, order = "desc") {
  try {
    // Configure query parameters
    const getTopicMessagesResponse = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=${limit}&order=${order}`
    );

    if (!getTopicMessagesResponse.ok) {
      throw new Error(`HTTP error! status: ${getTopicMessagesResponse.status}`);
    }

    const getTopicMessagesData = await getTopicMessagesResponse.json();

    console.log("------------------------------ Get Topic Messages ------------------------------ ");
    console.log("Response status         :", getTopicMessagesResponse.status);
    console.log("Topic Messages          :", JSON.stringify(getTopicMessagesData.messages, null, 2));

    return {
      status: getTopicMessagesResponse.status,
      messages: getTopicMessagesData.messages
    };
  } catch (error) {
    console.error("Error getting topic messages:", error);
    throw error;
  }
}

/**
 * 7. GET TOPIC MESSAGE BY SEQUENCE
 * Retrieves a specific message by sequence number using the mirror node API
 * @param {string} topicId - The topic ID
 * @param {number} sequenceNumber - The sequence number of the message
 * @returns {Promise<Object>} Object containing the message
 */
async function getTopicMessageBySequence(topicId, sequenceNumber) {
  try {
    // Configure query parameters
    const getTopicMessageBySequenceResponse = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages/${sequenceNumber}`
    );

    if (!getTopicMessageBySequenceResponse.ok) {
      throw new Error(`HTTP error! status: ${getTopicMessageBySequenceResponse.status}`);
    }

    const getTopicMessageBySequenceData = await getTopicMessageBySequenceResponse.json();

    console.log("------------------------------ Get Topic Message by Sequence ------------------------------ ");
    console.log("Response status         :", getTopicMessageBySequenceResponse.status);
    console.log("Topic Message           :", JSON.stringify(getTopicMessageBySequenceData, null, 2));

    return {
      status: getTopicMessageBySequenceResponse.status,
      message: getTopicMessageBySequenceData
    };
  } catch (error) {
    console.error("Error getting topic message by sequence:", error);
    throw error;
  }
}

/**
 * 8. GET TOPIC MESSAGE BY TIMESTAMP
 * Retrieves a message by consensus timestamp using the mirror node API
 * @param {string} timestamp - The consensus timestamp (e.g., "1234567890.123456789")
 * @returns {Promise<Object>} Object containing the message
 */
async function getTopicMessageByTimestamp(timestamp) {
  try {
    // Configure query parameters
    const getTopicMessageByTimestampResponse = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/topics/messages/${timestamp}`
    );

    if (!getTopicMessageByTimestampResponse.ok) {
      throw new Error(`HTTP error! status: ${getTopicMessageByTimestampResponse.status}`);
    }

    const getTopicMessageByTimestampData = await getTopicMessageByTimestampResponse.json();

    console.log("------------------------------ Get Topic Message by Timestamp ------------------------------ ");
    console.log("Response status         :", getTopicMessageByTimestampResponse.status);
    console.log("Topic Message           :", JSON.stringify(getTopicMessageByTimestampData, null, 2));

    return {
      status: getTopicMessageByTimestampResponse.status,
      message: getTopicMessageByTimestampData
    };
  } catch (error) {
    console.error("Error getting topic message by timestamp:", error);
    throw error;
  }
}

/**
 * EXAMPLE: Complete workflow demonstrating all HCS functions
 * This function shows how to use all the HCS operations in sequence
 */
async function exampleCompleteWorkflow() {
  try {
    console.log("\n========== HCS Complete Workflow Example ==========\n");

    // 1. Create a topic
    console.log("Step 1: Creating a topic...");
    const createResult = await createTopic();
    const topicId = createResult.topicId;
    console.log(`Topic created: ${topicId}\n`);

    // Wait a bit for the topic to be fully created
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Get topic information
    console.log("Step 2: Getting topic information...");
    await getTopicById(topicId);
    console.log();

    // 3. Submit a message
    console.log("Step 3: Submitting a message...");
    const submitResult = await submitMessage(topicId, "Hello, HCS! This is a test message.");
    const consensusTimestamp = submitResult.consensusTimestamp;
    console.log(`Message submitted with timestamp: ${consensusTimestamp}\n`);

    // Wait a bit for the message to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Get all messages
    console.log("Step 4: Getting all topic messages...");
    const messagesResult = await getTopicMessages(topicId, 10, "desc");
    console.log(`Found ${messagesResult.messages.length} message(s)\n`);

    // 5. Get message by sequence (if messages exist)
    if (messagesResult.messages && messagesResult.messages.length > 0) {
      const firstMessage = messagesResult.messages[0];
      const sequenceNumber = firstMessage.sequence_number;
      console.log(`Step 5: Getting message by sequence number (${sequenceNumber})...`);
      await getTopicMessageBySequence(topicId, sequenceNumber);
      console.log();
    }

    // 6. Get message by timestamp (if we have one)
    if (consensusTimestamp) {
      console.log(`Step 6: Getting message by timestamp (${consensusTimestamp})...`);
      await getTopicMessageByTimestamp(consensusTimestamp.toString());
      console.log();
    }

    console.log("========== Workflow Complete ==========\n");
    console.log("Note: Topic deletion is commented out. Uncomment to delete the topic.");
    // Uncomment to delete the topic (requires admin key)
    // const adminKey = PrivateKey.generateED25519();
    // await deleteTopic(topicId, adminKey);

  } catch (error) {
    console.error("Error in workflow:", error);
  }
}

// Export all functions
module.exports = {
  createTopic,
  updateTopic,
  submitMessage,
  deleteTopic,
  getTopicById,
  getTopicMessages,
  getTopicMessageBySequence,
  getTopicMessageByTimestamp,
  exampleCompleteWorkflow,
  getClient
};

// If running directly, execute the example workflow
if (require.main === module) {
  exampleCompleteWorkflow().catch(console.error);
}

