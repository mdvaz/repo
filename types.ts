import type { Socket } from 'socket.io-client';

export interface CardAttribute {
  [key: string]: number;
}

export interface Card {
  name: string;
  icon: string;
  attributes: CardAttribute;
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  cards: Card[];
}

// Estructura para jugadores en el lobby, enviada por el backend
export interface LobbyPlayer {
  user_id: string; // user_id del backend
  nickname: string;
  status?: 'online' | 'ingame';
  avatar?: string;
}

export type ScreenView = 'nickname' | 'lobby' | 'deckSelection' | 'game' | 'gameOver';

// Tipos para eventos de Socket.IO (adaptar según la API del backend)
export interface ServerToClientEvents {
  connect: () => void;
  disconnect: (reason: string) => void;
  user_registered: (data: { user_id: string; nickname: string; lobby_players: LobbyPlayer[] }) => void;
  lobby_update: (data: { lobby_players: LobbyPlayer[] }) => void;
  receive_invitation: (data: { inviter_id: string; inviter_nickname: string; game_id?: string }) => void;
  invitation_response: (data: { invitee_id: string; invitee_nickname: string; accepted: boolean; game_id?: string; message?: string }) => void;
  invitation_expired: (data: { other_user_id: string, game_id_proposal?: string, role?: 'inviter' | 'invitee' }) => void;
  invitation_sent_confirmation: (data: { invitee_id: string, invitee_nickname: string, game_id_proposal: string }) => void;
  invitation_cancelled_update: (data: { invitee_id?: string, inviter_id?: string, game_id_proposal?: string, reason: string}) => void;
  start_game: (data: { game_id: string; opponent_id: string; opponent_nickname: string; i_am_player1: boolean }) => void;
  error_message: (data: { message: string }) => void;
  game_terminated_by_disconnect: (data: { game_id: string, disconnected_player_id: string, disconnected_player_nickname: string }) => void; 
  opponent_left_game: (data: { game_id: string, opponent_id: string, opponent_nickname: string }) => void;
}

export interface ClientToServerEvents {
  register_user: (data: { nickname: string }) => void;
  request_lobby_players: () => void;
  send_invitation: (data: { invitee_id: string }) => void;
  respond_to_invitation: (data: { inviter_id: string; game_id?: string; accepted: boolean }) => void;
  cancel_invitation: (data: { invitee_id?: string }) => void; // Optional, backend has it
  leave_game_lobby: (data?: { game_id?: string }) => void; 
}

// Alias para el tipo de socket con los eventos definidos
export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface GameState {
  // Nickname & User state
  userNickname: string | null;
  userId: string | null; // Asignado por el backend tras el registro

  // Socket & Connection state
  socket: AppSocket | null;
  isConnected: boolean;
  serverMessage: string | null; // Para errores o info del backend

  // Lobby state (real)
  lobbyPlayers: LobbyPlayer[];
  incomingInvite: { inviter_id: string; inviter_nickname: string; game_id?: string } | null; // Matches backend
  sentInviteStatus: { invitee_id: string; status: 'pending' | 'accepted' | 'declined' | 'error' | 'cancelled' | 'expired'; message?: string; game_id_proposal?: string } | null; // Matches backend

  // Multiplayer Game state
  activeMultiplayerGame: {
    game_id: string; // Matches backend
    opponent_id: string; // Matches backend
    opponent_nickname: string; // Matches backend
    isMyTurn?: boolean; 
    i_am_player1?: boolean; // Matches backend
  } | null;

  // Deck and Single Player Game state
  availableDecks: Deck[];
  selectedDeck: Deck | null;
  playerCards: Card[];
  aiCards: Card[]; 
  currentPlayerCard: Card | null;
  currentAiCard: Card | null; 
  round: number;
  playerRoundWins: number;
  aiRoundWins: number;
  isPlayerTurn: boolean; 
  isComparing: boolean;
  selectedAttribute: string | null;
  aiChosenAttributeForRound: string | null; 
  roundMessage: string | null;
  gameOver: boolean;
  gameWinnerMessage: string | null;
}

export interface AttributeDisplayInfo {
  key: string;
  name: string;
  value: number | string;
  isWinner?: boolean;
  isLoser?: boolean;
}