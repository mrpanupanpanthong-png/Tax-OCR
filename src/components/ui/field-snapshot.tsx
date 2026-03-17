"use client";

import React from 'react';

interface FieldSnapshotProps {
  imageUrl: string;
  boundingBox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] (0-1000)
  className?: string;
}

export function FieldSnapshot({ imageUrl, boundingBox, className = "" }: FieldSnapshotProps) {
  if (!boundingBox || !imageUrl) return null;

  const [ymin, xmin, ymax, xmax] = boundingBox;
  
  // Calculate percentages
  const top = ymin / 10;
  const left = xmin / 10;
  const bottom = (1000 - ymax) / 10;
  const right = (1000 - xmax) / 10;

  // Calculate dimensions for better scaling
  const height = (ymax - ymin) / 10;
  const width = (xmax - xmin) / 10;

  return (
    <div className={`relative overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-sm transition-all hover:scale-[3] hover:z-50 hover:shadow-xl cursor-zoom-in ${className}`} style={{ height: '40px', width: '120px' }}>
      <img 
        src={imageUrl} 
        alt="Field Snapshot"
        className="absolute max-w-none transition-transform"
        style={{
          top: `-${top}%`,
          left: `-${left}%`,
          width: `${100 / (width / 100)}%`, // Scale width to make the snapshot fill the container
          height: `${100 / (height / 100)}%`, // Scale height
          transform: `translate(${-left * (100/width)}%, ${-top * (100/height)}%)`,
          // Simpler approach: use clip-path and absolute positioning
        }}
        // Re-thinking simpler CSS for cropping:
      />
      
      {/* Fallback to simple clip-path approach if transform is complex */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: `${100000 / (xmax - xmin)}% ${100000 / (ymax - ymin)}%`,
          backgroundPosition: `${(xmin / (1000 - (xmax - xmin))) * 100}% ${(ymin / (1000 - (ymax - ymin))) * 100}%`,
        }}
      />
    </div>
  );
}
