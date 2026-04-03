import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoomLobby } from './RoomLobby';
import { useAppStore } from '../store';

// Mock the store
vi.mock('../store', () => ({
  useAppStore: vi.fn(),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'app.name': 'PulseParty Rooms',
        'app.tagline': 'Live match experience with friends',
        'common.loading': 'Loading...',
        'room.create': 'Create Room',
        'room.join': 'Join Room',
        'room.code': 'Room Code',
        'room.code_placeholder': 'Enter room code',
        'room.theme': 'Room Theme',
        'room.theme_country': 'Country',
        'room.theme_club': 'Club',
        'room.theme_private': 'Private',
        'room.discover': 'Discover Rooms',
        'room.participants': 'Participants',
        'room.not_found': 'Room not found. Check the code and try again.',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

describe('RoomLobby', () => {
  const mockCreateRoom = vi.fn();
  const mockJoinRoom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementation
    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      createRoom: mockCreateRoom,
      joinRoom: mockJoinRoom,
      wsConnected: true,
    });
  });

  describe('Rendering', () => {
    it('should render the lobby with all sections', () => {
      render(<RoomLobby />);

      expect(screen.getByText('PulseParty Rooms')).toBeInTheDocument();
      expect(
        screen.getByText('Live match experience with friends')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Create Room' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Join Room' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Discover Rooms' })
      ).toBeInTheDocument();
    });

    it('should render theme selection buttons', () => {
      render(<RoomLobby />);

      const countryButton = screen.getByRole('button', {
        name: 'Country',
        pressed: true,
      });
      const clubButton = screen.getByRole('button', {
        name: 'Club',
        pressed: false,
      });
      const privateButton = screen.getByRole('button', {
        name: 'Private',
        pressed: false,
      });

      expect(countryButton).toBeInTheDocument();
      expect(clubButton).toBeInTheDocument();
      expect(privateButton).toBeInTheDocument();
    });

    it('should show connection warning when WebSocket is not connected', () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        createRoom: mockCreateRoom,
        joinRoom: mockJoinRoom,
        wsConnected: false,
      });

      render(<RoomLobby />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Theme Selection', () => {
    it('should select Country theme by default', () => {
      render(<RoomLobby />);

      const countryButton = screen.getAllByText('Country')[0];
      expect(countryButton).toHaveClass('border-blue-500');
    });

    it('should change theme when clicking theme buttons', () => {
      render(<RoomLobby />);

      const clubButton = screen.getAllByText('Club')[0];
      fireEvent.click(clubButton);

      expect(clubButton).toHaveClass('border-blue-500');
    });

    it('should allow selecting Private theme', () => {
      render(<RoomLobby />);

      const privateButton = screen.getAllByText('Private')[0];
      fireEvent.click(privateButton);

      expect(privateButton).toHaveClass('border-blue-500');
    });
  });

  describe('Room Creation', () => {
    it('should call createRoom with selected theme and match', async () => {
      mockCreateRoom.mockResolvedValue('ABC123');

      render(<RoomLobby />);

      const createButton = screen.getByRole('button', { name: 'Create Room' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateRoom).toHaveBeenCalledWith(
          'Country',
          'match-demo-001'
        );
      });
    });

    it('should disable create button when not connected', () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        createRoom: mockCreateRoom,
        joinRoom: mockJoinRoom,
        wsConnected: false,
      });

      render(<RoomLobby />);

      const createButton = screen.getByRole('button', { name: 'Create Room' });
      expect(createButton).toBeDisabled();
    });

    it('should show loading state while creating room', async () => {
      let resolveCreate: (value: string) => void;
      const createPromise = new Promise<string>((resolve) => {
        resolveCreate = resolve;
      });
      mockCreateRoom.mockReturnValue(createPromise);

      render(<RoomLobby />);

      const createButton = screen.getByRole('button', { name: 'Create Room' });
      fireEvent.click(createButton);

      // Check that button shows loading state
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Loading...' })
        ).toBeInTheDocument();
      });

      // Resolve the promise
      resolveCreate!('ABC123');

      await waitFor(() => {
        expect(mockCreateRoom).toHaveBeenCalled();
      });
    });

    it('should display error message when room creation fails', async () => {
      mockCreateRoom.mockRejectedValue(new Error('Failed to create room'));

      render(<RoomLobby />);

      const createButton = screen.getByRole('button', { name: 'Create Room' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create room')).toBeInTheDocument();
      });
    });
  });

  describe('Room Joining', () => {
    it('should call joinRoom with entered room code', async () => {
      mockJoinRoom.mockResolvedValue(undefined);

      render(<RoomLobby />);

      const input = screen.getByPlaceholderText('Enter room code');
      // Get all join buttons and select the first one (main join button)
      const joinButtons = screen.getAllByRole('button', { name: 'Join Room' });
      const mainJoinButton = joinButtons[0];

      fireEvent.change(input, { target: { value: 'abc123' } });
      fireEvent.click(mainJoinButton);

      await waitFor(() => {
        expect(mockJoinRoom).toHaveBeenCalledWith('ABC123');
      });
    });

    it('should convert room code to uppercase', async () => {
      mockJoinRoom.mockResolvedValue(undefined);

      render(<RoomLobby />);

      const input = screen.getByPlaceholderText('Enter room code');
      fireEvent.change(input, { target: { value: 'xyz789' } });

      expect(input).toHaveValue('XYZ789');
    });

    it('should disable join button when room code is empty', () => {
      render(<RoomLobby />);

      const joinButtons = screen.getAllByRole('button', { name: 'Join Room' });
      const mainJoinButton = joinButtons[0];
      expect(mainJoinButton).toBeDisabled();
    });

    it('should disable join button when not connected', () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        createRoom: mockCreateRoom,
        joinRoom: mockJoinRoom,
        wsConnected: false,
      });

      render(<RoomLobby />);

      const input = screen.getByPlaceholderText('Enter room code');
      fireEvent.change(input, { target: { value: 'ABC123' } });

      const joinButtons = screen.getAllByRole('button', { name: 'Join Room' });
      const mainJoinButton = joinButtons[0];
      expect(mainJoinButton).toBeDisabled();
    });

    it('should display error message when room join fails', async () => {
      mockJoinRoom.mockRejectedValue(
        new Error('Room not found. Check the code and try again.')
      );

      render(<RoomLobby />);

      const input = screen.getByPlaceholderText('Enter room code');
      const joinButtons = screen.getAllByRole('button', { name: 'Join Room' });
      const mainJoinButton = joinButtons[0];

      fireEvent.change(input, { target: { value: 'INVALID' } });
      fireEvent.click(mainJoinButton);

      await waitFor(() => {
        expect(
          screen.getByText('Room not found. Check the code and try again.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Public Room Discovery', () => {
    it('should render public rooms list', () => {
      render(<RoomLobby />);

      // Mock rooms should be displayed
      expect(screen.getByText('ABC123')).toBeInTheDocument();
      expect(screen.getByText('XYZ789')).toBeInTheDocument();
      expect(screen.getByText('DEF456')).toBeInTheDocument();
    });

    it('should filter rooms by match', () => {
      render(<RoomLobby />);

      const matchFilter = screen.getByLabelText('Match Filter');
      fireEvent.change(matchFilter, { target: { value: 'match-demo-002' } });

      // Only DEF456 should be visible
      expect(screen.queryByText('ABC123')).not.toBeInTheDocument();
      expect(screen.queryByText('XYZ789')).not.toBeInTheDocument();
      expect(screen.getByText('DEF456')).toBeInTheDocument();
    });

    it('should filter rooms by theme', () => {
      render(<RoomLobby />);

      const themeFilter = screen.getByLabelText('Theme Filter');
      fireEvent.change(themeFilter, { target: { value: 'Club' } });

      // Only XYZ789 (Club theme) should be visible
      expect(screen.queryByText('ABC123')).not.toBeInTheDocument();
      expect(screen.getByText('XYZ789')).toBeInTheDocument();
      expect(screen.queryByText('DEF456')).not.toBeInTheDocument();
    });

    it('should allow joining public rooms', async () => {
      mockJoinRoom.mockResolvedValue(undefined);

      render(<RoomLobby />);

      // Find all buttons with "Join Room" text
      const allButtons = screen.getAllByRole('button', { name: 'Join Room' });
      // The first button is the main join button, the rest are in the public rooms list
      const firstPublicRoomJoinButton = allButtons[1];

      fireEvent.click(firstPublicRoomJoinButton);

      await waitFor(() => {
        expect(mockJoinRoom).toHaveBeenCalledWith('ABC123');
      });
    });

    it('should show message when no rooms match filters', () => {
      render(<RoomLobby />);

      const matchFilter = screen.getByLabelText('Match Filter');
      const themeFilter = screen.getByLabelText('Theme Filter');

      fireEvent.change(matchFilter, { target: { value: 'match-demo-001' } });
      fireEvent.change(themeFilter, { target: { value: 'Club' } });

      // Only one room matches (XYZ789)
      expect(screen.getByText('XYZ789')).toBeInTheDocument();
      expect(screen.queryByText('ABC123')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<RoomLobby />);

      const roomCodeInput = screen.getByLabelText('Room Code');
      expect(roomCodeInput).toBeInTheDocument();
    });

    it('should have aria-pressed on theme buttons', () => {
      render(<RoomLobby />);

      const countryButton = screen.getAllByText('Country')[0];
      expect(countryButton).toHaveAttribute('aria-pressed', 'true');

      const clubButton = screen.getAllByText('Club')[0];
      expect(clubButton).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
