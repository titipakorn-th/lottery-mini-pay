import { ethers } from "hardhat";
import { expect } from "chai";

describe("Testnet Debug", function () {
  let lotteryFactory: any;
  let mockCUSD: any;
  let owner: any;
  
  before(async function () {
    [owner] = await ethers.getSigners();
    
    // Deploy mock cUSD token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockCUSD = await MockERC20.deploy("Celo USD", "cUSD", 18);
    
    // Mint tokens to test accounts
    const amount = ethers.parseEther("1000");
    await mockCUSD.mint(owner.address, amount);
    
    // Deploy the lottery factory
    const LotteryFactory = await ethers.getContractFactory("LotteryFactory");
    lotteryFactory = await LotteryFactory.deploy(await mockCUSD.getAddress());
    
    // Approve token spending
    await mockCUSD.approve(await lotteryFactory.getAddress(), ethers.parseEther("100"));
  });

  it("Should recreate testnet scenario with exact testnet values", async function () {
    // Constants from your testnet transaction
    const roomId = 0;
    const privateKey = "0x953485bce5da4adae4cd876cd66b4373112e15d54fd60183c4d3a95ca4ac5ac8";
    const winningNumber = 42;
    const ownerAddress = owner.address; // This is the room creator's address
    
    // Calculate the encryptedWinningNumber as we believe it should be
    const encryptedWinningNumber = ethers.keccak256(
      ethers.solidityPacked(
        ["uint8", "bytes32", "uint256", "address"],
        [winningNumber, privateKey, roomId, ownerAddress]
      )
    );
    
    console.log("Simulating testnet reveal attempt with:");
    console.log("Room ID:", roomId);
    console.log("Private Key:", privateKey);
    console.log("Winning Number:", winningNumber);
    console.log("Owner Address:", ownerAddress);
    console.log("Calculated Encrypted Number:", encryptedWinningNumber);
    
    // Create the room with these values
    const entryFee = ethers.parseEther("0.01");
    const drawTime = Math.floor(Date.now() / 1000) + 3600;
    
    await lotteryFactory.createRoom(
      "Testnet Debug Room",
      "Room to debug testnet issue",
      entryFee,
      drawTime,
      encryptedWinningNumber
    );
    
    // Get room details to verify it was created properly
    const room = await lotteryFactory.getRoomDetails(roomId);
    console.log("Room creator address:", room.owner);
    console.log("Stored encrypted number:", room.encryptedWinningNumber);
    console.log("Stored matches calculated:", room.encryptedWinningNumber === encryptedWinningNumber);
    
    // Fast forward time to after draw time
    await ethers.provider.send("evm_increaseTime", [3700]);
    await ethers.provider.send("evm_mine", []);
    
    // Try the reveal which should work if our understanding is correct
    try {
      await lotteryFactory.revealWinningNumber(roomId, privateKey, winningNumber);
      console.log("Reveal succeeded! The problem is likely with the testnet contract or transaction parameters.");
    } catch (e: any) {
      console.log("Reveal failed with error:", e.message);
      
      // Let's try various different formats to see if any work
      try {
        console.log("\nTrying with non-prefixed private key:");
        const privateKeyWithoutPrefix = privateKey.replace(/^0x/, '');
        await lotteryFactory.revealWinningNumber(roomId, "0x" + privateKeyWithoutPrefix, winningNumber);
        console.log("Success with non-prefixed private key!");
      } catch (e: any) {
        console.log("Failed with error:", e.message);
      }
    }
  });
}); 