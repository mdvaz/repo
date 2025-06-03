import React from 'react';

interface GameOverScreenProps {
  message: string | null;
  isPlayerWinner: boolean;
  onPlayAgain: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ message, isPlayerWinner, onPlayAgain }) => {
  if (!message) return null;

  return (
    <div className="animate-fadeIn p-4 flex flex-col items-center justify-center min-h-[60vh]">
      <div className={`p-8 md:p-12 rounded-xl shadow-2xl backdrop-filter backdrop-blur-lg text-center
                       max-w-lg w-full
                       ${isPlayerWinner ? 'bg-green-500/20 border-3 border-green-400' : 'bg-red-500/20 border-3 border-red-400'}`}>
        <h2 className={`text-4xl font-bold mb-6 ${isPlayerWinner ? 'text-green-300' : 'text-red-300'}`}>
          {isPlayerWinner ? '🎉 ¡VICTORIA! 🎉' : '😔 DERROTA 😔'}
        </h2>
        <p className="text-lg mb-8 opacity-90">{message}</p>
        <button
          onClick={onPlayAgain}
          className="px-10 py-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 font-bold text-lg rounded-full shadow-xl
                     hover:from-yellow-500 hover:to-amber-600 hover:scale-105 transform transition-all duration-300"
        >
          Jugar de Nuevo
        </button>
      </div>
    </div>
  );
};

export default GameOverScreen;
