import { ethers } from "hardhat";
import { expect } from "chai";

describe("Testnet Transaction Comparison", function () {
  let lotteryFactory: any;
  let mockCUSD: any;
  let owner: any;
  let otherAccount: any;
  
  before(async function () {
    [owner, otherAccount] = await ethers.getSigners();
    
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

  it("Should test various combinations to find testnet issue", async function () {
    // EXACT VALUES FROM THE TESTNET TRANSACTION
    const roomId = 0; // From input: 0000000000000000000000000000000000000000000000000000000000000000
    const privateKey = "0x953485bce5da4adae4cd876cd66b4373112e15d54fd60183c4d3a95ca4ac5ac8"; // From input
    const winningNumber = 42; // From input: 000000000000000000000000000000000000000000000000000000000000002a
    
    // Testnet contract address: 0x81b1ae6a82d0e34e1ad6377bc7ab0d39262f12be
    // Your wallet address (from): 0x7029564b1eef5490b588b654734bb7b8bff010c9
    
    // Create a room owned by our test account
    const entryFee = ethers.parseEther("0.01");
    const drawTime = Math.floor(Date.now() / 1000) + 3600;
    
    console.log("THEORY 1: Owner mismatch - testing if contract's owner verification checks a different address");
    // Our test will create the room with owner.address
    
    // Calculate encryptedWinningNumber directly without helper function
    const encryptedWinningNumber = ethers.keccak256(
      ethers.solidityPacked(
        ["uint8", "bytes32", "uint256", "address"],
        [winningNumber, privateKey, roomId, owner.address]
      )
    );
    
    await lotteryFactory.createRoom(
      "Testnet Debug Room",
      "Room to debug testnet issue",
      entryFee,
      drawTime,
      encryptedWinningNumber
    );
    
    // Confirm room details
    const room = await lotteryFactory.getRoomDetails(roomId);
    console.log("Our test owner address:", owner.address);
    console.log("Contract room owner:", room.owner);
    console.log("Owner addresses match:", owner.address === room.owner);
    
    // Fast forward time
    await ethers.provider.send("evm_increaseTime", [3700]);
    await ethers.provider.send("evm_mine", []);
    
    // Try reveal with various combinations
    console.log("\nTESTING DIFFERENT REVEAL COMBINATIONS:");
    
    // Try #1: Normal reveal with expected values
    try {
      console.log("\nTry #1: Normal reveal with our calculated values");
      await lotteryFactory.revealWinningNumber(roomId, privateKey, winningNumber);
      console.log("SUCCESS - Basic reveal works in our test");
    } catch (e: any) {
      console.log("FAILED - Basic reveal:", e.message);
    }
    
    // Try #2: Reveal from a different account
    try {
      console.log("\nTry #2: Reveal from different account");
      await lotteryFactory.connect(otherAccount).revealWinningNumber(roomId, privateKey, winningNumber);
      console.log("SUCCESS - This shouldn't work due to owner check");
    } catch (e: any) {
      console.log("FAILED as expected - Different account:", e.message);
    }
    
    // Try #3: Test with hardcoded testnet addresses
    try {
      console.log("\nTry #3: Test with hardcoded testnet addresses");
      // Using your testnet wallet address as a simulation
      const testnetUserAddress = "0x7029564b1eef5490b588b654734bb7b8bff010c9";
      
      const testnetHash = ethers.keccak256(
        ethers.solidityPacked(
          ["uint8", "bytes32", "uint256", "address"],
          [winningNumber, privateKey, roomId, testnetUserAddress]
        )
      );
      
      console.log("Hash with testnet user address:", testnetHash);
      console.log("Different from our test hash:", testnetHash !== encryptedWinningNumber);
      
      // Create another room with this hash for testing
      const roomId2 = 1;
      await lotteryFactory.createRoom(
        "Testnet Address Test",
        "Testing with testnet address",
        entryFee,
        drawTime,
        testnetHash
      );
      
      // Try to reveal from owner (which should work)
      await lotteryFactory.revealWinningNumber(roomId2, privateKey, winningNumber);
      console.log("SUCCESS - Room with testnet address hash worked from our account");
    } catch (e: any) {
      console.log("FAILED - Testnet address test:", e.message);
    }
    
    // Try #4: Test with different possible roomId
    try {
      console.log("\nTry #4: Test with different roomId (1 instead of 0)");
      // Create room with ID 1 but otherwise same parameters
      const roomId1Hash = ethers.keccak256(
        ethers.solidityPacked(
          ["uint8", "bytes32", "uint256", "address"],
          [winningNumber, privateKey, 1, owner.address]
        )
      );
      
      const roomId2 = 2;
      await lotteryFactory.createRoom(
        "Room ID Test",
        "Testing with different room ID in hash",
        entryFee,
        drawTime,
        roomId1Hash
      );
      
      // Try to reveal (should fail due to hash mismatch)
      await lotteryFactory.revealWinningNumber(roomId2, privateKey, winningNumber);
      console.log("SUCCESS - This shouldn't work due to ID mismatch");
    } catch (e: any) {
      console.log("FAILED as expected - Room ID mismatch:", e.message);
    }
    
    // Final conclusion
    console.log("\nTESTNET DEBUGGING CONCLUSION:");
    console.log("The most likely issue is that the testnet contract has one of these differences:");
    console.log("1. The owner stored in the contract isn't the address you're sending from");
    console.log("2. The room ID on testnet might be different");
    console.log("3. The privateKey or winningNumber you're using now isn't the same as when you created the room");
    console.log("4. The implementation of verifyWinningNumber is different (possibly including roundNumber)");
  });
}); 