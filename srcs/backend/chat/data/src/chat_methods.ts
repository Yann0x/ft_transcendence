export function chatWss(connection, req)
{
    if (!connection || !connection.socket)
        return ;
 connection.socket.on('message', (message) => {
    // Handle incoming messages from the client
    console.log('Received message:', message);
    // Echo the message back to the client
    connection.socket.send(`Echo: ${message}`);
 });   
return ;
}
