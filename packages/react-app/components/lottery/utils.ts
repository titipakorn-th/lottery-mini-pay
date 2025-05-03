// Format timestamp into a countdown string
export const formatCountdown = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = Math.max(0, timestamp - now);
    
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}; 