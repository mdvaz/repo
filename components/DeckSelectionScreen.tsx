import React, { useState } from 'react';
import { Deck } from '../types';

interface DeckSelectionScreenProps {
  availableDecks: Deck[];
  onDeckSelect: (deck: Deck) => void;
  onStartGame: () => void;
  selectedDeckId: string | null;
  onGenerateDeck: (theme: string) => Promise<void>;
  isGeneratingDeck: boolean;
  generationError: string | null;
}

const DeckSelectionScreen: React.FC<DeckSelectionScreenProps> = ({
  availableDecks,
  onDeckSelect,
  onStartGame,
  selectedDeckId,
  onGenerateDeck,
  isGeneratingDeck,
  generationError,
}) => {
  const [themeInput, setThemeInput] = useState('');

  const handleGenerateClick = () => {
    if (themeInput.trim()) {
      onGenerateDeck(themeInput.trim());
    }
  };

  return (
    <div className="animate-fadeIn p-4">
      <h2 className="text-3xl font-bold text-center mb-8 text-yellow-300">Selecciona o Crea tu Mazo</h2>

      {/* Deck Generation Section */}
      <div className="mb-10 p-6 bg-white/5 backdrop-filter backdrop-blur-md rounded-xl shadow-lg border border-purple-400/50">
        <h3 className="text-2xl font-semibold mb-4 text-purple-300">Crear Mazo con IA</h3>
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <input
            type="text"
            value={themeInput}
            onChange={(e) => setThemeInput(e.target.value)}
            placeholder="Escribe una temática (ej: Piratas, Espacio, Dinosaurios)"
            className="flex-grow p-3 rounded-lg bg-slate-700/50 border border-slate-600 focus:ring-2 focus:ring-purple-400 outline-none transition-all"
            disabled={isGeneratingDeck}
          />
          <button
            onClick={handleGenerateClick}
            disabled={isGeneratingDeck || !themeInput.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-lg shadow-md
                       hover:from-purple-600 hover:to-indigo-600 hover:scale-105 transform transition-all duration-300
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
          >
            {isGeneratingDeck ? (
              <>
                <span className="spinner mr-2"></span> Generando...
              </>
            ) : (
              "Crear Mazo (40 cartas)"
            )}
          </button>
        </div>
        {generationError && <p className="text-red-400 text-sm mt-2">{generationError}</p>}
         <p className="text-xs opacity-70 mt-1">La IA generará un mazo de 40 cartas con atributos y nombres únicos basados en tu temática.</p>
      </div>

      {/* Deck Selection List */}
      {availableDecks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {availableDecks.map((deck) => (
            <div
              key={deck.id}
              className={`p-6 rounded-xl shadow-lg cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl
                          bg-white/10 backdrop-filter backdrop-blur-md border-2 
                          ${selectedDeckId === deck.id ? 'border-yellow-400 bg-yellow-400/20 scale-105' : 'border-transparent hover:border-sky-400'}`}
              onClick={() => onDeckSelect(deck)}
              onKeyPress={(e) => e.key === 'Enter' && onDeckSelect(deck)}
              tabIndex={0}
              role="button"
              aria-pressed={selectedDeckId === deck.id}
            >
              <h3 className="text-2xl font-semibold mb-2 text-yellow-300">{deck.name}</h3>
              <p className="text-sm opacity-80 mb-3 h-12 overflow-hidden">{deck.description}</p> {/* Fixed height for description */}
              <p className="font-semibold text-sm">{deck.cards.length} cartas</p>
            </div>
          ))}
        </div>
      ) : (
        !isGeneratingDeck && (
          <p className="text-center text-xl opacity-80 my-10">
            No hay mazos disponibles. ¡Intenta crear uno con la IA!
          </p>
        )
      )}
      
      <div className="text-center">
        <button
          onClick={onStartGame}
          disabled={!selectedDeckId || isGeneratingDeck}
          className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-full shadow-lg
                     hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform transition-all duration-300
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          Comenzar Partida
        </button>
      </div>
    </div>
  );
};

export default DeckSelectionScreen;