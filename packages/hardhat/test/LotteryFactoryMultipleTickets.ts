import { ethers } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("LotteryFactory Multiple Tickets Test", function () {
  let lotteryFactory: any;
  let mockCUSD: any;
  let owner: HardhatEthersSigner;
  let player: HardhatEthersSigner;
  let privateKey: string;
  let winningNumber: number;
  let entryFee: bigint;
  let roomId: number;

  // Define a simple Ticket interface to help with typing
  interface Ticket {
    id: bigint;
    roomId: bigint;
    player: string;
    number: number;
    claimed: boolean;
    roundNumber: bigint;
  }

  const encryptWinningNumber = (
    number: number,
    privateKey: string,
    roomId: number,
    ownerAddress: string,
    roundNumber: number = 1
  ): string => {
    return ethers.keccak256(
      ethers.solidityPacked(
        ["uint8", "bytes32", "uint256", "address", "uint256"],
        [number, privateKey, roomId, ownerAddress, roundNumber]
      )
    );
  };

  before(async function () {
    [owner, player] = await ethers.getSigners();
    
    // Deploy mock cUSD token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockCUSD = await MockERC20.deploy("Celo USD", "cUSD", 18);
    
    // Mint tokens to test accounts
    const amount = ethers.parseEther("1000");
    await mockCUSD.mint(owner.address, amount);
    await mockCUSD.mint(player.address, amount);
    
    // Deploy the lottery factory
    const LotteryFactory = await ethers.getContractFactory("LotteryFactory");
    lotteryFactory = await LotteryFactory.deploy(await mockCUSD.getAddress());
    
    // Approve token spending
    await mockCUSD.approve(await lotteryFactory.getAddress(), ethers.parseEther("100"));
    await mockCUSD.connect(player).approve(await lotteryFactory.getAddress(), ethers.parseEther("100"));
    
    // Set up test variables
    roomId = 0;
    winningNumber = 42;
    privateKey = ethers.hexlify(ethers.randomBytes(32));
    entryFee = ethers.parseEther("0.01");
  });

  it("Should handle single player buying multiple tickets, winning and claiming prize", async function () {
    // Create a room with encrypted winning number
    
    // Store the exact values we'll use for encryption
    const winningNumberToUse = winningNumber; // 42
    const privateKeyToUse = privateKey;
    const roomIdToUse = roomId; // 0
    const ownerAddressToUse = owner.address; // Use actual owner address
    const roundNumberToUse = 1; // Add round number
    
    // Calculate the hash exactly as the contract does - including roundNumber
    const encryptedWinningNumber = ethers.keccak256(
      ethers.solidityPacked(
        ["uint8", "bytes32", "uint256", "address", "uint256"],
        [winningNumberToUse, privateKeyToUse, roomIdToUse, ownerAddressToUse, roundNumberToUse]
      )
    );
    
    const drawTime = Math.floor(Date.now() / 1000) + 3600;
    
    // Log all values for creating a room
    console.log("--- CREATE ROOM VALUES ---");
    console.log("name:", "string");
    console.log("description:", "string");
    console.log("entryFee:", "uint256", entryFee.toString());
    console.log("drawTime:", "uint256", drawTime.toString());
    console.log("encryptedWinningNumber:", "bytes32", encryptedWinningNumber);
    console.log("privateKey:", "bytes32", privateKeyToUse);
    
    // Add detailed logging to help debug encryption
    console.log("--- ENCRYPTION DETAILS ---");
    console.log("winningNumber:", winningNumberToUse);
    console.log("privateKey:", privateKeyToUse);
    console.log("roomId:", roomIdToUse);
    console.log("ownerAddress:", ownerAddressToUse);
    console.log("roundNumber:", roundNumberToUse);
    

    await lotteryFactory.createRoom(
      "Multiple Tickets Test Room",
      "Test room for multiple tickets from single player",
      entryFee,
      drawTime,
      encryptedWinningNumber
    );

    // Record player's initial balance
    const initialBalance = await mockCUSD.balanceOf(player.address);
    console.log("Initial balance:", ethers.formatEther(initialBalance));

    // Player buys 4 tickets with different numbers (one of them is the winning number)
    const ticketNumbers = [15, 27, winningNumber, 89]; // 42 is the winning number
    
    for (const number of ticketNumbers) {
      await lotteryFactory.connect(player).buyTicket(roomId, number);
    }
    
    // Verify total 4 tickets purchased
    const playerTickets = await lotteryFactory.getTicketsForAddress(roomId, player.address);
    expect(playerTickets.length).to.equal(4);
    
    console.log("Player tickets:", playerTickets.map((t: Ticket) => ({
      id: t.id.toString(),
      number: t.number
    })));
    
    // Get balance after buying tickets
    const balanceAfterPurchase = await mockCUSD.balanceOf(player.address);
    console.log("Balance after purchase:", ethers.formatEther(balanceAfterPurchase));
    
    // Verify player paid for 4 tickets
    expect(initialBalance - balanceAfterPurchase).to.equal(entryFee * 4n);
    
    // Get room details before revealing
    const roomBefore = await lotteryFactory.getRoomDetails(roomId);
    expect(roomBefore.prizePool).to.equal(entryFee * 4n);
    expect(roomBefore.playerCount).to.equal(1); // Only one player, despite multiple tickets
    
    // Fast forward time to after draw time
    await ethers.provider.send("evm_increaseTime", [3700]);
    await ethers.provider.send("evm_mine", []);
    
    // Get the stored encrypted winning number from the contract for comparison
    console.log("Contract stored encrypted number:", roomBefore.encryptedWinningNumber);
    console.log("Contract owner address:", roomBefore.owner);
    
    // Log all values for revealing winning number
    console.log("--- REVEALING WINNING NUMBER VALUES ---");
    console.log("roomId:", "uint256", roomIdToUse.toString());
    console.log("privateKey:", "bytes32", privateKeyToUse);
    console.log("winningNumber:", "uint8", winningNumberToUse.toString());
    console.log("roundNumber:", roundNumberToUse.toString());
    
    // Reveal winning number using the exact same values we used for encryption
    await lotteryFactory.revealWinningNumber(roomIdToUse, privateKeyToUse, winningNumberToUse);
    
    // Get room details after revealing
    const roomAfter = await lotteryFactory.getRoomDetails(roomId);
    expect(roomAfter.revealed).to.be.true;
    expect(roomAfter.winningNumber).to.equal(winningNumber);
    console.log("Revealed winning number:", roomAfter.winningNumber);
    
    // Find the winning ticket
    let winningTicketId: bigint | null = null;
    
    for (let i = 0; i < playerTickets.length; i++) {
      console.log(`Ticket ${i}: number=${playerTickets[i].number}, id=${playerTickets[i].id}`);
      if (Number(playerTickets[i].number) === winningNumber) {
        winningTicketId = playerTickets[i].id;
        break;
      }
    }
    
    console.log("Found winning ticket ID:", winningTicketId?.toString());
    expect(winningTicketId).to.not.be.null;
    
    // Calculate expected prize amount
    // Calculate platform fee (10%) based on contract implementation: (prizePool * 10) / 100
    const platformFee = (roomAfter.prizePool * 10n) / 100n;
    const adjustedPrizePool = roomAfter.prizePool - platformFee;
    
    console.log("Prize pool:", ethers.formatEther(roomAfter.prizePool));
    console.log("Platform fee:", ethers.formatEther(platformFee));
    console.log("Adjusted prize pool:", ethers.formatEther(adjustedPrizePool));
    
    // Claim prize
    const balanceBeforeClaim = await mockCUSD.balanceOf(player.address);
    console.log("Balance before claim:", ethers.formatEther(balanceBeforeClaim));

    await lotteryFactory.connect(player).claimPrize(roomId, winningTicketId);
    
    // Check balance after claiming
    const balanceAfterClaim = await mockCUSD.balanceOf(player.address);
    console.log("Balance after claim:", ethers.formatEther(balanceAfterClaim));
    
    // Check that balance increased by the expected prize amount
    const actualPrizeReceived = balanceAfterClaim - balanceBeforeClaim;
    console.log("Actual prize received:", ethers.formatEther(actualPrizeReceived));
    console.log("Expected prize amount:", ethers.formatEther(adjustedPrizePool));
    
    // Verify the prize amount received matches the expected prize
    expect(actualPrizeReceived).to.equal(adjustedPrizePool);
    
    // Verify the ticket is marked as claimed
    const updatedPlayerTickets = await lotteryFactory.getTicketsForAddress(roomId, player.address);
    const claimedTicket = updatedPlayerTickets.find((t: Ticket) => 
      t.id.toString() === winningTicketId?.toString()
    );
    expect(claimedTicket.claimed).to.be.true;
    
    // Calculate final balance if all operations were perfect
    const expectedFinalBalance = initialBalance - (entryFee * 4n) + adjustedPrizePool;
    
    console.log("Expected final balance:", ethers.formatEther(expectedFinalBalance));
    console.log("Actual final balance:", ethers.formatEther(balanceAfterClaim));
    
    // Due to precision issues, check they're equal within a small tolerance
    const difference = expectedFinalBalance > balanceAfterClaim
      ? expectedFinalBalance - balanceAfterClaim
      : balanceAfterClaim - expectedFinalBalance;
      
    // Tolerance of 1 wei
    expect(difference).to.be.lessThanOrEqual(1n);
  });
  
  it("DEBUG: Print encryption values for fixed owner address", async function() {
    // Define fixed owner address
    const fixedOwnerAddress = "0x7029564b1eEF5490B588B654734Bb7B8bFf010C9";
    
    // Use fixed test values for consistency
    const testPrivateKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const testWinningNumber = 42;
    const testRoomId = 0;
    const testRoundNumber = 1;
    
    console.log("\n----- ENCRYPTION VALUES FOR FIXED OWNER -----");
    console.log("Owner address:", fixedOwnerAddress);
    console.log("Private key:", testPrivateKey);
    console.log("Winning number:", testWinningNumber);
    console.log("Room ID:", testRoomId);
    console.log("Round number:", testRoundNumber);
    
    // Calculate the hashes
    const hashWithRound = ethers.keccak256(
      ethers.solidityPacked(
        ["uint8", "bytes32", "uint256", "address", "uint256"],
        [testWinningNumber, testPrivateKey, testRoomId, fixedOwnerAddress, testRoundNumber]
      )
    );

    
    console.log("\nHash (with round number):", hashWithRound);
    // Add input values in the format the contract expects
    console.log("\n----- INPUT VALUES FOR CONTRACT -----");
    console.log("winningNumber (uint8):", testWinningNumber);
    console.log("privateKey (bytes32):", testPrivateKey);
    console.log("roomId (uint256):", testRoomId);
    console.log("owner (address):", fixedOwnerAddress);
    console.log("roundNumber (uint256):", testRoundNumber);
    
    console.log("\n----- FOR CONTRACT VERIFICATION -----");
    console.log("To create a room with this winning number:");
    console.log(`await lotteryFactory.createRoom("Room Name", "Room Description", ethers.parseEther("0.01"), ${Math.floor(Date.now() / 1000) + 3600}, "${hashWithRound}");`);
    
    console.log("\nTo reveal the winning number:");
    console.log(`await lotteryFactory.revealWinningNumber(${testRoomId}, "${testPrivateKey}", ${testWinningNumber});`);
  });
}); 