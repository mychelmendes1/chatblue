-- Script para gerar e atualizar API Key da empresa Tokeniza
-- Execute este script no banco de dados do servidor

-- Primeiro, verifique o ID da empresa Tokeniza
SELECT id, name, slug FROM companies WHERE name ILIKE '%Tokeniza%';

-- Depois, atualize com a API Key gerada (substitua 'SUA_API_KEY_AQUI' pela chave gerada)
-- UPDATE companies 
-- SET webform_api_key = 'SUA_API_KEY_AQUI'
-- WHERE name ILIKE '%Tokeniza%';

-- Para verificar se foi atualizado:
-- SELECT id, name, slug, webform_api_key FROM companies WHERE name ILIKE '%Tokeniza%';








