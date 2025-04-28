import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("LotteryFactory Prize Claiming", function () {
  let lotteryFactory: Contract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let privateKey: string;
  let winningNumber: number;
  let entryFee: bigint;

  const encryptWinningNumber = (
    number: number,
    privateKey: string,
    roomId: number,
    ownerAddress: string
  ): string => {
    return ethers.keccak256(
      ethers.solidityPacked(
        ["uint8", "bytes32", "uint256", "address"],
        [number, privateKey, roomId, ownerAddress]
      )
    );
  };

  before(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    const LotteryFactory = await ethers.getContractFactory("LotteryFactory");
    lotteryFactory = await LotteryFactory.deploy();
    
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
      encryptedWinningNumber,
      ethers.hexlify(ethers.randomBytes(32))
    );

    // addr1 buys winning ticket
    await lotteryFactory.connect(addr1).buyTicket(0, winningNumber, { value: entryFee });
    
    // addr2 buys non-winning ticket
    await lotteryFactory.connect(addr2).buyTicket(0, winningNumber + 1, { value: entryFee });
    
    // Fast forward time to after draw time
    await ethers.provider.send("evm_increaseTime", [3700]);
    await ethers.provider.send("evm_mine", []);
    
    // Reveal winning number
    await lotteryFactory.revealWinningNumber(0, privateKey, winningNumber);
  });

  it("Should allow winner to claim prize", async function () {
    const initialBalance = await ethers.provider.getBalance(addr1.address);
    
    // Get ticket ID for addr1
    const tickets = await lotteryFactory.getTicketsForAddress(0, addr1.address);
    const ticketId = tickets[0].id;
    
    // Calculate expected prize (prizePool / number of winning tickets)
    const room = await lotteryFactory.getRoomDetails(0);
    const expectedPrize = room.prizePool; // Only one winning ticket
    
    // Claim prize
    const tx = await lotteryFactory.connect(addr1).claimPrize(0, ticketId);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    
    // Verify balance increase
    const newBalance = await ethers.provider.getBalance(addr1.address);
    const expectedNewBalance = initialBalance + expectedPrize - gasUsed;
    expect(newBalance).to.be.closeTo(
      expectedNewBalance,
      ethers.parseEther("0.0001") // Allow for some rounding
    );
    
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
});
