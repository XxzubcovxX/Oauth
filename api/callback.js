import https from 'https';

export default function handler(req, res) {
  const { code } = req.query;
  const client_id = process.env.OAUTH_CLIENT_ID;
  const client_secret = process.env.OAUTH_CLIENT_SECRET;

  if (!code) return res.status(400).send("Erro: Sem código");
  
  const data = JSON.stringify({ client_id, client_secret, code });
  
  const options = {
    hostname: 'github.com',
    port: 443,
    path: '/login/oauth/access_token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': data.length,
      'User-Agent': 'Node-Serverless'
    }
  };

  const request = https.request(options, (response) => {
    let body = '';
    response.on('data', (chunk) => body += chunk);
    
    response.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const token = parsed.access_token;
        const provider = 'github';

        // HTML que envia a mensagem repetidamente
        const html = `
          <html>
          <body style="background: #e6fffa; text-align: center; font-family: sans-serif; padding: 50px;">
            <h2 style="color: #047857;">Autenticado!</h2>
            <p>Enviando token para o painel...</p>
            <p>Aguarde, esta janela fechará em instantes.</p>
            
            <script>
              const message = 'authorization:github:success:' + JSON.stringify({
                token: "${token}",
                provider: "${provider}"
              });

              function sendMessage() {
                console.log("Enviando token...");
                if (window.opener) {
                  window.opener.postMessage(message, "*");
                }
              }

              // METRALHADORA: Envia a cada 200ms
              const interval = setInterval(sendMessage, 200);

              // Só fecha depois de 3 segundos (tempo suficiente para o site pegar)
              setTimeout(() => {
                clearInterval(interval);
                window.close();
              }, 3000);
            </script>
          </body>
          </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);

      } catch (e) {
        res.status(500).send("Erro JSON: " + e.message);
      }
    });
  });

  request.write(data);
  request.end();
}