"use client";

import React, { useState, useEffect } from "react";
import { Ticket, Room } from "../lottery/types";
import { Ticket as TicketIcon, Bell, ChevronLeft, Home, Award, DollarSign, Clock, Users, Star, BarChart, PieChart, TrendingUp, CircleDollarSign, Zap } from 'lucide-react';
import { useWeb3 } from "@/contexts/useWeb3";

interface StatisticsPageProps {
    tickets: Ticket[];
    rooms: Room[];
    address: string | null;
}

const StatisticsPage = ({ tickets, rooms, address }: StatisticsPageProps) => {
    const { getPlayerCompleteStats, getTotalPlayerWins, getTotalPlayerTickets } = useWeb3();
    const [statsLoading, setStatsLoading] = useState(true);
    const [playerStats, setPlayerStats] = useState({
        totalTickets: 0,
        totalWins: 0,
        totalClaimed: 0
    });
    
    // Fetch player stats from blockchain
    useEffect(() => {
        async function fetchPlayerStats() {
            if (!address) return;
            
            try {
                setStatsLoading(true);
                // Get player stats from smart contract
                const completeStats = await getPlayerCompleteStats(address);
                
                // Type assertion to handle unknown type
                const statsArray = completeStats as unknown as bigint[];
                
                setPlayerStats({
                    totalTickets: Number(statsArray[0]) || 0,
                    totalWins: Number(statsArray[1]) || 0,
                    totalClaimed: Number(statsArray[2]) || 0
                });
            } catch (error) {
                console.error("Error fetching player stats:", error);
                // Fall back to tickets data if contract call fails
                fallbackToTicketsData();
            } finally {
                setStatsLoading(false);
            }
        }
        
        fetchPlayerStats();
    }, [address]); // Remove getPlayerCompleteStats from dependencies
    
    // Fallback function to calculate stats from tickets if contract call fails
    const fallbackToTicketsData = () => {
        // Total tickets purchased
        const totalTickets = tickets.length;
        
        // Winning tickets
        const winningTickets = tickets.filter(ticket => ticket.win === true || ticket.status === 'won');
        const totalWins = winningTickets.length;
        
        // Claimed prizes
        const claimedTickets = winningTickets.filter(ticket => ticket.claimed);
        const totalClaimed = claimedTickets.length;
        
        setPlayerStats({
            totalTickets,
            totalWins,
            totalClaimed
        });
    };
    
    // Calculate derived stats
    
    // Winning tickets from frontend tickets data (for UI display)
    const winningTickets = tickets.filter(ticket => ticket.win === true || ticket.status === 'won');
    
    // Losing tickets 
    const losingTickets = tickets.filter(ticket => (ticket.status === 'lost' || (ticket.roomState === 2 || ticket.roomState === 3) && !ticket.win));
    const totalLosses = losingTickets.length;
    
    // Pending tickets
    const pendingTickets = tickets.filter(ticket => ticket.status === 'pending');
    
    // Win rate
    const winRate = playerStats.totalTickets > 0 ? (playerStats.totalWins / playerStats.totalTickets) * 100 : 0;
    
    // Total spent
    const totalSpent = tickets.reduce((total, ticket) => {
        const room = rooms.find(r => r.id === ticket.roomId);
        return total + (room ? room.fee : 0);
    }, 0);
    
    // Most played room
    const ticketsByRoom: Record<string, number> = {};
    tickets.forEach(ticket => {
        const roomName = ticket.roomName;
        ticketsByRoom[roomName] = (ticketsByRoom[roomName] || 0) + 1;
    });
    
    let mostPlayedRoom = '';
    let mostPlayedCount = 0;
    
    Object.entries(ticketsByRoom).forEach(([roomName, count]) => {
        if (count > mostPlayedCount) {
            mostPlayedRoom = roomName;
            mostPlayedCount = count;
        }
    });
    
    // Most common numbers
    const numberFrequency: Record<number, number> = {};
    tickets.forEach(ticket => {
        numberFrequency[ticket.number] = (numberFrequency[ticket.number] || 0) + 1;
    });
    
    // Sort numbers by frequency
    const sortedNumbers = Object.entries(numberFrequency)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 3)
        .map(entry => ({ number: Number(entry[0]), count: Number(entry[1]) }));
    
    return (
        <div className="flex flex-col h-full">
            <div className="sticky top-0 pt-4 px-4 pb-2 bg-gradient-to-b from-purple-900 to-purple-900/95 z-10">
                <h1 className="text-3xl font-bold text-center">My Statistics</h1>
                <p className="text-gray-300 text-center">Your lottery performance</p>
            </div>

            <div className="flex-1 overflow-auto px-4 pb-20">
                {/* Overview Stats */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 className="text-xl font-bold mb-3">Overview</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-700/50 p-3 rounded flex flex-col items-center">
                            <TicketIcon size={24} className="text-purple-400 mb-1" />
                            <p className="text-xs text-gray-300">Total Tickets</p>
                            <p className="text-xl font-bold">{statsLoading ? "..." : playerStats.totalTickets}</p>
                        </div>
                        <div className="bg-gray-700/50 p-3 rounded flex flex-col items-center">
                            <Zap size={24} className="text-yellow-400 mb-1" />
                            <p className="text-xs text-gray-300">Win Rate</p>
                            <p className="text-xl font-bold">{statsLoading ? "..." : winRate.toFixed(1)}%</p>
                        </div>
                        <div className="bg-gray-700/50 p-3 rounded flex flex-col items-center">
                            <CircleDollarSign size={24} className="text-red-400 mb-1" />
                            <p className="text-xs text-gray-300">Total Spent</p>
                            <p className="text-xl font-bold">${totalSpent.toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-700/50 p-3 rounded flex flex-col items-center">
                            <Award size={24} className="text-green-400 mb-1" />
                            <p className="text-xs text-gray-300">Wins</p>
                            <p className="text-xl font-bold">{statsLoading ? "..." : playerStats.totalWins}</p>
                        </div>
                    </div>
                </div>
                
                {/* Player Achievement Stats */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 className="text-xl font-bold mb-3">Achievements</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Award className="text-yellow-500 mr-2" size={18} />
                                <span>Total Prizes Claimed</span>
                            </div>
                            <span className="font-bold">{statsLoading ? "..." : playerStats.totalClaimed}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <TrendingUp className="text-green-500 mr-2" size={18} />
                                <span>Claiming Rate</span>
                            </div>
                            <span className="font-bold">
                                {statsLoading || playerStats.totalWins === 0 
                                    ? "N/A" 
                                    : `${((playerStats.totalClaimed / playerStats.totalWins) * 100).toFixed(1)}%`}
                            </span>
                        </div>
                    </div>
                </div>
                
                {/* Additional Stats */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 className="text-xl font-bold mb-3">Additional Stats</h2>
                    
                    {tickets.length > 0 ? (
                        <div className="space-y-4">
                            {mostPlayedRoom && (
                                <div>
                                    <p className="text-gray-300 text-sm">Most Played Room</p>
                                    <div className="flex items-center">
                                        <Star size={16} className="text-yellow-400 mr-2" />
                                        <p className="font-medium">{mostPlayedRoom}</p>
                                        <p className="ml-auto text-purple-300">{mostPlayedCount} tickets</p>
                                    </div>
                                </div>
                            )}
                            
                            {sortedNumbers.length > 0 && (
                                <div>
                                    <p className="text-gray-300 text-sm">Your Favorite Numbers</p>
                                    <div className="grid grid-cols-3 gap-2 mt-1">
                                        {sortedNumbers.map(item => (
                                            <div key={item.number} className="bg-gray-700/50 rounded p-2 flex items-center justify-between">
                                                <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center font-bold">
                                                    {item.number}
                                                </div>
                                                <span className="text-sm text-gray-300">{item.count}x</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-20">
                            <p className="text-gray-400">No statistics available yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatisticsPage; 