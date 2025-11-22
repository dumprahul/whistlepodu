'use client';

import { createContext, useState, useEffect, useContext, useRef, ChangeEvent } from 'react';

import { Console, Hook, Unhook } from 'console-feed'

import XXNDF from './ndf.json'

import { CMix, DMClient, XXDKUtils } from '@/public/xxdk-wasm/dist/src';
import { Button } from '@nextui-org/button';
import { Input } from '@nextui-org/input';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@nextui-org/modal';
import { useDisclosure } from '@nextui-org/react';
import Dexie from 'dexie';
import { DBConversation, DBDirectMessage } from '@/public/xxdk-wasm/dist/src/types/db';
const xxdk = require('xxdk-wasm');

const STATE_PATH = 'xx_client2';
const CMIX_INIT_KEY = 'cMixInitialized_client2';
const DM_ID_STORAGE_KEY = 'MyDMID_client2';
const CLIENT_LOG_PREFIX = '🔵 CLIENT 2 - ';
const MESSAGE_DB_PASSWORD = 'MessageStoragePassword';

// Hardcoded credentials for Client 2
const HARDCODED_TOKEN = '2537252129';
const HARDCODED_PUBLIC_KEY = 'C0nFOJ9kcaSz6cN5/aDqiAnzOVXfC9ogg7JRvzrZ76E=';

// XXContext is used to pass in "XXDKUtils", which
// provides access to all xx network functions to the children
 
const XXContext = createContext<XXDKUtils | null>(null);
const XXNet = createContext<CMix | null>(null);
const SDKStatusContext = createContext<'initializing' | 'ready' | 'error'>('initializing');
const CredentialsStatusContext = createContext<'initializing' | 'ready' | 'error'>('initializing');

export function XXNetwork({ children }: { children: React.ReactNode }) {
    const [XXDKUtils, setXXDKUtils] = useState<XXDKUtils | null>(null)
    const [XXCMix, setXXCMix] = useState<CMix | null>(null);
    const [sdkStatus, setSdkStatus] = useState<'initializing' | 'ready' | 'error'>('initializing');

    useEffect(() => {
        setSdkStatus('initializing');
        xxdk.setXXDKBasePath(`${window!.location.origin}/xxdk-wasm`);
        xxdk.InitXXDK().then(async(xx: XXDKUtils) => {
            setXXDKUtils(xx)

            const ndf = JSON.stringify(XXNDF)

            const secret = Buffer.from("Hello");
            const cMixParamsJSON = Buffer.from("");

            const stateExists = localStorage.getItem(CMIX_INIT_KEY);
            if (stateExists === null || !stateExists) {
                await xx.NewCmix(ndf, STATE_PATH, secret, "")
                localStorage.setItem(CMIX_INIT_KEY, 'true');
            }
            xx.LoadCmix(STATE_PATH, secret, cMixParamsJSON).then((net: CMix) => {
                setXXCMix(net)
                setSdkStatus('ready');
            }).catch((err: any) => {
                console.error('Failed to load cMix:', err);
                setSdkStatus('error');
            });
        }).catch((err: any) => {
            console.error('Failed to initialize XXDK:', err);
            setSdkStatus('error');
        });
    }, [])

    return (
        <SDKStatusContext.Provider value={sdkStatus}>
        <XXContext.Provider value={XXDKUtils}>
            <XXNet.Provider value={XXCMix}>
            { children }
            </XXNet.Provider>
        </XXContext.Provider>
        </SDKStatusContext.Provider>
    )
}


export function XXLogs() {
    const [logs, setLogs] = useState([])

    useEffect(() => {
      const hookedConsole = Hook(
        window.console,
        (log) => setLogs((currLogs) => [...currLogs, log]),
        false
      )
      return () => Unhook(hookedConsole)
    }, [])
  
    return (
        <div className="flex [overflow-anchor:none]">
            <Console logs={logs} variant="dark" />
        </div>
    )
}


// XXDirectMessages is used to pass "XXDMReceiver", which
// stores callbacks of events from the xxdk api for
// direct messages
const XXDMReceiver = createContext<String[]>([]);
const XXDMClient = createContext<DMClient | null>(null);

