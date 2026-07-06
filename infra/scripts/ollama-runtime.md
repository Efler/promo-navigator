# Ollama runtime

Promo Navigator использует Ollama как внутренний Docker-сервис для one-shot
рекомендации одной из трёх механик: `promotions`, `promocodes` или `bundles`.

Текущая модель — `qwen3:1.7b` в образе `ollama/ollama:0.30.10`. Она выбрана для
CPU-only VPS с 4 CPU и 4 GB RAM. Backend обращается к Ollama через `/api/chat`;
история сообщений и Ollama `context` не переиспользуются.

Канонический payload, системный промпт и формат ответа описаны в
`docs/llm-recommendation-contract-ru.md`.

## Локальный запуск

```bash
docker compose up -d pc_ollama
docker compose --profile ollama-init run --rm pc_ollama_model_init
docker compose ps pc_ollama
docker compose exec pc_ollama ollama list
```

Локальный API доступен только на `127.0.0.1:11434`.

Быстрый smoke-запрос:

```bash
curl http://127.0.0.1:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3:1.7b",
    "stream": false,
    "think": false,
    "keep_alive": "10m",
    "messages": [
      {"role": "user", "content": "Ответь одним словом: комплект"}
    ],
    "options": {"num_ctx": 1792, "num_predict": 32, "temperature": 0}
  }'
```

## Production

В `docker-compose.deploy.yml` Ollama не публикуется на host-порт. Backend вызывает
его по внутреннему адресу:

```text
http://pc_ollama:11434
```

Запуск и загрузка модели:

```bash
docker compose --env-file .env.deploy -f docker-compose.deploy.yml up -d pc_ollama
docker compose --env-file .env.deploy -f docker-compose.deploy.yml \
  --profile ollama-init run --rm pc_ollama_model_init
```

Текущий ресурсный профиль:

| Настройка | Значение | Назначение |
| --- | --- | --- |
| `OLLAMA_CPUS` | `3.0` | CPU-лимит модели |
| `OLLAMA_MEMORY_LIMIT` | `2304m` | ограничение памяти контейнера |
| `OLLAMA_CONTEXT_LENGTH` | `1792` | компактное контекстное окно |
| `OLLAMA_KEEP_ALIVE` | `10m` | хранение весов между запросами |
| `OLLAMA_MAX_QUEUE` | `8` | ограничение очереди |
| `OLLAMA_NUM_PARALLEL` | `1` | один inference одновременно |
| `OLLAMA_MAX_LOADED_MODELS` | `1` | только одна модель в памяти |
| `OLLAMA_KV_CACHE_TYPE` | `q8_0` | уменьшенный KV-cache |

Backend дополнительно использует:

| Настройка | Значение |
| --- | --- |
| `OLLAMA_CONNECT_TIMEOUT_SECONDS` | `3` |
| `OLLAMA_READ_TIMEOUT_SECONDS` | `120` |
| `OLLAMA_QUEUE_WAIT_TIMEOUT_SECONDS` | `5` |
| `OLLAMA_NUM_PREDICT` | `112` |
| `OLLAMA_SEED` | `42` |
| `OLLAMA_USER_MESSAGE_MAX_CHARS` | `2600` |

`OLLAMA_NO_CLOUD=1` оставляет inference локальным. Порт `11434` нельзя публиковать
наружу на VPS.

## Поведение интеграции

- backend допускает один активный запрос к Ollama;
- `think=false`, `temperature=0`, `stream=false`;
- `keep_alive=10m` сохраняет только веса модели, но не историю;
- structured JSON проверяется Pydantic-схемой;
- транспортные ошибки не повторяются;
- невалидный structured-ответ повторяется максимум один раз;
- обрезанное описание заменяется безопасным backend-текстом;
- `clarification_required` всегда получает стандартную backend-отбивку;
- очевидно посторонний ввод отсекается до сборки seller state и вызова Ollama.

Последний пункт обязателен: компактная модель при полном seller state может
переоценивать ассортимент и ошибочно подбирать механику для бытового ввода вроде
«хочу пиццы».

## Проверки и обслуживание

```bash
docker compose --env-file .env.deploy -f docker-compose.deploy.yml ps pc_ollama
docker stats pc_ollama --no-stream
docker compose --env-file .env.deploy -f docker-compose.deploy.yml \
  exec pc_ollama ollama list
docker compose --env-file .env.deploy -f docker-compose.deploy.yml \
  exec pc_ollama ollama ps
docker compose --env-file .env.deploy -f docker-compose.deploy.yml \
  logs --tail=100 pc_ollama
```

Удаление ненужной модели:

```bash
docker compose exec pc_ollama ollama rm <model-name>
```

Для production остаётся нужен фиксированный eval-набор релевантных, неоднозначных,
посторонних и prompt-injection запросов.
