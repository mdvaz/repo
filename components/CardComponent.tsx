import React from 'react';
import { Card, AttributeDisplayInfo } from '../types';
import AttributeItem from './AttributeItem';

interface CardComponentProps {
  card: Card | null;
  isPlayerCard: boolean;
  isSelectable: boolean; 
  onAttributeSelect: (attributeKey: string) => void;
  revealed: boolean; 
  selectedAttributeKey?: string | null;
  comparisonResult?: 'win' | 'lose' | 'tie' | null;
  obscureAttributes?: boolean; // Nueva prop
}

const CardComponent: React.FC<CardComponentProps> = ({
  card,
  isPlayerCard,
  isSelectable,
  onAttributeSelect,
  revealed,
  selectedAttributeKey,
  comparisonResult,
  obscureAttributes = false, // Default to false
}) => {
  if (!card) {
    return (
      <div className="w-full max-w-xs mx-auto bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-5 shadow-xl border-2 border-gray-600 flex flex-col items-center justify-center h-96 min-h-[384px]"> {/* Added min-h */}
        <p className="text-gray-400">No card</p>
      </div>
    );
  }

  if (!revealed) {
    return (
      <div className="w-full max-w-xs mx-auto bg-gradient-to-br from-purple-700 to-purple-900 rounded-xl p-5 shadow-xl border-2 border-purple-500 flex flex-col items-center justify-center h-96 min-h-[384px]"> {/* Added min-h */}
        <div className="w-full h-36 bg-purple-600 rounded-lg mb-4 flex items-center justify-center text-5xl text-white">❓</div>
        <div className="text-xl font-bold mb-3 text-yellow-300">Carta Oculta</div>
        {!isPlayerCard && (
            <p className="text-center text-sm opacity-70 px-2">
                La IA está pensando... Su carta se mostrará pronto.
            </p>
        )}
      </div>
    );
  }
  
  const attributesToDisplay: AttributeDisplayInfo[] = Object.entries(card.attributes).map(([key, value]) => {
    let displayInfo: AttributeDisplayInfo = { 
        key, 
        name: key, 
        value: obscureAttributes ? "???" : value // Mostrar "???" si obscureAttributes es true
    };
    if (key === selectedAttributeKey && !obscureAttributes) { // Solo aplicar resultado si no están ocultos
      if (comparisonResult === 'win') displayInfo.isWinner = true;
      else if (comparisonResult === 'lose') displayInfo.isLoser = true;
    }
    return displayInfo;
  });

  return (
    <div className={`w-full max-w-xs mx-auto bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl p-5 shadow-xl border-2 ${isPlayerCard ? 'border-blue-400' : 'border-red-400'} transition-all duration-300 hover:shadow-2xl hover:scale-105 h-auto min-h-[384px] flex flex-col`}> {/* Added min-h and flex structure */}
      <div className="w-full h-36 bg-gradient-to-r from-slate-600 to-slate-800 rounded-lg mb-4 flex items-center justify-center text-6xl shrink-0">
        {card.icon}
      </div>
      <div className="text-xl font-bold mb-3 text-center text-yellow-300 shrink-0">{card.name}</div>
      <div className="space-y-1 flex-grow">
        {attributesToDisplay.map((attr) => (
          <AttributeItem
            key={attr.key}
            attribute={attr}
            isSelectable={isSelectable && isPlayerCard && !obscureAttributes} // No se puede seleccionar si los atributos están ocultos
            onSelect={onAttributeSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default CardComponent;