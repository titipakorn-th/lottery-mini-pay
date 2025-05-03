// Lottery Room Winning Number Reveal Script
// This script demonstrates how to reveal the winning number for a lottery room on Celo Alfajores testnet

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

// Celo Alfajores Testnet Configuration
const CELO_ALFAJORES_RPC = 'https://alfajores-forno.celo-testnet.org';
const CELO_ALFAJORES_CHAIN_ID = 44787;
const CELO_EXPLORER = 'https://alfajores.celoscan.io';

// Lottery Factory Contract ABI
const LOTTERY_FACTORY_ABI = [
  "function revealWinningNumber(uint256 roomId, uint8 winningNumber, bytes32 privateKey) external",
  "function getRoomDetails(uint256 roomId) view returns (tuple(uint256 id, string name, string description, uint256 entryFee, uint256 drawTime, uint256 prizePool, uint256 playerCount, address owner, bytes32 encryptedWinningNumber, bytes32 publicKey, uint8 winningNumber, bool revealed, uint8 state, uint256 carryOverAmount, uint256 roundNumber))",
  "event WinningNumberRevealed(uint256 indexed roomId, uint8 winningNumber, uint256 timestamp, uint256 roundNumber)"
];

// Configuration
const MNEMONIC = process.env.MNEMONIC || '';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
// Factory contract address on Alfajores testnet
const LOTTERY_FACTORY_ADDRESS = process.env.LOTTERY_FACTORY_ADDRESS || '0x6bcbF58F89d228F5EEdB87d91c35046eBcbF59F5';
// Room details (these would normally be saved from room creation)
const ROOM_ID = process.env.ROOM_ID || '0';
const WINNING_NUMBER = parseInt(process.env.WINNING_NUMBER || '0');
const ENCRYPTION_PRIVATE_KEY = process.env.ENCRYPTION_PRIVATE_KEY || '';
const ROUND_NUMBER = parseInt(process.env.ROUND_NUMBER || '1');

async function main() {
  try {
    // Validate required inputs
    if (ROOM_ID === undefined || ROOM_ID === null || ROOM_ID === '') {
      throw new Error('ROOM_ID must be provided in .env file');
    }
    
    const roomIdNumber = parseInt(ROOM_ID);
    if (isNaN(roomIdNumber)) {
      throw new Error('ROOM_ID must be a valid number');
    }
    
    if (!WINNING_NUMBER || WINNING_NUMBER < 1 || WINNING_NUMBER > 99) {
      throw new Error('WINNING_NUMBER must be provided in .env file and be between 1-99');
    }
    
    if (!ENCRYPTION_PRIVATE_KEY) {
      throw new Error('ENCRYPTION_PRIVATE_KEY must be provided in .env file');
    }
    
    console.log('Connecting to Celo Alfajores Testnet...');
    
    // Create provider for Celo Alfajores
    const provider = new ethers.JsonRpcProvider(CELO_ALFAJORES_RPC);
    
    // Get network information
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Set up wallet from mnemonic or private key
    let wallet: ethers.Wallet | ethers.HDNodeWallet;
    
    if (MNEMONIC) {
      wallet = ethers.HDNodeWallet.fromPhrase(MNEMONIC);
      console.log(`Using wallet from mnemonic: ${wallet.address}`);
    } else if (PRIVATE_KEY) {
      wallet = new ethers.Wallet(PRIVATE_KEY);
      console.log(`Using wallet from private key: ${wallet.address}`);
    } else {
      throw new Error('Either MNEMONIC or PRIVATE_KEY must be provided in .env file');
    }
    
    // Connect wallet to provider
    const connectedWallet = wallet.connect(provider);
    
    // Check CELO balance
    const celoBalance = await provider.getBalance(connectedWallet.address);
    console.log(`CELO Balance: ${ethers.formatEther(celoBalance)} CELO`);
    
    if (celoBalance === BigInt(0)) {
      console.log(`Warning: Wallet has 0 CELO. You need CELO for transaction fees.`);
      console.log(`Get test tokens from: https://faucet.celo.org/alfajores`);
      return;
    }
    
    // Create lottery factory contract instance
    console.log(`Connecting to Lottery Factory at address: ${LOTTERY_FACTORY_ADDRESS}`);
    const lotteryFactoryContract = new ethers.Contract(LOTTERY_FACTORY_ADDRESS, LOTTERY_FACTORY_ABI, connectedWallet);
    
    // Get room details
    console.log(`Getting details for Room ID: ${roomIdNumber}`);
    const roomDetails = await lotteryFactoryContract.getRoomDetails(roomIdNumber);
    
    // Extract room details for informational purposes only
    const roomName = roomDetails[1];
    const prizePool = roomDetails[5];
    const playerCount = roomDetails[6];
    const roomOwner = roomDetails[7];
    const currentRoundNumber = roomDetails[14];
    
    // Display basic room information
    console.log(`Room name: ${roomName}`);
    console.log(`Prize pool: ${ethers.formatEther(prizePool)} CELO`);
    console.log(`Player count: ${playerCount}`);
    console.log(`Room owner: ${roomOwner}`);
    console.log(`Current round number: ${currentRoundNumber}`);
    
    // Check if you are the room owner (informational only)
    if (roomOwner.toLowerCase() !== connectedWallet.address.toLowerCase()) {
      console.log(`Note: You are not the owner of this room (${roomOwner}).`);
      console.log(`Your address: ${connectedWallet.address}`);
    }
    
    // Verify the winning number and private key
    console.log(`Attempting to reveal winning number: ${WINNING_NUMBER} for room ID: ${roomIdNumber}`);
    console.log(`Private key (first 10 chars): ${ENCRYPTION_PRIVATE_KEY.substring(0, 10)}...`);
    
    // Execute the reveal winning number transaction without checking room state
    console.log(`Submitting reveal transaction...`);
    const tx = await lotteryFactoryContract.revealWinningNumber(
      roomIdNumber,
      WINNING_NUMBER,
      ENCRYPTION_PRIVATE_KEY,
      {
        gasLimit: 500000 // Setting a gas limit for Celo transactions
      }
    );
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log(`View on explorer: ${CELO_EXPLORER}/tx/${tx.hash}`);
    
    // Wait for transaction to be mined
    console.log('Waiting for transaction confirmation...');
    const receipt = await tx.wait();
    
    console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
    // Find the WinningNumberRevealed event
    const winningNumberRevealedEvent = receipt.logs
      .map((log: ethers.Log) => {
        try {
          return lotteryFactoryContract.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .find((event: ethers.LogDescription | null) => event && event.name === 'WinningNumberRevealed');
    
    if (winningNumberRevealedEvent) {
      console.log(`Winning number revealed successfully: ${winningNumberRevealedEvent.args[1]}`);
      console.log(`For room ID: ${winningNumberRevealedEvent.args[0]}`);
      console.log(`Timestamp: ${new Date(Number(winningNumberRevealedEvent.args[2]) * 1000).toLocaleString()}`);
      console.log(`Round number: ${winningNumberRevealedEvent.args[3]}`);
    } else {
      console.log('Winning number revealed but could not find event in logs');
    }
    
    console.log('Winning number reveal completed successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Execute the main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 