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

// Constants
const DECIMAL_PLACES = 6; // Can be changed to any value (e.g., 18 for ETH, 6 for USDC)
const DECIMAL_FACTOR = 10 ** DECIMAL_PLACES;

const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(),
});

const USDCTokenAddress = "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B";  // Testnet
const USDCAdapterAddress = "0x4822e58de6f5e485eF90df51C41CE01721331dC0"; // Testnet
const LOTTERY_CONTRACT = "0x397A9661702496870ed2002fD0686B5240C05e10"; // Testnet

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


    // Lottery Functions
    const buyLotteryTicket = async (roomId: number, number: number, fee: number) => {
        try {
            let walletClient = createWalletClient({
                transport: custom(window.ethereum),
                chain: celoAlfajores,
            });

            let [address] = await walletClient.getAddresses();

            const amountInWei = parseEther(`${fee}`);
            
            // Approve USDC spending first
            const approve_tx = await walletClient.writeContract({
                address: USDCTokenAddress,
                abi: StableTokenABI.abi,
                functionName: "approve",
                account: address,
                args: [LOTTERY_CONTRACT, amountInWei],
                feeCurrency: USDCAdapterAddress,
                type: "cip64",
            });

            await publicClient.waitForTransactionReceipt({
                hash: approve_tx,
            });

            // Buy the lottery ticket
            const tx = await walletClient.writeContract({
                address: LOTTERY_CONTRACT,
                abi: LotteryFactoryABI.abi,
                functionName: "buyTicket",
                account: address,
                args: [roomId, number],
                feeCurrency: USDCAdapterAddress,
                type: "cip64",
            });

            let receipt = await publicClient.waitForTransactionReceipt({
                hash: tx,
            });
            
            return receipt;
        } catch (error) {
            let errorMessage = "Transaction failed";
            
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'object' && error !== null) {
                const errorObj = error as any;
                if (errorObj.shortMessage) errorMessage = errorObj.shortMessage;
                else if (errorObj.reason) errorMessage = errorObj.reason;
                else if (errorObj.message) errorMessage = errorObj.message;
            } else if (error !== undefined && error !== null) {
                errorMessage = String(error);
            }
            
            throw new Error(errorMessage);
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
            feeCurrency: USDCAdapterAddress,
            type: "cip64",
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

    const getCarryOverAmount = async (roomId: number) => {
        const lotteryContract = getContract({
            abi: LotteryFactoryABI.abi,
            address: LOTTERY_CONTRACT,
            client: publicClient,
        });

        const carryOverAmount = await lotteryContract.read.getCarryOverAmount([roomId]);
        return carryOverAmount;
    };

    const getCurrentRound = async (roomId: number) => {
        const lotteryContract = getContract({
            abi: LotteryFactoryABI.abi,
            address: LOTTERY_CONTRACT,
            client: publicClient,
        });

        const currentRound = await lotteryContract.read.getCurrentRound([roomId]);
        return currentRound;
    };

    const getTicketsForRound = async (roomId: number, roundNumber: number) => {
        const lotteryContract = getContract({
            abi: LotteryFactoryABI.abi,
            address: LOTTERY_CONTRACT,
            client: publicClient,
        });

        const tickets = await lotteryContract.read.getTicketsForRound([roomId, roundNumber]);
        return tickets;
    };

    const updateRoomState = async (roomId: number) => {
        let walletClient = createWalletClient({
            transport: custom(window.ethereum),
            chain: celoAlfajores,
        });

        let [address] = await walletClient.getAddresses();

        const tx = await walletClient.writeContract({
            address: LOTTERY_CONTRACT,
            abi: LotteryFactoryABI.abi,
            functionName: "updateRoomState",
            account: address,
            args: [roomId],
            feeCurrency: USDCAdapterAddress,
            type: "cip64",
        });

        let receipt = await publicClient.waitForTransactionReceipt({
            hash: tx,
        });

        return receipt;
    };

    const getCELOBalance = async (address: string) => {
        if (!address) return "0";
        
        const balance = await publicClient.getBalance({
            address: address as `0x${string}`,
        });
        
        // Convert from wei to CELO
        return (Number(balance) / DECIMAL_FACTOR).toString();
    };

    const getPlayerCount = async (roomId: number, roundNumber: number) => {
        const lotteryContract = getContract({
            abi: LotteryFactoryABI.abi,
            address: LOTTERY_CONTRACT,
            client: publicClient,
        });

        const playerCount = await lotteryContract.read.getPlayerCount([roomId, roundNumber]);
        return playerCount;
    };

    const isTicketClaimed = async (roomId: number, roundNumber: number, ticketId: number) => {
        try {
            const lotteryContract = getContract({
                abi: LotteryFactoryABI.abi,
                address: LOTTERY_CONTRACT,
                client: publicClient,
            });
            
            // Call the isTicketClaimed function with parameters in the correct order
            const claimed = await lotteryContract.read.isTicketClaimed([roomId, roundNumber, ticketId]);
            return claimed;
        } catch (error) {
            console.error("Error checking if ticket is claimed:", error);
            return false;
        }
    };

    // Player statistics functions
    const getTotalPlayerWins = async (address: string) => {
        const lotteryContract = getContract({
            abi: LotteryFactoryABI.abi,
            address: LOTTERY_CONTRACT,
            client: publicClient,
        });

        const totalWins = await lotteryContract.read.getTotalPlayerWins([address]);
        return totalWins;
    };

    const getTotalPlayerTickets = async (address: string) => {
        const lotteryContract = getContract({
            abi: LotteryFactoryABI.abi,
            address: LOTTERY_CONTRACT,
            client: publicClient,
        });

        const totalTickets = await lotteryContract.read.getTotalPlayerTickets([address]);
        return totalTickets;
    };

    const getPlayerRoomStats = async (roomId: number, address: string) => {
        const lotteryContract = getContract({
            abi: LotteryFactoryABI.abi,
            address: LOTTERY_CONTRACT,
            client: publicClient,
        });

        // Parameter order in contract is (roomId, address)
        const roomStats = await lotteryContract.read.getPlayerRoomStats([roomId, address]);
        return roomStats;
    };

    const getPlayerCompleteStats = async (address: string) => {
        const lotteryContract = getContract({
            abi: LotteryFactoryABI.abi,
            address: LOTTERY_CONTRACT,
            client: publicClient,
        });

        const completeStats = await lotteryContract.read.getPlayerCompleteStats([address]);
        return completeStats;
    };

    return {
        address,
        getUserAddress,
        getCELOBalance,
        // Lottery functions
        buyLotteryTicket,
        getRoomDetails,
        getTicketsForAddress,
        getPrizePool,
        getWinningNumber,
        claimPrize,
        listActiveRooms,
        // New lottery functions
        getCarryOverAmount,
        getCurrentRound,
        getTicketsForRound,
        updateRoomState,
        getPlayerCount,
        isTicketClaimed,
        // Player statistics functions
        getTotalPlayerWins,
        getTotalPlayerTickets,
        getPlayerRoomStats,
        getPlayerCompleteStats,
    };
};
