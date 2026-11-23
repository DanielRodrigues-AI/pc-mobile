# P.C.Mobile — GitHub Pages

Site estático para **consulta** de questões do P.C.Desktop, usando SQLite no navegador por `sql.js`. Sem cadastro de questões, sem servidor próprio e sem automação da Estácio.

## Publicar

1. No GitHub, crie um repositório público, por exemplo `pc-mobile`.
2. Faça upload **dos arquivos dentro desta pasta** (`index.html`, `app.js`, `styles.css`, `questoes.db`, `.nojekyll`, `README.md`) na raiz do repositório. Não envie o ZIP inteiro como um único arquivo.
3. Em **Settings > Pages**, selecione **Deploy from a branch**; branch **main** e pasta **/(root)**; depois salve.
4. O endereço será `https://SEU-USUARIO.github.io/pc-mobile/` (substitua o usuário e nome do repositório pelos seus).
5. Aguarde a publicação. O conteúdo pode demorar alguns minutos para atualizar.

## Atualizar questões

1. No P.C.Desktop, use **Exportar banco (.db)**, ou crie um backup consistente do coletor.
2. Renomeie o arquivo exportado para **`questoes.db`**.
3. No repositório, substitua o `questoes.db` antigo pelo novo e confirme o commit.
4. Quem abrir o site depois da publicação obterá a versão atual do banco. O botão **↻ Atualizar** força nova consulta.

**Formato:** o SQLite precisa ter tabela `questoes`, com colunas `enunciado`, `alternativas_json`, `materia`, `modulo`, `resposta_texto`, `comentario`; colunas de provas e simulados são detectadas quando existirem. A versão antiga do banco de 352 questões acompanha o pacote como teste inicial. O aplicativo carrega os dados em memória e não envia dados de sessão.

**Atenção à privacidade e copyright:** o GitHub Pages publica os arquivos do site e o banco: qualquer pessoa que tenha o endereço pode ler e baixar o `.db`. Hospede apenas material que você possa compartilhar. O script SQLite é obtido do CDN jsDelivr; portanto, além do GitHub Pages, a conexão com esse CDN deve estar disponível.

## Testar localmente no Linux

Dentro da pasta:

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000`. Não abra `index.html` diretamente com `file://`, porque o navegador pode bloquear o carregamento do `.db`.
