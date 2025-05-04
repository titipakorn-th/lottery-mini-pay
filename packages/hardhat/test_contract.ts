// Lottery Room Creation Script
// This script demonstrates how to create multiple lottery rooms on Celo Alfajores testnet

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

// Celo Alfajores Testnet Configuration
const CELO_ALFAJORES_RPC = 'https://alfajores-forno.celo-testnet.org';
const CELO_ALFAJORES_CHAIN_ID = 44787;
const CELO_EXPLORER = 'https://alfajores.celoscan.io';

// Lottery Factory Contract ABI (only the functions we need)
const LOTTERY_FACTORY_ABI = [
  "function createRoom(string name, string description, uint256 entryFee, uint256 drawTime, bytes32 encryptedWinningNumber) external",
  "function roomCount() view returns (uint256)",
  "function getRoomDetails(uint256 roomId) view returns (tuple(uint256 id, string name, string description, uint256 entryFee, uint256 drawTime, uint256 prizePool, uint256 playerCount, address owner, bytes32 encryptedWinningNumber, uint8 winningNumber, bool revealed, uint8 state))",
  "event RoomCreated(uint256 indexed roomId, string name, uint256 entryFee, uint256 drawTime, address indexed owner)"
];

// Configuration
const MNEMONIC = process.env.MNEMONIC || '';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
// Deployed contract address on Alfajores testnet
const LOTTERY_FACTORY_ADDRESS = process.env.LOTTERY_FACTORY_ADDRESS || '0x7BFedF7D49f058811E513e686Cf11F531204A78F';

// Room configurations
const ROOM_CONFIGS = [
  { name: "Hourly Lottery", description: "Lottery with 1 hour duration", entryFee: "1", durationHours: 1 },
  { name: "2-Hour Lottery", description: "Lottery with 2 hour duration", entryFee: "2", durationHours: 2 },
  { name: "3-Hour Lottery", description: "Lottery with 3 hour duration", entryFee: "3", durationHours: 3 },
  { name: "4-Hour Lottery", description: "Lottery with 4 hour duration", entryFee: "4", durationHours: 4 }
];

// Store winning numbers and private keys
interface RoomSecret {
  roomId: string;
  roomName: string;
  winningNumber: number;
  privateKey: string;
  drawTime: Date;
}

async function main() {
  try {
    console.log('Connecting to Celo Alfajores Testnet...');
    
    // Create provider for Celo Alfajores
    const provider = new ethers.JsonRpcProvider(CELO_ALFAJORES_RPC);
    
    // Get network information
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Set up wallet from mnemonic or private key
    let wallet: ethers.Wallet | ethers.HDNodeWallet;
    
    if (MNEMONIC) {
      // Create ethers.HDNodeWallet from mnemonic
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
    
    // Check ETH balance
    const celoBalance = await provider.getBalance(connectedWallet.address);
    console.log(`CELO Balance: ${ethers.formatEther(celoBalance)} CELO`);
    
    if (celoBalance === BigInt(0)) {
      console.log(`Warning: Wallet has 0 CELO. You need CELO for transaction fees.`);
      console.log(`Get test tokens from: https://faucet.celo.org/alfajores`);
      return;
    }
    
    // Create contract instance
    console.log(`Connecting to LotteryFactory at address: ${LOTTERY_FACTORY_ADDRESS}`);
    const lotteryFactoryContract = new ethers.Contract(LOTTERY_FACTORY_ADDRESS, LOTTERY_FACTORY_ABI, connectedWallet);
    
    // Store room secrets for reporting later
    const roomSecrets: RoomSecret[] = [];
    
    // Create each room
    for (let i = 0; i < ROOM_CONFIGS.length; i++) {
      const config = ROOM_CONFIGS[i];
      
      // Get current room count (for roomId)
      const roomCount = await lotteryFactoryContract.roomCount();
      
      // Generate winning number (1-99)
      const winningNumber = Math.floor(Math.random() * 99) + 1;
      
      // Generate a random private key for encryption
      const privateKey = ethers.hexlify(ethers.randomBytes(32));
      
      // Calculate draw time (current time + hours)
      const drawTime = Math.floor(Date.now() / 1000) + (config.durationHours * 3600);
      
      // Convert entry fee to wei (using 18 decimals for ERC-20 tokens)
      const entryFeeWei = ethers.parseUnits(config.entryFee, 18);
      
      // Use the roundNumber 1 for new rooms
      const roundNumber = 1;
      
      // Encrypt the winning number using keccak256 matching the contract verification
      const encryptedWinningNumber = ethers.keccak256(
        ethers.solidityPacked(
          ["uint8", "bytes32", "uint256", "address", "uint256"],
          [winningNumber, privateKey, roomCount, connectedWallet.address, roundNumber]
        )
      );
      
      console.log(`\nCreating lottery room: ${config.name}`);
      console.log(`Entry fee: ${config.entryFee} cUSD`);
      console.log(`Duration: ${config.durationHours} hour(s)`);
      console.log(`Draw time: ${new Date(drawTime * 1000).toLocaleString()}`);
      
      // Execute the room creation - without publicKey parameter as it's not in the contract
      const tx = await lotteryFactoryContract.createRoom(
        config.name,
        config.description,
        entryFeeWei,
        drawTime,
        encryptedWinningNumber,
        {
          gasLimit: 1000000 // Setting a gas limit for Celo transactions
        }
      );
      
      console.log(`Transaction hash: ${tx.hash}`);
      console.log(`View on explorer: ${CELO_EXPLORER}/tx/${tx.hash}`);
      
      // Wait for transaction to be mined
      console.log('Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      
      console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);
      
      // Find the RoomCreated event to get the room ID
      const roomCreatedEvent = receipt.logs
        .map((log: ethers.Log) => {
          try {
            return lotteryFactoryContract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find((event: ethers.LogDescription | null) => event && event.name === 'RoomCreated');
      
      if (roomCreatedEvent) {
        const roomId = roomCreatedEvent.args[0];
        console.log(`Room created successfully with ID: ${roomId}`);
        
        // Store room secrets
        roomSecrets.push({
          roomId: roomId.toString(),
          roomName: config.name,
          winningNumber: winningNumber,
          privateKey: privateKey,
          drawTime: new Date(drawTime * 1000)
        });
        
        // Get room details
        const roomDetails = await lotteryFactoryContract.getRoomDetails(roomId);
        console.log(`Room name: ${roomDetails[1]}`);
        console.log(`Entry fee: ${ethers.formatUnits(roomDetails[3], 18)} cUSD`);
        console.log(`Draw time: ${new Date(Number(roomDetails[4]) * 1000).toLocaleString()}`);
      } else {
        console.log('Room created but could not find room ID in events');
      }
    }
    
    // Print all room secrets at the end
    console.log('\n\n========== SAVE THIS INFORMATION SECURELY ==========');
    console.log('ROOM WINNING NUMBERS AND PRIVATE KEYS:');
    console.log('================================================');
    
    roomSecrets.forEach((secret, index) => {
      console.log(`\nRoom #${index + 1}: ${secret.roomName} (ID: ${secret.roomId})`);
      console.log(`Draw Time: ${secret.drawTime.toLocaleString()}`);
      console.log(`Winning Number: ${secret.winningNumber}`);
      console.log(`Private Key: ${secret.privateKey}`);
      console.log('------------------------------------------------');
    });
    
    console.log('\nALL ROOMS CREATED SUCCESSFULLY!');
    
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