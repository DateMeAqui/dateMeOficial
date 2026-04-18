# Pasta utilitária: common

Esta pasta agrupa utilitários compartilhados entre módulos. Não é um NestModule
(não existe `common.module.ts`, não há providers, controllers ou resolvers registrados).
Por isso este README usa um template simplificado (sem as 11 seções do template padrão).

Localização: `src/modules/common/`.

## Conteúdo

### `pagination.input.ts`

Define o `InputType` GraphQL `PaginationInput`, usado para parametrizar paginação
em queries. É declarado como `@InputType('PaginationInput')` explicitamente.

Campos:

| Campo   | Tipo GraphQL | Tipo TS              | Decoradores de validação        | Default | Nullable |
| ------- | ------------ | -------------------- | ------------------------------- | ------- | -------- |
| `page`  | `Int`        | `number` (opcional)  | `@IsOptional()`, `@IsPositive()`| `1`     | `true`   |
| `limit` | `Int`        | `number` (opcional)  | `@IsOptional()`, `@IsPositive()`| `10`    | `true`   |

Observações extraídas do arquivo:

- Ambos os campos são opcionais na query; quando omitidos, o GraphQL atribui os
  `defaultValue` declarados (`1` e `10`).
- A validação `@IsPositive()` da `class-validator` garante valor estritamente
  maior que zero quando o campo é enviado.

### `settings.js`

Arquivo em JavaScript (não TypeScript) contendo um objeto de configuração
exportado via CommonJS. Conteúdo integral do arquivo:

```js
const settings = {
    APPNAME: "date-me"
}
module.exports = settings
```

Ele expõe uma única chave: `APPNAME` com o valor literal `"date-me"`.

### `validators/`

Pasta com validadores customizados baseados em `class-validator`.

#### `validators/cpf.validator.ts`

Implementa a validação de CPF brasileiro. Exporta dois símbolos:

- `IsValidCPFConstraint` — classe que implementa `ValidatorConstraintInterface`.
  Registrada com `@ValidatorConstraint({ name: 'isValidCPF', async: false })`.
  Regras de validação aplicadas no método `validate`:
  - Rejeita valores que não sejam `string`.
  - Remove caracteres não numéricos (`cpf.replace(/\D/g, '')`).
  - Exige exatamente 11 dígitos após a limpeza.
  - Rejeita CPFs com todos os dígitos iguais (regex `/^(\d)\1{10}$/`).
  - Calcula e confere o primeiro dígito verificador (soma ponderada com pesos
    decrescentes de 10 a 2; se o resto `* 10 % 11` for 10, vira 0).
  - Calcula e confere o segundo dígito verificador (pesos decrescentes de 11 a 2,
    mesma regra do resto igual a 10).
  - Mensagem padrão (`defaultMessage`): `'CPF inválido'`.
- `IsValidCPF(validationOptions?)` — decorator factory que registra o constraint
  acima via `registerDecorator`, permitindo usar `@IsValidCPF()` em campos de DTOs.

## Quem usa

Consumidores internos a `src/modules/` que importam de `common/` (resultado de
`grep -rn "from.*common/" src --include="*.ts"`, filtrando apenas os imports
que apontam para `src/modules/common/` — os resultados com `./common/` dentro
de `src/modules/pag-seguro/dto/` referem-se a uma pasta `common/` local do
módulo `pag-seguro`, não a esta):

- `src/modules/users/users.resolver.ts` — importa `PaginationInput` de
  `../common/pagination.input`.
- `src/modules/users/dto/create-user.input.ts` — importa `IsValidCPF` de
  `../../common/validators/cpf.validator` e o aplica ao campo `cpf` do
  `CreateUserInput` (`@IsValidCPF({ message: 'CPF inválido' })`).

Nenhum outro arquivo sob `src/` importa símbolos desta pasta.

## Pontos de atenção

- **`settings.js` em JS no meio de TS.** O único arquivo não TypeScript da
  pasta. Usa `module.exports` (CommonJS) em vez de `export`. Nenhum arquivo
  dentro de `src/` importa `settings.js` desta pasta — a única ocorrência de
  um `settings.js` importado no projeto é outro arquivo, em
  `src/aws/integration/helpers/config/settings.js` (importado por
  `src/aws/integration/helpers/database/database.js`). Portanto o
  `src/modules/common/settings.js` aparenta ser código morto ou utilitário
  reservado para uso futuro. A confirmar se existe uso dinâmico não rastreável
  por grep estático (por exemplo, `require()` computado em runtime).
- **Constante literal `APPNAME`.** O valor `"date-me"` está hard-coded no
  arquivo e não vem de variável de ambiente.
- **`IsValidCPFConstraint` também é exportado.** Além do decorator
  `IsValidCPF`, a classe `IsValidCPFConstraint` é exportada. Atualmente
  nenhum consumidor fora de `cpf.validator.ts` a usa diretamente (o único
  hit de `IsValidCPFConstraint` fora das definições é a auto-referência
  dentro do próprio arquivo).
- **Mensagem duplicada no consumidor.** `defaultMessage` do constraint
  retorna `'CPF inválido'`, mas `create-user.input.ts` passa explicitamente
  `{ message: 'CPF inválido' }` ao decorator. A mensagem acaba idêntica,
  porém fica duplicada em dois lugares.
- **Pasta não é um NestModule.** Como não há `common.module.ts`, estes
  utilitários são consumidos via import direto do path, e não via injeção
  de dependência / `imports: [CommonModule]`.
