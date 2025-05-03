"use client";

import React, { useState, useRef } from 'react';

interface PullToRefreshProps {
    children: React.ReactNode;
    onRefresh: () => Promise<void>;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ children, onRefresh }) => {
    const [isPulling, setIsPulling] = useState(false);
    const [refreshProgress, setRefreshProgress] = useState(0);
    const touchStartY = useRef(0);
    const MIN_PULL_DISTANCE = 80;
    const wrapperRef = useRef<HTMLDivElement>(null);
    
    const handleTouchStart = (e: React.TouchEvent) => {
        // Only enable pull-to-refresh when at the top of the page
        if (wrapperRef.current && wrapperRef.current.scrollTop <= 0) {
            touchStartY.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartY.current === 0 || wrapperRef.current?.scrollTop !== 0) return;
        
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
                onRefresh().then(() => {
                    // Add a small delay to show the refresh animation
                    setTimeout(() => {
                        setIsPulling(false);
                        setRefreshProgress(0);
                    }, 800);
                });
            } else {
                // User didn't pull enough, reset
                setIsPulling(false);
                setRefreshProgress(0);
            }
        }
        
        touchStartY.current = 0;
    };
    
    return (
        <>
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
            <div 
                ref={wrapperRef}
                className="flex-1 overflow-auto"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </>
    );
};

export default PullToRefresh; 