/**
 * Lamplighter — vendored variable fonts (no external CDN).
 *
 * Fraunces  → expressive transitional serif for the wordmark, chapter cards and
 *             narration/dialogue body. We import the `opsz` axis build so optical
 *             sizing engages (`font-optical-sizing: auto`) for crisp display text.
 * Inter     → humanist sans for all chrome, labels and controls.
 * JetBrains → mono technical voice for the "Lumen" proxy system readout.
 *
 * These side-effect imports register @font-face rules; the family names used in
 * tokens.css are exactly 'Fraunces Variable', 'Inter Variable', 'JetBrains Mono Variable'.
 */
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
