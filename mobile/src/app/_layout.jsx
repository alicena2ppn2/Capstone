import { Slot, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GameApp from '../GameApp';
export default function Layout() {
  const pathname = usePathname();
  // Review route never mounts the game, hydration, attendance, or save effects.
  if (pathname === '/friend-preview') return <SafeAreaProvider><Slot /></SafeAreaProvider>;
  return <GameApp><Slot /></GameApp>;
}
