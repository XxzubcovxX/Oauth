// api/auth.js
export default function handler(req, res) {
  const { host } = req.headers;
  const client_id = process.env.OAUTH_CLIENT_ID;

  // Monta a URL para onde o GitHub deve devolver a resposta
  // Usamos https por padrão na Vercel
  const redirect_uri = `https://${host}/api/callback`;

  // Redireciona para o GitHub pedindo permissão
  const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&scope=repo,user&redirect_uri=${redirect_uri}`;

  res.redirect(url);
}