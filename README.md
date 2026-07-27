# Blaze Analytics Collector 1.3 — Teste Direto

Esta versão testa coleta independente no Railway EU West (Amsterdam). Ela não depende da extensão.

## Resultado esperado

Nos registros:

- sucesso: `[direct-current] OK` e `[direct-recent] OK`
- bloqueio: `HTTP 451`

## Testes

- `/health`: mostra estado do coletor e últimos erros/sucessos.
- `/api/direct-test`: testa imediatamente os dois endpoints.
- `/api/stats`: confirma se rodadas e snapshots aumentam.

## Variáveis

Apenas `DATABASE_URL` é obrigatória. `INGEST_TOKEN` pode permanecer no Railway, mas esta versão não o utiliza.

Não tente contornar restrições geográficas ou legais. Se o serviço retornar HTTP 451, use somente uma origem de coleta permitida pelos termos e pela legislação aplicável.
