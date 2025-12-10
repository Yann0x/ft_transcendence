export default async function fetchAndCheck(url: string, method: string, body?: any) {
  let fetchUrl = url;
  let fetchOptions: RequestInit = {
    method: method,
    headers: {'Content-Type': 'application/json'}
  };
  
  if (method === 'GET' && body) {
    // Convert body to query parameters for GET requests
    const params = new URLSearchParams();
    Object.keys(body).forEach(key => {
      if (body[key] !== undefined) {
        params.append(key, body[key].toString());
      }
    });
    fetchUrl = `${url}?${params.toString()}`;
  } else if (body && method !== 'GET') {
    // For POST, PUT, PATCH, DELETE - send body as JSON
    fetchOptions.body = JSON.stringify(body);
  }
  
  const result = await fetch(fetchUrl, fetchOptions);
  if (!result.ok) {
    throw new Error(`Error fetching ${url}: ${result.statusText}`);
  }
  const data = await result.json();
  return data;
}