export function XXDirectMessages({ children }: { children: React.ReactNode }) {
    const xx = useContext(XXContext)
    const xxNet = useContext(XXNet)

    const [dmReceiver, setDMReceiver] = useState<String[]>([]);
    const [dmClient, setDMClient] = useState<DMClient | null>(null);
    const [credentialsStatus, setCredentialsStatus] = useState<'initializing' | 'ready' | 'error'>('initializing');
    // NOTE: a ref is used instead of state because changes should not
    // cause a rerender, and also our handler function will need
    // to be able to access the db object when it is set.
    const dmDB = useRef<Dexie | null>(null);

    useEffect(() => {
        if (xx === null || xxNet === null) {
            return;
        }
        
        setCredentialsStatus('initializing');
        // Use hardcoded identity if available, otherwise generate new one
        // Note: The identity blob must produce the hardcoded token and public key
        var dmIDStr = localStorage.getItem(DM_ID_STORAGE_KEY);
        if (dmIDStr === null) {
            console.log(`${CLIENT_LOG_PREFIX}Generating DM Identity...`);
            // Generate identity and verify it matches hardcoded credentials
            // If it doesn't match, we'll need to use a pre-generated identity blob
            dmIDStr = Buffer.from(xx.GenerateChannelIdentity(xxNet.GetID())).toString('base64');
            localStorage.setItem(DM_ID_STORAGE_KEY, dmIDStr);
            console.log(`${CLIENT_LOG_PREFIX}Generated new identity. If credentials don't match hardcoded values, you may need to provide the correct identity blob.`);
        }
        console.log(`${CLIENT_LOG_PREFIX}Exported Codename Blob: ${dmIDStr}`);
        // Note: we parse to convert to Byte Array
        const dmID = new Uint8Array(Buffer.from(dmIDStr, 'base64'));

        // Web does not support notifications, so we use a dummy call
        var notifications = xx.LoadNotificationsDummy(xxNet.GetID());

        // DatabaseCipher encrypts using the given password, the max
        // size here the max for xx network DMs. 
        const cipher = xx.NewDatabaseCipher(xxNet.GetID(),
            Buffer.from(MESSAGE_DB_PASSWORD), 725);

        // Function to commit decrypted messages to Hedera Consensus Service
        const commitMessageToHCS = async (message: string) => {
            try {
                // Add log for starting HCS commit
                setDMReceiver((prev) => [...prev, `🔄 HCS: Starting commit to Hedera Consensus Service...`]);
                
                // Dynamically import the HCS client function
                const { submitMessageToHCS, getOrCreateTopic } = await import('@/lib/hcs-client');
                
                // Check if topic exists or create one
                const topicId = await getOrCreateTopic();
                setDMReceiver((prev) => [...prev, `📌 HCS: Using Topic ID: ${topicId}`]);
                
                console.log(`${CLIENT_LOG_PREFIX}Committing message to HCS topic: ${topicId}`);
                setDMReceiver((prev) => [...prev, `⏳ HCS: Submitting message to Hedera network...`]);
                
                const result = await submitMessageToHCS(message);
                
                console.log(`${CLIENT_LOG_PREFIX}✅ Message committed to HCS successfully`);
                console.log(`${CLIENT_LOG_PREFIX}Transaction ID: ${result.transactionId}`);
                console.log(`${CLIENT_LOG_PREFIX}Hashscan URL: ${result.hashscanUrl}`);
                console.log(`${CLIENT_LOG_PREFIX}Consensus Timestamp: ${result.consensusTimestamp}`);
                
                // Add detailed HCS logs to the UI
                const timestamp = new Date().toLocaleString();
                setDMReceiver((prev) => [...prev, `✅ HCS: Message committed successfully at ${timestamp}`]);
                setDMReceiver((prev) => [...prev, `🔗 HCS: Transaction ID: ${result.transactionId}`]);
                setDMReceiver((prev) => [...prev, `📊 HCS: Status: ${result.status}`]);
                setDMReceiver((prev) => [...prev, `🌐 HCS: Explorer: ${result.hashscanUrl}`]);

                // After successful HCS commit, trigger HTS token transfer
                try {
                    // Parse the message to extract Hedera Account ID
                    let reportData = null;
                    try {
                        reportData = JSON.parse(message);
                    } catch (e) {
                        // Not JSON, skip token transfer
                        console.log(`${CLIENT_LOG_PREFIX}Message is not JSON, skipping token transfer`);
                        return result;
                    }

                    // Extract Hedera Account ID from the report
                    const hederaAccountId = reportData?.hederaAccountId || reportData?.evmAddress; // fallback to evmAddress for backward compatibility

                    if (hederaAccountId && /^0\.0\.\d+$/.test(hederaAccountId)) {
                        // Transfer 10 WHISTLE tokens to the user's account
                        setDMReceiver((prev) => [...prev, `🎁 HTS: Initiating token transfer to ${hederaAccountId}...`]);
                        
                        const { transferWhistleTokens } = await import('@/lib/hts-client');
                        const transferResult = await transferWhistleTokens(hederaAccountId, 10);
                        
                        console.log(`${CLIENT_LOG_PREFIX}✅ Token transfer successful`);
                        console.log(`${CLIENT_LOG_PREFIX}Transfer Transaction ID: ${transferResult.transactionId}`);
                        console.log(`${CLIENT_LOG_PREFIX}Transfer Hashscan URL: ${transferResult.hashscanUrl}`);
                        
                        // Add detailed HTS logs to the UI
                        setDMReceiver((prev) => [...prev, `✅ HTS: 10 WHISTLE tokens transferred successfully`]);
                        setDMReceiver((prev) => [...prev, `💰 HTS: To Account: ${transferResult.toAccount}`]);
                        setDMReceiver((prev) => [...prev, `🔗 HTS: Transaction ID: ${transferResult.transactionId}`]);
                        setDMReceiver((prev) => [...prev, `📊 HTS: Status: ${transferResult.status}`]);
                        setDMReceiver((prev) => [...prev, `🌐 HTS: Explorer: ${transferResult.hashscanUrl}`]);
                    } else {
                        console.log(`${CLIENT_LOG_PREFIX}No valid Hedera Account ID found in message, skipping token transfer`);
                        setDMReceiver((prev) => [...prev, `⚠️ HTS: No valid Hedera Account ID found in message`]);
                    }
                } catch (htsError: any) {
                    console.error(`${CLIENT_LOG_PREFIX}Failed to transfer tokens:`, htsError);
                    const htsErrorMessage = htsError?.message || 'Unknown error';
                    setDMReceiver((prev) => [...prev, `❌ HTS: Failed to transfer tokens - ${htsErrorMessage}`]);
                    setDMReceiver((prev) => [...prev, `⚠️ HTS: Error occurred at ${new Date().toLocaleString()}`]);
                    // Don't throw - HCS commit was successful, token transfer failure shouldn't break the flow
                }
                
                return result;
            } catch (error: any) {
                console.error(`${CLIENT_LOG_PREFIX}Failed to commit message to HCS:`, error);
                const errorMessage = error?.message || 'Unknown error';
                setDMReceiver((prev) => [...prev, `❌ HCS: Failed to commit - ${errorMessage}`]);
                setDMReceiver((prev) => [...prev, `⚠️ HCS: Error occurred at ${new Date().toLocaleString()}`]);
                // Don't throw - allow message to display even if HCS fails
            }
        };

        // The following handles events, namely to decrypt messages
        const onDmEvent = (eventType: number, data: Uint8Array) => {
            const msg = Buffer.from(data)
            console.log(`${CLIENT_LOG_PREFIX}onDmEvent called -> EventType: ${eventType}, data: ${msg}`);

            dmReceiver.push(msg.toString('utf-8'));
            setDMReceiver([...dmReceiver]);

            const db = dmDB.current
            if (db !== null) {
                console.log("XXDB Lookup!!!!")
                const e = JSON.parse(msg.toString("utf-8"));
                Promise.all([
                    db.table<DBDirectMessage>("messages")
                        .where('id')
                        .equals(e.uuid)
                        .first(),
                    db.table<DBConversation>("conversations")
                        .filter((c) => c.pub_key === e.pubKey)
                        .last()
                ]).then(([message, conversation]) => {
                    if (!conversation) {
                        console.log(e);
                        console.error("XXDB Couldn't find conversation in database: " + e.pubKey);
                        return;
                    }
                    if (!message) {
                        console.log(e);
                        console.error("XXDB Couldn't find message in database: " + e.uuid);
                        return;
                    }

                    const plaintext = Buffer.from(cipher.Decrypt(message.text));
                    const decryptedMessage = plaintext.toString('utf-8');
                    setDMReceiver((prev) => [...prev, "Decrypted Message: " + decryptedMessage]);

                    // Commit message to Hedera Consensus Service (HCS)
                    commitMessageToHCS(decryptedMessage).catch((hcsError) => {
                        console.error(`${CLIENT_LOG_PREFIX}Error committing to HCS:`, hcsError);
                        // Don't block message display if HCS fails
                    });
        
                });
            }
        }

        // Start a wasm worker for indexedDB that handles 
        // DM reads and writes and create DM object with it
        xxdk.dmIndexedDbWorkerPath().then((workerPath: string) => {
            const workerStr = workerPath.toString()
            console.log("DM Worker Path: " + workerPath.toString());
            xx.NewDMClientWithIndexedDb(xxNet.GetID(), notifications.GetID(),
                cipher.GetID(), workerStr, dmID,
                { EventUpdate: onDmEvent }).then((client) => {
                    const token = client.GetToken();
                    const pubKey = Buffer.from(client.GetPublicKey()).toString('base64');
                    console.log(`${CLIENT_LOG_PREFIX}DMTOKEN: ${token}`);
                    console.log(`${CLIENT_LOG_PREFIX}DMPUBKEY: ${pubKey}`);

                    // Verify credentials match hardcoded values
                    if (String(token) !== HARDCODED_TOKEN || pubKey !== HARDCODED_PUBLIC_KEY) {
                        console.warn(`${CLIENT_LOG_PREFIX}⚠️ WARNING: Generated credentials don't match hardcoded values!`);
                        console.warn(`${CLIENT_LOG_PREFIX}Expected Token: ${HARDCODED_TOKEN}, Got: ${token}`);
                        console.warn(`${CLIENT_LOG_PREFIX}Expected PubKey: ${HARDCODED_PUBLIC_KEY}, Got: ${pubKey}`);
                        console.warn(`${CLIENT_LOG_PREFIX}You may need to provide the correct identity blob that produces these credentials.`);
                    }

                    // Use hardcoded public key for database name to ensure consistency
                    const dbName = HARDCODED_PUBLIC_KEY.replace(/={1,2}$/, '');
                    const db = new Dexie(dbName + "_speakeasy_dm")
                    db.open().then(() => {
                        console.log(db);
                        dmDB.current = db;
                    });

                    xxNet.StartNetworkFollower(10000);
                    xxNet.WaitForNetwork(30000)

                    setDMClient(client);
                    setCredentialsStatus('ready');
                }).catch((err: any) => {
                    console.error('Failed to create DM client:', err);
                    setCredentialsStatus('error');
                });
        }).catch((err: any) => {
            console.error('Failed to get DM worker path:', err);
            setCredentialsStatus('error');
        });
    }, [xx, xxNet]);

    return (
        <CredentialsStatusContext.Provider value={credentialsStatus}>
        <XXDMClient.Provider value={dmClient}>
            <XXDMReceiver.Provider value={dmReceiver}>
            { children }
            </XXDMReceiver.Provider>
        </XXDMClient.Provider>
        </CredentialsStatusContext.Provider>
    );
}

