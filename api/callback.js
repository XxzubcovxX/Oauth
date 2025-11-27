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

        const token = parsed.access_token;
        const provider = 'github'; // Tem que ser minúsculo para bater com o config.yml

        // MODO DEBUG: Não fecha a janela e mostra o token
        const html = `
          <html>
          <body style="font-family: sans-serif; text-align: center; padding: 20px;">
            <h1 style="color: green;">SUCESSO! Token Gerado</h1>
            <p>O GitHub autorizou e gerou o token abaixo:</p>
            <textarea style="width: 100%; height: 100px;">${token}</textarea>
            
            <hr>
            <h3>Tentando enviar para o CMS...</h3>
            <button onclick="enviarMensagem()">Tentar Enviar Novamente</button>
            <p id="status">Enviando automaticamente...</p>

            <script>
              const message = { token: "${token}", provider: "${provider}" };
              const target = window.opener; // Quem abriu a janela (o CMS)
              
              function enviarMensagem() {
                if (!target) {
                   document.getElementById('status').innerText = "ERRO: Janela do CMS não encontrada (window.opener null).";
                   return;
                }
                
                // Envia a mensagem no formato que o Decap espera
                // Formato: authorization:github:success:{...}
                const msgString = "authorization:${provider}:success:" + JSON.stringify(message);
                
                // Envia para qualquer origem (*) para evitar bloqueio de CORS no teste
                target.postMessage(msgString, "*");
                
                document.getElementById('status').innerText = "Mensagem enviada! Verifique o console da outra aba.";
                console.log("Mensagem enviada:", msgString);
              }

              // Tenta enviar assim que carrega
              setTimeout(enviarMensagem, 500);
              
              // COMENTEI O FECHAMENTO PARA VOCÊ VER
              // window.close(); 
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