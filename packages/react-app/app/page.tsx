"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWeb3 } from "@/contexts/useWeb3";
import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, ChevronLeft, Home, Ticket, Award, DollarSign, Clock, Users, Star } from 'lucide-react';

// Types
enum RoomState {
    OPEN = 0,
    PENDING_REVEAL = 1,
    REVEALED = 2,
    CLOSED = 3,
    RESETTING = 4
}

type Room = {
    id: number;
    name: string;
    prizePool: number;
    players: number;
    countdown: string;
    fee: number;
    description: string;
    drawTime: number;
    roundNumber: number;
    state: RoomState;
    carryOverAmount: number;
    winningNumber: number;
};

type Ticket = {
    id: number;
    roomId: number;
    roomName: string;
    number: number;
    date: string;
    status: 'won' | 'lost' | 'pending';
    prize: number;
    roomState: RoomState;
    winningNumber: number;
    roundNumber: number;
};

type Winner = {
    roomId: number;
    roomName: string;
    date: string;
    number: number;
    pool: number;
};

// Main App Component
const LotteryApp = () => {
    const {
        address,
        getUserAddress,
        buyLotteryTicket,
        getRoomDetails,
        getTicketsForAddress,
        getPrizePool,
        getWinningNumber,
        claimPrize,
        listActiveRooms,
        getPlayerCount,
        getTicketsForRound,
    } = useWeb3();

    const [currentPage, setCurrentPage] = useState<'home' | 'tickets' | 'results' | 'buy-ticket'>('home');
    const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
    const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    
    // Multiple lottery rooms
    const [rooms, setRooms] = useState<Room[]>([]);
    
    const [previousWinners, setPreviousWinners] = useState<Winner[]>([]);
    
    // Pull to refresh state
    const [isPulling, setIsPulling] = useState(false);
    const [refreshProgress, setRefreshProgress] = useState(0);
    const touchStartY = useRef(0);
    const MIN_PULL_DISTANCE = 80;
    const contentRef = useRef<HTMLDivElement>(null);

    // Update room state based on timestamp
    const updateRoomState = (room: Room): Room => {
        const now = Math.floor(Date.now() / 1000);
        
        // If room is OPEN but draw time has passed, set to PENDING_REVEAL
        if (room.state === RoomState.OPEN && now >= room.drawTime) {
            return {
                ...room,
                state: RoomState.PENDING_REVEAL
            };
        }
        
        return room;
    };
    
    // Update countdown timers every second
    useEffect(() => {
        // Skip if no rooms
        if (rooms.length === 0) return;
        
        const timer = setInterval(() => {
            setRooms(currentRooms => 
                currentRooms.map(room => {
                    // First update the countdown
                    const roomWithUpdatedCountdown = {
                        ...room,
                        countdown: formatCountdown(room.drawTime)
                    };
                    
                    // Then check if we need to update the state
                    return updateRoomState(roomWithUpdatedCountdown);
                })
            );
        }, 1000);
        
        return () => clearInterval(timer);
    }, [rooms.length]);

    // Function to buy ticket
    const buyTicket = async () => {
        if (selectedNumber !== null && selectedRoom !== null) {
            const roomInfo = rooms.find(room => room.id === selectedRoom);
            if (!roomInfo) return;
            
            // Check if room is in the OPEN state
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
                return;
            }
            
            try {
                // Purchase the ticket on the blockchain
                const receipt = await buyLotteryTicket(selectedRoom, selectedNumber, roomInfo.fee);
                
                // Create a temporary ticket object for immediate feedback
                const newTicket: Ticket = {
                    id: Date.now(), // Temporary ID until we reload data
                    roomId: selectedRoom,
                    roomName: roomInfo.name,
                    number: selectedNumber,
                    date: new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    }),
                    status: 'pending',
                    prize: 0,
                    roomState: roomInfo.state,
                    winningNumber: roomInfo.winningNumber,
                    roundNumber: Number(roomInfo.roundNumber || 0)
                };
                
                // Check if the player already has tickets in this room
                const userTicketsInRoom = tickets.filter(ticket => 
                    ticket.roomId === selectedRoom && 
                    ticket.roundNumber === roomInfo.roundNumber
                );
                
                // Update rooms with increased prize pool and player count (if new player)
                const updatedRooms = rooms.map(room => {
                    if (room.id === selectedRoom) {
                        return {
                            ...room,
                            prizePool: room.prizePool + room.fee,
                            // Only increment player count if this is the player's first ticket in this room and round
                            players: userTicketsInRoom.length === 0 ? room.players + 1 : room.players,
                            countdown: formatCountdown(room.drawTime)
                        };
                    }
                    return room;
                });
                
                setRooms(updatedRooms);
                
                // Add ticket to state for immediate feedback
                setTickets(prev => [newTicket, ...prev]);
                
                // After a short delay, reload the real ticket data from the blockchain
                setTimeout(() => {
                    loadUserTickets();
                }, 1000);
                
                setSelectedNumber(null);
                setCurrentPage('tickets');
                
                // Display success message
                alert('Ticket purchased successfully!');
            } catch (error) {
                // Improved error message
                let errorMessage = "Unknown error occurred";
                
                if (error instanceof Error) {
                    errorMessage = error.message;
                } else if (typeof error === 'object' && error !== null) {
                    // Try to extract some meaningful information from the error object
                    const errorObj = error as any;
                    if (errorObj.reason) errorMessage = errorObj.reason;
                    else if (errorObj.message) errorMessage = errorObj.message;
                    else if (Object.keys(errorObj).length > 0) {
                        // If there are properties, use the first one
                        const key = Object.keys(errorObj)[0];
                        errorMessage = `${key}: ${JSON.stringify(errorObj[key])}`;
                    } else {
                        errorMessage = "Empty error object received";
                    }
                } else if (error !== undefined && error !== null) {
                    errorMessage = String(error);
                }
                
                // Display error message
                alert(`Failed to buy ticket: ${errorMessage}`);
            }
        }
    };

    // Load active rooms from the contract
    const loadActiveRooms = async () => {
        try {
            const activeRoomIds = await listActiveRooms();
            if (activeRoomIds && Array.isArray(activeRoomIds) && activeRoomIds.length > 0) {
                const roomsData = await Promise.all(
                    activeRoomIds.map(async (roomId: number | bigint) => {
                        // Using a type assertion for the room details
                        const details: any = await getRoomDetails(Number(roomId));
                        
                        // Get the player count for the current round
                        let playerCount = 0;
                        const roundNumber = Number(details.roundNumber || 0);
                        
                        try {
                            playerCount = Number(await getPlayerCount(Number(roomId), roundNumber));
                        } catch (error) {
                            console.error(`Error getting player count for room ${roomId}:`, error);
                            
                            // Fall back to ticket count if player count fails
                            try {
                                // Get tickets for this round
                                const tickets = await getTicketsForRound(Number(roomId), roundNumber);
                                if (tickets && Array.isArray(tickets)) {
                                    playerCount = tickets.length; // Use ticket count as fallback
                                }
                            } catch (ticketError) {
                                console.error(`Error getting tickets for room ${roomId}:`, ticketError);
                                playerCount = 0;
                            }
                        }
                        
                        // Debug: log round number raw value and type
                        console.log(`Room ${roomId} round number:`, details.roundNumber);
                        console.log(`Round number type:`, typeof details.roundNumber);
                        
                        // Convert from blockchain format to UI format
                        return {
                            id: Number(details.id),
                            name: details.name,
                            prizePool: Number(details.prizePool) / 1e18, // Convert from wei
                            players: playerCount,
                            countdown: formatCountdown(Number(details.drawTime)),
                            drawTime: Number(details.drawTime), // Store the actual timestamp
                            fee: Number(details.entryFee) / 1e18, // Convert from wei
                            description: details.description,
                            roundNumber: Number(details.roundNumber || 0), // Ensure we convert to Number and provide default
                            state: Number(details.state),
                            carryOverAmount: Number(details.carryOverAmount) / 1e18,
                            winningNumber: Number(details.winningNumber)
                        };
                    })
                );
                
                setRooms(roomsData);
            }
        } catch (error) {
            // Handle error silently
            console.error("Error loading active rooms:", error);
        }
    };
    
    // Format timestamp into a countdown string
    const formatCountdown = (timestamp: number) => {
        const now = Math.floor(Date.now() / 1000);
        const timeLeft = Math.max(0, timestamp - now);
        
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
    
    // Refresh data function
    const refreshData = useCallback(async () => {
        if (!address) return;
        
        await loadActiveRooms();
        await loadUserTickets();
        await loadPreviousWinners();
        
        // Add a small delay to show the refresh animation
        setTimeout(() => {
            setIsPulling(false);
            setRefreshProgress(0);
        }, 800);
    }, [address]);
    
    // Load user tickets
    const loadUserTickets = async () => {
        if (!address) return;
        
        try {
            const userTickets: Ticket[] = [];
            // For each room, get the user's tickets
            for (const room of rooms) {
                const ticketsInRoom = await getTicketsForAddress(room.id, address);
                
                if (ticketsInRoom && Array.isArray(ticketsInRoom) && ticketsInRoom.length > 0) {
                    // Get room details for state and winning number
                    const roomDetails: any = await getRoomDetails(room.id);
                    const roomState = Number(roomDetails.state);
                    const winningNumber = Number(roomDetails.winningNumber);
                    
                    // For each ticket, get details and add to the tickets array
                    for (const ticket of ticketsInRoom) {
                        const ticketData = ticket as any;
                        const ticketRoundNumber = Number(ticketData.roundNumber || 0);
                        
                        // Check if the ticket is claimed - we'll show it as "won" if it is
                        const isWinningTicket = Number(ticketData.number) === winningNumber;
                        const isCurrentRound = ticketRoundNumber === room.roundNumber;
                        
                        // Determine ticket status based on round number, room state, and claimed status
                        let status: 'won' | 'lost' | 'pending' = 'pending';
                        
                        if (ticketData.claimed) {
                            status = 'won'; // If claimed, it's definitely won
                        } else if (!isCurrentRound) {
                            // If ticket is from a previous round, it's either won or lost
                            status = isWinningTicket ? 'won' : 'lost';
                        } else if (roomState === RoomState.REVEALED) {
                            // Current round with revealed number
                            status = isWinningTicket ? 'won' : 'lost';
                        } else {
                            // Current round still pending
                            status = 'pending';
                        }
                        
                        userTickets.push({
                            id: Number(ticketData.id),
                            roomId: Number(ticketData.roomId),
                            roomName: room.name,
                            number: Number(ticketData.number),
                            date: new Date().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            }),
                            status: status,
                            prize: ticketData.claimed ? Number(await getPrizePool(Number(ticketData.roomId))) / 1e18 : 0,
                            roomState: roomState,
                            winningNumber: winningNumber,
                            roundNumber: ticketRoundNumber
                        });
                    }
                }
            }
            setTickets(userTickets);
        } catch (error) {
            // Handle error silently
            console.error("Error loading user tickets:", error);
        }
    };
    
    // Claim prize for a winning ticket
    const handleClaimPrize = async (roomId: number, ticketId: number) => {
        try {
            const result = await claimPrize(roomId, ticketId);
            
            // Update ticket status upon successful claim
            setTickets(prevTickets => 
                prevTickets.map(ticket => 
                    ticket.id === ticketId && ticket.roomId === roomId
                        ? { 
                            ...ticket, 
                            status: 'won', 
                            prize: rooms.find(r => r.id === roomId)?.prizePool || 0 
                          }
                        : ticket
                )
            );
            
            // Reload tickets to ensure we have the latest data
            loadUserTickets();
            
            alert('Prize claimed successfully!');
        } catch (error) {
            // Extract a user-friendly error message
            let errorMessage = "Unknown error occurred";
            
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'object' && error !== null) {
                const errorObj = error as any;
                if (errorObj.reason) errorMessage = errorObj.reason;
                else if (errorObj.message) errorMessage = errorObj.message;
                else if (Object.keys(errorObj).length > 0) {
                    const key = Object.keys(errorObj)[0];
                    errorMessage = `${key}: ${JSON.stringify(errorObj[key])}`;
                }
            } else if (error !== undefined && error !== null) {
                errorMessage = String(error);
            }
            
            // Check for specific error conditions and show appropriate messages
            if (errorMessage.toLowerCase().includes("not announced")) {
                alert("Cannot claim prize: The winning number has not been announced yet.");
            } else if (errorMessage.toLowerCase().includes("not winner")) {
                alert("Sorry, your ticket did not win in this lottery.");
            } else if (errorMessage.toLowerCase().includes("already claimed")) {
                alert("This prize has already been claimed.");
            } else {
                // Generic error message
                alert(`Failed to claim prize: ${errorMessage}`);
            }
        }
    };

    // Load winners for the results page
    const loadPreviousWinners = async () => {
        try {
            const winners: Winner[] = [];
            // This is where you would fetch previous winners from the contract
            // For now this is left empty as the contract would need a way to track past winners
            setPreviousWinners(winners);
        } catch (error) {
            // Handle error silently
        }
    };

    // Pull to refresh handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        // Only enable pull-to-refresh when at the top of the page
        if (contentRef.current && contentRef.current.scrollTop <= 0) {
            touchStartY.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartY.current === 0 || contentRef.current?.scrollTop !== 0) return;
        
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;
        
        if (diff > 0) {
            // Prevent default to stop normal scroll
            e.preventDefault();
            
            // Calculate progress (0-100%)
            const progress = Math.min(100, (diff / MIN_PULL_DISTANCE) * 100);
            setRefreshProgress(progress);
            setIsPulling(true);
        }
    };

    const handleTouchEnd = () => {
        if (isPulling) {
            if (refreshProgress >= 100) {
                // User pulled enough to trigger refresh
                refreshData();
            } else {
                // User didn't pull enough, reset
                setIsPulling(false);
                setRefreshProgress(0);
            }
        }
        
        touchStartY.current = 0;
    };

    useEffect(() => {
        getUserAddress();
    }, []);
    
    useEffect(() => {
        if (address) {
            loadActiveRooms();
            loadUserTickets();
            loadPreviousWinners();
        }
    }, [address]);

    const renderPage = () => {
        switch (currentPage) {
            case 'home':
                return (
                    <HomePage 
                        rooms={rooms}
                        selectedRoom={selectedRoom}
                        setSelectedRoom={setSelectedRoom}
                        selectedNumber={selectedNumber}
                        setSelectedNumber={setSelectedNumber}
                        buyTicket={buyTicket}
                        address={address}
                        onRoomSelect={(roomId) => {
                            setSelectedRoom(roomId);
                            setSelectedNumber(null);
                            setCurrentPage('buy-ticket');
                        }}
                    />
                );
            case 'tickets':
                return (
                    <TicketsPage 
                        tickets={tickets}
                        address={address}
                        onClaimPrize={handleClaimPrize}
                    />
                );
            case 'results':
                return (
                    <ResultsPage 
                        rooms={rooms}
                        previousWinners={previousWinners}
                        address={address}
                    />
                );
            case 'buy-ticket':
                return (
                    <BuyTicketPage
                        roomInfo={rooms.find(room => room.id === selectedRoom)}
                        selectedNumber={selectedNumber}
                        setSelectedNumber={setSelectedNumber}
                        buyTicket={buyTicket}
                        goBack={() => {
                            setSelectedRoom(null);
                            setCurrentPage('home');
                        }}
                    />
                );
            default:
                return <HomePage 
                    rooms={rooms}
                    selectedRoom={selectedRoom}
                    setSelectedRoom={setSelectedRoom}
                    selectedNumber={selectedNumber}
                    setSelectedNumber={setSelectedNumber}
                    buyTicket={buyTicket}
                    address={address}
                    onRoomSelect={(roomId) => {
                        setSelectedRoom(roomId);
                        setSelectedNumber(null);
                        setCurrentPage('buy-ticket');
                    }}
                />;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-b from-purple-900 to-indigo-900 text-white">
            {/* Pull to refresh indicator */}
            {isPulling && (
                <div 
                    className="absolute top-0 left-0 right-0 flex justify-center items-center z-50 pointer-events-none"
                    style={{ height: `${Math.min(60, refreshProgress * 0.6)}px` }}
                >
                    <div 
                        className={`animate-spin h-6 w-6 border-2 border-white rounded-full border-t-transparent ${
                            refreshProgress >= 100 ? 'opacity-100' : 'opacity-70'
                        }`}
                    />
                </div>
            )}
            
            {/* App Content */}
            <div 
                ref={contentRef}
                className="flex-1 overflow-auto"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {!address ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold mb-4">Please connect your wallet</h1>
                            <p className="text-gray-300">Connect your wallet to participate in the lottery</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {currentPage !== 'home' && (
                            <button 
                                className="absolute top-4 left-4 z-10 flex items-center text-gray-300 hover:text-white"
                                onClick={() => {
                                    if (currentPage === 'buy-ticket') {
                                        setSelectedRoom(null);
                                    }
                                    setCurrentPage('home');
                                }}
                            >
                                <ChevronLeft size={20} />
                                <span>Back</span>
                            </button>
                        )}
                        {renderPage()}
                    </>
                )}
            </div>

            {/* Bottom Navigation */}
            {address && (
                <div className="bg-gray-900">
                    <div className="flex justify-around py-3">
                        <button 
                            className={`flex flex-col items-center ${currentPage === 'home' ? 'text-purple-400' : 'text-gray-400'}`}
                            onClick={() => setCurrentPage('home')}
                        >
                            <Home size={24} />
                            <span className="text-xs mt-1">Home</span>
                        </button>
                        <button 
                            className={`flex flex-col items-center ${currentPage === 'tickets' ? 'text-purple-400' : 'text-gray-400'}`}
                            onClick={() => setCurrentPage('tickets')}
                        >
                            <Ticket size={24} />
                            <span className="text-xs mt-1">My Tickets</span>
                        </button>
                        <button 
                            className={`flex flex-col items-center ${currentPage === 'results' ? 'text-purple-400' : 'text-gray-400'}`}
                            onClick={() => setCurrentPage('results')}
                        >
                            <Award size={24} />
                            <span className="text-xs mt-1">Results</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Home Page Component
interface HomePageProps {
    rooms: Room[];
    selectedRoom: number | null;
    setSelectedRoom: (roomId: number | null) => void;
    selectedNumber: number | null;
    setSelectedNumber: (number: number | null) => void;
    buyTicket: () => Promise<void>;
    address: string | null;
    onRoomSelect: (roomId: number) => void;
}

const HomePage = ({ rooms, selectedRoom, setSelectedRoom, selectedNumber, setSelectedNumber, buyTicket, address, onRoomSelect }: HomePageProps) => {
    // Room selection
    const handleRoomSelect = (roomId: number) => {
        const room = rooms.find(room => room.id === roomId);
        
        if (!room) return;
        
        // Prevent selection if room is not in OPEN state
        if (room.state !== RoomState.OPEN) {
            let message = "This lottery is not available for ticket purchases right now.";
            
            if (room.state === RoomState.PENDING_REVEAL) {
                message = "This lottery is waiting for the winning number announcement.";
            } else if (room.state === RoomState.REVEALED) {
                message = "This lottery has already revealed its winning number.";
            } else if (room.state === RoomState.CLOSED) {
                message = "This lottery has ended for this round.";
            }
            
            alert(message);
            return;
        }
        
        onRoomSelect(roomId);
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
                    <p className="text-gray-300 text-center">Choose a room, pick a number, win big!</p>
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
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                                            <span className={`
                                                px-3 py-1 rounded text-white
                                                ${room.state === RoomState.PENDING_REVEAL ? 'bg-yellow-600' : ''}
                                                ${room.state === RoomState.REVEALED ? 'bg-green-600' : ''}
                                                ${room.state === RoomState.CLOSED ? 'bg-red-600' : ''}
                                            `}>
                                                {stateLabel}
                                            </span>
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

// Tickets Page Component
interface TicketsPageProps {
    tickets: Ticket[];
    address: string | null;
    onClaimPrize: (roomId: number, ticketId: number) => Promise<void>;
}

const TicketsPage = ({ tickets, address, onClaimPrize }: TicketsPageProps) => {
    
    // Group tickets by rooms
    const ticketsByRoom = tickets.reduce((acc, ticket) => {
        if (!acc[ticket.roomName]) {
            acc[ticket.roomName] = [];
        }
        acc[ticket.roomName].push(ticket);
        return acc;
    }, {} as Record<string, Ticket[]>);

    // Group identical tickets to display with a counter
    const getGroupedTickets = (roomTickets: Ticket[]) => {
        const groupedByNumber: Record<string, Ticket & { count: number }> = {};
        
        roomTickets.forEach(ticket => {
            // Create a key that includes all the properties we want to group by
            const key = `${ticket.number}-${ticket.status}-${ticket.roundNumber}`;
            
            if (!groupedByNumber[key]) {
                groupedByNumber[key] = {
                    ...ticket,
                    count: 1
                };
            } else {
                groupedByNumber[key].count++;
            }
        });
        
        return Object.values(groupedByNumber);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="sticky top-0 pt-4 px-4 pb-2 bg-gradient-to-b from-purple-900 to-purple-900/95 z-10">
                <h1 className="text-3xl font-bold text-center">My Tickets</h1>
                <p className="text-gray-300 text-center">View your lottery entries</p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-20">
                {tickets.length === 0 ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="text-center">
                            <Ticket size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-gray-400">You haven't purchased any tickets yet.</p>
                        </div>
                    </div>
                ) : (
                    Object.entries(ticketsByRoom).map(([roomName, roomTickets]) => {
                        const groupedTickets = getGroupedTickets(roomTickets);
                        
                        return (
                            <div key={roomName} className="mb-6">
                                <div className="flex items-center mb-2">
                                    <Star size={16} className="text-yellow-400 mr-2" />
                                    <h3 className="text-lg font-bold">{roomName}</h3>
                                </div>
                                
                                {groupedTickets.map((ticket) => {
                                    const isWinningTicket = ticket.number === ticket.winningNumber && 
                                                        ticket.roomState === RoomState.REVEALED;
                                    const canClaim = isWinningTicket && ticket.status === 'pending';
                                    
                                    return (
                                        <div
                                            key={`${ticket.id}-${ticket.number}-${ticket.status}`}
                                            className={`bg-gray-800 rounded-lg p-4 mb-3 flex items-center ${
                                                canClaim ? 'border-2 border-green-500' : ''
                                            }`}
                                        >
                                            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold mr-4 relative">
                                                {ticket.number}
                                                {ticket.count > 1 && (
                                                    <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                                                        x{ticket.count}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-400">
                                                    {ticket.date} • Round #{ticket.roundNumber.toString()}
                                                </p>
                                                <div className="flex items-center">
                                                    <span
                                                        className={`inline-block w-3 h-3 rounded-full mr-2 ${
                                                            ticket.status === 'won'
                                                                ? 'bg-green-500'
                                                                : ticket.status === 'lost'
                                                                ? 'bg-red-500'
                                                                : 'bg-yellow-500'
                                                        }`}
                                                    ></span>
                                                    <span
                                                        className={
                                                            ticket.status === 'won'
                                                                ? 'text-green-500'
                                                                : ticket.status === 'lost'
                                                                ? 'text-red-500'
                                                                : 'text-yellow-500'
                                                        }
                                                    >
                                                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                                                        {ticket.status === 'pending' && ticket.roomState === RoomState.REVEALED &&
                                                        ' (Results Available)'}
                                                    </span>
                                                </div>
                                            </div>
                                            {canClaim && (
                                                <>
                                                    <div className="flex flex-col items-end">
                                                        <p className="text-green-400 text-sm mb-2">Winner! Claim your prize</p>
                                                        <button
                                                            className="bg-purple-600 px-3 py-1 rounded text-sm"
                                                            onClick={() => onClaimPrize(ticket.roomId, ticket.id)}
                                                        >
                                                            Claim Prize
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                            {ticket.status === 'won' && (
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-400">Prize</p>
                                                    <p className="text-xl font-bold text-green-400">${ticket.prize}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

// Results Page Component
interface ResultsPageProps {
    rooms: Room[];
    previousWinners: Winner[];
    address: string | null;
}

const ResultsPage = ({ rooms, previousWinners, address }: ResultsPageProps) => {
    // Group results by rooms
    const resultsByRoom = previousWinners.reduce((acc, winner) => {
        if (!acc[winner.roomName]) {
            acc[winner.roomName] = [];
        }
        acc[winner.roomName].push(winner);
        return acc;
    }, {} as Record<string, Winner[]>);

    const [activeRoom, setActiveRoom] = useState<string | null>(Object.keys(resultsByRoom)[0] || null);
    
    // Helper function to get state label
    const getRoomStateLabel = (room: Room) => {
        switch (room.state) {
            case RoomState.OPEN:
                return "Open for Entries";
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
    
    return (
        <div className="flex flex-col h-full">
            <div className="sticky top-0 pt-4 px-4 pb-2 bg-gradient-to-b from-purple-900 to-purple-900/95 z-10">
                <h1 className="text-3xl font-bold text-center">Lottery Results</h1>
                <p className="text-gray-300 text-center">Check winning numbers</p>
            </div>

            <div className="flex-1 overflow-auto px-4 pb-20">
                <div className="bg-gray-800 rounded-lg p-4 mb-6">
                    <h2 className="text-xl font-bold mb-3">Upcoming Draws</h2>
                    
                    <div className="space-y-3">
                        {rooms.length === 0 ? (
                            <div className="flex items-center justify-center h-20">
                                <p className="text-gray-400">Loading upcoming draws...</p>
                            </div>
                        ) : (
                            rooms.map((room) => (
                                <div key={room.id} className="flex justify-between items-center border-b border-gray-700 pb-2">
                                    <div className="w-1/2">
                                        <p className="font-semibold">{room.name}</p>
                                        <p className="text-sm text-gray-400">Prize: ${room.prizePool}</p>
                                        <p className="text-xs text-purple-300">Round #{room.roundNumber.toString()}</p>
                                    </div>
                                    <div className="w-1/2 text-right">
                                        <p className="text-purple-400 font-mono font-medium">{room.countdown}</p>
                                        <p className={`text-xs 
                                            ${room.state === RoomState.OPEN ? 'text-green-400' : ''}
                                            ${room.state === RoomState.PENDING_REVEAL ? 'text-yellow-400' : ''}
                                            ${room.state === RoomState.REVEALED ? 'text-blue-400' : ''}
                                            ${room.state === RoomState.CLOSED ? 'text-red-400' : ''}
                                        `}>
                                            {getRoomStateLabel(room)}
                                        </p>
                                        {room.state === RoomState.REVEALED && (
                                            <p className="text-sm font-semibold text-green-400">
                                                Winning: {room.winningNumber}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-bold mb-2">Previous Results</h2>
                    
                    {/* Room tabs for results */}
                    <div className="flex overflow-x-auto pb-2 mb-4">
                        {Object.keys(resultsByRoom).length === 0 ? (
                            <div className="w-full text-center py-4">
                                <p className="text-gray-400">No previous results found</p>
                            </div>
                        ) : (
                            Object.keys(resultsByRoom).map((roomName) => (
                                <button
                                    key={roomName}
                                    className={`px-4 py-2 rounded-full mr-2 whitespace-nowrap ${
                                        activeRoom === roomName 
                                            ? 'bg-purple-600 text-white' 
                                            : 'bg-gray-800 text-gray-300'
                                    }`}
                                    onClick={() => setActiveRoom(roomName)}
                                >
                                    {roomName}
                                </button>
                            ))
                        )}
                    </div>
                    
                    {activeRoom && resultsByRoom[activeRoom].map((winner, index) => (
                        <div
                            key={index}
                            className="bg-gray-800 rounded-lg p-4 mb-4 flex items-center"
                        >
                            <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center text-xl font-bold mr-4">
                                {winner.number}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-400">{winner.date}</p>
                                <p>Winning Number</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-400">Prize Pool</p>
                                <p className="text-xl font-bold">${winner.pool}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Buy Ticket Page Component
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
                        <ChevronLeft size={20} />
                        <span>Rooms</span>
                    </button>
                    <div className="bg-purple-900 px-3 py-1 rounded-full text-sm">
                        ${roomInfo.fee} Entry
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
                                <DollarSign size={14} className="text-green-400 mr-1" />
                                {roomInfo.prizePool}
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
                        Buy Ticket for ${roomInfo.fee}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LotteryApp;