// XXDMSend
export async function XXDMSend(dm: DMClient, msg: string, recipientPubKey: string, recipientToken: string): Promise<boolean> {
    try {
        const cleanedMessage = msg.trim();
        if (!cleanedMessage) {
            throw new Error("Message cannot be empty");
        }
        const cleanedPubKey = recipientPubKey.trim();
        if (!cleanedPubKey) {
            throw new Error("Recipient public key is required");
        }
        const pubKeyBytes = Buffer.from(cleanedPubKey, 'base64');
        if (pubKeyBytes.length === 0) {
            throw new Error("Recipient public key is invalid");
        }
        const tokenStr = recipientToken.trim();
        if (!tokenStr) {
            throw new Error("Recipient token is required");
        }
        const tokenNumber = Number(tokenStr);
        if (!Number.isFinite(tokenNumber)) {
            throw new Error("Recipient token must be a number");
        }

        await dm.SendText(pubKeyBytes, tokenNumber, cleanedMessage, 0, Buffer.from(""));
        console.log(`${CLIENT_LOG_PREFIX}✅ Message sent successfully: ${cleanedMessage}`);
        return true;
    } catch (err) {
        console.error(`${CLIENT_LOG_PREFIX}could not send: `, err);
        return false;
    }
}

type XXMsgSenderProps = {
    recipientLabel?: string;
    recipientTokenLabel?: string;
    recipientPubKeyLabel?: string;
    buttonText?: string;
};

