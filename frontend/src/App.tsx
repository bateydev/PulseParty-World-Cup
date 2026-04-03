import { PWAStatusIndicator } from './components/PWAStatus';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <PWAStatusIndicator />
      <header className="bg-primary-600 text-white p-4">
        <h1 className="text-2xl font-bold">PulseParty Rooms</h1>
      </header>
      <main className="container mx-auto p-4">
        <p>Welcome to PulseParty Rooms - Real-time football watch parties!</p>
      </main>
    </div>
  );
}

export default App;
