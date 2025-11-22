# WhistlePodu Protocol 🚀

**A Privacy-First Whistleblowing Protocol**

WhistlePodu is a privacy-first whistleblowing protocol that uses the xxNetwork to shred metadata and protect user anonymity while securely delivering evidence. An off-chain resolver verifies each report, anchors a tamper-proof attestation on Hedera HCS, and rewards contributors with 10 WHISTLE HTS tokens for verified submissions. The protocol ensures trust, auditability, and quantum-resistant privacy while enabling communities to safely expose environmental or social issues.

<img width="999" height="564" alt="Screenshot 2025-11-22 at 10 12 36 AM" src="https://github.com/user-attachments/assets/f7f212a6-236d-4343-94e3-d8509900f506" />


**Note - Public RPC endpoints expose your IP address, location, and timing metadata because every request connects directly from your device, allowing RPC operators or third parties to correlate your activity with your identity.
WhistlePodu eliminates this risk by routing all submissions through xxNetwork’s cMix layer, which shreds metadata and hides IPs, ensuring the blockchain only ever sees anonymized, untraceable relayed traffic**

**youtube demo video - https://www.youtube.com/watch?v=87diHdGmVE8**

## 🌟 Key Features

- **Quantum-Resistant Privacy**: Uses xxNetwork for metadata shredding and complete anonymity
- **Tamper-Proof Attestations**: All reports are immutably anchored on Hedera Consensus Service (HCS)
- **Automated Rewards**: Contributors receive 10 WHISTLE tokens automatically upon submission verification
- **Secure Messaging**: End-to-end encrypted communication using xxdk-wasm
- **Transparent Verification**: Off-chain resolver ensures report integrity and authenticity
- **Environmental & Social Focus**: Designed for sustainability whistleblowing and public interest reporting

## 🏗️ Architecture

WhistlePodu consists of two main components:

### 1. **cmixx** - User Client Application
The client application that users interact with to submit whistleblower reports. Built with Next.js and React, providing an intuitive interface for reporting environmental violations, sustainability issues, or unethical practices.

**Key Features:**
- Beautiful, animated UI with status indicators
- Secure form submission with field validation
- SDK and credentials initialization status tracking
- Anonymous submission via xxNetwork encrypted messaging

### 2. **resolver** - Off-Chain Resolver Service
The off-chain resolver service that receives, verifies, and processes whistleblower reports. It handles report verification, HCS anchoring, and token distribution.

**Key Features:**
- Receives encrypted reports via xxNetwork
- Automatically commits reports to Hedera Consensus Service
- Distributes 10 WHISTLE tokens to verified reporters
- Comprehensive transaction logging with Hashscan explorer links
- Status tracking for both HCS and HTS operations

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- A modern web browser with WebAssembly support
- Hedera Testnet account credentials (for resolver)

## 🚀 Getting Started

### Setup cmixx (User Client)
Please disable CORS Error in Browser you are using(Chrome Preffered with CORS Error Disabled)

1. **Navigate to the cmixx directory:**
   ```bash
   cd cmixx
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create symbolic link for xxdk-wasm:**
   ```bash
   cd public
   ln -s ../node_modules/xxdk-wasm xxdk-wasm
   cd ..
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

### Setup resolver (Off-Chain Resolver)

1. **Navigate to the resolver directory:**
   ```bash
   cd resolver
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create symbolic link for xxdk-wasm:**
   ```bash
   cd public
   ln -s ../node_modules/xxdk-wasm xxdk-wasm
   cd ..
   ```

4. **Configure Hedera credentials (if needed):**
   The resolver uses the following Hedera Testnet credentials:
   - Account ID: `0.0.5161124`
   - Token ID: `0.0.7304457` (WHISTLE)

   These are configured in `resolver/lib/hcs.ts` and `resolver/lib/hts.ts`. Update if using different credentials.

5. **Start the development server:**
   ```bash
   npm run dev
   ```

   The resolver runs on port 3001 by default (configured in `package.json`).

6. **Access the resolver:**
   Open your browser and navigate to [http://localhost:3001](http://localhost:3001)

## 🔄 How It Works

### Report Submission Flow

1. **User submits report via cmixx:**
   - User fills out the whistleblower form with issue details
   - Provides their Hedera Account ID for token rewards
   - Submits the report securely through xxNetwork encrypted messaging

2. **Resolver receives and processes:**
   - Resolver decrypts the incoming message
   - Verifies the report structure and data
   - Immediately commits the report to Hedera Consensus Service (HCS)
   - Creates an immutable record on the Hedera blockchain

3. **Automatic token distribution:**
   - Upon successful HCS commit, the resolver extracts the user's Hedera Account ID
   - Transfers 10 WHISTLE tokens to the reporter's account
   - All transaction details are logged and displayed in the resolver UI

4. **Verification and transparency:**
   - All transactions are viewable on Hashscan (Hedera explorer)
   - Users can verify their report was committed and tokens were received
   - Full audit trail maintained on-chain

## 💰 WHISTLE Token Information

```
--------------------------------- Token Creation ---------------------------------
Receipt status           : SUCCESS
Transaction ID           : 0.0.5161124@1763773961.477491700
Hashscan URL             : https://hashscan.io/testnet/transaction/0.0.5161124@1763773961.477491700
Token ID                 : 0.0.7304457

