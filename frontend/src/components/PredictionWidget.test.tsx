import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PredictionWidget } from './PredictionWidget';
import { useAppStore } from '../store';
import '../i18n'; // Initialize i18n for tests

// Mock the store
vi.mock('../store', () => ({
  useAppStore: vi.fn(),
}));

describe('PredictionWidget', () => {
  let mockSubmitPrediction: ReturnType<typeof vi.fn>;
  let mockStore: any;

  beforeEach(() => {
    // Create mock functions
    mockSubmitPrediction = vi.fn().mockResolvedValue(undefined);

    // Default mock store state
    mockStore = {
      activePredictionWindow: null,
      submitPrediction: mockSubmitPrediction,
      wsConnected: true,
    };

    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStore
    );
  });

  it('should not render when no active prediction window', () => {
    const { container } = render(<PredictionWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('should render prediction window with countdown timer', () => {
    const expiresAt = new Date(Date.now() + 60000).toISOString(); // 60 seconds from now
    mockStore.activePredictionWindow = {
      windowId: 'window-1',
      roomId: 'room-1',
      matchId: 'match-1',
      predictionType: 'next_goal_scorer',
      options: ['Player A', 'Player B', 'Player C'],
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStore
    );

    render(<PredictionWidget />);

    expect(screen.getByText('Make Your Prediction')).toBeInTheDocument();
    expect(screen.getByText(/remaining/i)).toBeInTheDocument();
  });

  it('should render multiple choice options as buttons', () => {
    const expiresAt = new Date(Date.now() + 60000).toISOString();
    mockStore.activePredictionWindow = {
      windowId: 'window-1',
      roomId: 'room-1',
      matchId: 'match-1',
      predictionType: 'next_goal_scorer',
      options: ['Player A', 'Player B', 'Player C'],
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStore
    );

    render(<PredictionWidget />);

    expect(
      screen.getByRole('button', { name: 'Player A' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Player B' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Player C' })
    ).toBeInTheDocument();
  });

  it('should highlight selected choice when clicked', () => {
    const expiresAt = new Date(Date.now() + 60000).toISOString();
    mockStore.activePredictionWindow = {
      windowId: 'window-1',
      roomId: 'room-1',
      matchId: 'match-1',
      predictionType: 'next_goal_scorer',
      options: ['Player A', 'Player B'],
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStore
    );

    render(<PredictionWidget />);

    const playerAButton = screen.getByRole('button', { name: 'Player A' });
    fireEvent.click(playerAButton);

    expect(playerAButton).toHaveAttribute('aria-pressed', 'true');
    expect(playerAButton).toHaveClass('border-blue-600');
  });

  it('should enable submit button when choice is selected', () => {
    const expiresAt = new Date(Date.now() + 60000).toISOString();
    mockStore.activePredictionWindow = {
      windowId: 'window-1',
      roomId: 'room-1',
      matchId: 'match-1',
      predictionType: 'next_goal_scorer',
      options: ['Player A', 'Player B'],
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStore
    );

    render(<PredictionWidget />);

    const submitButton = screen.getByRole('button', {
      name: /submit prediction/i,
    });
    expect(submitButton).toBeDisabled();

    const playerAButton = screen.getByRole('button', { name: 'Player A' });
    fireEvent.click(playerAButton);

    expect(submitButton).not.toBeDisabled();
  });

  it('should call submitPrediction with correct parameters when submitted', async () => {
    const expiresAt = new Date(Date.now() + 60000).toISOString();
    mockStore.activePredictionWindow = {
      windowId: 'window-1',
      roomId: 'room-1',
      matchId: 'match-1',
      predictionType: 'next_goal_scorer',
      options: ['Player A', 'Player B'],
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStore
    );

    render(<PredictionWidget />);

    const playerAButton = screen.getByRole('button', { name: 'Player A' });
    fireEvent.click(playerAButton);

    const submitButton = screen.getByRole('button', {
      name: /submit prediction/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmitPrediction).toHaveBeenCalledWith('window-1', 'Player A');
    });
  });

  it('should show submitted feedback after successful submission', async () => {
    const expiresAt = new Date(Date.now() + 60000).toISOString();
    mockStore.activePredictionWindow = {
      windowId: 'window-1',
      roomId: 'room-1',
      matchId: 'match-1',
      predictionType: 'next_goal_scorer',
      options: ['Player A'],
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStore
    );

    render(<PredictionWidget />);

    fireEvent.click(screen.getByRole('button', { name: 'Player A' }));
    fireEvent.click(screen.getByRole('button', { name: /submit prediction/i }));

    await waitFor(() => {
      expect(screen.getByText(/prediction submitted/i)).toBeInTheDocument();
    });
  });

  it('should disable submission when window expires', () => {
    const expiresAt = new Date(Date.now() - 1000).toISOString(); // Already expired
    mockStore.activePredictionWindow = {
      windowId: 'window-1',
      roomId: 'room-1',
      matchId: 'match-1',
      predictionType: 'next_goal_scorer',
      options: ['Player A'],
      expiresAt,
      createdAt: new Date(Date.now() - 61000).toISOString(),
    };

    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStore
    );

    render(<PredictionWidget />);

    const playerAButton = screen.getByRole('button', { name: 'Player A' });
    fireEvent.click(playerAButton);

    const submitButton = screen.getByRole('button', {
      name: /submit prediction/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it('should disable submit button when WebSocket is not connected', () => {
    const expiresAt = new Date(Date.now() + 60000).toISOString();
    mockStore.activePredictionWindow = {
      windowId: 'window-1',
      roomId: 'room-1',
      matchId: 'match-1',
      predictionType: 'next_goal_scorer',
      options: ['Player A'],
      expiresAt,
      createdAt: new Date().toISOString(),
    };
    mockStore.wsConnected = false;

    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStore
    );

    render(<PredictionWidget />);

    fireEvent.click(screen.getByRole('button', { name: 'Player A' }));

    // Submit button should be disabled when wsConnected is false
    const submitButton = screen.getByRole('button', {
      name: /submit prediction/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it('should display localized prediction type titles', () => {
    const expiresAt = new Date(Date.now() + 60000).toISOString();
    mockStore.activePredictionWindow = {
      windowId: 'window-1',
      roomId: 'room-1',
      matchId: 'match-1',
      predictionType: 'next_goal_scorer',
      options: ['Player A'],
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStore
    );

    render(<PredictionWidget />);

    expect(screen.getByText(/who will score next/i)).toBeInTheDocument();
  });

  it('should show progress bar indicating remaining time', () => {
    const expiresAt = new Date(Date.now() + 60000).toISOString();
    const createdAt = new Date(Date.now() - 60000).toISOString(); // Started 60s ago, 60s remaining
    mockStore.activePredictionWindow = {
      windowId: 'window-1',
      roomId: 'room-1',
      matchId: 'match-1',
      predictionType: 'next_goal_scorer',
      options: ['Player A'],
      expiresAt,
      createdAt,
    };

    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStore
    );

    const { container } = render(<PredictionWidget />);

    // Check for progress bar
    const progressBar = container.querySelector('.bg-gray-200');
    expect(progressBar).toBeTruthy();
  });
});
