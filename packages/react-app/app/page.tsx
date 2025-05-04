"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { useWeb3 } from "@/contexts/useWeb3";
import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, Home, Ticket, BarChart } from 'lucide-react';

// Constants
const DECIMAL_PLACES = 6; // Can be changed to any value (e.g., 18 for ETH, 6 for USDC)
const DECIMAL_FACTOR = 10 ** DECIMAL_PLACES;

// Import types and components
import { Room, RoomState, Ticket as TicketType } from "@/components/lottery/types";
import { formatCountdown } from "@/components/lottery/utils";
import PullToRefresh from "@/components/common/PullToRefresh";
import HomePage from "@/components/pages/HomePage";
import TicketsPage from "@/components/pages/TicketsPage";
import StatisticsPage from "@/components/pages/StatisticsPage";
import BuyTicketPage from "@/components/pages/BuyTicketPage";

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
        isTicketClaimed,
        getTotalPlayerWins,
        getTotalPlayerTickets,
        getPlayerRoomStats,
        getPlayerCompleteStats,
    } = useWeb3();

    const [currentPage, setCurrentPage] = useState<'home' | 'tickets' | 'statistics' | 'buy-ticket'>('home');
    const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
    const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
    const [tickets, setTickets] = useState<TicketType[]>([]);
    const [highlightRoomId, setHighlightRoomId] = useState<number | null>(null);
    
    // Multiple lottery rooms
    const [rooms, setRooms] = useState<Room[]>([]);
    
    // Reference to content area
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
                    // Only update countdown for rooms with OPEN state
                    if (room.state === RoomState.OPEN) {
                        const roomWithUpdatedCountdown = {
                            ...room,
                            countdown: formatCountdown(room.drawTime)
                        };
                        
                        // Then check if we need to update the state
                        return updateRoomState(roomWithUpdatedCountdown);
                    }
                    // For non-OPEN rooms, just check if we need to update state
                    // but preserve the prize pool amount
                    const updatedRoom = updateRoomState(room);
                    return updatedRoom;
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
                
                // Generate a temporary unique ID for optimistic update
                const tempId = Date.now();
                
                // Create a temporary ticket object for immediate feedback
                const newTicket: TicketType = {
                    id: tempId, // Temporary ID until we reload data
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
                
                // Update state
                setRooms(updatedRooms);
                
                // Add ticket to state for immediate feedback
                setTickets(prev => [newTicket, ...prev]);
                
                // Set page and selected number first
                setSelectedNumber(null);
                setCurrentPage('tickets');
                
                // Display success message
                alert('Ticket purchased successfully!');
                
                // Add a flag to the temporary ticket to mark it as optimistic
                const tempTicketId = Date.now();
                
                // After a short delay, reload the real ticket data from the blockchain
                // Using a longer delay to ensure the UI transition is complete
                setTimeout(async () => {
                    try {
                        // Load tickets from blockchain
                        await loadUserTickets();
                    } catch (refreshError) {
                        console.error("Error refreshing tickets:", refreshError);
                        // If we can't load the real ticket data, leave the optimistic update in place
                    }
                }, 2000);
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
                        
                        // Find existing room data to preserve prize pool if state has changed
                        const existingRoom = rooms.find(r => r.id === Number(roomId));
                        const prizePool = Number(details.prizePool) / DECIMAL_FACTOR;  // Convert from wei
                        
                        // Convert from blockchain format to UI format
                        return {
                            id: Number(details.id),
                            name: details.name,
                            // Use current prize pool regardless of state
                            prizePool: prizePool,
                            players: playerCount,
                            countdown: formatCountdown(Number(details.drawTime)),
                            drawTime: Number(details.drawTime), // Store the actual timestamp
                            fee: Number(details.entryFee) / DECIMAL_FACTOR, // Convert from wei
                            description: details.description,
                            roundNumber: Number(details.roundNumber || 0), // Ensure we convert to Number and provide default
                            state: Number(details.state),
                            carryOverAmount: Number(details.carryOverAmount) / DECIMAL_FACTOR,
                            winningNumber: Number(details.winningNumber)
                        };
                    })
                );
                
                setRooms(roomsData);
                return roomsData; // Return the rooms data for immediate use
            }
            return []; // Return empty array if no active rooms
        } catch (error) {
            // Handle error silently
            console.error("Error loading active rooms:", error);
            return []; // Return empty array on error
        }
    };
        
    // Refresh data function
    const refreshData = useCallback(async () => {
        if (!address) return;
        
        const roomsData = await loadActiveRooms();
        await loadUserTickets(roomsData); // Pass rooms data directly
    }, [address]);
    
    // Load user tickets
    const loadUserTickets = async (roomsToUse?: Room[]) => {
        if (!address) return;
        
        try {
            // Store current tickets to avoid UI flicker
            const currentTickets = [...tickets];
            const userTickets: TicketType[] = [];
            
            // Use provided rooms data or fall back to state
            const roomsData = roomsToUse || rooms;
            
            // For each room, get the user's tickets
            for (const room of roomsData) {
                try {
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
                            
                            // Check if the ticket is claimed using the contract function
                            let isClaimed = false;
                            try {
                                // Only check claimed status for winning tickets based on win attribute
                                if (ticketData.win) {
                                    isClaimed = Boolean(await isTicketClaimed(room.id, ticketRoundNumber, Number(ticketData.id)));
                                    console.log(`Ticket ${ticketData.id} in room ${room.id} claimed status:`, isClaimed);
                                }
                            } catch (error) {
                                console.error(`Error checking if ticket ${ticketData.id} is claimed:`, error);
                                // Default to false if there's an error
                                isClaimed = false;
                            }
                            
                            // Determine ticket status based on win attribute and room state
                            let status: 'won' | 'lost' | 'pending' = 'pending';
                            
                            // Use the win attribute from the contract
                            if (ticketData.win) {
                                status = 'won'; // Always show winning tickets as 'won' even if not claimed yet
                            } else if (roomState === RoomState.REVEALED || roomState === RoomState.CLOSED) {
                                // Non-winning tickets in resolved rounds are 'lost'
                                status = 'lost';
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
                                // Always set prize to the pool amount for winning tickets regardless of claimed status
                                prize: Number(roomDetails.prizePool) / DECIMAL_FACTOR,
                                roomState: roomState,
                                winningNumber: winningNumber,
                                roundNumber: ticketRoundNumber,
                                claimed: isClaimed, // Use the value from isTicketClaimed function
                                win: Boolean(ticketData.win) // Add win property from contract data
                            });
                        }
                    }
                } catch (roomError) {
                    console.error(`Error loading tickets for room ${room.id}:`, roomError);
                    // Continue with other rooms even if one fails
                }
            }
            
            // Only update if we actually got tickets back, otherwise keep existing ones
            if (userTickets.length > 0 || currentTickets.length === 0) {
                setTickets(userTickets);
            } else {
                console.log("Keeping existing tickets as no new tickets were found");
            }
        } catch (error) {
            // Handle error silently
            console.error("Error loading user tickets:", error);
        }
    };
    
    // Claim prize for a winning ticket
    const handleClaimPrize = async (roomId: number, ticketId: number) => {
        try {
            const result = await claimPrize(roomId, ticketId);
            
            // Check if the ticket is now claimed
            let isClaimed = false;
            try {
                // Find the ticket to get its round number
                const ticket = tickets.find(t => t.id === ticketId && t.roomId === roomId);
                const roundNumber = ticket ? ticket.roundNumber : 1; // Default to round 1 if undefined
                
                isClaimed = Boolean(await isTicketClaimed(roomId, roundNumber, ticketId));
            } catch (claimCheckError) {
                console.error("Error checking ticket claimed status:", claimCheckError);
                // If we can't check, assume it worked since the claim transaction succeeded
                isClaimed = true;
            }
            
            // Update ticket status upon successful claim
            setTickets(prevTickets => 
                prevTickets.map(ticket => 
                    ticket.id === ticketId && ticket.roomId === roomId
                        ? { 
                            ...ticket, 
                            status: 'won', 
                            // Preserve the existing prize amount rather than getting it from rooms
                            claimed: isClaimed
                          }
                        : ticket
                )
            );
            
            // Show success message
            alert('Prize claimed successfully!');
            
            // No need to immediately reload tickets as we've already updated the claimed status
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

    useEffect(() => {
        getUserAddress();
    }, []);
    
    useEffect(() => {
        if (address) {
            const loadData = async () => {
                const roomsData = await loadActiveRooms();
                await loadUserTickets(roomsData);
            };
            loadData();
        }
    }, [address]);

    // Add a specific effect to refresh ticket data when navigating to tickets page
    useEffect(() => {
        if (currentPage === 'tickets' && address) {
            const loadTicketsData = async () => {
                // If we already have rooms data, use it directly to load tickets
                if (rooms.length > 0) {
                    await loadUserTickets(rooms);
                } else {
                    // Otherwise load rooms first, then tickets
                    const roomsData = await loadActiveRooms();
                    await loadUserTickets(roomsData);
                }
            };
            loadTicketsData();
        }
    }, [currentPage, address, rooms.length]);

    const renderPage = () => {
        const content = (() => {
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
                            setCurrentPage={(page) => {
                                if (page === 'tickets') {
                                    // If we're navigating to tickets, highlight the current selected room
                                    setHighlightRoomId(selectedRoom);
                                }
                                setCurrentPage(page);
                            }}
                        />
                    );
                case 'tickets':
                    return (
                        <TicketsPage 
                            tickets={tickets}
                            address={address}
                            onClaimPrize={handleClaimPrize}
                            highlightRoomId={highlightRoomId}
                            clearHighlight={() => setHighlightRoomId(null)}
                        />
                    );
                case 'statistics':
                    return (
                        <StatisticsPage 
                            tickets={tickets}
                            rooms={rooms}
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
                        setCurrentPage={(page) => {
                            if (page === 'tickets') {
                                // If we're navigating to tickets, highlight the current selected room
                                setHighlightRoomId(selectedRoom);
                            }
                            setCurrentPage(page);
                        }}
                    />;
            }
        })();
        
        // Wrap content with PullToRefresh component
        return (
            <PullToRefresh onRefresh={refreshData}>
                {content}
            </PullToRefresh>
        );
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-b from-purple-900 to-indigo-900 text-white">
            {/* App Content */}
            <div 
                ref={contentRef}
                className="flex-1 overflow-auto"
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
                            onClick={async () => {
                                setCurrentPage('tickets');
                                // Refresh ticket data when clicking on tickets tab
                                if (address) {
                                    const roomsData = await loadActiveRooms();
                                    await loadUserTickets(roomsData);
                                }
                            }}
                        >
                            <Ticket size={24} />
                            <span className="text-xs mt-1">My Tickets</span>
                        </button>
                        <button 
                            className={`flex flex-col items-center ${currentPage === 'statistics' ? 'text-purple-400' : 'text-gray-400'}`}
                            onClick={() => setCurrentPage('statistics')}
                        >
                            <BarChart size={24} />
                            <span className="text-xs mt-1">Statistics</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LotteryApp;
