# Blaze Analytics Collector

Coletor 24/7, banco PostgreSQL e API para o Blaze Analytics.

## O que esta primeira versão faz

- Consulta a rodada atual em intervalo configurável.
- Registra snapshots financeiros durante a rodada.
- Calcula a exposição da casa para vermelho, preto e branco.
- Sincroniza resultados recentes e associa tudo pelo mesmo ID da rodada.
- Expõe uma API para consultar saúde, estatísticas, rodadas e snapshots.

## Endpoints da API

- `GET /`
- `GET /health`
- `GET /api/stats`
- `GET /api/rounds?limit=50`
- `GET /api/rounds/:id`

## Publicação no Railway

1. Envie todos os arquivos deste projeto para o repositório GitHub.
2. No Railway, crie um projeto usando **Repositório GitHub**.
3. Selecione o repositório `blaze-analytics-collector`.
4. Adicione um banco **PostgreSQL** ao mesmo projeto.
5. No serviço do coletor, abra **Variables**.
6. Adicione uma variável de referência:
   - Nome: `DATABASE_URL`
   - Valor: `${{Postgres.DATABASE_URL}}`
7. Adicione também:
   - `NODE_ENV=production`
   - `BLAZE_BASE_URL=https://blaze.bet.br/api`
   - `CURRENT_PATH=/roulette_games/current`
   - `RECENT_PATH=/roulette_games/recent`
   - `CURRENT_POLL_MS=2000`
   - `RECENT_POLL_MS=5000`
8. Aguarde o novo deploy.
9. Em **Settings > Networking**, gere um domínio público.
10. Abra `https://SEU-DOMINIO/health`.

## Resultado esperado no /health

```json
{
  "ok": true,
  "database": "connected",
  "collector": {
    "running": true
  }
}
```

## Observações importantes

- Os endpoints utilizados não são uma API pública documentada; podem mudar ou bloquear acessos de servidor.
- O coletor limita a frequência de requisições e possui timeout, mas você deve respeitar os termos do serviço de origem.
- Dados históricos podem medir padrões, porém não garantem previsão, assertividade ou lucro.
- Nunca publique senhas, tokens ou a URL real do banco no GitHub.