TOKEN NAME - WHISTLE
TOKEN SYMBOL - WHISTLE
INITIAL SUPPLY - 500000000000000000
```

**Token Details:**
- **Token ID**: `0.0.7304457`
- **Name**: WHISTLE
- **Symbol**: WHISTLE
- **Network**: Hedera Testnet
- **Reward Amount**: 10 WHISTLE tokens per verified submission

### View Token on Hashscan
- [Token Details](https://hashscan.io/testnet/token/0.0.7304457)
- [Creation Transaction](https://hashscan.io/testnet/transaction/0.0.5161124@1763773961.477491700)

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **NextUI** - Modern React component library

### Privacy & Messaging
- **xxdk-wasm** - xxNetwork SDK for WebAssembly
- **Dexie.js** - IndexedDB wrapper for message storage
- **DatabaseCipher** - Encrypted message storage

### Blockchain & Distributed Ledger
- **Hedera Consensus Service (HCS)** - Immutable message anchoring
- **Hedera Token Service (HTS)** - Token creation and distribution
- **@hashgraph/sdk** - Official Hedera JavaScript SDK

### Backend
- **Next.js API Routes** - Server-side API endpoints
- **Hedera Testnet** - Blockchain network

## 📁 Project Structure

```
powerhouse/
├── cmixx/                 # User client application
│   ├── app/
│   │   ├── page.tsx      # Main form interface
│   │   ├── xxdk.tsx      # xxNetwork integration
│   │   └── globals.css   # Global styles
│   └── package.json
│
├── resolver/              # Off-chain resolver service
│   ├── app/
│   │   ├── page.tsx      # Resolver dashboard
│   │   ├── xxdk.tsx      # Message receiver & HCS/HTS integration
│   │   ├── api/
│   │   │   ├── hcs/      # HCS API routes
│   │   │   └── hts/      # HTS API routes
│   │   └── globals.css
│   ├── lib/
│   │   ├── hcs.ts        # Hedera Consensus Service functions
│   │   ├── hcs-client.ts # HCS client-side service
│   │   ├── hts.ts        # Hedera Token Service functions
│   │   └── hts-client.ts # HTS client-side service
│   └── package.json
│
└── README.md             # This file
```

## 🔐 Security & Privacy

- **Metadata Shredding**: xxNetwork ensures no metadata leakage
- **End-to-End Encryption**: All messages are encrypted using xxdk
- **Anonymous Reporting**: Users can submit reports without revealing identity
- **Tamper-Proof Records**: All reports are immutably stored on Hedera HCS
- **Quantum-Resistant**: xxNetwork provides post-quantum cryptographic security

## 📝 Report Fields

When submitting a whistleblower report, users provide:

- **Issue Type**: Type of violation (pollution, waste, emissions, etc.)
- **Category**: Entity category (corporate, government, NGO, etc.)
- **Severity Level**: Low, Medium, High, or Critical
- **Location of Happening**: Geographic location of the incident
- **Detailed Description**: Comprehensive account of the issue
- **Evidence/Supporting Information**: Links to supporting evidence
- **Hedera Account ID**: Account to receive WHISTLE token rewards

## 🎯 Use Cases

- **Environmental Violations**: Report pollution, illegal waste disposal, emissions violations
- **Sustainability Issues**: Expose greenwashing, deforestation, water contamination
- **Corporate Misconduct**: Document unethical business practices
- **Government Transparency**: Report public sector violations
- **Wildlife Protection**: Report violations of wildlife protection laws
- **Carbon Emissions**: Track and report carbon emission violations

## 🔍 Monitoring & Verification

### For Users (cmixx):
- SDK initialization status
- Credentials status
- Form submission confirmation

### For Resolver:
- Message reception logs
- HCS commit status and transaction IDs
- HTS token transfer status
- Hashscan explorer links for all transactions
- Real-time status updates

## 🌐 Network Information

- **xxNetwork**: Mainnet (metadata-shredding network)
- **Hedera**: Testnet (for HCS and HTS operations)
- **Hashscan Explorer**: [https://hashscan.io/testnet](https://hashscan.io/testnet)

## ⚠️ Important Notes

1. **Testnet Environment**: Currently running on Hedera Testnet. Use testnet HBAR and accounts for testing.

2. **Token Association**: Receivers must have their Hedera account associated with the WHISTLE token (Token ID: `0.0.7304457`) before they can receive tokens.

3. **Port Configuration**: 
   - cmixx runs on port `3000` (default)
   - resolver runs on port `3001` (configured in package.json)

4. **Credentials**: Both applications use hardcoded credentials for demonstration. In production, implement proper credential management.

## 📚 Resources

- [xxNetwork Documentation](https://xx.network/)
- [Hedera Documentation](https://docs.hedera.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Hashscan Explorer](https://hashscan.io/)

## 🤝 Contributing

This is a demonstration project. For production use:
1. Implement proper credential management
2. Add comprehensive error handling
3. Set up monitoring and alerting
4. Implement rate limiting
5. Add authentication and authorization
6. Deploy to production networks

## 📄 License

This project is provided as-is for demonstration purposes.

---

**Built with ❤️ for privacy-first whistleblowing and environmental protection**
