import { useState } from "react";
import StableTokenABI from "./cusd-abi.json";
import LotteryFactoryABI from "./LotteryFactoryModule.json";
import {
    createPublicClient,
    createWalletClient,
    custom,
    getContract,
    http,
    parseEther,
} from "viem";
import { celoAlfajores } from "viem/chains";

const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(),
});

const cUSDTokenAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"; // Testnet
const LOTTERY_CONTRACT = "0x5EA095523C27F81564BD56cCE2466b2B77d157a9"; // Testnet

export const useWeb3 = () => {
    const [address, setAddress] = useState<string | null>(null);

    const getUserAddress = async () => {
        if (typeof window !== "undefined" && window.ethereum) {
            let walletClient = createWalletClient({
                transport: custom(window.ethereum),
                chain: celoAlfajores,
            });

            let [address] = await walletClient.getAddresses();
            setAddress(address);
        }
    };

    const sendCUSD = async (to: string, amount: string) => {
        let walletClient = createWalletClient({
            transport: custom(window.ethereum),
            chain: celoAlfajores,
        });

        let [address] = await walletClient.getAddresses();

        const amountInWei = parseEther(amount);

        const tx = await walletClient.writeContract({
            address: cUSDTokenAddress,
            abi: StableTokenABI.abi,
            functionName: "transfer",
            account: address,
            args: [to, amountInWei],
        });

        let receipt = await publicClient.waitForTransactionReceipt({
            hash: tx,
        });

        return receipt;
    };

    // Lottery Functions
    const buyLotteryTicket = async (roomId: number, number: number) => {
        try {
            let walletClient = createWalletClient({
                transport: custom(window.ethereum),
                chain: celoAlfajores,
            });

            let [address] = await walletClient.getAddresses();
            console.log("User address:", address);

            // Convert roomId to a number to ensure it's the right type
            const safeRoomId = Number(roomId);
            console.log(`Original roomId: ${roomId} (${typeof roomId}), converted: ${safeRoomId} (${typeof safeRoomId})`);

            // Get the room details to determine entry fee
            const lotteryContract = getContract({
                abi: LotteryFactoryABI.abi,
                address: LOTTERY_CONTRACT,
                client: publicClient,
            });
            const roomDetails = await lotteryContract.read.getRoomDetails([safeRoomId]);
            const entryFee = (roomDetails as any).entryFee;

            const amountInWei = parseEther(entryFee.toString());

            // Simulate the contract write before execution
            const {request} = await publicClient.simulateContract({
                address: LOTTERY_CONTRACT,
                abi: LotteryFactoryABI.abi,
                functionName: "buyTicket",
                account: address,
                args: [safeRoomId, number],
                value: amountInWei,
                gas: BigInt(300000), // Set a reasonable gas limit
            });

            // Create the transaction request with explicit gas configuration
            const tx = await walletClient.writeContract({
                ...request,
                gas: BigInt(300000), // Set a reasonable gas limit
            });

            let receipt = await publicClient.waitForTransactionReceipt({
                hash: tx,
            });
            
            return receipt;
        } catch (error) {
            console.error("Error in buyLotteryTicket:", error);
            throw error;
        }
    };

    const getRoomDetails = async (roomId: number) => {
        const lotteryContract = getContract({
            abi: LotteryFactoryABI.abi,
            address: LOTTERY_CONTRACT,
            client: publicClient,
        });

        const roomDetails = await lotteryContract.read.getRoomDetails([roomId]);
        return roomDetails;
    };

    const getTicketsForAddress = async (roomId: number, playerAddress: string) => {
        const lotteryContract = getContract({
            abi: LotteryFactoryABI.abi,
            address: LOTTERY_CONTRACT,
            client: publicClient,
        });

        const tickets = await lotteryContract.read.getTicketsForAddress([roomId, playerAddress]);
        return tickets;
    };

    const getPrizePool = async (roomId: number) => {
        const lotteryContract = getContract({
            abi: LotteryFactoryABI.abi,
            address: LOTTERY_CONTRACT,
            client: publicClient,
        });

        const prizePool = await lotteryContract.read.getPrizePool([roomId]);
        return prizePool;
    };

    const getWinningNumber = async (roomId: number) => {
        const lotteryContract = getContract({
            abi: LotteryFactoryABI.abi,
            address: LOTTERY_CONTRACT,
            client: publicClient,
        });

        const winningNumber = await lotteryContract.read.getWinningNumber([roomId]);
        return winningNumber;
    };

    const claimPrize = async (roomId: number, ticketId: number) => {
        let walletClient = createWalletClient({
            transport: custom(window.ethereum),
            chain: celoAlfajores,
        });

        let [address] = await walletClient.getAddresses();

        const tx = await walletClient.writeContract({
            address: LOTTERY_CONTRACT,
            abi: LotteryFactoryABI.abi,
            functionName: "claimPrize",
            account: address,
            args: [roomId, ticketId],
        });

        let receipt = await publicClient.waitForTransactionReceipt({
            hash: tx,
        });

        return receipt;
    };

    const listActiveRooms = async () => {
        const lotteryContract = getContract({
            abi: LotteryFactoryABI.abi,
            address: LOTTERY_CONTRACT,
            client: publicClient,
        });

        const activeRooms = await lotteryContract.read.listActiveRooms();
        return activeRooms;
    };

    const getCELOBalance = async (address: string) => {
        if (!address) return "0";
        
        const balance = await publicClient.getBalance({
            address: address as `0x${string}`,
        });
        
        // Convert from wei to CELO
        return (Number(balance) / 1e18).toString();
    };

    return {
        address,
        getUserAddress,
        sendCUSD,
        getCELOBalance,
        // Lottery functions
        buyLotteryTicket,
        getRoomDetails,
        getTicketsForAddress,
        getPrizePool,
        getWinningNumber,
        claimPrize,
        listActiveRooms,
    };
};
