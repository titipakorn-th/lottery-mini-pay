"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWeb3 } from "@/contexts/useWeb3";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { Bell, ChevronLeft, Home, Ticket, Award, DollarSign, Clock, Users, Star, Terminal } from 'lucide-react';

// Debug Console Component
const DebugConsole = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const consolePatched = useRef(false);

    useEffect(() => {
        // Only patch console methods once
        if (consolePatched.current) {
            return;
        }
        
        consolePatched.current = true;

        // Store original console methods
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalInfo = console.info;

        // Override console methods
        console.log = (...args) => {
            originalLog(...args);
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            setLogs(prev => [...prev, `LOG: ${message}`].slice(-100)); // Keep last 100 logs
        };

        console.error = (...args) => {
            originalError(...args);
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            setLogs(prev => [...prev, `ERROR: ${message}`].slice(-100));
        };

        console.warn = (...args) => {
            originalWarn(...args);
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            setLogs(prev => [...prev, `WARN: ${message}`].slice(-100));
        };

        console.info = (...args) => {
            originalInfo(...args);
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            setLogs(prev => [...prev, `INFO: ${message}`].slice(-100));
        };

        // Clean up
        return () => {
            if (consolePatched.current) {
                console.log = originalLog;
                console.error = originalError;
                console.warn = originalWarn;
                console.info = originalInfo;
                consolePatched.current = false;
            }
        };
    }, []);

    // Scroll to bottom when logs update
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    // Clear logs
    const clearLogs = () => {
        setLogs([]);
    };

    return (
        <>
            {/* Toggle Button */}
            <button
                className="fixed bottom-4 right-4 z-50 bg-purple-700 text-white p-3 rounded-full shadow-lg"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Terminal size={20} />
            </button>

            {/* Console Panel */}
            {isOpen && (
                <div className="fixed bottom-20 right-4 z-50 bg-gray-900 rounded-lg shadow-lg border border-gray-700 w-[90vw] max-w-[500px] max-h-[60vh] flex flex-col overflow-hidden">
                    <div className="bg-gray-800 p-2 flex justify-between items-center">
                        <span className="text-sm font-mono">Debug Console</span>
                        <div>
                            <button 
                                className="text-xs bg-red-800 hover:bg-red-700 px-2 py-1 rounded mr-2"
                                onClick={clearLogs}
                            >
                                Clear
                            </button>
                            <button 
                                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                                onClick={() => setIsOpen(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    <div 
                        ref={logContainerRef}
                        className="flex-1 p-2 overflow-auto font-mono text-xs whitespace-pre-wrap"
                    >
                        {logs.length === 0 ? (
                            <div className="text-gray-500 italic">No logs yet</div>
                        ) : (
                            logs.map((log, i) => (
                                <div 
                                    key={i} 
                                    className={`mb-1 ${
                                        log.startsWith('ERROR') 
                                            ? 'text-red-400' 
                                            : log.startsWith('WARN') 
                                            ? 'text-yellow-400' 
                                            : log.startsWith('INFO')
                                            ? 'text-blue-400'
                                            : 'text-green-400'
                                    }`}
                                >
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

// Types
type Room = {
    id: number;
    name: string;
    prizePool: number;
    players: number;
    countdown: string;
    fee: number;
    description: string;
    drawTime: number;
};

type Ticket = {
    id: number;
    roomId: number;
    roomName: string;
    number: number;
    date: string;
    status: 'won' | 'lost' | 'pending';
    prize: number;
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
        sendCUSD,
        buyLotteryTicket,
        getRoomDetails,
        getTicketsForAddress,
        getPrizePool,
        getWinningNumber,
        claimPrize,
        listActiveRooms,
        getCELOBalance,
    } = useWeb3();

    const [currentPage, setCurrentPage] = useState<'home' | 'tickets' | 'results' | 'buy-ticket'>('home');
    const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
    const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    
    // Multiple lottery rooms
    const [rooms, setRooms] = useState<Room[]>([]);
    
    const [previousWinners, setPreviousWinners] = useState<Winner[]>([]);

    // Update countdown timers every second
    useEffect(() => {
        // Skip if no rooms
        if (rooms.length === 0) return;
        
        const timer = setInterval(() => {
            setRooms(currentRooms => 
                currentRooms.map(room => ({
                    ...room,
                    countdown: formatCountdown(room.drawTime)
                }))
            );
        }, 1000);
        
        return () => clearInterval(timer);
    }, [rooms.length]);

    // Function to buy ticket
    const buyTicket = async () => {
        if (selectedNumber !== null && selectedRoom !== null) {
            const roomInfo = rooms.find(room => room.id === selectedRoom);
            if (!roomInfo) return;
            
            try {
                console.log(`Buying ticket for room ID: ${selectedRoom} (${typeof selectedRoom}) with number: ${selectedNumber}`);
                
                // Check CELO balance first
                const celoBalance = await getCELOBalance(address);
                const requiredCELO = roomInfo.fee + 0.01; // Add some extra for gas (0.01 CELO should be enough)
                
                if (Number(celoBalance) < requiredCELO) {
                    alert(`Insufficient CELO balance. You need at least ${requiredCELO} CELO but only have ${celoBalance}. Please get testnet CELO from the Alfajores faucet.`);
                    return;
                }
                
                // Continue with buying the ticket...
                const receipt = await buyLotteryTicket(selectedRoom, selectedNumber);
                console.log("Transaction successful:", receipt);
                
                const newTicket: Ticket = {
                    id: tickets.length + 1,
                    roomId: selectedRoom,
                    roomName: roomInfo.name,
                    number: selectedNumber,
                    date: new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    }),
                    status: 'pending',
                    prize: 0
                };
                
                // Update rooms with new player and increased prize pool
                const updatedRooms = rooms.map(room => {
                    if (room.id === selectedRoom) {
                        return {
                            ...room,
                            prizePool: room.prizePool + room.fee,
                            players: room.players + 1,
                            countdown: formatCountdown(room.drawTime)
                        };
                    }
                    return room;
                });
                
                setRooms(updatedRooms);
                setTickets([newTicket, ...tickets]);
                setSelectedNumber(null);
                setCurrentPage('tickets');
                
                // Display success message
                alert('Ticket purchased successfully!');
            } catch (error) {
                console.error("Failed to buy ticket:", error);
                
                // Display error message
                alert(`Failed to buy ticket: ${error instanceof Error ? error.message : String(error)}`);
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
                        
                        // Convert from blockchain format to UI format
                        return {
                            id: Number(details.id),
                            name: details.name,
                            prizePool: Number(details.prizePool) / 1e18, // Convert from wei
                            players: Number(details.playerCount),
                            countdown: formatCountdown(Number(details.drawTime)),
                            drawTime: Number(details.drawTime), // Store the actual timestamp
                            fee: Number(details.entryFee) / 1e18, // Convert from wei
                            description: details.description
                        };
                    })
                );
                
                setRooms(roomsData);
            }
        } catch (error) {
            console.error("Failed to load rooms:", error);
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
    
    // Load user tickets
    const loadUserTickets = async () => {
        if (!address) return;
        
        try {
            const userTickets: Ticket[] = [];
            
            // For each room, get the user's tickets
            for (const room of rooms) {
                const ticketsInRoom = await getTicketsForAddress(room.id, address);
                
                if (ticketsInRoom && Array.isArray(ticketsInRoom) && ticketsInRoom.length > 0) {
                    // For each ticket, get details and add to the tickets array
                    for (const ticket of ticketsInRoom) {
                        const ticketData = ticket as any;
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
                            status: ticketData.claimed ? 'won' : 'pending',
                            prize: ticketData.claimed ? Number(await getPrizePool(Number(ticketData.roomId))) / 1e18 : 0
                        });
                    }
                }
            }
            
            setTickets(userTickets);
        } catch (error) {
            console.error("Failed to load tickets:", error);
        }
    };
    
    // Claim prize for a winning ticket
    const handleClaimPrize = async (roomId: number, ticketId: number) => {
        try {
            const result = await claimPrize(roomId, ticketId);
            
            // Update the ticket status
            setTickets(prevTickets => 
                prevTickets.map(ticket => 
                    ticket.id === ticketId && ticket.roomId === roomId
                        ? { ...ticket, status: 'won' as const }
                        : ticket
                )
            );
        } catch (error) {
            console.error("Failed to claim prize:", error);
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
            console.error("Failed to load winners:", error);
        }
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
            {/* App Content */}
            <div className="flex-1 overflow-auto">
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
            
            {/* Debug Console */}
            <DebugConsole />
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
        onRoomSelect(roomId);
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
                        rooms.map((room) => (
                            <div 
                                key={room.id}
                                className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 cursor-pointer mb-4"
                                onClick={() => handleRoomSelect(room.id)}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xl font-semibold">{room.name}</h3>
                                    <div className="bg-purple-900 px-3 py-1 rounded-full text-sm">
                                        ${room.fee} Entry
                                    </div>
                                </div>
                                <p className="text-gray-400 text-sm mb-2">{room.description}</p>
                                <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                                    <div className="flex items-center">
                                        <DollarSign size={16} className="text-green-400 mr-1 flex-shrink-0" />
                                        <span className="truncate">Prize: ${room.prizePool}</span>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <Users size={16} className="text-blue-400 mr-1 flex-shrink-0" />
                                        <span className="truncate">{room.players} Players</span>
                                    </div>
                                    <div className="flex items-center justify-end">
                                        <Clock size={16} className="text-yellow-400 mr-1 flex-shrink-0" />
                                        <span className="font-mono">{room.countdown}</span>
                                    </div>
                                </div>
                            </div>
                        ))
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
}

const TicketsPage = ({ tickets, address }: TicketsPageProps) => {
    const { claimPrize } = useWeb3();
    
    const handleClaimPrize = async (roomId: number, ticketId: number) => {
        try {
            await claimPrize(roomId, ticketId);
            // Note: Updating the UI would be handled in a real app
            alert('Prize claimed successfully!');
        } catch (error) {
            console.error("Failed to claim prize:", error);
        }
    };
    
    // Group tickets by rooms
    const ticketsByRoom = tickets.reduce((acc, ticket) => {
        if (!acc[ticket.roomName]) {
            acc[ticket.roomName] = [];
        }
        acc[ticket.roomName].push(ticket);
        return acc;
    }, {} as Record<string, Ticket[]>);

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
                    Object.entries(ticketsByRoom).map(([roomName, roomTickets]) => (
                        <div key={roomName} className="mb-6">
                            <div className="flex items-center mb-2">
                                <Star size={16} className="text-yellow-400 mr-2" />
                                <h3 className="text-lg font-bold">{roomName}</h3>
                            </div>
                            
                            {roomTickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="bg-gray-800 rounded-lg p-4 mb-3 flex items-center"
                                >
                                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold mr-4">
                                        {ticket.number}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-400">{ticket.date}</p>
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
                                    {ticket.status === 'pending' && (
                                        <button
                                            className="bg-purple-600 px-3 py-1 rounded text-sm"
                                            onClick={() => handleClaimPrize(ticket.roomId, ticket.id)}
                                        >
                                            Claim Prize
                                        </button>
                                    )}
                                    {ticket.status === 'won' && (
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400">Prize</p>
                                            <p className="text-xl font-bold text-green-400">${ticket.prize}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))
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
                                    </div>
                                    <div className="w-1/2 text-right">
                                        <p className="text-purple-400 font-mono font-medium">{room.countdown}</p>
                                        <div className="flex items-center justify-end mt-1">
                                            <Bell size={12} className="text-yellow-400 mr-1" />
                                            <p className="text-xs text-yellow-400">Notify me</p>
                                        </div>
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
        const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
        return (
            <div className="grid grid-cols-3 gap-3 mx-auto max-w-xs">
                {digits.map((digit) => (
                    <button
                        key={digit}
                        className="w-16 h-16 bg-gray-800 hover:bg-gray-700 rounded-lg text-2xl font-bold"
                        onClick={() => handleNumberInput(digit)}
                    >
                        {digit}
                    </button>
                ))}
                <button
                    className="w-16 h-16 bg-red-800 hover:bg-red-700 rounded-lg text-lg font-bold col-span-3"
                    onClick={clearNumber}
                >
                    Clear
                </button>
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

    // Log room info only on first render
    useEffect(() => {
        console.log("BuyTicketPage - Room info:", { 
            id: roomInfo.id, 
            type: typeof roomInfo.id,
            name: roomInfo.name,
            fee: roomInfo.fee
        });
    }, [roomInfo.id]);

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

            <div className="px-4 flex flex-col flex-1 pb-20">
                <div className="bg-gray-800 rounded-lg p-4 mb-6">
                    <div className="flex justify-between mb-2">
                        <h2 className="text-xl font-bold">{roomInfo.name}</h2>
                        <div className="flex items-center">
                            <Clock size={16} className="text-yellow-400 mr-1" />
                            <span className="font-mono min-w-[80px] text-right">{roomInfo.countdown}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="bg-gray-700/50 p-3 rounded">
                            <p className="text-gray-400 text-sm">Prize Pool</p>
                            <p className="text-xl font-bold flex items-center">
                                <DollarSign size={16} className="text-green-400 mr-1" />
                                {roomInfo.prizePool}
                            </p>
                        </div>
                        <div className="bg-gray-700/50 p-3 rounded">
                            <p className="text-gray-400 text-sm">Players</p>
                            <p className="text-lg font-bold flex items-center">
                                <Users size={16} className="text-blue-400 mr-1" />
                                {roomInfo.players}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 mb-6 flex-1">
                    <h2 className="text-xl font-bold mb-4">Your Lucky Number</h2>
                    
                    <div className="bg-gray-900 h-20 rounded-lg flex items-center justify-center mb-6 relative">
                        {selectedNumber !== null ? (
                            <span className="text-5xl font-bold">{selectedNumber}</span>
                        ) : (
                            <span className="text-2xl text-gray-500">Select a number (0-99)</span>
                        )}
                    </div>
                    
                    {renderNumberPad()}
                </div>

                <div className="mt-auto mb-4">
                    <button
                        className={`w-full py-4 rounded-lg text-xl font-bold ${
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
