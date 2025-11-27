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
        
        if (parsed.error) {
          return res.status(400).send(`Erro GitHub: ${parsed.error_description}`);
        }

        const content = {
          token: parsed.access_token,
          provider: 'github'
        };

        // Este script roda no navegador, envia o token e fecha a janela
        const script = `
          <script>
            (function() {
              function receiveMessage(e) {
                console.log("Enviando token para o CMS...");
                
                // Envia a mensagem no formato exato que o Decap CMS espera
                // authorization:github:success:{json...}
                window.opener.postMessage(
                  'authorization:github:success:${JSON.stringify(content)}',
                  '*' // Envia para qualquer origem (seguro neste contexto de popup)
                );
                
                // Fecha a janela após enviar
                window.close();
              }
              receiveMessage();
            })();
          </script>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(script);

      } catch (e) {
        res.status(500).send("Erro JSON: " + e.message);
      }
    });
  });

  request.write(data);
  request.end();
}