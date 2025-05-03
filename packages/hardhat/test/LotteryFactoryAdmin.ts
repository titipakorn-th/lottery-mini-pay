import { ethers } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("LotteryFactory Admin Functions", function () {
  let lotteryFactory: any;
  let mockCUSD: any;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;

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

  beforeEach(async function() {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock cUSD token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockCUSD = await MockERC20.deploy("Celo USD", "cUSD", 18);
    
    // Mint tokens to test accounts
    const amount = ethers.parseEther("1000");
    await mockCUSD.mint(owner.address, amount);
    await mockCUSD.mint(addr1.address, amount);
    await mockCUSD.mint(addr2.address, amount);
    
    // Deploy a fresh contract for each test
    const LotteryFactory = await ethers.getContractFactory("LotteryFactory");
    lotteryFactory = await LotteryFactory.deploy(await mockCUSD.getAddress());
    
    // Approve token spending
    await mockCUSD.approve(await lotteryFactory.getAddress(), ethers.parseEther("100"));
    await mockCUSD.connect(addr1).approve(await lotteryFactory.getAddress(), ethers.parseEther("100"));
    await mockCUSD.connect(addr2).approve(await lotteryFactory.getAddress(), ethers.parseEther("100"));
  });

  it("Should allow owner to pause and unpause", async function () {
    // First pause the contract
    await lotteryFactory.emergencyPause();
    
    // Check contract is paused
    expect(await lotteryFactory.isPaused()).to.equal(true);
    
    // Setup room creation parameters
    const entryFee = ethers.parseEther("0.01");
    const drawTime = Math.floor(Date.now() / 1000) + 3600;
    
    // Attempt to create a room while paused should fail
    let succeeded = true;
    try {
      await lotteryFactory.createRoom(
        "Test Room",
        "Test Description",
        entryFee,
        drawTime,
        ethers.hexlify(ethers.randomBytes(32))
      );
    } catch (error) {
      // If we get an error, that's what we want - operation should fail when paused
      succeeded = false;
    }
    // Verify the transaction failed
    expect(succeeded).to.equal(false);
    
    // Resume operations
    await lotteryFactory.resumeOperations();
    
    // Check contract is not paused anymore
    expect(await lotteryFactory.isPaused()).to.equal(false);
    
    // Try to create a room after unpausing - should succeed
    await expect(
      lotteryFactory.createRoom(
        "Test Room",
        "Test Description",
        entryFee,
        drawTime,
        ethers.hexlify(ethers.randomBytes(32))
      )
    ).to.not.be.reverted;
  });

  it("Should allow emergency withdrawal of cUSD tokens", async function () {
    // Send some tokens to the contract
    const amount = ethers.parseEther("1");
    await mockCUSD.transfer(await lotteryFactory.getAddress(), amount);
    
    const initialOwnerBalance = await mockCUSD.balanceOf(owner.address);
    
    // Perform emergency withdrawal
    await lotteryFactory.emergencyWithdrawTokens(amount);
    
    // Check owner's balance increased
    const newOwnerBalance = await mockCUSD.balanceOf(owner.address);
    expect(newOwnerBalance).to.equal(initialOwnerBalance + amount);
    
    // Check contract balance
    const newContractBalance = await mockCUSD.balanceOf(await lotteryFactory.getAddress());
    expect(newContractBalance).to.equal(0);
  });
  
  it("Should handle room reset by owner", async function() {
    // Create a room
    const entryFee = ethers.parseEther("0.01");
    const drawTime = Math.floor(Date.now() / 1000) + 3600;
    const privateKey = ethers.hexlify(ethers.randomBytes(32));
    const winningNumber = 42;
    
    const encryptedWinningNumber = encryptWinningNumber(
      winningNumber,
      privateKey,
      0, // First room
      owner.address
    );
    
    await lotteryFactory.createRoom(
      "Test Room",
      "Test Description",
      entryFee,
      drawTime,
      encryptedWinningNumber
    );
    
    // Reveal winning number after time passes
    await ethers.provider.send("evm_increaseTime", [3700]);
    await ethers.provider.send("evm_mine", []);
    
    await lotteryFactory.revealWinningNumber(0, privateKey, winningNumber);
    
    // Reset the room
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
    
    // Check room details
    const room = await lotteryFactory.getRoomDetails(0);
    expect(room.roundNumber).to.equal(2);
    expect(room.state).to.equal(0); // OPEN
    expect(room.revealed).to.be.false;
    
    // Non-owner should not be able to reset
    await expect(
      lotteryFactory.connect(addr1).resetRoom(
        0,
        newDrawTime,
        ethers.hexlify(ethers.randomBytes(32))
      )
    ).to.be.revertedWithCustomError(lotteryFactory, "InvalidOwner");
  });
});
