import { Slot, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GameApp from '../GameApp';
import AuthGate from '../auth/AuthGate';
export default function Layout() {
  const pathname = usePathname();
  // Review route never mounts the game, hydration, attendance, or save effects.
  if (pathname === '/friend-preview' || pathname === '/friend-identity-review') return <SafeAreaProvider><Slot /></SafeAreaProvider>;
  return <SafeAreaProvider><AuthGate><GameApp><Slot /></GameApp></AuthGate></SafeAreaProvider>;
}
