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
const LOTTERY_CONTRACT = "0x7BFedF7D49f058811E513e686Cf11F531204A78F"; // Testnet

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
    const buyLotteryTicket = async (roomId: number, number: number, fee: number) => {
        try {
            let walletClient = createWalletClient({
                transport: custom(window.ethereum),
                chain: celoAlfajores,
            });

            let [address] = await walletClient.getAddresses();

            const amountInWei = parseEther(`${fee}`);
            
            const approve_tx = await walletClient.writeContract({
                address: cUSDTokenAddress,
                abi: StableTokenABI.abi,
                functionName: "approve",
                account: address,
                args: [LOTTERY_CONTRACT, amountInWei],
                feeCurrency: cUSDTokenAddress,
            });

            let approved_receipt = await publicClient.waitForTransactionReceipt({
                hash: approve_tx,
            });

            const tx = await walletClient.writeContract({
                address: LOTTERY_CONTRACT,
                abi: LotteryFactoryABI.abi,
                functionName: "buyTicket",
                account: address,
                args: [roomId, number],
                feeCurrency: cUSDTokenAddress,
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
        return (Number(balance) / 1e18).toString();
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
        // New lottery functions
        getCarryOverAmount,
        getCurrentRound,
        getTicketsForRound,
        updateRoomState,
        getPlayerCount,
    };
};
