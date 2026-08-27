// Registers the module hook that stubs `expo-secure-store` for Node runs.
// Usage: node --import ./register-loader.mjs <script>
// See expo-stub-loader.mjs for what is stubbed and why the stub can never
// stand in for the real backend without the run failing loudly.
import { register } from 'node:module';

register('./expo-stub-loader.mjs', import.meta.url);
