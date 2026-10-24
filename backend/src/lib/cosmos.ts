import { Container, CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

export const credential = new DefaultAzureCredential();

let client: CosmosClient | undefined;

function getClient() {
  if (!client) {
    const endpoint = process.env.COSMOS_ENDPOINT;
    if (!endpoint) throw new Error('COSMOS_ENDPOINT is not set.');
    // Key access is disabled on the account; the Function App signs in with its managed identity.
    client = new CosmosClient({ endpoint, aadCredentials: credential });
  }
  return client;
}

export type ContainerName =
  | 'products'
  | 'categories'
  | 'suppliers'
  | 'orders'
  | 'customers'
  | 'deliveryRates'
  | 'settings';

export function container(name: ContainerName): Container {
  return getClient().database(process.env.COSMOS_DATABASE || 'batteryhub').container(name);
}

/** Read one document, or undefined when it does not exist. */
export async function readDoc<T>(name: ContainerName, id: string, partitionKey: string = id) {
  try {
    const { resource, etag } = await container(name).item(id, partitionKey).read();
    return resource ? { doc: resource as unknown as T, etag: etag! } : undefined;
  } catch (error) {
    if ((error as { code?: number }).code === 404) return undefined;
    throw error;
  }
}

export async function queryAll<T>(name: ContainerName, query: string, parameters: { name: string; value: string | number | boolean | null }[] = []) {
  const { resources } = await container(name).items.query<T>({ query, parameters }).fetchAll();
  return resources;
}

export function isConflict(error: unknown) {
  const code = (error as { code?: number }).code;
  return code === 412 || code === 409;
}
