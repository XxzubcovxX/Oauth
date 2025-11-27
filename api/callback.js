// api/callback.js
export default async function handler(req, res) {
  const { code } = req.query;
  
  // Pegamos as senhas do ambiente da Vercel
  const client_id = process.env.OAUTH_CLIENT_ID;
  const client_secret = process.env.OAUTH_CLIENT_SECRET;

  if (!code) {
    return res.status(400).send("No code provided");
  }

  try {
    // 1. Troca o 'code' pelo 'access_token' no GitHub
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code
      })
    });

    const data = await response.json();
    const token = data.access_token;

    // 2. Monta o script que envia o token de volta para o Decap CMS
    const html = `
      <html>
        <body>
          <script>
            const receiveMessage = (message) => {
              window.opener.postMessage(
                'authorization:github:success:${JSON.stringify({ token: token, provider: 'github' })}',
                message.origin
              );
              window.removeEventListener("message", receiveMessage, false);
            }
            window.addEventListener("message", receiveMessage, false);
            
            // Envia mensagem para o CMS dizendo que logou
            window.opener.postMessage("authorizing:github", "*");
          </script>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error(error);
    res.status(500).send("Erro na autenticação: " + error.message);
  }
}