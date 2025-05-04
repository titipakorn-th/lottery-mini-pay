"use client";

import React, { useRef, useEffect, useState } from "react";
import { Ticket } from "../lottery/types";
import { Star, Ticket as TicketIcon } from "lucide-react";
import { useWeb3 } from "../../contexts/useWeb3";

interface TicketsPageProps {
    tickets: Ticket[];
    address: string | null;
    onClaimPrize: (roomId: number, ticketId: number) => Promise<void>;
    highlightRoomId: number | null;
    clearHighlight: () => void;
}

const TicketsPage = ({ tickets, address, onClaimPrize, highlightRoomId, clearHighlight }: TicketsPageProps) => {
    // Get getCurrentRound function from useWeb3 context
    const { getCurrentRound } = useWeb3();
    
    // State to store current round numbers for each room
    const [currentRounds, setCurrentRounds] = useState<Record<string, number>>({});
    
    // Create refs for room sections to enable scrolling to them
    const roomRefs = useRef<Record<string, HTMLDivElement | null>>({});
    
    // Set up ref callback to correctly assign refs
    const setRoomRef = (roomId: string) => (el: HTMLDivElement | null) => {
        roomRefs.current[roomId] = el;
    };
    
    // Group tickets by rooms
    const ticketsByRoom = tickets.reduce((acc, ticket) => {
        const roomId = ticket.roomId.toString();
        if (!acc[roomId]) {
            acc[roomId] = {
                roomName: ticket.roomName,
                tickets: []
            };
        }
        acc[roomId].tickets.push(ticket);
        return acc;
    }, {} as Record<string, { roomName: string, tickets: Ticket[] }>);
    
    // Get room name from ID for highlighting
    const highlightRoomData = highlightRoomId 
        ? ticketsByRoom[highlightRoomId.toString()]
        : null;

    // Helper function to deduplicate tickets by number
    const getUniqueTicketsByNumber = (tickets: Ticket[]) => {
        const uniqueTickets: Record<number, Ticket> = {};
        
        tickets.forEach(ticket => {
            // For each number, we'll keep the most important ticket
            // Winning tickets take priority, then pending, then lost
            const existingTicket = uniqueTickets[ticket.number];
            
            if (!existingTicket) {
                uniqueTickets[ticket.number] = ticket;
            } else if (ticket.win && !existingTicket.win) {
                // Always prefer winning tickets
                uniqueTickets[ticket.number] = ticket;
            } else if (ticket.status === 'pending' && existingTicket.status === 'lost') {
                // Prefer pending over lost
                uniqueTickets[ticket.number] = ticket;
            }
        });
        
        return Object.values(uniqueTickets);
    };

    // Load current round numbers for each room
    useEffect(() => {
        const loadCurrentRounds = async () => {
            const rounds: Record<string, number> = {};
            
            for (const roomId of Object.keys(ticketsByRoom)) {
                try {
                    const currentRound = await getCurrentRound(parseInt(roomId));
                    rounds[roomId] = Number(currentRound);
                } catch (error) {
                    console.error(`Error fetching current round for room ${roomId}:`, error);
                    // Fallback to max round from tickets
                    const roomTickets = ticketsByRoom[roomId].tickets;
                    rounds[roomId] = roomTickets.length > 0 
                        ? Math.max(...roomTickets.map(t => t.roundNumber))
                        : 0;
                }
            }
            
            setCurrentRounds(rounds);
        };
        
        if (Object.keys(ticketsByRoom).length > 0) {
            loadCurrentRounds();
        }
    }, [ticketsByRoom]);
    
    // Scroll to highlighted room if specified
    useEffect(() => {
        if (highlightRoomId && roomRefs.current[highlightRoomId.toString()]) {
            roomRefs.current[highlightRoomId.toString()]?.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
            
            // Clear the highlight after a delay
            const timer = setTimeout(() => {
                clearHighlight();
            }, 3000);
            
            return () => clearTimeout(timer);
        }
    }, [highlightRoomId, clearHighlight]);

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
                            <TicketIcon size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-gray-400">You haven&apos;t purchased any tickets yet.</p>
                        </div>
                    </div>
                ) : (
                    Object.entries(ticketsByRoom).map(([roomId, { roomName, tickets: roomTickets }]) => {
                        const isHighlighted = roomId === highlightRoomId?.toString();
                        
                        // Get the current round number from state or fallback to max from tickets
                        const currentRound = currentRounds[roomId] || 
                            (roomTickets.length > 0 
                                ? Math.max(...roomTickets.map(t => t.roundNumber))
                                : 0);
                        
                        // Find the latest round number for this room from tickets
                        const latestTicketRound = roomTickets.length > 0 
                            ? Math.max(...roomTickets.map(t => t.roundNumber))
                            : 0;
                        
                        // Filter tickets based on round visibility
                        // If current round is greater than latest ticket round, show latest ticket round
                        // to avoid showing an empty list when a new round has started
                        const roundToShow = latestTicketRound > 0 ? latestTicketRound : currentRound;
                        const currentRoundTickets = roomTickets.filter(t => t.roundNumber === roundToShow);
                        
                        // Get unique tickets by number
                        const uniqueTickets = getUniqueTicketsByNumber(currentRoundTickets);
                        
                        // Sort tickets by number in ascending order
                        const sortedTickets = [...uniqueTickets].sort((a, b) => a.number - b.number);
                        
                        // Skip rendering if there are no tickets for this room
                        if (currentRoundTickets.length === 0) {
                            return null;
                        }
                        
                        return (
                            <div 
                                key={roomId} 
                                className={`mb-6 ${isHighlighted ? 'animate-pulse' : ''}`}
                                ref={setRoomRef(roomId)}
                            >
                                <div className={`flex items-center mb-2 ${isHighlighted ? 'bg-purple-800/50 p-2 rounded-lg' : ''}`}>
                                    <Star size={16} className={`${isHighlighted ? 'text-yellow-300' : 'text-yellow-400'} mr-2`} />
                                    <h3 className="text-lg font-bold">{roomName}</h3>
                                    {isHighlighted && <span className="ml-2 text-sm text-yellow-300">Check your tickets!</span>}
                                </div>
                                
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2 mt-3">
                                        <h4 className="text-sm font-medium text-gray-400">Round #{roundToShow}</h4>
                                    </div>
                                    
                                    {sortedTickets.map((ticket) => {
                                        // Check if it's a winning ticket using the win attribute from contract data
                                        const isWinningTicket = ticket.win === true;
                                        
                                        // Update ticket status to 'lost' if round doesn't match current round (unless won)
                                        let adjustedStatus = ticket.status;
                                        if (!isWinningTicket && currentRound > ticket.roundNumber) {
                                            adjustedStatus = 'lost';
                                        }
                                        
                                        return (
                                            <div
                                                key={`${ticket.id}-${ticket.roundNumber}-${ticket.number}-${ticket.status}`}
                                                className={`bg-gray-800 rounded-lg p-4 mb-3 flex items-center ${
                                                    isWinningTicket && !ticket.claimed ? 'border-2 border-green-500' : 
                                                    isWinningTicket && ticket.claimed ? 'border-2 border-purple-500' : ''
                                                } ${isHighlighted && ticket.number === ticket.winningNumber && !ticket.claimed ? 'bg-gray-700' : ''}`}
                                            >
                                                <div className={`w-12 h-12 rounded-full ${
                                                    isHighlighted && ticket.number === ticket.winningNumber && !ticket.claimed
                                                    ? 'bg-green-700 animate-pulse' : 'bg-gray-700'
                                                } flex items-center justify-center text-xl font-bold mr-4 relative`}>
                                                    {ticket.number}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm text-gray-400">
                                                        {ticket.date}
                                                    </p>
                                                    <div className="flex items-center">
                                                        <span
                                                            className={`inline-block w-3 h-3 rounded-full mr-2 ${
                                                                adjustedStatus === 'won'
                                                                    ? 'bg-green-500'
                                                                    : adjustedStatus === 'lost'
                                                                    ? 'bg-red-500'
                                                                    : 'bg-yellow-500'
                                                            }`}
                                                        ></span>
                                                        <span
                                                            className={
                                                                adjustedStatus === 'won'
                                                                    ? 'text-green-500'
                                                                    : adjustedStatus === 'lost'
                                                                    ? 'text-red-500'
                                                                    : 'text-yellow-500'
                                                            }
                                                        >
                                                            {adjustedStatus.charAt(0).toUpperCase() + adjustedStatus.slice(1)}
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Show claim UI for winning tickets */}
                                                {isWinningTicket && (
                                                    <div className="flex flex-col items-end">
                                                        <p className="text-green-400 text-sm mb-2">
                                                            {!ticket.claimed 
                                                                ? "Winner! Claim your prize" 
                                                                : "Prize claimed!"
                                                            }
                                                        </p>
                                                        {!ticket.claimed && (
                                                            <button
                                                                className="bg-purple-600 px-3 py-1 rounded text-sm"
                                                                onClick={() => onClaimPrize(ticket.roomId, ticket.id)}
                                                            >
                                                                Claim Prize
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default TicketsPage; 