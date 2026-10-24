import { SecretClient } from '@azure/keyvault-secrets';
import { credential } from './cosmos';

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { value: string | undefined; at: number }>();
let client: SecretClient | undefined;

/** Read a Key Vault secret (cached for 10 minutes). Undefined when the secret is not set. */
export async function getSecret(name: string): Promise<string | undefined> {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const uri = process.env.KEY_VAULT_URI;
  if (!uri) return process.env[name.toUpperCase().replace(/-/g, '_')];
  client ??= new SecretClient(uri, credential);

  let value: string | undefined;
  try {
    value = (await client.getSecret(name)).value;
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 404) throw error;
  }
  cache.set(name, { value, at: Date.now() });
  return value;
}
