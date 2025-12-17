async function customFetch(url: string, method: string, body?: any) {
  let fetchUrl = url;
  let fetchOptions: RequestInit = {
    method: method,
    headers: {'Content-Type': 'application/json'}
  };
  
  if (method === 'GET' && body) {
    const params = new URLSearchParams();
    Object.keys(body).forEach(key => {
      if (body[key] !== undefined) {
        params.append(key, body[key].toString());
      }
    });
    fetchUrl = `${url}?${params.toString()}`;
  } else if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }
  
  try {
    console.log(`utils.customFetch: Sending ${method} request to ${fetchUrl} with options:`, fetchOptions);
    const response = await fetch(fetchUrl, fetchOptions);
    console.log(`utils.customFetch: Received response with status ${response.status} for ${method} ${fetchUrl}`); 
    const isJson = response.headers.get('content-type')?.includes('application/json');
    let data: any;
    if (isJson) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // If response is not ok, throw error with details
    if (!response.ok) {
      const message = typeof data === 'string' ? data : data.message;
      const error: any = new Error(message || `HTTP ${response.status}: ${response.statusText}`);
      error.statusCode = response.status;
      error.error = typeof data === 'object' && data?.error ? data.error : 'Request Failed';
      if (typeof data === 'object') {
        error.service = data.service;
        error.details = data.details;
      }
      throw error;
    }
    
    return data;
    
  } catch (error: any) {
    // Network or parsing errors
    if (!error.statusCode) {
      error.statusCode = 503;
      error.error = 'Service Unavailable';
      error.message = `Failed to connect to ${url}: ${error.message}`;
    }
    throw error;
  }
}

module.exports = customFetch
