// Creating and joining rooms (faked: there is no server, so "joining" just
// builds a room locally with sample players in it).

import { shuffle } from './session';
import type { PrototypeState } from './state';
import { MAX_PLAYERS_PER_ROOM, type Room, type UserId } from './types';

// No 0/O or 1/I/L, so codes read out loud or typed from a phone aren't misread.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  return Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
}

/** Host a new room. Adds one sample opponent so the 1v1 flow works right away. */
export function hostRoom(state: PrototypeState, hostId: UserId): Room {
  const room: Room = { code: generateRoomCode(), hostId, playerIds: [hostId], spectatorIds: [] };
  addSamplePlayer(state, room);
  state.room = room;
  state.session = undefined;
  return room;
}

/** "Join" a room by code. Pretends a random sample player is already hosting it. */
export function joinRoom(state: PrototypeState, code: string, userId: UserId): Room {
  const others = state.accounts.filter((a) => a.id !== userId);
  const host = shuffle(others)[0]?.id ?? userId;
  const room: Room = { code: code.toUpperCase(), hostId: host, playerIds: [host, userId], spectatorIds: [] };
  state.room = room;
  state.session = undefined;
  return room;
}

/** Simulate another friend joining. Returns false if the room is full or nobody is left. */
export function addSamplePlayer(state: PrototypeState, room: Room): boolean {
  if (room.playerIds.length >= MAX_PLAYERS_PER_ROOM) return false;
  const next = state.accounts.find((a) => !room.playerIds.includes(a.id));
  if (!next) return false;
  room.playerIds.push(next.id);
  return true;
}
