import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { getSocket } from '@/socket';
import { useGameStore } from '@/store/gameStore';
import { PublicRoom, RolePayload, VoteResultsPayload, GameOverPayload, VotingPlayer } from '@/types/game';

// Pages
import HomePage from '@/pages/HomePage';
import CreateGamePage from '@/pages/CreateGamePage';
import JoinPage from '@/pages/JoinPage';
import LobbyPage from '@/pages/LobbyPage';
import RoleRevealPage from '@/pages/RoleRevealPage';
import CluePhase from '@/pages/CluePhase';
import VotingPage from '@/pages/VotingPage';
import VoteResultPage from '@/pages/VoteResultPage';
import GameOverPage from '@/pages/GameOverPage';

// ─── Socket event wiring (inside router so useNavigate works) ────────────────
function SocketBridge() {
  const navigate = useNavigate();
  const store = useGameStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on('room_updated', (room: PublicRoom) => {
      store.setRoom(room);
    });

    socket.on('role_assigned', (payload: RolePayload) => {
      store.setMyRole(payload);
      navigate('/game/reveal');
    });

    socket.on('game_started', () => {
      store.setVoteResults(null);
      store.setGameOver(null);
      store.setMyRole(null);
      // Navigate everyone to role reveal — alive players get role_assigned shortly after,
      // eliminated players (spectators) see the spectator view automatically
      navigate('/game/reveal');
    });

    socket.on('round_started', () => {
      store.setVoteResults(null);
      store.setMyVote(null);
      store.setMyRole(null);
      // Same: navigate all players including spectators
      navigate('/game/reveal');
    });

    socket.on('clue_phase_started', ({ timerSeconds }: { timerSeconds: number }) => {
      store.setClueTimer(timerSeconds);
      store.setGameState('CLUE_PHASE');
      navigate('/game/clue');
    });

    socket.on('voting_started', ({
      players,
      timerSeconds,
    }: {
      players: VotingPlayer[];
      timerSeconds: number;
    }) => {
      store.setVotingPlayers(players);
      store.setVotingTimer(timerSeconds);
      store.setGameState('VOTING');
      navigate('/game/vote');
    });

    socket.on('vote_cast', (progress: { votedCount: number; totalCount: number }) => {
      store.setVoteCastProgress(progress);
    });

    socket.on('vote_results', (results: VoteResultsPayload) => {
      store.setVoteResults(results);
      store.setGameState('RESULT');
      navigate('/game/result');
    });

    socket.on('game_over', (payload: GameOverPayload) => {
      store.setGameOver(payload);
      store.setGameState('GAME_OVER');
      navigate('/game/over');
    });

    socket.on('role_confirm_progress', (p: { confirmed: number; total: number }) => {
      store.setRoleConfirmProgress(p);
    });

    socket.on('host_changed', ({ newHostName }: { newHostName: string }) => {
      store.setNewHostName(newHostName);
    });

    socket.on('kicked', () => {
      store.clearSession();
      store.reset();
      navigate('/');
    });

    socket.on('play_again_started', () => {
      store.setVoteResults(null);
      store.setGameOver(null);
      store.setMyRole(null);
      store.setMyVote(null);
      navigate('/lobby');
    });

    socket.on('game_ended_by_host', () => {
      store.setMyRole(null);
      store.setVoteResults(null);
      store.setGameOver(null);
      navigate('/lobby');
    });

    return () => {
      socket.off('room_updated');
      socket.off('role_assigned');
      socket.off('game_started');
      socket.off('round_started');
      socket.off('clue_phase_started');
      socket.off('voting_started');
      socket.off('vote_cast');
      socket.off('vote_results');
      socket.off('game_over');
      socket.off('role_confirm_progress');
      socket.off('host_changed');
      socket.off('kicked');
      socket.off('play_again_started');
      socket.off('game_ended_by_host');
    };
  }, []);

  return null;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <SocketBridge />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateGamePage />} />
        <Route path="/join/:code?" element={<JoinPage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/game/reveal" element={<RoleRevealPage />} />
        <Route path="/game/clue" element={<CluePhase />} />
        <Route path="/game/vote" element={<VotingPage />} />
        <Route path="/game/result" element={<VoteResultPage />} />
        <Route path="/game/over" element={<GameOverPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
