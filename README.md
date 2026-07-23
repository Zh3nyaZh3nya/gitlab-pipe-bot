## Запуск

1. `npm install`
2. Скопировать `.env.example` в `.env` и заполнить:
   - `BOT_TOKEN` — токен из @BotFather
   - `GITLAB_WEBHOOK_SECRET` — любая длинная случайная строка
   - `GITLAB_URL` — адрес вашего GitLab
   - `GITLAB_API_TOKEN` — токен сервис-аккаунта/бота со scope `read_api`,
     добавленного участником (Reporter) в проект — используется, чтобы
     подтягивать инфо о merge request по коммиту, когда пайплайн не является
     MR-пайплайном (см. «Инфо о merge request» ниже)
   - `<NAME>_CONFIG_JSON` — переменная с бизнес-настройками уведомлений для
     одной или нескольких GitLab-репозиториев (например
     [`docs/notify-config.md`](docs/notify-config.md)
   - `LOG_LEVEL=debug` - нужно для просмотра логов
3. `npm run dev`
4. Проверка: открыть `http://localhost:3000/health` — должно вернуть `{"status":"ok"}`

## Подключение GitLab

Проект → Settings → Webhooks:
- URL: `http://<IP>:PORT/webhook/gitlab`
- Secret token: значение `GITLAB_WEBHOOK_SECRET`
- Trigger: только **Pipeline events**

## Локальный тест без GitLab

После создания вебхука нажать на test и в списке выбрать `Pipeline events`

## Инфо о merge request

Настройка:
1. Создать в GitLab сервис-аккаунт (или personal/project access token) со
   scope `read_api`.
2. Добавить его участником проекта с ролью **Reporter** (без доступа
   участника запрос будет падать с `404 Project Not Found`).
3. Токен и адрес инстанса — в `.env` → `GITLAB_API_TOKEN` и `GITLAB_URL`.

Если запрос не удался (нет доступа, сеть, MR не нашелся) — бот просто
отправляет уведомление без ссылки на MR, ничего не ломается.

## Продакшен

```
npm run build
npm start
```

## Сломанные символы из за кириллицы в логах
Нужно ввести `chcp 65001`
