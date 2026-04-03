import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchTimeline } from './MatchTimeline';
import { useAppStore } from '../store';
import '../i18n'; // Initialize i18n for tests

// Mock the store
vi.mock('../store', () => ({
  useAppStore: vi.fn(),
}));

describe('MatchTimeline Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should render empty state when no match events', () => {
    // Mock store with no events
    vi.mocked(useAppStore).mockReturnValue({
      matchEvents: [],
    } as ReturnType<typeof useAppStore>);

    render(<MatchTimeline />);

    expect(screen.getByText('Match Timeline')).toBeInTheDocument();
    expect(screen.getByText('Waiting for match events...')).toBeInTheDocument();
  });

  it('should render match events as cards', () => {
    // Mock store with events
    vi.mocked(useAppStore).mockReturnValue({
      matchEvents: [
        {
          eventId: 'event-1',
          matchId: 'match-1',
          eventType: 'goal',
          timestamp: '2024-01-15T10:30:00Z',
          teamId: 'team-a',
          playerId: 'player-1',
          metadata: {
            playerName: 'John Doe',
            teamName: 'Team A',
          },
        },
        {
          eventId: 'event-2',
          matchId: 'match-1',
          eventType: 'yellow_card',
          timestamp: '2024-01-15T10:35:00Z',
          teamId: 'team-b',
          playerId: 'player-2',
          metadata: {
            playerName: 'Jane Smith',
            teamName: 'Team B',
          },
        },
      ],
    } as ReturnType<typeof useAppStore>);

    render(<MatchTimeline />);

    // Check that events are rendered
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
  });

  it('should display event icons for different event types', () => {
    vi.mocked(useAppStore).mockReturnValue({
      matchEvents: [
        {
          eventId: 'event-1',
          matchId: 'match-1',
          eventType: 'goal',
          timestamp: '2024-01-15T10:30:00Z',
          teamId: 'team-a',
          metadata: { playerName: 'Player 1', teamName: 'Team A' },
        },
        {
          eventId: 'event-2',
          matchId: 'match-1',
          eventType: 'corner',
          timestamp: '2024-01-15T10:32:00Z',
          teamId: 'team-a',
          metadata: { teamName: 'Team A' },
        },
      ],
    } as ReturnType<typeof useAppStore>);

    const { container } = render(<MatchTimeline />);

    // Check that event cards are rendered
    const eventCards = container.querySelectorAll('.event-card');
    expect(eventCards).toHaveLength(2);
  });

  it('should display timestamps for events', () => {
    vi.mocked(useAppStore).mockReturnValue({
      matchEvents: [
        {
          eventId: 'event-1',
          matchId: 'match-1',
          eventType: 'goal',
          timestamp: '2024-01-15T10:30:00Z',
          teamId: 'team-a',
          metadata: { playerName: 'Player 1', teamName: 'Team A' },
        },
      ],
    } as ReturnType<typeof useAppStore>);

    render(<MatchTimeline />);

    // Check that timestamp is displayed (format may vary by locale)
    const timeElements = screen.getAllByText(/\d{1,2}:\d{2}/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('should localize event descriptions', () => {
    vi.mocked(useAppStore).mockReturnValue({
      matchEvents: [
        {
          eventId: 'event-1',
          matchId: 'match-1',
          eventType: 'goal',
          timestamp: '2024-01-15T10:30:00Z',
          teamId: 'team-a',
          metadata: {
            playerName: 'John Doe',
            teamName: 'Team A',
          },
        },
      ],
    } as ReturnType<typeof useAppStore>);

    render(<MatchTimeline />);

    // Check that localized description is rendered
    expect(screen.getByText(/John Doe.*Team A/)).toBeInTheDocument();
  });

  it('should handle different event types correctly', () => {
    const eventTypes = [
      {
        eventType: 'substitution',
        metadata: { playerOut: 'Player Out', playerIn: 'Player In' },
      },
      {
        eventType: 'possession',
        metadata: { teamName: 'Team A', percentage: '65' },
      },
      {
        eventType: 'shot',
        metadata: { playerName: 'Shooter' },
      },
    ];

    eventTypes.forEach((eventData, index) => {
      vi.mocked(useAppStore).mockReturnValue({
        matchEvents: [
          {
            eventId: `event-${index}`,
            matchId: 'match-1',
            eventType: eventData.eventType,
            timestamp: '2024-01-15T10:30:00Z',
            teamId: 'team-a',
            metadata: eventData.metadata,
          },
        ],
      } as ReturnType<typeof useAppStore>);

      const { unmount } = render(<MatchTimeline />);

      // Verify the component renders without errors
      expect(screen.getByText('Match Timeline')).toBeInTheDocument();

      unmount();
    });
  });

  it('should apply correct color classes for event types', () => {
    vi.mocked(useAppStore).mockReturnValue({
      matchEvents: [
        {
          eventId: 'event-1',
          matchId: 'match-1',
          eventType: 'goal',
          timestamp: '2024-01-15T10:30:00Z',
          teamId: 'team-a',
          metadata: { playerName: 'Player 1', teamName: 'Team A' },
        },
        {
          eventId: 'event-2',
          matchId: 'match-1',
          eventType: 'red_card',
          timestamp: '2024-01-15T10:35:00Z',
          teamId: 'team-b',
          metadata: { playerName: 'Player 2' },
        },
      ],
    } as ReturnType<typeof useAppStore>);

    const { container } = render(<MatchTimeline />);

    const eventCards = container.querySelectorAll('.event-card');
    expect(eventCards[0]).toHaveClass('bg-green-50', 'border-green-200');
    expect(eventCards[1]).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('should render events in chronological order', () => {
    vi.mocked(useAppStore).mockReturnValue({
      matchEvents: [
        {
          eventId: 'event-1',
          matchId: 'match-1',
          eventType: 'goal',
          timestamp: '2024-01-15T10:30:00Z',
          teamId: 'team-a',
          metadata: { playerName: 'First Player', teamName: 'Team A' },
        },
        {
          eventId: 'event-2',
          matchId: 'match-1',
          eventType: 'corner',
          timestamp: '2024-01-15T10:35:00Z',
          teamId: 'team-b',
          metadata: { teamName: 'Team B' },
        },
        {
          eventId: 'event-3',
          matchId: 'match-1',
          eventType: 'goal',
          timestamp: '2024-01-15T10:40:00Z',
          teamId: 'team-b',
          metadata: { playerName: 'Second Player', teamName: 'Team B' },
        },
      ],
    } as ReturnType<typeof useAppStore>);

    const { container } = render(<MatchTimeline />);

    const eventCards = container.querySelectorAll('.event-card');
    expect(eventCards).toHaveLength(3);

    // Verify order by checking text content
    expect(eventCards[0].textContent).toContain('First Player');
    expect(eventCards[1].textContent).toContain('Team B');
    expect(eventCards[2].textContent).toContain('Second Player');
  });
});
