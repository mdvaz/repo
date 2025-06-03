
import React, { useState, FormEvent } from 'react';
import { io, Socket } from 'socket.io-client'; // Importar Socket

// Definir la URL del servidor aquí o importarla si se centraliza
const SOCKET_SERVER_URL_FOR_TEST = 'http://186.158.12.129:8000';

interface NicknameScreenProps {
  onNicknameSubmit: (nickname: string) => void;
}

const NicknameScreen: React.FC<NicknameScreenProps> = ({ onNicknameSubmit }) => {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [testConnectionStatus, setTestConnectionStatus] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (nickname.trim().length < 3) {
      setError('El apodo debe tener al menos 3 caracteres.');
      return;
    }
    if (nickname.trim().length > 15) {
      setError('El apodo no puede exceder los 15 caracteres.');
      return;
    }
    setError(null);
    onNicknameSubmit(nickname.trim());
  };

  const handleTestConnection = () => {
    setTestConnectionStatus("Probando conexión...");
    let testSocket: Socket | null = null;

    try {
      testSocket = io(SOCKET_SERVER_URL_FOR_TEST, {
        reconnection: false, // No queremos reintentos para una prueba rápida
        timeout: 5000, // Timeout corto de 5 segundos para la prueba
        transports: ['websocket'], // Forzar WebSocket para la prueba
      });

      testSocket.on('connect', () => {
        setTestConnectionStatus("Éxito: Conexión WebSocket establecida y luego cerrada.");
        testSocket?.disconnect();
      });

      testSocket.on('connect_error', (err: any) => {
        let errMsg = "Falló: No se pudo conectar.";
        if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
            errMsg = `Falló: ${err.message.toLowerCase().includes("timeout") ? "Timeout" : err.message}.`;
        } else if (typeof err === 'string') {
            errMsg = `Falló: ${err.toLowerCase().includes("timeout") ? "Timeout" : err}.`;
        }
        setTestConnectionStatus(errMsg);
        testSocket?.disconnect();
      });

    } catch (e: any) {
        setTestConnectionStatus(`Falló: Error al inicializar socket - ${e.message}`);
        if(testSocket) testSocket.disconnect();
    }
  };

  return (
    <div className="animate-fadeIn flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="bg-white/10 backdrop-filter backdrop-blur-md p-8 md:p-12 rounded-xl shadow-2xl max-w-md w-full">
        <h2 className="text-3xl font-bold mb-6 text-yellow-300">Elige tu Apodo</h2>
        <p className="mb-8 opacity-80">
          Ingresa un apodo para que otros jugadores te reconozcan en la sala de espera.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Tu apodo épico aquí"
              className="w-full p-3 rounded-lg bg-slate-700/50 border border-slate-600 focus:ring-2 focus:ring-purple-400 outline-none transition-all text-white placeholder-gray-400"
              aria-label="Ingresa tu apodo"
              required
              minLength={3}
              maxLength={15}
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
          <button
            type="submit"
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-lg shadow-md
                       hover:from-purple-600 hover:to-indigo-600 hover:scale-105 transform transition-all duration-300
                       disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!nickname.trim()}
          >
            Continuar a la Sala de Espera
          </button>
        </form>
        <div className="mt-6">
          <button
            onClick={handleTestConnection}
            className="w-full px-6 py-2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-semibold rounded-lg shadow-md
                       hover:from-sky-600 hover:to-cyan-600 transform transition-all duration-300"
          >
            Probar Conexión al Servidor
          </button>
          {testConnectionStatus && (
            <p className={`text-sm mt-3 p-2 rounded-md ${testConnectionStatus.startsWith("Éxito") ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'}`}>
              Resultado de la prueba: {testConnectionStatus}
            </p>
          )}
        </div>
         <p className="text-xs opacity-60 mt-6">
            Tu apodo se guardará en este navegador para futuras sesiones.
        </p>
      </div>
       <p className="mt-8 text-sm opacity-70">
        El modo multijugador online es una demostración y no ofrece conexión real entre jugadores si el servidor no está disponible.
      </p>
    </div>
  );
};

export default NicknameScreen;
