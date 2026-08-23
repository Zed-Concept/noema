import Constants from 'expo-constants';

/**
 * The single source for the user-visible application name.
 *
 * `app.json`'s `expo.name` is that source. Expo inlines the resolved config
 * into the bundle on every platform, so reading it here means no screen, header,
 * or document title ever hard-codes the name a second time — which is the
 * requirement in `docs/00-master/PRODUCT.md` ("The app name renders from a
 * single config source") and what makes the eventual rename under ruling 8 a
 * one-line change to `app.json`.
 *
 * The value there is a PLACEHOLDER and must stay one until trademark clearance.
 * Ruling 8 bars "noema" from every user-visible field; `expo.slug` and
 * `expo.scheme` keep that string as internal or frozen identifiers and are not
 * read here.
 *
 * The `??` is load-bearing rather than defensive habit. `Constants.expoConfig`
 * is typed `(ExpoConfig & {...}) | null` with `name` REQUIRED, but on web the
 * constants module falls back to a bare `{}` when no manifest was inlined, and
 * `{}` is truthy — so `.name` can be `undefined` at runtime while the type says
 * otherwise. `'App'` is not a second name: it is the visible marker that config
 * was unavailable, chosen to be ruling-8 safe.
 */
export const APP_NAME: string = Constants.expoConfig?.name ?? 'App';
