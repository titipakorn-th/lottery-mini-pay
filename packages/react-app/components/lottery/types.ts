// Lottery Types
export enum RoomState {
    OPEN = 0,
    PENDING_REVEAL = 1,
    REVEALED = 2,
    CLOSED = 3,
    RESETTING = 4
}

export type Room = {
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

export type Ticket = {
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
    claimed?: boolean;
}; 