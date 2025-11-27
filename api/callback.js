// api/callback.js
import https from 'https';

export default function handler(req, res) {
  const { code } = req.query;
  
  // Pegamos as senhas do ambiente da Vercel
  const client_id = process.env.OAUTH_CLIENT_ID;
  const client_secret = process.env.OAUTH_CLIENT_SECRET;

  if (!code) {
    return res.status(400).send("Erro: Nenhum código recebido do GitHub.");
  }

  if (!client_id || !client_secret) {
    return res.status(500).send("Erro: Variáveis de ambiente (CLIENT_ID/SECRET) não configuradas na Vercel.");
  }

  // Prepara os dados para enviar ao GitHub
  const data = JSON.stringify({
    client_id,
    client_secret,
    code
  });

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

  // Faz a requisição manual (sem usar fetch para evitar incompatibilidade)
  const request = https.request(options, (response) => {
    let body = '';

    response.on('data', (chunk) => {
      body += chunk;
    });

    response.on('end', () => {
      try {
        const parsed = JSON.parse(body);

        // Se o GitHub retornou erro (ex: senha errada)
        if (parsed.error) {
          return res.status(400).send(`Erro do GitHub: ${parsed.error_description || parsed.error}`);
        }

        const token = parsed.access_token;
        const provider = 'github';

        // Script que envia o token para o CMS e fecha a janela
        const html = `
          <html>
          <body>
            <p>Autenticando...</p>
            <script>
              const message = {
                token: "${token}",
                provider: "${provider}"
              };
              
              // Tenta enviar para a janela pai (o CMS)
              window.opener.postMessage(
                "authorization:${provider}:success:" + JSON.stringify(message),
                "*"
              );
              
              // Fecha esta janela popup
              window.close();
            </script>
          </body>
          </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);

      } catch (e) {
        res.status(500).send("Erro ao processar resposta do GitHub: " + e.message);
      }
    });
  });

  request.on('error', (e) => {
    res.status(500).send("Erro na conexão com GitHub: " + e.message);
  });

  request.write(data);
  request.end();
}