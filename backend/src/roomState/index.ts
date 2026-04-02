// Room State Management Module
// Exports room management functions for use in Lambda handlers

export {
  generateRoomCode,
  createRoom,
  getRoomByCode,
  getActiveRoomsByMatch,
} from './roomManagement';
