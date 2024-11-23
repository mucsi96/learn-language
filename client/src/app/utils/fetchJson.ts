export async function fetchJson(url: string, options: { body?: any, method?: string; } = {}) {
  const { body, method = 'GET' } = options;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Could not load data');
  }

  return response.json();
}
