
import React from 'react';
import { LobbyPlayer, GameState } from '../types';

interface LobbyScreenProps {
  userNickname: string | null;
  players: LobbyPlayer[];
  isConnected: boolean;
  serverMessage: string | null;
  incomingInvite: GameState['incomingInvite'];
  sentInviteStatus: GameState['sentInviteStatus'];
  onChangeNickname: () => void;
  onPlayAgainstAI: () => void;
  onInvitePlayer: (playerId: string) => void;
  onAcceptInvite: () => void;
  onDeclineInvite: () => void;
  onCancelSentInvite: (invitee_user_id: string) => void;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({
  userNickname,
  players,
  isConnected,
  serverMessage,
  incomingInvite,
  sentInviteStatus,
  onChangeNickname,
  onPlayAgainstAI,
  onInvitePlayer,
  onAcceptInvite,
  onDeclineInvite,
  onCancelSentInvite
}) => {
  const userAvatar = userNickname ? userNickname.charAt(0).toUpperCase() : '👽';

  return (
    <div className="animate-fadeIn p-4">
      {/* Modal para Invitación Entrante */}
      {incomingInvite && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-xl shadow-2xl text-center max-w-sm w-full">
            <h3 className="text-2xl font-bold text-yellow-300 mb-4">¡Invitación de Juego!</h3>
            <p className="text-lg mb-6">{incomingInvite.inviter_nickname} te ha invitado a una partida.</p>
            <div className="flex justify-around">
              <button
                onClick={onAcceptInvite}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-colors"
              >
                Aceptar
              </button>
              <button
                onClick={onDeclineInvite}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md transition-colors"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <div className={`w-16 h-16 rounded-full mr-4 border-2 ${isConnected ? 'border-green-400' : 'border-red-400'} bg-purple-600 flex items-center justify-center text-3xl font-bold`}>
            {userAvatar}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-yellow-300">Sala de Espera</h2>
            <p className="text-lg opacity-90">
              ¡Bienvenido, {userNickname || 'Jugador'}! Estado: {isConnected ? <span className="text-green-400">Online</span> : <span className="text-red-400">Offline</span>}
            </p>
          </div>
        </div>
        <button
          onClick={onChangeNickname}
          className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg shadow-md
                     hover:from-orange-600 hover:to-amber-600 transform transition-all duration-300 hover:scale-105"
        >
          Cambiar Apodo / Desconectar
        </button>
      </div>
      
      {serverMessage && !serverMessage.toLowerCase().includes("registrado") && !serverMessage.toLowerCase().includes("conectado") && (
          <p className={`text-center mb-4 p-2 rounded-md ${serverMessage.toLowerCase().includes("error") ? 'bg-red-500/30 text-red-300' : 'bg-yellow-500/30 text-yellow-200'}`}>
              {serverMessage}
          </p>
      )}


      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/10 backdrop-filter backdrop-blur-md p-6 rounded-xl shadow-xl border border-purple-400/50">
          <h3 className="text-2xl font-semibold mb-6 text-purple-300">Modo Un Jugador</h3>
          <p className="opacity-80 mb-6">
            Desafía a la IA. Elige o crea un mazo y prueba tu estrategia.
          </p>
          <button
            onClick={onPlayAgainstAI}
            className="w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-lg shadow-lg
                       hover:from-teal-600 hover:to-cyan-600 transform transition-all duration-300 hover:scale-105"
          >
            Jugar contra la IA
          </button>
        </div>
        
        <div className="bg-white/10 backdrop-filter backdrop-blur-md p-6 rounded-xl shadow-xl border border-sky-400/50">
          <h3 className="text-2xl font-semibold mb-1 text-sky-300">Jugadores Online</h3>
          {!isConnected && <p className="text-sm text-red-400 mb-3">No conectado al servidor para ver jugadores.</p>}
          {players.length > 0 && isConnected ? (
            <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {players.map(player => {
                const isInvitedByMe = sentInviteStatus?.invitee_id === player.user_id;
                const inviteButtonStatus = () => {
                    if (isInvitedByMe) {
                        switch(sentInviteStatus?.status) {
                            case 'pending': return { text: "Enviada...", disabled: true, action: () => onCancelSentInvite(player.user_id), cancel: true };
                            case 'accepted': return { text: "¡Aceptada!", disabled: true, action: () => {} };
                            case 'declined': return { text: "Rechazada", disabled: false, action: () => onInvitePlayer(player.user_id) };
                            case 'cancelled': return { text: "Cancelada", disabled: false, action: () => onInvitePlayer(player.user_id) };
                            case 'expired': return { text: "Expirada", disabled: false, action: () => onInvitePlayer(player.user_id) };
                            case 'error': return { text: "Error Inv.", disabled: false, action: () => onInvitePlayer(player.user_id) };
                            default: return { text: "Invitar", disabled: player.status === 'ingame', action: () => onInvitePlayer(player.user_id) };
                        }
                    }
                    return { text: "Invitar", disabled: player.status === 'ingame' || !!incomingInvite, action: () => onInvitePlayer(player.user_id) };
                };
                const btnState = inviteButtonStatus();

                return (
                    <li 
                    key={player.user_id} 
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg shadow"
                    >
                    <div className="flex items-center">
                        <span className="text-3xl mr-3">{player.avatar || player.nickname.charAt(0).toUpperCase()}</span>
                        <div>
                            <span className="font-semibold text-white">{player.nickname}</span>
                            {player.status && (
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${player.status === 'online' ? 'bg-green-500/70' : 'bg-yellow-500/70'}`}>
                                {player.status}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center">
                      {btnState.cancel && (
                         <button
                            onClick={() => onCancelSentInvite(player.user_id)}
                            className="px-3 py-1.5 mr-2 text-white text-xs font-semibold rounded-md shadow transition-colors bg-red-600 hover:bg-red-700"
                         >
                            Cancelar
                         </button>
                      )}
                      <button
                          onClick={btnState.action}
                          disabled={btnState.disabled}
                          className={`px-4 py-1.5 text-white text-sm font-semibold rounded-md shadow transition-colors
                                      ${btnState.disabled ? 'bg-gray-500 opacity-70 cursor-not-allowed' : (btnState.cancel ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-sky-500 hover:bg-sky-600')}
                                      ${isInvitedByMe && sentInviteStatus?.status === 'accepted' ? 'bg-green-600' : ''}
                                      ${isInvitedByMe && sentInviteStatus?.status === 'declined' ? 'bg-red-600' : ''}
                                  `}
                      >
                          {btnState.text}
                      </button>
                    </div>
                    </li>
                );
            })}
            </ul>
          ) : (
            isConnected && <p className="opacity-70 text-center py-4">No hay otros jugadores conectados en este momento.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;