export function XXMsgSender({
    recipientLabel = "Recipient",
    recipientTokenLabel = "Recipient's Token",
    recipientPubKeyLabel = "Recipient's Public Key",
    buttonText = "Send Message",
}: XXMsgSenderProps) {
    const dm = useContext(XXDMClient);
    const [msgToSend, setMessage] = useState<string>("");
    const [recipientToken, setRecipientToken] = useState<string>("");
    const [recipientPubKey, setRecipientPubKey] = useState<string>("");
    const [status, setStatus] = useState<string>("");
    const [error, setError] = useState<string>("");

    const handleSubmit = async () => {
        if (dm === null) {
            setError("DM Client not ready yet!");
            return;
        }
        if (!msgToSend.trim()) {
            setError("Please enter a message to send!");
            return;
        }
        if (!recipientToken || !recipientPubKey) {
            setError("Please enter recipient's public key and token!");
            return;
        }
        setError("");
        setStatus("");
        const success = await XXDMSend(dm, msgToSend, recipientPubKey, recipientToken);
        if (success) {
            setMessage("");
            setStatus("✅ Message sent successfully");
        } else {
            setError("Failed to send message. Check console for details.");
        }
    }

    return (
        <div className="flex w-full flex-col gap-3 p-4">
            <div className="grid w-full gap-3 md:grid-cols-2">
                <Input
                    label={recipientTokenLabel}
                    placeholder={`Paste ${recipientLabel}'s token`}
                    value={recipientToken}
                    onChange={(e) => setRecipientToken(e.target.value)}
                    labelPlacement="outside"
                />
                <Input
                    label={recipientPubKeyLabel}
                    placeholder={`Paste ${recipientLabel}'s public key (base64)`}
                    value={recipientPubKey}
                    onChange={(e) => setRecipientPubKey(e.target.value)}
                    labelPlacement="outside"
                />
            </div>
            <Input
                label="Message"
                placeholder="Type message to send..."
                value={msgToSend}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setMessage(event.target.value)}
                labelPlacement="outside"
            />
            <div className="flex justify-end">
                <Button size="md" color="primary" onClick={handleSubmit}>
                    {buttonText}
                </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {status && <p className="text-sm text-green-600">{status}</p>}
        </div>
    )
}

