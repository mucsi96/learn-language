export const isApiRequest = (url: string): boolean => /\/api(\/|$)/.test(url);
