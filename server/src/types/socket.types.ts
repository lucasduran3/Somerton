import { Movie } from './tmdb.types.js';

export interface Message {
  userId: string;
  text: string;
  sentAt: number;
}

export interface Room {
  id: string;
  movie: Movie;
  duration: number;
  maxUsers: number;
  ownerId: string;
  users: string[];
  messages: Message[];
  createdAt: number;
}

export interface CreateRoomData {
  movie: Movie;
  duration: number;
  maxUsers: number;
}
