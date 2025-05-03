"use client";

import React from "react";
import { Room, RoomState } from "../lottery/types";
import { DollarSign, Users, Clock, Star } from "lucide-react";

interface HomePageProps {
    rooms: Room[];
    selectedRoom: number | null;
    setSelectedRoom: (roomId: number | null) => void;
    selectedNumber: number | null;
    setSelectedNumber: (number: number | null) => void;
    buyTicket: () => Promise<void>;
    address: string | null;
    onRoomSelect: (roomId: number) => void;
    setCurrentPage: (page: 'home' | 'tickets' | 'statistics' | 'buy-ticket') => void;
}

const HomePage = ({ 
    rooms, 
    selectedRoom, 
    setSelectedRoom, 
    selectedNumber, 
    setSelectedNumber, 
    buyTicket, 
    address, 
    onRoomSelect, 
    setCurrentPage 
}: HomePageProps) => {
    // Room selection
    const handleRoomSelect = (roomId: number) => {
        const room = rooms.find(room => room.id === roomId);
        
        if (!room) return;
        
        // Check for different room states and handle accordingly
        switch (room.state) {
            case RoomState.OPEN:
                // If room is open, proceed with normal selection
                onRoomSelect(roomId);
                break;
                
            case RoomState.REVEALED:
                // If room has revealed results, set the selected room and redirect to tickets page
                setSelectedRoom(roomId);
                setCurrentPage('tickets');
                break;
                
            case RoomState.PENDING_REVEAL:
                alert("This lottery is waiting for the winning number announcement.");
                break;
                
            case RoomState.CLOSED:
                alert("This lottery has ended for this round.");
                break;
                
            default:
                alert("This lottery is not available for ticket purchases right now.");
                break;
        }
    };

    // Helper function to get state label
    const getRoomStateLabel = (room: Room) => {
        switch (room.state) {
            case RoomState.OPEN:
                return null; // No label needed for open rooms
            case RoomState.PENDING_REVEAL:
                return "Waiting for Results";
            case RoomState.REVEALED:
                return "Results Available";
            case RoomState.CLOSED:
                return "Closed";
            default:
                return "Unknown State";
        }
    };

    const getSelectedRoomInfo = () => {
        if (!selectedRoom) return null;
        return rooms.find(room => room.id === selectedRoom);
    };

    const roomInfo = getSelectedRoomInfo();

    return (
        <div className="flex flex-col h-full">
            <div className="space-y-4 overflow-auto">
                <div className="sticky top-0 pt-4 px-4 pb-2 bg-gradient-to-b from-purple-900 to-purple-900/95 z-10">
                    <h1 className="text-3xl font-bold text-center">Lucky Lotto</h1>
                    <p className="text-gray-300 text-center">Pick a number, win big!</p>
                    <h2 className="text-xl font-bold mt-6">Select a Lottery Room</h2>
                </div>
                
                <div className="px-4 pb-20">
                    {rooms.length === 0 ? (
                        <div className="flex items-center justify-center h-40">
                            <p className="text-gray-400">Loading rooms...</p>
                        </div>
                    ) : (
                        rooms.map((room) => {
                            const stateLabel = getRoomStateLabel(room);
                            const isOpen = room.state === RoomState.OPEN;
                            const hasResults = room.state === RoomState.REVEALED;
                            
                            return (
                                <div 
                                    key={room.id}
                                    className={`bg-gray-800 rounded-lg p-4 mb-4 ${
                                        !isOpen
                                        ? "opacity-75 relative" 
                                        : "hover:bg-gray-700 cursor-pointer"
                                    }`}
                                    onClick={() => handleRoomSelect(room.id)}
                                >
                                    {!isOpen && (
                                        <div className={`absolute inset-0 flex ${hasResults ? 'flex-col' : ''} items-center justify-center bg-black/50 rounded-lg`}>
                                            <span className={`
                                                px-3 py-1 rounded text-white
                                                ${room.state === RoomState.PENDING_REVEAL ? 'bg-yellow-600' : ''}
                                                ${room.state === RoomState.REVEALED ? 'bg-green-600' : ''}
                                                ${room.state === RoomState.CLOSED ? 'bg-red-600' : ''}
                                            `}>
                                                {stateLabel}
                                            </span>
                                            
                                            {hasResults && (
                                                <div className="mt-2 text-center">
                                                    <p className="text-white font-bold">Winning Number: {room.winningNumber}</p>
                                                    <p className="text-yellow-300 text-sm mt-1">Click to check your tickets</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-xl font-semibold">{room.name}</h3>
                                        <div className="bg-purple-900 px-3 py-1 rounded-full text-sm">
                                            ${room.fee}
                                        </div>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-2">{room.description}</p>
                                    <div className="flex justify-between items-center">
                                        <p className="text-purple-300 text-sm font-medium">Round #{room.roundNumber.toString()}</p>
                                        {room.carryOverAmount > 0 && (
                                            <p className="text-green-300 text-sm font-medium">
                                                +${room.carryOverAmount} rollover
                                            </p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                                        <div className="flex items-center">
                                            <DollarSign size={16} className="text-green-400 mr-1 flex-shrink-0" />
                                            <span className="truncate">Prize: ${room.prizePool}</span>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <Users size={16} className="text-blue-400 mr-1 flex-shrink-0" />
                                            <span className="truncate">{room.players} {room.players === 1 ? 'Player' : 'Players'}</span>
                                        </div>
                                        <div className="flex items-center justify-end">
                                            <Clock size={16} className={`mr-1 flex-shrink-0 ${room.countdown === "00:00:00" ? "text-red-400" : "text-yellow-400"}`} />
                                            <span className="font-mono">{room.countdown}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomePage; 