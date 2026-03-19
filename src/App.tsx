import AppShell from './components/layout/AppShell'
import { useKeyboard } from './hooks/useKeyboard'

export default function App() {
  useKeyboard()
  return <AppShell />
}
