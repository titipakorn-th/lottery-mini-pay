"use client";

import React, { useRef, useEffect } from "react";
import { Ticket } from "../lottery/types";
import { Star, Ticket as TicketIcon } from "lucide-react";

interface TicketsPageProps {
    tickets: Ticket[];
    address: string | null;
    onClaimPrize: (roomId: number, ticketId: number) => Promise<void>;
    highlightRoomId: number | null;
    clearHighlight: () => void;
}

const TicketsPage = ({ tickets, address, onClaimPrize, highlightRoomId, clearHighlight }: TicketsPageProps) => {
    
    // Create refs for room sections to enable scrolling to them
    const roomRefs = useRef<Record<string, HTMLDivElement | null>>({});
    
    // Set up ref callback to correctly assign refs
    const setRoomRef = (roomName: string) => (el: HTMLDivElement | null) => {
        roomRefs.current[roomName] = el;
    };
    
    // Group tickets by rooms
    const ticketsByRoom = tickets.reduce((acc, ticket) => {
        if (!acc[ticket.roomName]) {
            acc[ticket.roomName] = [];
        }
        acc[ticket.roomName].push(ticket);
        return acc;
    }, {} as Record<string, Ticket[]>);
    
    // Get room name from ID for highlighting
    const highlightRoomName = highlightRoomId 
        ? tickets.find(ticket => ticket.roomId === highlightRoomId)?.roomName 
        : null;

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
    
    // Scroll to highlighted room if specified
    useEffect(() => {
        if (highlightRoomName && roomRefs.current[highlightRoomName]) {
            roomRefs.current[highlightRoomName]?.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
            
            // Clear the highlight after a delay
            const timer = setTimeout(() => {
                clearHighlight();
            }, 3000);
            
            return () => clearTimeout(timer);
        }
    }, [highlightRoomName, clearHighlight]);

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
                    Object.entries(ticketsByRoom).map(([roomName, roomTickets]) => {
                        const groupedTickets = getGroupedTickets(roomTickets);
                        const isHighlighted = roomName === highlightRoomName;
                        
                        return (
                            <div 
                                key={roomName} 
                                className={`mb-6 ${isHighlighted ? 'animate-pulse' : ''}`}
                                ref={setRoomRef(roomName)}
                            >
                                <div className={`flex items-center mb-2 ${isHighlighted ? 'bg-purple-800/50 p-2 rounded-lg' : ''}`}>
                                    <Star size={16} className={`${isHighlighted ? 'text-yellow-300' : 'text-yellow-400'} mr-2`} />
                                    <h3 className="text-lg font-bold">{roomName}</h3>
                                    {isHighlighted && <span className="ml-2 text-sm text-yellow-300">Check your tickets!</span>}
                                </div>
                                
                                {groupedTickets.map((ticket) => {
                                    // Check if it's a winning ticket (matches the winning number and number is revealed/closed)
                                    const isWinningTicket = ticket.number === ticket.winningNumber && 
                                                        (ticket.roomState === 2 || ticket.roomState === 3);
                                    
                                    // A ticket can be claimed if it's a winning ticket, hasn't been claimed yet, and status is 'won'
                                    const canClaim = isWinningTicket && !ticket.claimed && ticket.status === 'won';
                                    
                                    // Check if ticket is already claimed
                                    const alreadyClaimed = isWinningTicket && ticket.claimed;
                                    
                                    return (
                                        <div
                                            key={`${ticket.id}-${ticket.number}-${ticket.status}`}
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
                                                {ticket.count > 1 && (
                                                    <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                                                        x{ticket.count}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-400">
                                                    {ticket.date}
                                                </p>
                                                 <p className="text-sm text-gray-400">
                                                   Round #{ticket.roundNumber.toString()}
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
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default TicketsPage; 