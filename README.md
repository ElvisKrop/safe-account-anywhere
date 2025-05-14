# Safe Anywhere

A web application that enables deploying Safe smart contract accounts across multiple EVM-compatible networks while preserving the same address.

![Safe Anywhere](/images/safe-anywhere-banner.png)

## Overview

Safe Anywhere simplifies the process of deploying existing Safe accounts to new blockchain networks. It maintains the same address across chains, providing a consistent identity and improving cross-chain user experience.

## Features

- **Cross-Chain Deployment**: Deploy the same Safe account across multiple EVM-compatible networks
- **Address Preservation**: Maintain the same address across different chains
- **Step-by-Step Process**: Easy-to-follow guided deployment workflow
- **Validation**: Verify Safe deployments and validate transaction data
- **Wallet Integration**: Compatible with web3 wallets like MetaMask

## Installation

### Prerequisites

- Node.js (v16 or higher)
- pnpm (recommended), npm, or yarn
- Git

### Setup

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/ElvisKrop/safe-account-anywhere.git
   cd safe-account-anywhere
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   pnpm install
   \`\`\`

3. Run the development server:
   \`\`\`bash
   pnpm dev
   \`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage Guide

### Step 1: Source Chain Information

1. Enter the Chain ID of the network where your Safe is currently deployed
2. Input your Safe address
3. Provide the deployment transaction hash of your Safe
4. The system will verify the Safe and extract necessary deployment information

### Step 2: Verification

The system will verify your Safe deployment and display the deployment details:
- Factory Address
- Singleton Address
- Owners
- Threshold
- Fallback Handler
- Salt Nonce

### Step 3: Target Chain Selection

1. Enter the Chain ID of the network where you want to deploy your Safe
2. The system will verify if the factory is deployed on the target chain
3. It will also check if your Safe is already deployed on the target chain

### Step 4: Deployment

1. Connect your wallet
2. Ensure you're connected to the correct network
3. Click "Deploy Safe" to deploy your Safe on the target chain
4. Once deployed, you'll receive confirmation with the transaction hash and Safe address

## Important Notes

- It is only possible to deploy a Safe with the same address on another network if you use exactly the same arguments that were used for the deployment of the existing Safe.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Safe{Wallet}](https://safe.global/) for the underlying smart contracts
- [Ethereum Lists](https://github.com/ethereum-lists/chains) for chain information
