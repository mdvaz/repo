
import React from 'react';
import { GameState } from '../types';
import CardComponent from './CardComponent';

interface GameScreenProps {
  gameState: GameState;
  onAttributeSelect: (attributeKey: string) => void;
  onNextRound: () => void;
  onNewGame: () => void;
  onRevealAiChoice: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ gameState, onAttributeSelect, onNextRound, onNewGame, onRevealAiChoice }) => {
  const {
    playerCards,
    aiCards, // Representa las cartas del oponente (IA o jugador real)
    currentPlayerCard,
    currentAiCard, // Representa la carta del oponente
    round,
    isPlayerTurn,
    isComparing,
    selectedAttribute,
    aiChosenAttributeForRound, // Específico para IA
    roundMessage,
    activeMultiplayerGame, // Para saber si es multijugador
  } = gameState;

  let playerCardComparisonResult: 'win' | 'lose' | 'tie' | null = null;
  let opponentCardComparisonResult: 'win' | 'lose' | 'tie' | null = null;

  if (isComparing && selectedAttribute && currentPlayerCard && currentAiCard) {
    const playerValue = currentPlayerCard.attributes[selectedAttribute];
    const opponentValue = currentAiCard.attributes[selectedAttribute];
    if (playerValue > opponentValue) {
      playerCardComparisonResult = 'win';
      opponentCardComparisonResult = 'lose';
    } else if (opponentValue > playerValue) {
      playerCardComparisonResult = 'lose';
      opponentCardComparisonResult = 'win';
    } else {
      playerCardComparisonResult = 'tie';
      opponentCardComparisonResult = 'tie';
    }
  }

  const opponentName = activeMultiplayerGame ? activeMultiplayerGame.opponent_nickname : "IA";
  
  // En multijugador, la carta del oponente podría estar siempre oculta hasta la comparación,
  // o el backend podría gestionar su visibilidad.
  // Para la lógica local actual:
  const opponentCardAlwaysHiddenUntilCompare = !!activeMultiplayerGame; // Ejemplo: en multijugador, siempre oculta hasta comparar

  const opponentCardRevealed = isComparing || (!opponentCardAlwaysHiddenUntilCompare && !isPlayerTurn && !!aiChosenAttributeForRound && !activeMultiplayerGame);
  const opponentCardObscureAttributes = (!isComparing && !isPlayerTurn && !!aiChosenAttributeForRound && !activeMultiplayerGame) || (opponentCardAlwaysHiddenUntilCompare && !isComparing);


  return (
    <div className="animate-fadeIn p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mb-6">
        {/* Player Section */}
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-4 text-yellow-300">🎯 Tu Carta ({gameState.userNickname})</h2>
          <CardComponent
            card={currentPlayerCard}
            isPlayerCard={true}
            isSelectable={isPlayerTurn && !isComparing}
            onAttributeSelect={onAttributeSelect}
            revealed={true}
            selectedAttributeKey={selectedAttribute}
            comparisonResult={playerCardComparisonResult}
            obscureAttributes={false}
          />
        </div>

        {/* Game Stats */}
        <div className="flex flex-col items-center bg-white/10 backdrop-filter backdrop-blur-md rounded-xl p-6 shadow-lg order-first md:order-none min-h-[384px]">
          <h2 className="text-2xl font-bold mb-4 text-yellow-300">Estadísticas</h2>
          <div className="text-center mb-3">
            <div className="text-3xl font-bold text-yellow-400">{round}</div>
            <div className="text-sm opacity-80">Ronda</div>
          </div>
          <div className="text-center mb-3">
            <div className="text-3xl font-bold text-blue-400">{playerCards.length}</div>
            <div className="text-sm opacity-80">Tus Cartas</div>
          </div>
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-red-400">{aiCards.length}</div>
            <div className="text-sm opacity-80">Cartas {opponentName}</div>
          </div>
          <button
             onClick={onNewGame} // Debería llevar al lobby o a la selección de mazo
             className="mt-auto px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-full shadow-md
                        hover:from-gray-600 hover:to-gray-700 hover:scale-105 transform transition-all duration-300"
           >
             {activeMultiplayerGame ? "Abandonar Partida" : "Nueva Partida (vs IA)"}
           </button>
        </div>

        {/* Opponent Section */}
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-4 text-yellow-300">🤖 Carta {opponentName}</h2>
          <CardComponent
            card={currentAiCard} // currentAiCard representa la carta del oponente
            isPlayerCard={false}
            isSelectable={false} 
            onAttributeSelect={() => {}}
            // Lógica de revelación para el oponente:
            // Si es multijugador, podría estar siempre oculta hasta la comparación.
            // Si es IA, usa la lógica de aiChosenAttributeForRound.
            revealed={isComparing || (!activeMultiplayerGame && !isPlayerTurn && !aiChosenAttributeForRound && !isComparing) || (activeMultiplayerGame && isComparing) || (!activeMultiplayerGame && opponentCardRevealed)}
            selectedAttributeKey={selectedAttribute}
            comparisonResult={opponentCardComparisonResult}
            obscureAttributes={opponentCardObscureAttributes}
          />
        </div>
      </div>

      {/* Game Interaction Area */}
      <div className="text-center p-4 my-6 min-h-[100px]">
        {isComparing && roundMessage && (
          <div className={`p-4 rounded-xl shadow-lg backdrop-filter backdrop-blur-md
            ${playerCardComparisonResult === 'win' ? 'bg-green-500/20 border-2 border-green-400' : ''}
            ${playerCardComparisonResult === 'lose' ? 'bg-red-500/20 border-2 border-red-400' : ''}
            ${playerCardComparisonResult === 'tie' ? 'bg-gray-500/20 border-2 border-gray-400' : ''}
          `}>
            <h3 className="text-xl font-semibold mb-3">{roundMessage}</h3>
            <button
              onClick={onNextRound}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-full shadow-lg
                         hover:from-blue-600 hover:to-indigo-600 hover:scale-105 transform transition-all duration-300"
            >
              Siguiente Ronda
            </button>
          </div>
        )}

        {!isComparing && isPlayerTurn && (
          <h3 className="text-xl font-semibold text-yellow-200">Es tu turno. Elige un atributo.</h3>
        )}
        
        {/* Mensajes para el turno del oponente (IA o jugador real) */}
        {!isComparing && !isPlayerTurn && activeMultiplayerGame && (
          <h3 className="text-xl font-semibold text-purple-300">Turno de {opponentName}. Esperando su jugada...</h3>
        )}

        {!isComparing && !isPlayerTurn && !activeMultiplayerGame && !aiChosenAttributeForRound && ( // Solo para IA
          <h3 className="text-xl font-semibold text-purple-300">Turno de la IA. Pensando...</h3>
        )}

        {!isComparing && !isPlayerTurn && !activeMultiplayerGame && aiChosenAttributeForRound && ( // Solo para IA
          <div>
            <h3 className="text-xl font-semibold mb-4 text-purple-300">IA ha elegido un atributo. ¿Listo para el duelo?</h3>
            <button
              onClick={onRevealAiChoice}
              className="px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-full shadow-lg
                         hover:from-teal-600 hover:to-cyan-600 hover:scale-105 transform transition-all duration-300"
            >
              Revelar Duelo y Comparar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameScreen;