export function XXMyCredentials({ title = "📋 RESOLVER - MY CREDENTIALS", accentClass = "border-blue-300 bg-blue-50" }: { title?: string; accentClass?: string }) {
    const dm = useContext(XXDMClient);
    const [token] = useState<string>(HARDCODED_TOKEN);
    const [pubKey] = useState<string>(HARDCODED_PUBLIC_KEY);
    const { isOpen, onOpen, onClose } = useDisclosure();

    return (
        <>
            <div className={`w-full rounded-lg border-2 p-4 shadow-sm ${accentClass}`}>
                <div className="flex items-center justify-between">
                    <p className="font-semibold text-lg">{title}</p>
                    <Button 
                        size="sm" 
                        color="primary" 
                        variant="flat"
                        onPress={onOpen}
                        isDisabled={!dm}
                    >
                        View Details
                    </Button>
                </div>
                {dm ? (
                    <div className="mt-3 flex flex-col gap-2">
                        <div className="text-sm">
                            <span className="font-medium">Token: </span>
                            <span className="text-gray-600">{token.substring(0, 20)}...</span>
                        </div>
                        <div className="text-sm">
                            <span className="font-medium">Public Key: </span>
                            <span className="text-gray-600">{pubKey.substring(0, 30)}...</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-600 mt-2">Initializing credentials...</p>
                )}
            </div>

            <Modal 
                isOpen={isOpen} 
                onClose={onClose} 
                size="md" 
                scrollBehavior="inside"
                classNames={{
                    wrapper: "z-[99999]",
                    base: "z-[99999]",
                    backdrop: "z-[99998]",
                }}
                style={{ zIndex: 99999 }}
            >
                <ModalContent className="z-[99999]">
                    <ModalHeader>
                        <h2 className="text-lg font-bold">Credentials</h2>
                    </ModalHeader>
                    <ModalBody>
            {dm ? (
                            <div className="flex flex-col gap-4">
                    <Input
                                    label="Token"
                        value={token}
                        isReadOnly
                        labelPlacement="outside"
                    />
                    <Input
                                    label="Public Key"
                        value={pubKey}
                        isReadOnly
                        labelPlacement="outside"
                    />
                </div>
            ) : (
                            <p className="text-center text-gray-600 py-4">Initializing credentials...</p>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button color="danger" variant="light" onPress={onClose}>
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    )
}

// Export status hooks for use in page
export function useSDKStatus() {
    return useContext(SDKStatusContext);
}

export function useCredentialsStatus() {
    return useContext(CredentialsStatusContext);
}

export function useDMClient() {
    return useContext(XXDMClient);
}

// XXDirectMessagesReceived is just a buffer of received event messages
export function XXDirectMessagesReceived() {
    const msgs = useContext(XXDMReceiver);

    if (msgs === null || msgs.length == 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm mt-2">Messages will appear here when received</p>
            </div>
        )
    }

    const msgOut = msgs.map((m, idx) => {
        const msgStr = String(m);
        
        // Check if it's an HCS or HTS log message
        if (msgStr.includes('HCS:') || msgStr.includes('HTS:')) {
            const isHTS = msgStr.includes('HTS:');
            const isSuccess = msgStr.includes('✅');
            const isError = msgStr.includes('❌');
            const isInfo = msgStr.includes('📌') || msgStr.includes('🔗') || msgStr.includes('⏱️') || msgStr.includes('📊') || msgStr.includes('🌐') || msgStr.includes('💰') || msgStr.includes('🎁');
            const isProcessing = msgStr.includes('🔄') || msgStr.includes('⏳');
            
            // Check if it's an explorer link
            if (msgStr.includes('Explorer: ')) {
                const url = msgStr.split('Explorer: ')[1];
                const serviceType = isHTS ? 'HTS' : 'HCS';
                return (
                    <div key={`${idx}-${m}`} className={`mb-2 p-3 border-l-4 rounded shadow-sm ${
                        isHTS ? 'bg-purple-50 border-purple-500' : 'bg-blue-50 border-blue-500'
                    }`}>
                        <div className="flex items-start gap-2">
                            <span className="text-lg">{isHTS ? '🎁' : '🌐'}</span>
                            <div className="flex-1">
                                <p className={`text-sm font-semibold mb-1 ${
                                    isHTS ? 'text-purple-800' : 'text-blue-800'
                                }`}>
                                    {serviceType} Transaction Explorer
                                </p>
                                <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`text-xs underline break-all font-mono ${
                                        isHTS ? 'text-purple-600 hover:text-purple-800' : 'text-blue-600 hover:text-blue-800'
                                    }`}
                                >
                                    {url}
                                </a>
                                <p className={`text-xs mt-1 ${
                                    isHTS ? 'text-purple-600' : 'text-blue-600'
                                }`}>
                                    Click to view on Hashscan
                                </p>
                            </div>
                        </div>
                    </div>
                );
            }
            
            return (
                <div key={`${idx}-${m}`} className={`mb-2 p-2 rounded text-sm ${
                    isHTS ? (
                        isSuccess ? 'bg-purple-50 border-l-4 border-purple-500 text-purple-800' :
                        isError ? 'bg-red-50 border-l-4 border-red-500 text-red-800' :
                        isInfo ? 'bg-purple-50 border-l-4 border-purple-500 text-purple-800' :
                        isProcessing ? 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800' :
                        'bg-gray-50 border-l-4 border-gray-300 text-gray-700'
                    ) : (
                        isSuccess ? 'bg-green-50 border-l-4 border-green-500 text-green-800' :
                        isError ? 'bg-red-50 border-l-4 border-red-500 text-red-800' :
                        isInfo ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-800' :
                        isProcessing ? 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800' :
                        'bg-gray-50 border-l-4 border-gray-300 text-gray-700'
                    )
                }`}>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{new Date().toLocaleTimeString()}</span>
                        <span className="flex-1">{msgStr}</span>
                    </div>
                </div>
            );
        }
        
        // Try to parse JSON messages
        let parsedMessage = null;
        try {
            parsedMessage = JSON.parse(msgStr);
        } catch (e) {
            // Not JSON, display as plain text
        }

        // Check if it's a decrypted message
        if (msgStr.includes('Decrypted Message: ')) {
            const decryptedContent = msgStr.replace('Decrypted Message: ', '');
            let reportData = null;
            try {
                reportData = JSON.parse(decryptedContent);
            } catch (e) {
                // Not JSON
            }

            if (reportData && reportData.type === 'whistleblower_report') {
                // Find HCS transaction info from subsequent messages
                const hcsTxIdMsg = msgs.slice(idx + 1).find((msg) => {
                    const msgStr = String(msg);
                    return msgStr.includes('HCS: Transaction ID: ');
                });
                const hcsExplorerMsg = msgs.slice(idx + 1).find((msg) => {
                    const msgStr = String(msg);
                    return msgStr.includes('HCS: Explorer: ');
                });
                const hcsTimestampMsg = msgs.slice(idx + 1).find((msg) => {
                    const msgStr = String(msg);
                    return msgStr.includes('HCS: Consensus Timestamp: ');
                });
                const hcsStatusMsg = msgs.slice(idx + 1).find((msg) => {
                    const msgStr = String(msg);
                    return msgStr.includes('HCS: Status: ');
                });
                
                // Find HTS transaction info from subsequent messages
                const htsTxIdMsg = msgs.slice(idx + 1).find((msg) => {
                    const msgStr = String(msg);
                    return msgStr.includes('HTS: Transaction ID: ');
                });
                const htsExplorerMsg = msgs.slice(idx + 1).find((msg) => {
                    const msgStr = String(msg);
                    return msgStr.includes('HTS: Explorer: ');
                });
                const htsToAccountMsg = msgs.slice(idx + 1).find((msg) => {
                    const msgStr = String(msg);
                    return msgStr.includes('HTS: To Account: ');
                });
                const htsStatusMsg = msgs.slice(idx + 1).find((msg) => {
                    const msgStr = String(msg);
                    return msgStr.includes('HTS: Status: ');
                });
                
                const hcsTxId = hcsTxIdMsg ? String(hcsTxIdMsg).split('Transaction ID: ')[1]?.trim() : null;
                const hcsExplorerUrl = hcsExplorerMsg ? String(hcsExplorerMsg).split('Explorer: ')[1]?.trim() : null;
                const hcsTimestamp = hcsTimestampMsg ? String(hcsTimestampMsg).split('Consensus Timestamp: ')[1]?.trim() : null;
                const hcsStatus = hcsStatusMsg ? String(hcsStatusMsg).split('Status: ')[1]?.trim() : null;
                
                const htsTxId = htsTxIdMsg ? String(htsTxIdMsg).split('Transaction ID: ')[1]?.trim() : null;
                const htsExplorerUrl = htsExplorerMsg ? String(htsExplorerMsg).split('Explorer: ')[1]?.trim() : null;
                const htsToAccount = htsToAccountMsg ? String(htsToAccountMsg).split('To Account: ')[1]?.trim() : null;
                const htsStatus = htsStatusMsg ? String(htsStatusMsg).split('Status: ')[1]?.trim() : null;
                
                return (
                    <div key={`${idx}-${m}`} className="mb-4 p-5 bg-white border-2 border-green-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🌱</span>
                                <div>
                                    <h3 className="font-bold text-green-800">Whistleblower Report</h3>
                                    <p className="text-xs text-gray-500">{new Date(reportData.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                            {hcsTxId && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                                    <span className="text-xs">✅</span>
                                    <span className="text-xs font-semibold text-green-700">Committed to HCS</span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            {reportData.issueType && (
                                <div className="flex gap-2">
                                    <span className="font-semibold text-sm text-gray-700 min-w-[120px]">Issue Type:</span>
                                    <span className="text-sm text-gray-900">{reportData.issueType}</span>
                                </div>
                            )}
                            {reportData.category && (
                                <div className="flex gap-2">
                                    <span className="font-semibold text-sm text-gray-700 min-w-[120px]">Category:</span>
                                    <span className="text-sm text-gray-900">{reportData.category}</span>
                                </div>
                            )}
                            {reportData.severity && (
                                <div className="flex gap-2">
                                    <span className="font-semibold text-sm text-gray-700 min-w-[120px]">Severity:</span>
                                    <span className={`text-sm font-medium px-2 py-1 rounded ${
                                        reportData.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                        reportData.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                        reportData.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {reportData.severity}
                                    </span>
                                </div>
                            )}
                            {reportData.location && (
                                <div className="flex gap-2">
                                    <span className="font-semibold text-sm text-gray-700 min-w-[120px]">Location:</span>
                                    <span className="text-sm text-gray-900">📍 {reportData.location}</span>
                                </div>
                            )}
                            {reportData.description && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <span className="font-semibold text-sm text-gray-700 block mb-2">Description:</span>
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                                        {reportData.description}
                                    </p>
                                </div>
                            )}
                            {reportData.evidence && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <span className="font-semibold text-sm text-gray-700 block mb-2">Evidence:</span>
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                                        {reportData.evidence}
                                    </p>
                                </div>
                            )}
                            {reportData.hederaAccountId && (
                                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                                    <span className="font-semibold text-sm text-gray-700 min-w-[120px]">Hedera Account ID:</span>
                                    <span className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                        {reportData.hederaAccountId}
                                    </span>
                                </div>
                            )}
                            {/* Backward compatibility - also check for evmAddress */}
                            {reportData.evmAddress && !reportData.hederaAccountId && (
                                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                                    <span className="font-semibold text-sm text-gray-700 min-w-[120px]">EVM Address:</span>
                                    <span className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                        {reportData.evmAddress}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        {/* HCS Transaction Information */}
                        {(hcsTxId || hcsExplorerUrl) && (
                            <div className="mt-4 pt-4 border-t-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl">⛓️</span>
                                    <h4 className="font-bold text-green-800">Hedera Consensus Service</h4>
                                    <span className="ml-auto text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-semibold">
                                        ✅ Committed
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {hcsTxId && (
                                        <div className="flex gap-2 items-center">
                                            <span className="font-semibold text-xs text-gray-700 min-w-[110px]">Transaction ID:</span>
                                            <span className="text-xs text-gray-900 font-mono bg-white px-2 py-1 rounded border border-green-200 break-all">
                                                {hcsTxId}
                                            </span>
                                        </div>
                                    )}
                                    {hcsStatus && (
                                        <div className="flex gap-2 items-center">
                                            <span className="font-semibold text-xs text-gray-700 min-w-[110px]">Status:</span>
                                            <span className="text-xs text-green-700 font-semibold bg-white px-2 py-1 rounded border border-green-200">
                                                {hcsStatus}
                                            </span>
                                        </div>
                                    )}
                                    {hcsExplorerUrl && (
                                        <div className="flex gap-2 items-center mt-3 pt-2 border-t border-green-200">
                                            <span className="font-semibold text-xs text-gray-700 min-w-[110px]">Explorer:</span>
                                            <a
                                                href={hcsExplorerUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-mono break-all bg-white px-2 py-1 rounded border border-green-200 inline-flex items-center gap-1"
                                            >
                                                <span>🌐</span>
                                                <span>View on Hashscan</span>
                                                <span>↗</span>
                                            </a>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-green-200">
                                        <span className="text-xs text-green-700 flex items-center gap-1">
                                            <span>🔒</span>
                                            <span>Immutably stored on Hedera network</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* HTS Token Transfer Information */}
                        {(htsTxId || htsExplorerUrl) && (
                            <div className="mt-4 pt-4 border-t-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl">🎁</span>
                                    <h4 className="font-bold text-purple-800">Hedera Token Service (HTS)</h4>
                                    <span className="ml-auto text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full font-semibold">
                                        ✅ Tokens Transferred
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {htsToAccount && (
                                        <div className="flex gap-2 items-center">
                                            <span className="font-semibold text-xs text-gray-700 min-w-[110px]">To Account:</span>
                                            <span className="text-xs text-gray-900 font-mono bg-white px-2 py-1 rounded border border-purple-200 break-all">
                                                {htsToAccount}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex gap-2 items-center">
                                        <span className="font-semibold text-xs text-gray-700 min-w-[110px]">Amount:</span>
                                        <span className="text-xs text-purple-700 font-semibold bg-white px-2 py-1 rounded border border-purple-200">
                                            10 WHISTLE tokens
                                        </span>
                                    </div>
                                    {htsTxId && (
                                        <div className="flex gap-2 items-center">
                                            <span className="font-semibold text-xs text-gray-700 min-w-[110px]">Transaction ID:</span>
                                            <span className="text-xs text-gray-900 font-mono bg-white px-2 py-1 rounded border border-purple-200 break-all">
                                                {htsTxId}
                                            </span>
                                        </div>
                                    )}
                                    {htsStatus && (
                                        <div className="flex gap-2 items-center">
                                            <span className="font-semibold text-xs text-gray-700 min-w-[110px]">Status:</span>
                                            <span className="text-xs text-purple-700 font-semibold bg-white px-2 py-1 rounded border border-purple-200">
                                                {htsStatus}
                                            </span>
                                        </div>
                                    )}
                                    {htsExplorerUrl && (
                                        <div className="flex gap-2 items-center mt-3 pt-2 border-t border-purple-200">
                                            <span className="font-semibold text-xs text-gray-700 min-w-[110px]">Explorer:</span>
                                            <a
                                                href={htsExplorerUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-purple-600 hover:text-purple-800 hover:underline font-mono break-all bg-white px-2 py-1 rounded border border-purple-200 inline-flex items-center gap-1"
                                            >
                                                <span>🌐</span>
                                                <span>View on Hashscan</span>
                                                <span>↗</span>
                                            </a>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-purple-200">
                                        <span className="text-xs text-purple-700 flex items-center gap-1">
                                            <span>💰</span>
                                            <span>10 WHISTLE tokens transferred to reporter</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            }
        }

        // Check if it's an event log
        if (msgStr.includes('onDmEvent called') || msgStr.includes('EventType:')) {
            return (
                <div key={`${idx}-${msgStr}`} className="mb-2 p-2 bg-purple-50 border-l-4 border-purple-400 rounded text-xs text-purple-800 [overflow-anchor:none] break-words">
                    <div className="flex items-center gap-2">
                        <span>📡</span>
                        <span className="font-mono">{new Date().toLocaleTimeString()}</span>
                        <span className="flex-1">{msgStr}</span>
                    </div>
                </div>
            );
        }
        
        // Display as regular message
        return (
            <div key={`${idx}-${msgStr}`} className="mb-3 p-3 bg-white border border-gray-300 rounded-lg shadow-sm [overflow-anchor:none] break-words">
                <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-400 font-mono mt-1">{new Date().toLocaleTimeString()}</span>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{msgStr}</p>
                </div>
            </div>
        );
    });

    return (
        <div className="space-y-2">
            {msgOut}
            <div id="anchor2" className="h-1 [overflow-anchor:auto]" />
        </div>
    )
}