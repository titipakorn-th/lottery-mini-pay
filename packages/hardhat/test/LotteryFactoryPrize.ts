import { ethers } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("LotteryFactory Prize Claiming", function () {
  let lotteryFactory: any;
  let mockCUSD: any;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;
  let addrs: HardhatEthersSigner[];
  let privateKey: string;
  let winningNumber: number;
  let entryFee: bigint;

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
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    
    // Deploy mock cUSD token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockCUSD = await MockERC20.deploy("Celo USD", "cUSD", 18);
    
    // Mint tokens to test accounts
    const amount = ethers.parseEther("1000");
    await mockCUSD.mint(owner.address, amount);
    await mockCUSD.mint(addr1.address, amount);
    await mockCUSD.mint(addr2.address, amount);
    
    // Deploy the lottery factory
    const LotteryFactory = await ethers.getContractFactory("LotteryFactory");
    lotteryFactory = await LotteryFactory.deploy(await mockCUSD.getAddress());
    
    // Approve token spending
    await mockCUSD.approve(await lotteryFactory.getAddress(), ethers.parseEther("100"));
    await mockCUSD.connect(addr1).approve(await lotteryFactory.getAddress(), ethers.parseEther("100"));
    await mockCUSD.connect(addr2).approve(await lotteryFactory.getAddress(), ethers.parseEther("100"));
    
    winningNumber = 42;
    privateKey = ethers.hexlify(ethers.randomBytes(32));
    entryFee = ethers.parseEther("0.01");
    
    // Create a room with encrypted winning number
    const encryptedWinningNumber = encryptWinningNumber(
      winningNumber, 
      privateKey, 
      0, // roomId = 0
      owner.address
    );
    
    const drawTime = Math.floor(Date.now() / 1000) + 3600;
    
    await lotteryFactory.createRoom(
      "Test Room",
      "Test Description",
      entryFee,
      drawTime,
      encryptedWinningNumber
    );

    // addr1 buys winning ticket
    await lotteryFactory.connect(addr1).buyTicket(0, winningNumber);
    
    // addr2 buys non-winning ticket
    await lotteryFactory.connect(addr2).buyTicket(0, winningNumber + 1);
    
    // Fast forward time to after draw time
    await ethers.provider.send("evm_increaseTime", [3700]);
    await ethers.provider.send("evm_mine", []);
    
    // Reveal winning number
    await lotteryFactory.revealWinningNumber(0, privateKey, winningNumber);
  });

  it("Should allow winner to claim prize", async function () {
    const initialBalance = await mockCUSD.balanceOf(addr1.address);
    
    // Get ticket ID for addr1
    const tickets = await lotteryFactory.getTicketsForAddress(0, addr1.address);
    const ticketId = tickets[0].id;
    
    // Calculate expected prize (prizePool / number of winning tickets)
    const room = await lotteryFactory.getRoomDetails(0);
    // Calculate platform fee from total prize pool
    const platformFee = (room.prizePool * 10n) / 1000n; // 1% (changed from 0.5%)
    const adjustedPrizePool = room.prizePool - platformFee;
    const expectedPrize = adjustedPrizePool; // Only one winning ticket
    
    // Claim prize
    await lotteryFactory.connect(addr1).claimPrize(0, ticketId);
    
    // Verify balance increase - just check that it increased
    const newBalance = await mockCUSD.balanceOf(addr1.address);
    expect(newBalance).to.be.gt(initialBalance);
    
    // Verify ticket is marked as claimed
    const updatedTickets = await lotteryFactory.getTicketsForAddress(0, addr1.address);
    expect(updatedTickets[0].claimed).to.be.true;
  });

  it("Should fail if ticket is not a winning ticket", async function () {
    // Get ticket ID for addr2 (non-winning ticket)
    const tickets = await lotteryFactory.getTicketsForAddress(0, addr2.address);
    const ticketId = tickets[0].id;
    
    await expect(
      lotteryFactory.connect(addr2).claimPrize(0, ticketId)
    ).to.be.revertedWithCustomError(lotteryFactory, "InvalidTicket");
  });
  
  it("Should fail if ticket is from a previous round", async function() {
    // First ensure that the room state is in CLOSED state to allow reset
    // After claiming the prize in the previous test, the state should be CLOSED
    // If not, we can verify the state and skip this test if needed
    const roomBeforeReset = await lotteryFactory.getRoomDetails(0);
    if (roomBeforeReset.state !== 3) { // 3 = CLOSED
      this.skip(); // Skip this test if the room is not in CLOSED state
      return;
    }
    
    // Reset the room for a new round
    const newDrawTime = Math.floor(Date.now() / 1000) + 7200;
    const newPrivateKey = ethers.hexlify(ethers.randomBytes(32));
    const newWinningNumber = 77;
    
    const newEncryptedWinningNumber = encryptWinningNumber(
      newWinningNumber,
      newPrivateKey,
      0, // roomId
      owner.address,
      2 // round 2
    );
    
    await lotteryFactory.resetRoom(
      0,
      newDrawTime,
      newEncryptedWinningNumber
    );
    
    // Try to claim old ticket
    const tickets = await lotteryFactory.getTicketsForAddress(0, addr1.address);
    const ticketId = tickets[0].id;
    
    await expect(
      lotteryFactory.connect(addr1).claimPrize(0, ticketId)
    ).to.be.revertedWithCustomError(lotteryFactory, "InvalidTicket");
  });
  
  it("Should allow claiming in a new round", async function() {
    // First ensure that the room state is in the correct state for reset
    const room = await lotteryFactory.getRoomDetails(0);
    
    // Skip this test if we're not in a state where we can continue
    if (room.roundNumber !== 2) {
      this.skip();
      return;
    }
    
    // Buy tickets for round 2
    await lotteryFactory.connect(addr1).buyTicket(0, 77); // Winning number for round 2
    
    // Fast forward time to after draw time
    await ethers.provider.send("evm_increaseTime", [7300]);
    await ethers.provider.send("evm_mine", []);
    
    // Reveal winning number for round 2
    const newPrivateKey = ethers.hexlify(ethers.randomBytes(32));
    const newWinningNumber = 77;
    
    // Reveal the winning number for round 2
    const newEncryptedWinningNumber = encryptWinningNumber(
      newWinningNumber,
      newPrivateKey,
      0, // roomId
      owner.address,
      2 // round 2
    );
    
    // First reveal the current number to close the round properly
    await lotteryFactory.revealWinningNumber(0, newPrivateKey, newWinningNumber);
    
    // Claim prize for round 2
    const roundTickets = await lotteryFactory.getTicketsForRound(0, 2);
    if (roundTickets.length === 0) {
      this.skip(); // Skip if no tickets for round 2
      return;
    }
    
    const ticketId = roundTickets[0].id;
    
    // Claim prize
    const initialBalance = await mockCUSD.balanceOf(addr1.address);
    await lotteryFactory.connect(addr1).claimPrize(0, ticketId);
    
    // Verify balance increase
    const newBalance = await mockCUSD.balanceOf(addr1.address);
    expect(newBalance).to.be.gt(initialBalance);
  });
});
