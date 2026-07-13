export interface Message {
  userId: string;
  text: string;
  sentAt: number;
}

export interface Room {
  id: string;
  movieId: number;
  duration: number;
  maxUsers: number;
  ownerId: string;
  users: string[];
  messages: Message[];
  createdAt: number;
}

export interface CreateRoomData {
  movieId: number;
  duration: number;
  maxUsers: number;
}
