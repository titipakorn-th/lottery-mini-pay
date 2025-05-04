<!-- TITLE -->
<p align="center">
  <img width="100px" src="https://github.com/celo-org/celo-composer/blob/main/images/readme/celo_isotype.svg" align="center" alt="Celo" />
 <h2 align="center">LotteryMiniPay - Funding Dreams Through Collective Chance</h2>
 <p align="center">A transparent blockchain-based lottery platform that empowers individuals and fosters social impact.</p>
</p>
  <p align="center">
    <a href="https://opensource.org/license/mit/">
      <img alt="MIT License" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
    </a>
  </p>
</p>

<!-- TABLE OF CONTENTS -->

<div>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#project-description">Project Description</a></li>
    <li><a href="#how-it-works">How It Works</a></li>
    <li><a href="#built-with">Built With</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#minipay-integration">MiniPay Integration</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</div>

<!-- ABOUT THE PROJECT -->

## About The Project

LotteryMiniPay is a transparent blockchain-based lottery platform built on Celo that pools resources from participants and distributes rewards to lucky winners, empowering them to develop their potential and create positive social impact. The platform leverages the power of blockchain to ensure transparency, fairness, and security in all lottery operations.

Our mission is to democratize access to opportunity capital while creating engaging experiences for participants. Each ticket represents both a chance at financial reward and a contribution toward empowering individuals to pursue education, launch businesses, develop community initiatives, or implement innovative solutions to local challenges.

## Project Description

LotteryMiniPay transforms the traditional lottery model into a powerful tool for social impact. By combining the excitement of chance with the mission of community empowerment, we create a win-win ecosystem:

### Problem
In many communities, talented individuals with promising ideas lack access to capital needed to pursue their dreams and create positive social impact. Traditional funding methods are often inaccessible, requiring extensive networks, collateral, or existing resources.

### Solution
Our platform provides:
1. Transparent and fair lottery system built on blockchain technology
2. Affordable ticket purchasing with cUSD
3. Secure number selection and verification
4. Automatic prize distribution to winners
5. Sustainable operations through a modest 10% platform fee

### Impact
By distributing opportunity through chance, we foster societies where talent isn't limited by economic circumstances. Winners can use their prizes to:
- Launch entrepreneurial ventures that create jobs
- Pursue education and skill development
- Fund community improvement initiatives
- Develop innovative solutions to local challenges

## How It Works

1. **Create Lottery Rooms**: Admin creates lottery rooms with specific entry fees, draw times, and encrypted winning numbers.

2. **Buy Tickets**: Users purchase tickets by selecting numbers (0-99) and paying the entry fee in cUSD.

3. **Winning Number Reveal**: At the scheduled draw time, the admin reveals the winning number with cryptographic verification.

4. **Claim Prizes**: Winners claim their prizes directly to their wallets.

5. **Continuous Rounds**: Rooms can be reset for new rounds, carrying over unclaimed prizes.

The smart contract ensures all operations are transparent, fair, and secure, with anti-fraud measures like reentrancy protection and secure number verification.

## Built With

LotteryMiniPay is built on Celo to make it simple, transparent, and accessible:

- [Celo](https://celo.org/) - Mobile-first blockchain platform
- [Solidity](https://docs.soliditylang.org/en/v0.8.24/) - Smart contract programming language
- [Hardhat](https://hardhat.org/) - Development environment for Ethereum software
- [React.js](https://reactjs.org/) - Frontend library
- [Next.js](https://nextjs.org/) - React framework
- [viem](https://viem.sh/) - TypeScript interface for Ethereum
- [Tailwind](https://tailwindcss.com/) - CSS framework
- [cUSD](https://docs.celo.org/token) - Celo Dollar stablecoin

## Getting Started

### Prerequisites

- Node (v20 or higher)
- Git (v2.38 or higher)
- MiniPay wallet or compatible Celo wallet

### Installation

1. Clone the repository
   ```sh
   git clone https://github.com/yourusername/lottery-mini-pay.git
   cd lottery-mini-pay
   ```

2. Install dependencies
   ```sh
   yarn
   # or with npm
   npm install
   ```

3. Deploy the smart contract
   ```sh
   cd packages/hardhat
   # Update .env file with your private key
   cp .env.template .env
   # Deploy to Alfajores testnet
   npx hardhat ignition deploy ./ignition/modules/MiniPay.ts --network alfajores
   ```

4. Run the frontend
   ```sh
   cd packages/react-app
   # Update .env file with your WalletConnect Cloud Project ID
   cp .env.template .env
   # Start the development server
   yarn dev
   # or with npm
   npm run dev
   ```

## MiniPay Integration

LotteryMiniPay is designed to work seamlessly with [MiniPay](https://www.opera.com/products/minipay), one of the fastest growing wallets built by Opera on Celo. MiniPay provides a simple user experience to interact with decentralized applications like ours.

With MiniPay, users can easily:
- Purchase lottery tickets using cUSD
- Check their ticket history and status
- Claim prizes with minimal friction
- Monitor lottery room details and results

:::info
Install the [MiniPay standalone app](https://play.google.com/store/apps/details?id=com.opera.minipay) to try LotteryMiniPay now! 🎉 📥
:::

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.