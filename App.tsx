
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScreenView, GameState, Card, Deck, LobbyPlayer, AppSocket } from './types';
import { TOTAL_ROUNDS, AI_THINKING_TIME_MS, TARGET_CARDS_PER_PLAYER } from './constants';
import NicknameScreen from './components/NicknameScreen';
import LobbyScreen from './components/LobbyScreen';
import DeckSelectionScreen from './components/DeckSelectionScreen';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';
import FloatingParticles from './components/FloatingParticles';
import { GoogleGenAI } from "@google/genai";
import { io } from 'socket.io-client';

// Helper function to shuffle an array
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Backend URL
const SOCKET_SERVER_URL = 'http://186.158.12.129:8000'; 

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenView>('nickname');
  const [gameState, setGameState] = useState<GameState>({
    userNickname: null,
    userId: null,
    socket: null,
    isConnected: false,
    serverMessage: null,
    lobbyPlayers: [],
    incomingInvite: null,
    sentInviteStatus: null,
    activeMultiplayerGame: null,
    availableDecks: [],
    selectedDeck: null,
    playerCards: [],
    aiCards: [],
    currentPlayerCard: null,
    currentAiCard: null,
    round: 1,
    playerRoundWins: 0,
    aiRoundWins: 0,
    isPlayerTurn: true,
    isComparing: false,
    selectedAttribute: null,
    aiChosenAttributeForRound: null,
    roundMessage: null,
    gameOver: false,
    gameWinnerMessage: null,
  });
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const geminiAI = useMemo(() => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("API Key de Gemini no encontrada. La generación de mazos no funcionará.");
      return null;
    }
    try {
      return new GoogleGenAI({ apiKey });
    } catch (e) {
      console.error("Error inicializando GoogleGenAI:", e);
      setGameState(prev => ({ ...prev, serverMessage: "Error inicializando IA para generar mazos." }));
      return null;
    }
  }, []);

  // Efecto para manejar la conexión Socket.IO
  useEffect(() => {
    if (gameState.userNickname && !gameState.socket) {
      console.log(`[SocketIO] Nickname: ${gameState.userNickname} - No socket. Attempting connection to URL: ${SOCKET_SERVER_URL}`);
      setGameState(prev => ({ ...prev, serverMessage: `Intentando conectar a ${SOCKET_SERVER_URL}...` }));

      const newSocketInstance: AppSocket = io(SOCKET_SERVER_URL, {
        reconnectionAttempts: 3,
        timeout: 20000, // Increased timeout for diagnostics
        transports: ['websocket'], 
      });

      newSocketInstance.on('connect', () => {
        console.log('[SocketIO] Event: connect - Successfully connected. Socket ID:', newSocketInstance.id);
        setGameState(prev => {
          const nicknameToRegister = prev.userNickname; 
          if (nicknameToRegister) {
            console.log('[SocketIO] Emitting register_user with nickname:', nicknameToRegister);
            newSocketInstance.emit('register_user', { nickname: nicknameToRegister });
          }
          return {
            ...prev,
            socket: newSocketInstance, 
            isConnected: true, 
            serverMessage: "Conectado. Registrando usuario...",
          };
        });
      });

      newSocketInstance.on('disconnect', (reason) => {
        console.warn('[SocketIO] Event: disconnect - Reason:', reason);
        setGameState(prev => ({
          ...prev,
          isConnected: false,
          serverMessage: `Desconectado: ${reason}. Intenta cambiar apodo para reconectar.`,
          socket: null, 
          lobbyPlayers: [],
          activeMultiplayerGame: null,
          incomingInvite: null,
          sentInviteStatus: null,
        }));
      });

      newSocketInstance.on('connect_error', (err: any) => { // Added 'any' type for err for robust handling
        console.error('[SocketIO] Event: connect_error - Raw Error Object:', err);
        let specificMessage = "Error de conexión WebSocket desconocido.";
        let userHint = `Verifica que el servidor (${SOCKET_SERVER_URL}) esté online y accesible.`;

        if (typeof err === 'object' && err !== null && 'message' in err) {
            const messageValue = err.message; // Access message property
            if (typeof messageValue === 'string') { // Check if it's a string
                const errMsg = messageValue.toLowerCase(); // Safely call toLowerCase
                if (errMsg.includes("timeout")) {
                    specificMessage = "Error de conexión: Tiempo de espera agotado al intentar conectar con el servidor vía WebSocket.";
                    userHint += " Si este problema persiste, es probable que haya un problema con el servidor, la red, un firewall o una configuración de proxy que impide las conexiones WebSocket.";
                } else {
                    specificMessage = `Error de conexión WebSocket: ${messageValue}.`;
                }
            } else {
                // err.message exists but is not a string
                specificMessage = `Error de conexión WebSocket: El mensaje de error (tipo: ${typeof messageValue}) no es un texto válido.`;
            }
        } else if (typeof err === 'string') { // Error might be a string itself
            const errMsg = err.toLowerCase(); // Safely call toLowerCase
            if (errMsg.includes("timeout")) {
                specificMessage = "Error de conexión: Tiempo de espera agotado al intentar conectar con el servidor vía WebSocket.";
                userHint += " Si este problema persiste, es probable que haya un problema con el servidor, la red, un firewall o una configuración de proxy que impide las conexiones WebSocket.";
            } else {
                specificMessage = `Error de conexión WebSocket: ${err}.`;
            }
        }
        // If err is neither an object with a message nor a string, specificMessage will retain its default
        // or you can add another else here for more specific handling of other error types.
        
        setGameState(prev => ({
            ...prev,
            isConnected: false,
            serverMessage: `${specificMessage} ${userHint}`,
            socket: null, 
        }));
      });

      newSocketInstance.on('user_registered', (data) => {
        console.log('[SocketIO] Event: user_registered - Data:', data);
        setGameState(prev => ({
          ...prev,
          userId: data.user_id, // Use user_id from backend
          userNickname: data.nickname, 
          lobbyPlayers: data.lobby_players, // Backend already excludes self
          isConnected: true, 
          serverMessage: `Registrado como ${data.nickname}. ¡Bienvenido al lobby!`
        }));
        setCurrentScreen('lobby');
      });
      
      newSocketInstance.on('lobby_update', (data) => {
        console.log('[SocketIO] Event: lobby_update - Data:', data);
        setGameState(prev => ({ ...prev, lobbyPlayers: data.lobby_players })); // Backend already excludes self
      });

      newSocketInstance.on('receive_invitation', (data) => {
        console.log('[SocketIO] Event: receive_invitation - Data:', data);
        setGameState(prev => {
            if (data.inviter_id === prev.userId) return prev; 
            return { ...prev, incomingInvite: data, serverMessage: `${data.inviter_nickname} te ha invitado a jugar.` };
        });
      });
      
      newSocketInstance.on('invitation_sent_confirmation', (data) => {
        console.log('[SocketIO] Event: invitation_sent_confirmation - Data:', data);
        setGameState(prev => ({
          ...prev,
          sentInviteStatus: { 
            invitee_id: data.invitee_id, 
            status: 'pending', 
            message: `Invitación enviada a ${data.invitee_nickname}. Esperando respuesta...`,
            game_id_proposal: data.game_id_proposal 
          }
        }));
      });


      newSocketInstance.on('invitation_response', (data) => {
        console.log('[SocketIO] Event: invitation_response - Data:', data);
        if (data.accepted) {
            setGameState(prev => ({ ...prev, sentInviteStatus: { invitee_id: data.invitee_id, status: 'accepted', message: `${data.invitee_nickname} aceptó tu invitación.`, game_id_proposal: data.game_id }}));
        } else {
            setGameState(prev => ({ 
                ...prev, 
                sentInviteStatus: { 
                    invitee_id: data.invitee_id, 
                    status: 'declined', 
                    message: `${data.invitee_nickname} rechazó tu invitación. ${data.message || ''}`,
                    game_id_proposal: data.game_id
                }
            }));
            setTimeout(() => setGameState(prev => ({ ...prev, sentInviteStatus: null })), 5000);
        }
      });
      
      newSocketInstance.on('invitation_cancelled_update', (data) => {
        console.log('[SocketIO] Event: invitation_cancelled_update - Data:', data);
        setGameState(prev => {
          // Si yo era el invitado y el invitador canceló
          if (prev.incomingInvite && prev.incomingInvite.inviter_id === data.inviter_id) {
            return { ...prev, incomingInvite: null, serverMessage: `La invitación de ${prev.incomingInvite.inviter_nickname} fue cancelada: ${data.reason}` };
          }
          // Si yo era el invitador y cancelé (o el invitado la canceló indirectamente - ej. desconexión)
          if (prev.sentInviteStatus && prev.sentInviteStatus.invitee_id === data.invitee_id) {
            return { ...prev, sentInviteStatus: { ...prev.sentInviteStatus, status: 'cancelled', message: data.reason } };
          }
          return prev;
        });
      });

      newSocketInstance.on('invitation_expired', (data) => {
        console.log('[SocketIO] Event: invitation_expired - Data:', data);
        setGameState(prev => {
            if (prev.incomingInvite && prev.incomingInvite.inviter_id === data.other_user_id) {
                return { ...prev, incomingInvite: null, serverMessage: "La invitación de juego ha expirado." };
            }
            if (prev.sentInviteStatus && prev.sentInviteStatus.invitee_id === data.other_user_id) {
                return { ...prev, sentInviteStatus: { ...prev.sentInviteStatus, status: 'expired', message: 'La invitación enviada ha expirado.' }};
            }
            return prev;
        });
      });

      newSocketInstance.on('start_game', (data) => {
        console.log('[SocketIO] Event: start_game - Data:', data);
        setGameState(prev => ({
            ...prev,
            activeMultiplayerGame: {
            game_id: data.game_id,
            opponent_id: data.opponent_id,
            opponent_nickname: data.opponent_nickname,
            i_am_player1: data.i_am_player1,
            isMyTurn: data.i_am_player1, // El jugador 1 inicia
            },
            incomingInvite: null,
            sentInviteStatus: null,
            serverMessage: `¡Partida contra ${data.opponent_nickname} comenzará!`
        }));
        setCurrentScreen('deckSelection');
      });

      newSocketInstance.on('error_message', (data) => {
        console.error('[SocketIO] Event: error_message - Data:', data);
        setGameState(prev => ({ ...prev, serverMessage: `Error del servidor: ${data.message}` }));
        if (data.message.includes("invitación") || data.message.includes("invitado")) {
            setGameState(prev => ({ ...prev, sentInviteStatus: { invitee_id: prev.sentInviteStatus?.invitee_id || '', status: 'error', message: data.message, game_id_proposal: prev.sentInviteStatus?.game_id_proposal }}));
        }
      });
      
      newSocketInstance.on('game_terminated_by_disconnect', (data) => {
        console.warn('[SocketIO] Event: game_terminated_by_disconnect - Data:', data);
        const userIsStillInThatGame = gameState.activeMultiplayerGame?.game_id === data.game_id;
        if (userIsStillInThatGame) {
            setGameState(prev => ({
                ...prev,
                activeMultiplayerGame: null,
                serverMessage: `Partida abortada: ${data.disconnected_player_nickname} se desconectó.`,
                gameOver: true, // End current game screen if active
                gameWinnerMessage: `Partida abortada: ${data.disconnected_player_nickname} se desconectó. Vuelves al lobby.`,
            }));
            setCurrentScreen('lobby');
        }
      });
      
      newSocketInstance.on('opponent_left_game', (data) => {
        console.warn('[SocketIO] Event: opponent_left_game - Data:', data);
        const userIsStillInThatGame = gameState.activeMultiplayerGame?.game_id === data.game_id;
        if (userIsStillInThatGame) {
            setGameState(prev => ({
                ...prev,
                activeMultiplayerGame: null,
                serverMessage: `Partida terminada: ${data.opponent_nickname} ha dejado la partida.`,
                gameOver: true, 
                gameWinnerMessage: `Partida terminada: ${data.opponent_nickname} ha dejado la partida. Vuelves al lobby.`,
            }));
            setCurrentScreen('lobby');
        }
      });


      return () => {
        console.log('[SocketIO] Cleanup effect: Disconnecting socket for nickname', gameState.userNickname);
        newSocketInstance.removeAllListeners();
        newSocketInstance.disconnect();
      };
    } else if (!gameState.userNickname && gameState.socket) {
      console.log('[SocketIO] Nickname cleared, active socket exists. Disconnecting.');
      gameState.socket.disconnect();
      setGameState(prev => ({...prev, socket: null, isConnected: false}));
    }
  }, [gameState.userNickname, gameState.socket]); // gameState.socket dependency to re-run if socket becomes null


  const handleNicknameSubmit = useCallback((nickname: string) => {
    if (!nickname.trim()) return;
    localStorage.setItem('userNickname', nickname);
    setGameState(prev => ({ // Reset socket-related state for a fresh connection attempt
        ...prev,
        userNickname: nickname,
        userId: null, 
        socket: null, 
        isConnected: false,
        serverMessage: "Procesando apodo...", 
        lobbyPlayers: [],
        activeMultiplayerGame: null,
        incomingInvite: null,
        sentInviteStatus: null,
    }));
    // setCurrentScreen will be handled by user_registered or connect_error
  }, []);

  const handleChangeNickname = useCallback(() => {
    localStorage.removeItem('userNickname');
    setGameState(prev => ({
      ...prev,
      userNickname: null, 
      userId: null,
      lobbyPlayers: [],
      activeMultiplayerGame: null,
      incomingInvite: null,
      sentInviteStatus: null,
      serverMessage: "Apodo eliminado. Ingresa uno nuevo.",
      // socket will be disconnected by the useEffect due to userNickname becoming null
    }));
    setCurrentScreen('nickname');
  }, []);

  const handleInvitePlayer = useCallback((invitee_user_id: string) => {
    if (gameState.socket && gameState.isConnected) {
      console.log('[SocketIO] Emitting send_invitation to user_id:', invitee_user_id);
      gameState.socket.emit('send_invitation', { invitee_id: invitee_user_id });
      // Don't set sentInviteStatus here; wait for 'invitation_sent_confirmation'
    } else {
      setGameState(prev => ({ ...prev, serverMessage: "No conectado al servidor para enviar invitación." }));
      console.warn('[SocketIO] Attempted to send invitation while not connected.');
    }
  }, [gameState.socket, gameState.isConnected]);

  const handleRespondToInvite = useCallback((accepted: boolean) => {
    if (gameState.socket && gameState.isConnected && gameState.incomingInvite) {
      console.log('[SocketIO] Emitting respond_to_invitation. Accepted:', accepted, 'Inviter ID:', gameState.incomingInvite.inviter_id, 'Game ID:', gameState.incomingInvite.game_id);
      gameState.socket.emit('respond_to_invitation', {
        inviter_id: gameState.incomingInvite.inviter_id,
        game_id: gameState.incomingInvite.game_id,
        accepted,
      });
      setGameState(prev => ({ ...prev, incomingInvite: null, serverMessage: accepted ? "Invitación aceptada." : "Invitación rechazada." }));
    } else {
        console.warn('[SocketIO] Cannot respond to invite. Socket:', gameState.socket, 'Connected:', gameState.isConnected, 'Invite:', gameState.incomingInvite);
    }
  }, [gameState.socket, gameState.isConnected, gameState.incomingInvite]);
  
  const handleCancelSentInvite = useCallback((invitee_user_id: string) => {
    if (gameState.socket && gameState.isConnected && gameState.sentInviteStatus && gameState.sentInviteStatus.invitee_id === invitee_user_id && gameState.sentInviteStatus.status === 'pending') {
        console.log('[SocketIO] Emitting cancel_invitation for invitee_id:', invitee_user_id);
        // El backend espera un objeto vacío o con `invitee_id` si es específico
        // Para la lógica actual del backend que usa el inviter_id para buscar, un data vacío es suficiente
        // o podrías enviar `game_id_proposal` si lo tienes y el backend lo usa.
        gameState.socket.emit('cancel_invitation', {}); 
        setGameState(prev => ({ ...prev, sentInviteStatus: null, serverMessage: `Cancelando invitación a ${invitee_user_id}...` }));
    } else {
        setGameState(prev => ({ ...prev, serverMessage: "No se puede cancelar la invitación." }));
    }
  }, [gameState.socket, gameState.isConnected, gameState.sentInviteStatus]);


  const resetGameStateForNewGame = useCallback((deck: Deck | null = gameState.selectedDeck) => {
    setGameState(prev => ({
      ...prev,
      selectedDeck: deck, 
      playerCards: [],
      aiCards: [],
      currentPlayerCard: null,
      currentAiCard: null,
      round: 1,
      playerRoundWins: 0,
      aiRoundWins: 0,
      isPlayerTurn: prev.activeMultiplayerGame ? (prev.activeMultiplayerGame.i_am_player1 === true) : true,
      isComparing: false,
      selectedAttribute: null,
      aiChosenAttributeForRound: null,
      roundMessage: null,
      gameOver: false,
      gameWinnerMessage: null,
    }));
  }, [gameState.selectedDeck, gameState.activeMultiplayerGame]);

  const handleDeckSelect = (deck: Deck) => {
    setGameState(prev => ({ ...prev, selectedDeck: deck }));
  };

  const handleGenerateDeck = async (theme: string) => {
    if (!geminiAI) {
      setGenerationError("Error de configuración: No se pudo inicializar el cliente de IA Gemini. Verifica la API Key.");
      setIsGeneratingDeck(false);
      return;
    }
    if (!theme.trim()) {
      setGenerationError("Por favor, introduce una temática para el mazo.");
      setIsGeneratingDeck(false);
      return;
    }
    setIsGeneratingDeck(true);
    setGenerationError(null);

    const prompt = `
Eres un asistente creativo experto en diseñar cartas para juegos de mesa.
Tu tarea es generar un mazo de 40 cartas únicas para un juego de atributos basado en la temática proporcionada.
Temática: "${theme}"
Instrucciones:
1. Mazo de 40 cartas únicas.
2. Cada carta: \`name\` (string), \`icon\` (emoji string), \`attributes\` (object con 4 pares clave-valor).
3. Los 4 nombres de atributos (claves) deben ser los MISMOS para TODAS las 40 cartas. Incluye unidades (ej: "Velocidad (km/h)").
4. Valores de atributos: números enteros entre 20 y 100.
5. Mazo completo: \`id\` (string único), \`name\` (string " Emoji Mazo de ${theme}"), \`description\` (string).
Formato de Respuesta OBLIGATORIO: JSON ÚNICAMENTE.
{
  "id": "mazo-${theme.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}",
  "name": "✨ Mazo de ${theme}",
  "description": "Un mazo de 40 cartas sobre ${theme}, generado por IA.",
  "cards": [ { "name": "Carta 1", "icon": "⭐", "attributes": { "Atr1 (Unidad)": 50, "Atr2": 60, "Atr3": 70, "Atr4": 80 } } /* ...39 más */ ]
}`;

    try {
      const response = await geminiAI.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json", temperature: 0.7 },
      });
      
      let jsonStr = response.text.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) jsonStr = match[2].trim();
      const generatedDeck = JSON.parse(jsonStr) as Deck;

      if (!generatedDeck.id || !generatedDeck.name || !generatedDeck.cards || generatedDeck.cards.length !== TARGET_CARDS_PER_PLAYER * 2) {
        throw new Error(`La IA generó un mazo con estructura incorrecta o número incorrecto de cartas (${generatedDeck.cards?.length || 0}). Se esperaban ${TARGET_CARDS_PER_PLAYER * 2}.`);
      }
      generatedDeck.id = `deck-${theme.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      setGameState(prev => ({ ...prev, availableDecks: [...prev.availableDecks, generatedDeck] }));
    } catch (error: any) {
      console.error("Error generando el mazo:", error);
      setGenerationError(`Error al generar: ${error.message || "Respuesta inesperada."}.`);
    } finally {
      setIsGeneratingDeck(false);
    }
  };

  const startGameAgainstAI = useCallback(() => {
    if (!gameState.selectedDeck) {
         setGameState(prev => ({ ...prev, serverMessage: "Selecciona un mazo para jugar contra la IA."}));
         setCurrentScreen('deckSelection');
        return;
    }
    setGameState(prev => ({ ...prev, activeMultiplayerGame: null })); // Ensure not in MP mode
    resetGameStateForNewGame(gameState.selectedDeck);

    const selectedDeckData = gameState.selectedDeck;
    const shuffled = shuffleArray(selectedDeckData.cards);
    
    let pCards: Card[], aCards: Card[];
    const minCardsForTargetDeal = TARGET_CARDS_PER_PLAYER * 2;

    if (shuffled.length < 2) {
        alert("El mazo seleccionado es demasiado pequeño (necesita al menos 2 cartas).");
        setCurrentScreen('deckSelection'); return;
    }
    if (shuffled.length >= minCardsForTargetDeal) {
      pCards = shuffled.slice(0, TARGET_CARDS_PER_PLAYER);
      aCards = shuffled.slice(TARGET_CARDS_PER_PLAYER, minCardsForTargetDeal);
    } else {
      const cardsPerPlayer = Math.floor(shuffled.length / 2);
      pCards = shuffled.slice(0, cardsPerPlayer);
      aCards = shuffled.slice(cardsPerPlayer, cardsPerPlayer * 2);
      alert(`Mazo con ${shuffled.length} cartas. Se repartirán ${cardsPerPlayer} a cada uno.`);
    }
    if (pCards.length === 0 || aCards.length === 0 ) { 
        alert("Error al repartir cartas."); setCurrentScreen('deckSelection'); resetGameStateForNewGame(null); return;
    }
    setGameState(prev => ({ ...prev, playerCards: pCards, aiCards: aCards, currentPlayerCard: pCards[0] || null, currentAiCard: aCards[0] || null, isPlayerTurn: true, round: 1 }));
    setCurrentScreen('game');
  }, [gameState.selectedDeck, resetGameStateForNewGame]);
  
  const initializeAndStartGame = useCallback(() => { // Called for AI or MP
    if (!gameState.selectedDeck) {
        setGameState(prev => ({ ...prev, serverMessage: "Error: No se ha seleccionado un mazo para la partida."}));
        setCurrentScreen('deckSelection');
        return;
    }
    resetGameStateForNewGame(gameState.selectedDeck);
    const selectedDeckData = gameState.selectedDeck;
    const shuffled = shuffleArray(selectedDeckData.cards);
    
    let pCards: Card[], opponentCards: Card[];
    const minCardsForTargetDeal = TARGET_CARDS_PER_PLAYER * 2;

    if (shuffled.length < 2) { 
        alert("El mazo seleccionado es demasiado pequeño (necesita al menos 2 cartas).");
        setCurrentScreen('deckSelection'); return;
    }
    if (shuffled.length >= minCardsForTargetDeal) {
      pCards = shuffled.slice(0, TARGET_CARDS_PER_PLAYER);
      opponentCards = shuffled.slice(TARGET_CARDS_PER_PLAYER, minCardsForTargetDeal);
    } else {
      const cardsPerPlayer = Math.floor(shuffled.length / 2);
      pCards = shuffled.slice(0, cardsPerPlayer);
      opponentCards = shuffled.slice(cardsPerPlayer, cardsPerPlayer * 2);
      alert(`Mazo con ${shuffled.length} cartas. Se repartirán ${cardsPerPlayer} a cada uno.`);
    }
     if (pCards.length === 0 || opponentCards.length === 0 ) { 
        alert("Error al repartir cartas."); setCurrentScreen('deckSelection'); resetGameStateForNewGame(null); return;
    }
    
    const initialPlayerTurn = gameState.activeMultiplayerGame ? (gameState.activeMultiplayerGame.i_am_player1 === true) : true;

    setGameState(prev => ({ 
        ...prev, 
        playerCards: pCards, 
        aiCards: opponentCards, // For AI, these are AI's cards. For MP, these are opponent's cards (if local game logic)
        currentPlayerCard: pCards[0] || null, 
        currentAiCard: opponentCards[0] || null, // Represents opponent's card
        isPlayerTurn: initialPlayerTurn, 
        round: 1 
    }));
    setCurrentScreen('game');
  }, [gameState.selectedDeck, gameState.activeMultiplayerGame, resetGameStateForNewGame]);


  const processRoundEnd = useCallback(() => {
    setGameState(prev => {
      if (prev.gameOver) return prev;
      
      let newPlayerCards = [...prev.playerCards];
      let newOpponentCards = [...prev.aiCards];
      let nextPlayerTurn = prev.isPlayerTurn; 
      let roundMsg = "";
      let playerRoundWins = prev.playerRoundWins;
      let opponentRoundWins = prev.aiRoundWins;
      
      const pCard = prev.currentPlayerCard;
      const oCard = prev.currentAiCard;
      const attr = prev.selectedAttribute;

      let playerValue: number = 0;
      let opponentValue: number = 0;

      if (pCard && oCard && attr) {
        playerValue = pCard.attributes[attr];
        opponentValue = oCard.attributes[attr];
        
        const playedPlayerCard = newPlayerCards.shift();
        const playedOpponentCard = newOpponentCards.shift();

        if (playedPlayerCard && playedOpponentCard) {
            if (playerValue > opponentValue) {
                newPlayerCards.push(playedPlayerCard, playedOpponentCard);
                nextPlayerTurn = true; 
                roundMsg = `¡Ganaste! ${attr.split('(')[0].trim()} (${playerValue}) > (${opponentValue}).`;
                playerRoundWins++;
            } else if (opponentValue > playerValue) {
                newOpponentCards.push(playedOpponentCard, playedPlayerCard);
                nextPlayerTurn = false; 
                roundMsg = `${prev.activeMultiplayerGame ? prev.activeMultiplayerGame.opponent_nickname : 'IA'} ganó. ${attr.split('(')[0].trim()} (${opponentValue}) > (${playerValue}).`;
                opponentRoundWins++;
            } else { // Tie
                newPlayerCards.push(playedPlayerCard);
                newOpponentCards.push(playedOpponentCard);
                // En caso de empate, si es multijugador, el turno alterna basado en quién NO era P1 originalmente,
                // o si es IA, el turno simplemente alterna.
                // Para mantener consistencia, si el P1 empató, el P2 (o IA) debería jugar.
                nextPlayerTurn = prev.activeMultiplayerGame ? !(prev.activeMultiplayerGame.i_am_player1 === true) : !prev.isPlayerTurn;

                roundMsg = `¡Empate! ${attr.split('(')[0].trim()} (${playerValue}).`;
            }
        } else {
            roundMsg = "Error al procesar cartas.";
        }
      } else {
        roundMsg = "Error: Faltan cartas o atributo seleccionado para comparar.";
      }
      
      let isGameOver = false;
      let winnerMsg = "";
      const opponentName = prev.activeMultiplayerGame ? prev.activeMultiplayerGame.opponent_nickname : 'IA';

      if (newPlayerCards.length === 0) {
        isGameOver = true;
        winnerMsg = `¡${opponentName} ganó todas tus cartas!`;
      } else if (newOpponentCards.length === 0) {
        isGameOver = true;
        winnerMsg = `¡Ganaste todas las cartas de ${opponentName}!`;
      } else if (prev.round >= TOTAL_ROUNDS) {
        isGameOver = true;
        if (newPlayerCards.length > newOpponentCards.length) {
          winnerMsg = `¡Ganaste por puntos! (${newPlayerCards.length} vs ${newOpponentCards.length})`;
        } else if (newOpponentCards.length > newPlayerCards.length) {
          winnerMsg = `${opponentName} ganó por puntos. (${newOpponentCards.length} vs ${newPlayerCards.length})`;
        } else {
          winnerMsg = `¡Empate por puntos! (${newPlayerCards.length} vs ${newPlayerCards.length})`;
        }
      }
      
      if (isGameOver) {
        setCurrentScreen('gameOver');
        if(prev.socket && prev.activeMultiplayerGame){ // Informar al servidor que el juego terminó para este cliente
            prev.socket.emit('leave_game_lobby', { game_id: prev.activeMultiplayerGame.game_id });
        }
      }
      
      // Si es multijugador, el estado de isPlayerTurn se actualiza basado en quién es P1 y el resultado de la ronda.
      const actualNextPlayerTurn = prev.activeMultiplayerGame 
                                    ? (nextPlayerTurn ? prev.activeMultiplayerGame.i_am_player1 === true : prev.activeMultiplayerGame.i_am_player1 === false) 
                                    : nextPlayerTurn;
      
      return {
        ...prev,
        playerCards: newPlayerCards,
        aiCards: newOpponentCards,
        isPlayerTurn: actualNextPlayerTurn,
        roundMessage: roundMsg,
        gameOver: isGameOver,
        gameWinnerMessage: winnerMsg,
        playerRoundWins,
        aiRoundWins: opponentRoundWins,
        isComparing: true,
      };
    });
  }, []);

  const handleAttributeSelect = useCallback((attributeKey: string) => {
    if (gameState.isComparing || !gameState.isPlayerTurn || currentScreen !== 'game') return;
    
    if (gameState.activeMultiplayerGame) {
        // TODO: En un futuro, esta jugada se enviaría al servidor.
        // Por ahora, para mantener la lógica local, se procesa directamente.
        console.log("Multijugador: Jugada seleccionada (localmente procesada):", attributeKey);
        setGameState(prev => ({ ...prev, selectedAttribute: attributeKey, isComparing: true })); 
        setTimeout(processRoundEnd, 100); // Simular un pequeño delay como si fuera una respuesta de red
    } else { // Modo IA
        setGameState(prev => ({ ...prev, isComparing: true, selectedAttribute: attributeKey }));
        setTimeout(processRoundEnd, 100);
    }
  }, [gameState.isComparing, gameState.isPlayerTurn, currentScreen, processRoundEnd, gameState.socket, gameState.activeMultiplayerGame]);
  
  const handleRevealAiChoiceAndCompare = useCallback(() => {
    if (gameState.isComparing || gameState.isPlayerTurn || !gameState.aiChosenAttributeForRound || currentScreen !== 'game' || gameState.activeMultiplayerGame) return;
    setGameState(prev => ({ ...prev, selectedAttribute: prev.aiChosenAttributeForRound, isComparing: true }));
    setTimeout(processRoundEnd, 100);
  }, [gameState.isComparing, gameState.isPlayerTurn, gameState.aiChosenAttributeForRound, currentScreen, processRoundEnd, gameState.activeMultiplayerGame]);

  const setupNextRound = useCallback(() => {
    setGameState(prev => {
      if (prev.gameOver) return prev;
      const nextPlayerCard = prev.playerCards[0] || null, nextOpponentCard = prev.aiCards[0] || null;
      if (!nextPlayerCard || !nextOpponentCard) {
        const opponentName = prev.activeMultiplayerGame ? prev.activeMultiplayerGame.opponent_nickname : 'IA';
        const newWinnerMsg = prev.gameWinnerMessage || (!nextPlayerCard ? `${opponentName} ganó (sin cartas).` : `Ganaste (${opponentName} sin cartas).`);
        setCurrentScreen('gameOver');
        if(prev.socket && prev.activeMultiplayerGame){ // Informar al servidor que el juego terminó para este cliente
            prev.socket.emit('leave_game_lobby', { game_id: prev.activeMultiplayerGame.game_id });
        }
        return { ...prev, gameOver: true, gameWinnerMessage: newWinnerMsg, isComparing: false, selectedAttribute: null, aiChosenAttributeForRound: null, roundMessage: null };
      }

      // Determinar el turno para la siguiente ronda en multijugador
      let nextTurnPlayer = prev.isPlayerTurn; // Default para IA
      if (prev.activeMultiplayerGame) {
          // Aquí, isPlayerTurn refleja el resultado de la ronda anterior.
          // Si fue mi turno (y gané o perdí), y soy P1, el turno debería seguir siendo mío.
          // Si no fue mi turno (y el P2/oponente ganó o perdió), y soy P1, el turno debería ser mío.
          // La lógica de `actualNextPlayerTurn` en `processRoundEnd` ya debería haber seteado `isPlayerTurn` correctamente
          // para indicar quién *debería* jugar la *siguiente* carta, no necesariamente quién *inicia* la siguiente ronda.
          // `isPlayerTurn` aquí ya es el estado para la nueva ronda.
          nextTurnPlayer = prev.isPlayerTurn; 
      }
      
      return { 
          ...prev, 
          round: prev.round + 1, 
          currentPlayerCard: nextPlayerCard, 
          currentAiCard: nextOpponentCard, 
          isComparing: false, 
          selectedAttribute: null, 
          aiChosenAttributeForRound: null, 
          roundMessage: null,
          isPlayerTurn: nextTurnPlayer
        };
    });
  }, []);
  
  const handleNextRound = () => setupNextRound();

  useEffect(() => { 
    if (!gameState.activeMultiplayerGame && !gameState.isPlayerTurn && !gameState.isComparing && !gameState.aiChosenAttributeForRound && currentScreen === 'game' && !gameState.gameOver && gameState.currentAiCard) {
      const timer = setTimeout(() => {
        if (gameState.currentAiCard && gameState.currentAiCard.attributes) {
            const attributes = Object.entries(gameState.currentAiCard.attributes);
            if (attributes.length === 0) { 
                console.error("AI card has no attributes!"); 
                return; 
            }
            // IA simple: elige el atributo con el valor más alto
            const bestAttribute = attributes.reduce((best, current) => current[1] > best[1] ? current : best);
            setGameState(prev => ({ ...prev, aiChosenAttributeForRound: bestAttribute[0] }));
        } else {
            console.error("AI turn: currentAiCard or its attributes are null/undefined.");
        }
      }, AI_THINKING_TIME_MS);
      return () => clearTimeout(timer);
    }
  }, [gameState.activeMultiplayerGame, gameState.isPlayerTurn, gameState.isComparing, gameState.aiChosenAttributeForRound, gameState.currentAiCard, currentScreen, gameState.gameOver]);

  const handlePlayAgainFromGameOver = () => {
    if(gameState.socket && gameState.activeMultiplayerGame){ // Asegurar que si estaba en juego MP, notifique
        gameState.socket.emit('leave_game_lobby', { game_id: gameState.activeMultiplayerGame.game_id });
    }
    setGameState(prev => ({
        ...prev, 
        activeMultiplayerGame: null,
        selectedDeck: null,
        playerCards: [],
        aiCards: [],
        currentPlayerCard: null,
        currentAiCard: null,
        round: 1,
        playerRoundWins: 0,
        aiRoundWins: 0,
        isPlayerTurn: true,
        isComparing: false,
        selectedAttribute: null,
        aiChosenAttributeForRound: null,
        roundMessage: null,
        gameOver: false,
        gameWinnerMessage: null,
        serverMessage: prev.isConnected ? "De vuelta en el lobby." : "Desconectado. Ingresa apodo.",
    }));
    setCurrentScreen(gameState.userNickname && gameState.isConnected ? 'lobby' : 'nickname');
  };
  
  const handleNavigateToDeckSelectionFromLobby = () => {
      setGameState(prev => ({
        ...prev,
        selectedDeck: null, // Reset selected deck
        activeMultiplayerGame: null, // Ensure not in MP mode if coming from lobby
      }));
      setCurrentScreen('deckSelection');
  };
  
  const handleStartGame = () => {
    if (gameState.activeMultiplayerGame) { // Viene de un 'start_game' de Socket.IO
        console.log("Iniciando juego multijugador con oponente:", gameState.activeMultiplayerGame.opponent_nickname);
        initializeAndStartGame(); // Ya debería tener activeMultiplayerGame seteado
    } else { // Jugador seleccionó "Jugar contra IA"
        console.log("Iniciando juego contra IA.");
        startGameAgainstAI();
    }
  };


  const renderScreen = () => {
    switch (currentScreen) {
      case 'nickname':
        return <NicknameScreen onNicknameSubmit={handleNicknameSubmit} />;
      case 'lobby':
         if (!gameState.isConnected && gameState.userNickname) {
             return (
                <div className="animate-fadeIn flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
                    <div className="bg-white/10 backdrop-filter backdrop-blur-md p-8 md:p-12 rounded-xl shadow-2xl max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-4 text-yellow-300">Problema de Conexión</h2>
                        <p className="mb-4 opacity-80">
                            No se pudo conectar al servidor o se perdió la conexión.
                            <br />
                            {gameState.serverMessage}
                        </p>
                        <button
                            onClick={handleChangeNickname}
                            className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg shadow-md
                                       hover:from-orange-600 hover:to-amber-600 hover:scale-105 transform transition-all duration-300"
                        >
                            Reintentar / Cambiar Apodo
                        </button>
                    </div>
                </div>
            );
         }
        return <LobbyScreen 
                  userNickname={gameState.userNickname} 
                  players={gameState.lobbyPlayers} 
                  isConnected={gameState.isConnected}
                  serverMessage={gameState.serverMessage}
                  incomingInvite={gameState.incomingInvite}
                  sentInviteStatus={gameState.sentInviteStatus}
                  onChangeNickname={handleChangeNickname}
                  onPlayAgainstAI={handleNavigateToDeckSelectionFromLobby}
                  onInvitePlayer={handleInvitePlayer}
                  onAcceptInvite={() => handleRespondToInvite(true)}
                  onDeclineInvite={() => handleRespondToInvite(false)}
                  onCancelSentInvite={handleCancelSentInvite}
                />;
      case 'deckSelection':
        return <DeckSelectionScreen 
                  availableDecks={gameState.availableDecks}
                  onDeckSelect={handleDeckSelect} 
                  onStartGame={handleStartGame}
                  selectedDeckId={gameState.selectedDeck?.id || null}
                  onGenerateDeck={handleGenerateDeck}
                  isGeneratingDeck={isGeneratingDeck}
                  generationError={generationError} 
                />;
      case 'game':
        if (gameState.gameOver && gameState.gameWinnerMessage) {
           return <GameOverScreen 
                    message={gameState.gameWinnerMessage} 
                    isPlayerWinner={gameState.playerCards.length > 0 && (gameState.aiCards.length === 0 || (gameState.round >= TOTAL_ROUNDS && gameState.playerCards.length > gameState.aiCards.length))}
                    onPlayAgain={handlePlayAgainFromGameOver} />;
        }
        return <GameScreen 
                  gameState={gameState} 
                  onAttributeSelect={handleAttributeSelect} 
                  onNextRound={handleNextRound} 
                  onNewGame={handlePlayAgainFromGameOver} 
                  onRevealAiChoice={handleRevealAiChoiceAndCompare} 
                />;
      case 'gameOver':
        return <GameOverScreen 
                  message={gameState.gameWinnerMessage} 
                  isPlayerWinner={gameState.playerCards.length > 0 && (gameState.aiCards.length === 0 || (gameState.round >= TOTAL_ROUNDS && gameState.playerCards.length > gameState.aiCards.length))}
                  onPlayAgain={handlePlayAgainFromGameOver} />;
      default:
        if (!gameState.userNickname || !gameState.userId) { 
             setCurrentScreen('nickname'); 
             return <NicknameScreen onNicknameSubmit={handleNicknameSubmit} />;
        }
        return <div className="text-center text-xl p-10">Cargando... {gameState.serverMessage}</div>;
    }
  };

  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col">
      <FloatingParticles />
      <header className="text-center mb-6 md:mb-10 mt-4">
        <h1 className="text-4xl md:text-5xl font-bold animate-glow">🎮 Atributos al Límite AI 🎮</h1>
        <p className="text-sm md:text-base opacity-80 mt-2">
          {gameState.userNickname 
            ? `Jugador: ${gameState.userNickname} ${gameState.isConnected ? '(Online)' : '(Offline)'}` 
            : "¡El juego de cartas de atributos con mazos generados por IA!"}
        </p>
         {gameState.serverMessage && <p className="text-xs text-yellow-300 mt-1 p-1 bg-black/20 rounded inline-block">{gameState.serverMessage}</p>}
      </header>
      <main className="flex-grow">
        {renderScreen()}
      </main>
      <footer className="text-center py-4 mt-8 opacity-60 text-xs">
        Creado con React, Tailwind CSS y Gemini AI. (Regla: ${TARGET_CARDS_PER_PLAYER} cartas/jugador. Máx ${TOTAL_ROUNDS} rondas.)
        <p>El backend para multijugador se encuentra en: ${SOCKET_SERVER_URL}</p>
      </footer>
    </div>
  );
};

export default App;
