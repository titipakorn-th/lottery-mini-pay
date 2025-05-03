"use client";

import React from "react";
import { Ticket, Room } from "../lottery/types";
import { Ticket as TicketIcon, Bell, ChevronLeft, Home, Award, DollarSign, Clock, Users, Star, BarChart, PieChart, TrendingUp, CircleDollarSign, Zap } from 'lucide-react';

interface StatisticsPageProps {
    tickets: Ticket[];
    rooms: Room[];
    address: string | null;
}

const StatisticsPage = ({ tickets, rooms, address }: StatisticsPageProps) => {
    // Calculate user statistics from tickets
    
    // Total tickets purchased
    const totalTickets = tickets.length;
    
    // Winning tickets
    const winningTickets = tickets.filter(ticket => ticket.status === 'won');
    const totalWins = winningTickets.length;
    
    // Losing tickets
    const losingTickets = tickets.filter(ticket => ticket.status === 'lost');
    const totalLosses = losingTickets.length;
    
    // Pending tickets
    const pendingTickets = tickets.filter(ticket => ticket.status === 'pending');
    
    // Win rate
    const resolvedTickets = totalWins + totalLosses;
    const winRate = resolvedTickets > 0 ? (totalWins / resolvedTickets) * 100 : 0;
    
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
                            <p className="text-xl font-bold">{totalTickets}</p>
                        </div>
                        <div className="bg-gray-700/50 p-3 rounded flex flex-col items-center">
                            <Zap size={24} className="text-yellow-400 mb-1" />
                            <p className="text-xs text-gray-300">Win Rate</p>
                            <p className="text-xl font-bold">{winRate.toFixed(1)}%</p>
                        </div>
                        <div className="bg-gray-700/50 p-3 rounded flex flex-col items-center">
                            <CircleDollarSign size={24} className="text-red-400 mb-1" />
                            <p className="text-xs text-gray-300">Total Spent</p>
                            <p className="text-xl font-bold">${totalSpent.toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-700/50 p-3 rounded flex flex-col items-center">
                            <Award size={24} className="text-green-400 mb-1" />
                            <p className="text-xs text-gray-300">Wins</p>
                            <p className="text-xl font-bold">{totalWins}</p>
                        </div>
                    </div>
                </div>
                
                {/* Ticket Status Breakdown */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 className="text-xl font-bold mb-3">Ticket Status</h2>
                    <div className="flex items-center mb-2">
                        <div className="w-full bg-gray-700 rounded-full h-4 mr-2">
                            <div className="flex h-4 rounded-full overflow-hidden">
                                {totalWins > 0 && (
                                    <div 
                                        className="bg-green-500" 
                                        style={{ width: `${(totalWins / totalTickets) * 100}%` }}
                                    ></div>
                                )}
                                {totalLosses > 0 && (
                                    <div 
                                        className="bg-red-500" 
                                        style={{ width: `${(totalLosses / totalTickets) * 100}%` }}
                                    ></div>
                                )}
                                {pendingTickets.length > 0 && (
                                    <div 
                                        className="bg-yellow-500" 
                                        style={{ width: `${(pendingTickets.length / totalTickets) * 100}%` }}
                                    ></div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center">
                        <div>
                            <p className="flex items-center justify-center text-green-500">
                                <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
                                Won
                            </p>
                            <p className="font-bold">{totalWins}</p>
                        </div>
                        <div>
                            <p className="flex items-center justify-center text-red-500">
                                <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>
                                Lost
                            </p>
                            <p className="font-bold">{totalLosses}</p>
                        </div>
                        <div>
                            <p className="flex items-center justify-center text-yellow-500">
                                <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span>
                                Pending
                            </p>
                            <p className="font-bold">{pendingTickets.length}</p>
                        </div>
                    </div>
                </div>
                
                {/* Additional Stats */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 className="text-xl font-bold mb-3">Additional Stats</h2>
                    
                    {totalTickets > 0 ? (
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