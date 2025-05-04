"use client";

import React, { useEffect } from "react";
import { Room, RoomState } from "../lottery/types";
import { Users, Clock } from "lucide-react";
import Image from "next/image";
import { withBasePath } from "@/utils/path";

interface BuyTicketPageProps {
    roomInfo: Room | undefined;
    selectedNumber: number | null;
    setSelectedNumber: (number: number | null) => void;
    buyTicket: () => Promise<void>;
    goBack: () => void;
}

const BuyTicketPage = ({ roomInfo, selectedNumber, setSelectedNumber, buyTicket, goBack }: BuyTicketPageProps) => {
    // Redirect back if the room is not in OPEN state
    useEffect(() => {
        if (roomInfo) {
            if (roomInfo.state !== RoomState.OPEN) {
                let message = "This lottery is not available for ticket purchases right now.";
                
                if (roomInfo.state === RoomState.PENDING_REVEAL) {
                    message = "This lottery is waiting for the winning number announcement.";
                } else if (roomInfo.state === RoomState.REVEALED) {
                    message = "This lottery has already revealed its winning number.";
                } else if (roomInfo.state === RoomState.CLOSED) {
                    message = "This lottery has ended for this round.";
                }
                
                alert(message);
                goBack();
            }
        }
    }, [roomInfo, goBack]);
    
    // Number pad input for more user-friendly selection
    const handleNumberInput = (digit: number) => {
        if (selectedNumber === null) {
            // First digit pressed
            if (digit === 0) return; // Avoid leading zero
            setSelectedNumber(digit);
        } else {
            // Second digit (if applicable)
            const currentNum = selectedNumber;
            if (currentNum < 10) {
                const newNum = currentNum * 10 + digit;
                if (newNum <= 99) {
                    setSelectedNumber(newNum);
                }
            }
        }
    };

    const clearNumber = () => {
        setSelectedNumber(null);
    };

    const renderNumberPad = () => {
        const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        return (
            <div className="grid grid-cols-3 gap-3 mx-auto w-full max-w-sm">
                {digits.map((digit) => (
                    <button
                        key={digit}
                        className="w-full h-14 bg-gray-800 hover:bg-gray-700 rounded-lg text-2xl font-bold"
                        onClick={() => handleNumberInput(digit)}
                    >
                        {digit}
                    </button>
                ))}
                <button
                    className="w-full h-14 bg-red-800 hover:bg-red-700 rounded-lg text-base font-bold"
                    onClick={clearNumber}
                >
                    Clear
                </button>
                <button
                    className="w-full h-14 bg-gray-800 hover:bg-gray-700 rounded-lg text-2xl font-bold"
                    onClick={() => handleNumberInput(0)}
                >
                    0
                </button>
                <div className="w-full h-14"></div>
            </div>
        );
    };

    if (!roomInfo) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">Room not found</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="sticky top-0 pt-4 px-4 pb-2 bg-gradient-to-b from-purple-900 to-purple-900/95 z-10">
                <div className="flex justify-between items-center mb-2">
                    <button 
                        className="text-gray-400 hover:text-white flex items-center"
                        onClick={goBack}
                    >
                        <span>Rooms</span>
                    </button>
                    <div className="bg-purple-900 px-3 py-1 rounded-full text-sm flex items-center">
                        <Image 
                            src={withBasePath("/usd-coin-usdc-logo.svg")} 
                            alt="USDC" 
                            width={14} 
                            height={14} 
                            className="mr-1" 
                        />
                        {roomInfo.fee} USDC
                    </div>
                </div>
            </div>

            <div className="px-4 flex flex-col flex-1">
                <div className="bg-gray-800 rounded-lg p-3 mb-3">
                    <div className="flex justify-between mb-1">
                        <h2 className="text-xl font-bold">{roomInfo.name}</h2>
                        <div className="flex items-center">
                            <Clock size={16} className="text-yellow-400 mr-1" />
                            <span className="font-mono min-w-[80px] text-right">{roomInfo.countdown}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="bg-gray-700/50 p-2 rounded">
                            <p className="text-gray-400 text-xs">Prize Pool</p>
                            <p className="text-lg font-bold flex items-center">
                                <Image 
                                    src={withBasePath("/usd-coin-usdc-logo.svg")} 
                                    alt="USDC" 
                                    width={14} 
                                    height={14} 
                                    className="mr-1" 
                                />
                                {roomInfo.prizePool} USDC
                            </p>
                        </div>
                        <div className="bg-gray-700/50 p-2 rounded">
                            <p className="text-gray-400 text-xs">Players</p>
                            <p className="text-lg font-bold flex items-center">
                                <Users size={14} className="text-blue-400 mr-1" />
                                {roomInfo.players}
                            </p>
                        </div>
                    </div>
                    <div className="mt-1 text-xs">
                        <p className="text-purple-300 font-medium">Round #{roomInfo.roundNumber.toString()}</p>
                        {roomInfo.carryOverAmount > 0 && (
                            <p className="text-green-300 font-medium">
                                Includes ${roomInfo.carryOverAmount} rollover from previous round!
                            </p>
                        )}
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 mb-0 flex flex-col items-center">
                    <div className="bg-gray-900 h-20 rounded-lg flex items-center justify-center mb-4 relative w-full max-w-sm">
                        {selectedNumber !== null ? (
                            <span className="text-5xl font-bold">{selectedNumber}</span>
                        ) : (
                            <span className="text-xl text-gray-500">Select a number (0-99)</span>
                        )}
                    </div>
                    
                    {renderNumberPad()}
                    
                    <button
                        className={`w-full py-3 rounded-lg text-xl font-bold mt-4 max-w-sm ${
                            selectedNumber !== null
                                ? 'bg-purple-500 hover:bg-purple-600'
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={selectedNumber === null}
                        onClick={buyTicket}
                    >
                        Buy Ticket for {roomInfo.fee} USDC
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BuyTicketPage; 