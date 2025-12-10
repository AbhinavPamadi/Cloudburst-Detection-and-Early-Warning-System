'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, GripHorizontal, Layers, AlertTriangle } from 'lucide-react';
import type { SectorState, AlertLevel } from '@/types/sector.types';

// ============================================
// Types
// ============================================

type DrawerState = 'collapsed' | 'partial' | 'expanded';

interface BottomDrawerProps {
  children: React.ReactNode;
  sectorCount: number;
  alertCounts: Record<AlertLevel, number>;
  hasCloudbursts: boolean;
  onStateChange?: (state: DrawerState) => void;
  className?: string;
}

// ============================================
// Constants
// ============================================

const COLLAPSED_HEIGHT = 64;
const PARTIAL_HEIGHT_RATIO = 0.4;
const EXPANDED_HEIGHT_RATIO = 0.85;
const DRAG_THRESHOLD = 50;
const MIN_TOUCH_SIZE = 44;

// ============================================
// Component
// ============================================

export function BottomDrawer({
  children,
  sectorCount,
  alertCounts,
  hasCloudbursts,
  onStateChange,
  className = '',
}: BottomDrawerProps) {
  const [drawerState, setDrawerState] = useState<DrawerState>('collapsed');
  const [isDragging, setIsDragging] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(COLLAPSED_HEIGHT);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);

  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate heights based on window
  const getHeights = useCallback(() => {
    if (typeof window === 'undefined') {
      return {
        collapsed: COLLAPSED_HEIGHT,
        partial: 300,
        expanded: 600,
      };
    }
    return {
      collapsed: COLLAPSED_HEIGHT,
      partial: window.innerHeight * PARTIAL_HEIGHT_RATIO,
      expanded: window.innerHeight * EXPANDED_HEIGHT_RATIO,
    };
  }, []);

  // Update drawer height based on state
  const updateHeight = useCallback(
    (state: DrawerState) => {
      const heights = getHeights();
      switch (state) {
        case 'collapsed':
          setCurrentHeight(heights.collapsed);
          break;
        case 'partial':
          setCurrentHeight(heights.partial);
          break;
        case 'expanded':
          setCurrentHeight(heights.expanded);
          break;
      }
    },
    [getHeights]
  );

  // Change drawer state
  const changeState = useCallback(
    (newState: DrawerState) => {
      setDrawerState(newState);
      updateHeight(newState);
      onStateChange?.(newState);
    },
    [updateHeight, onStateChange]
  );

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setStartY(touch.clientY);
    setStartHeight(currentHeight);
    setIsDragging(true);
  }, [currentHeight]);

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;

      const touch = e.touches[0];
      const deltaY = startY - touch.clientY;
      const heights = getHeights();
      const newHeight = Math.max(
        heights.collapsed,
        Math.min(heights.expanded, startHeight + deltaY)
      );
      setCurrentHeight(newHeight);
    },
    [isDragging, startY, startHeight, getHeights]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const heights = getHeights();
    const deltaY = startHeight - currentHeight;

    // Snap to nearest state based on position and drag direction
    if (Math.abs(deltaY) > DRAG_THRESHOLD) {
      // Dragged down
      if (deltaY > 0) {
        if (drawerState === 'expanded') {
          changeState('partial');
        } else {
          changeState('collapsed');
        }
      }
      // Dragged up
      else {
        if (drawerState === 'collapsed') {
          changeState('partial');
        } else {
          changeState('expanded');
        }
      }
    } else {
      // Snap back to current state
      updateHeight(drawerState);
    }
  }, [isDragging, startHeight, currentHeight, drawerState, getHeights, changeState, updateHeight]);

  // Handle state toggle button
  const toggleState = useCallback(() => {
    switch (drawerState) {
      case 'collapsed':
        changeState('partial');
        break;
      case 'partial':
        changeState('expanded');
        break;
      case 'expanded':
        changeState('collapsed');
        break;
    }
  }, [drawerState, changeState]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => updateHeight(drawerState);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawerState, updateHeight]);

  // Calculate alert summary
  const criticalCount = alertCounts.critical + alertCounts.high;
  const showAlert = hasCloudbursts || criticalCount > 0;

  return (
    <div
      ref={drawerRef}
      className={`
        fixed bottom-0 left-0 right-0 z-40
        bg-white dark:bg-gray-900
        rounded-t-2xl shadow-lg
        transform transition-transform duration-300 ease-out
        md:hidden
        ${className}
      `}
      style={{
        height: currentHeight,
        transition: isDragging ? 'none' : 'height 0.3s ease-out',
      }}
    >
      {/* Drag Handle */}
      <div
        className="absolute top-0 left-0 right-0 touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ minHeight: MIN_TOUCH_SIZE }}
      >
        <div className="flex flex-col items-center pt-2 pb-3">
          <GripHorizontal className="w-8 h-1.5 text-gray-300 dark:text-gray-600" />
        </div>
      </div>

      {/* Header - Always Visible */}
      <div className="px-4 pt-6 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-gray-900 dark:text-white">
              Sector Monitor
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {sectorCount} sectors
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Alert Badge */}
            {showAlert && (
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  hasCloudbursts
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 animate-pulse'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                {hasCloudbursts ? 'Cloudburst!' : `${criticalCount} Alert${criticalCount !== 1 ? 's' : ''}`}
              </div>
            )}

            {/* Expand/Collapse Button */}
            <button
              onClick={toggleState}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              style={{ minWidth: MIN_TOUCH_SIZE, minHeight: MIN_TOUCH_SIZE }}
              aria-label={drawerState === 'expanded' ? 'Collapse' : 'Expand'}
            >
              {drawerState === 'expanded' ? (
                <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Stats - Collapsed View */}
        {drawerState === 'collapsed' && (
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {alertCounts.critical} critical
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              {alertCounts.high} high
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {alertCounts.normal} normal
            </span>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div
        ref={contentRef}
        className={`
          overflow-y-auto overscroll-contain
          ${drawerState === 'collapsed' ? 'hidden' : 'block'}
        `}
        style={{
          height: drawerState === 'collapsed' ? 0 : currentHeight - 100,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default BottomDrawer;
