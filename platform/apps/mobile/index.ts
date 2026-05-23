// Entrada explicita (necessaria em monorepo — o AppEntry.js classico do
// Expo resolve mal o caminho da App quando node_modules e hoisted).
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
