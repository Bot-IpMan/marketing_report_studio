# Project Evolution Agent — прямий GitHub, без власного сервера

Комплект для приватного Custom GPT, який аналізує `Bot-IpMan/marketing_report_studio` і за прямим запитом готує невеликі зміни та draft PR. Версія 1.0.0. Репозиторій містить вихідний код агента; саме додавання цього комплекту ще не встановлює GPT і не створює GitHub token.

## Що зроблено і де

| Місце | Вміст |
|---|---|
| `.github/workflows/agent-context.yml` | Частини великих файлів на службовій гілці |
| `.github/workflows/agent-task.yml` | План, окрема гілка задачі, обмежені зміни |
| `.github/workflows/agent-validation.yml` | Strict перевірка точного commit і GitHub check |
| `scripts/agent/`, `.agent/policy.json` | Довірені скрипти, правила та журнал |
| `agent-gpt/` | Інструкція, Knowledge, схема й матеріали налаштування GPT |

Це developer tooling. `app.js`, standalone HTML, API-disabled routes та спосіб зберігання звітів у браузері не змінюються від самого підключення агента.

## Налаштування власником

1. Переглянь bootstrap PR/гілку, внеси ці файли в GitHub default branch `main` і переконайся, що три workflows у вкладці Actions мають стан **Active**. Не копіюй каталог `gateway/` зі старого комплекту. Після додавання комітів ще раз перевір новий SHA `main`.
2. Дочекайся запуску `Agent Context` після push у `main`. Переконайся, що з’явилася окрема гілка `agent-data`, а `contexts/<новий-main-SHA>/manifest.json` має `complete:true`. Якщо push, зроблений `GITHUB_TOKEN`, не запустив workflow, запусти `Agent Context` вручну з `source_sha=<main SHA>` і `source_branch=main`.
3. У GitHub створи **fine-grained PAT**, доступ тільки до цього репозиторію: Metadata read, Contents read, Actions read/write, Pull requests read/write, Checks read. Для щоденного GPT не видавай Contents write, Workflows write або Administration. Токен не записуй у чат, файли чи скриншоти.
4. У редакторі **приватного GPT** встав текст `01_GPT_INSTRUCTIONS.txt` у Instructions. Додай у Knowledge файли `02_KNOWLEDGE_PROTOCOL.md`, `05_TECHNICAL_SPEC.md`, `08_PROJECT_BASELINE.md`. У Actions імпортуй `03_ACTION_OPENAPI.yaml`; для Authentication обери **API Key → Bearer** і введи PAT у захищене поле редактора. Увімкни Data Analysis, щоб точно перевіряти base64 та частини великих файлів.
5. Спочатку перевір `ANALYZE` (тільки читання поточного SHA). Тоді перевір один конкретний малий `EXECUTE`: task journal, гілка, strict CI та check на candidate SHA. `PR` має створити лише draft, без merge. Встанови ruleset для `main`: людський review, перевірений потрібний status check `MRS Agent Validation` від GitHub Actions, без обходу для автоматизації. Назву/app check і роботу ruleset звір у реальному GitHub UI.

Хостинг Cloudflare Pages та його production branch перевіряються окремо; `main` є перевіреною GitHub default branch, але це не доказ Cloudflare production branch. Пуш до робочої гілки може створити Cloudflare preview, якщо це налаштовано. Службову `agent-data` краще виключити з preview builds.

## Що вводити в GPT

| Поле | Значення |
|---|---|
| Instructions | Увесь вміст `01_GPT_INSTRUCTIONS.txt` |
| Knowledge | Три `.md` файли з кроку 4 |
| Actions → Schema | Увесь вміст `03_ACTION_OPENAPI.yaml` |
| Actions → Authentication | API Key → Bearer → окремий GitHub fine-grained PAT |
| Action domain | `https://api.github.com` уже в схемі; не вводь `agent.example.com` |

Ключ OpenAI API, GitHub App private key, власний сервер, Docker, SQLite та Cloudflare secret для роботи GPT не потрібні. GitHub-hosted Actions використовують ліміти та billing GitHub; дізнайся про фактичні налаштування свого репозиторію в GitHub.

## Перевірка файлів перед встановленням

```bash
npm run build
npm test
npm run test:agent
npm run qa:pdf:strict
npm run e2e:strict
python3 agent-gpt/validate_bundle.py
```

Для YAML validator потрібен PyYAML. Відсутність браузера або неуспішний strict E2E — не PASS. Локальна валідація схеми не доводить, що GPT Editor прийняв її або токен має права; це перевіряється в редакторі після встановлення workflows.

Старий `project-evolution-agent-v1` поза цим каталогом містить gateway-версію. Не змішуй її Instructions і Action Schema з цим комплектом.
