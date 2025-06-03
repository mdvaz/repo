import React from 'react';
import { AttributeDisplayInfo } from '../types';

interface AttributeItemProps {
  attribute: AttributeDisplayInfo;
  isSelectable: boolean;
  onSelect: (attributeKey: string) => void;
}

const AttributeItem: React.FC<AttributeItemProps> = ({ attribute, isSelectable, onSelect }) => {
  const baseClasses = "flex justify-between items-center p-2 my-1 rounded-lg transition-all duration-300 ease-in-out text-sm";
  const selectableClasses = isSelectable ? "cursor-pointer hover:bg-yellow-400/30 hover:scale-105 border-l-4 border-transparent hover:border-yellow-400" : "cursor-default";
  const winnerClasses = attribute.isWinner ? "bg-green-500/30 border-l-4 border-green-500 animate-pulse-strong" : "";
  const loserClasses = attribute.isLoser ? "bg-red-500/30 border-l-4 border-red-500" : "";

  return (
    <div
      className={`${baseClasses} ${selectableClasses} ${winnerClasses} ${loserClasses} bg-white/10`}
      onClick={() => isSelectable && onSelect(attribute.key)}
      role={isSelectable ? "button" : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      onKeyPress={isSelectable ? (e) => e.key === 'Enter' && onSelect(attribute.key) : undefined}
    >
      <span>{attribute.name}</span>
      <span className="font-bold">{attribute.value}</span>
    </div>
  );
};

export default AttributeItem;
