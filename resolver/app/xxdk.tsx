'use client';

import { createContext, useState, useEffect, useContext, useRef, ChangeEvent } from 'react';

import { Console, Hook, Unhook } from 'console-feed'

import XXNDF from './ndf.json'

import { CMix, DMClient, XXDKUtils } from '@/public/xxdk-wasm/dist/src';
import { Button } from '@nextui-org/button';
import { Input } from '@nextui-org/input';
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
export function XXNetwork({ children }: { children: React.ReactNode }) {
    const [XXDKUtils, setXXDKUtils] = useState<XXDKUtils | null>(null)
    const [XXCMix, setXXCMix] = useState<CMix | null>(null);

    useEffect(() => {
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
            })
        });
    }, [])

    return (
        <XXContext.Provider value={XXDKUtils}>
            <XXNet.Provider value={XXCMix}>
            { children }
            </XXNet.Provider>
        </XXContext.Provider>
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
    // NOTE: a ref is used instead of state because changes should not
    // cause a rerender, and also our handler function will need
    // to be able to access the db object when it is set.
    const dmDB = useRef<Dexie | null>(null);

    useEffect(() => {
        if (xx === null || xxNet === null) {
            return;
        }
        
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
                    dmReceiver.push("Decrypted Message: " + plaintext.toString('utf-8'));
                    setDMReceiver([...dmReceiver]);
        
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
                });
        });
    }, [xx, xxNet]);

    return (
        <XXDMClient.Provider value={dmClient}>
            <XXDMReceiver.Provider value={dmReceiver}>
            { children }
            </XXDMReceiver.Provider>
        </XXDMClient.Provider>
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

export function XXMyCredentials({ title = "📋 MY CREDENTIALS", accentClass = "border-blue-300 bg-blue-50" }: { title?: string; accentClass?: string }) {
    const dm = useContext(XXDMClient);
    // Always use hardcoded values for Client 2
    const [token] = useState<string>(HARDCODED_TOKEN);
    const [pubKey] = useState<string>(HARDCODED_PUBLIC_KEY);

    return (
        <div className={`w-full rounded border p-4 ${accentClass}`}>
            <p className="font-semibold">{title}</p>
            {dm ? (
                <div className="mt-3 flex flex-col gap-3">
                    <Input
                        label="My Token"
                        value={token}
                        isReadOnly
                        labelPlacement="outside"
                    />
                    <Input
                        label="My Public Key"
                        value={pubKey}
                        isReadOnly
                        labelPlacement="outside"
                    />
                </div>
            ) : (
                <p className="text-sm text-gray-600">Initializing credentials...</p>
            )}
        </div>
    )
}

// XXDirectMessagesReceived is just a buffer of received event messages
export function XXDirectMessagesReceived() {
    const msgs = useContext(XXDMReceiver);

    if (msgs === null || msgs.length == 0) {
        return (
            <div>Nothing yet...</div>
        )
    }

    const msgOut = msgs.map((m, idx) => <div key={`${idx}-${m}`} className="[overflow-anchor:none] break-words">{m}</div>);
    return (
        msgOut
    )
}