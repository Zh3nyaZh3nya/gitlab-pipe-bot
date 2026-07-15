## Запуск

1. `npm install`
2. Скопировать `.env.example` в `.env` и заполнить:
   - `BOT_TOKEN` — токен из @BotFather
   - `CHAT_ID` — id чата/группы (см. раздел «Как получить CHAT_ID» ниже)
   - `GITLAB_WEBHOOK_SECRET` — любая длинная случайная строка
3. `npm run dev`
4. Проверка: открыть `http://localhost:3000/health` — должно вернуть `{"status":"ok"}`

## Как получить CHAT_ID

1. Напишите боту в личку `/start`, либо добавьте бота в нужную группу/канал и отправьте туда любое сообщение.
2. `https://api.telegram.org/botBOT_TOKEN/getUpdates`
3. В ответе найдите `"chat":{"id": ... }`:
   - для личного чата — положительное число;
   - для группы/супергруппы — отрицательное, обычно начинается с `-100`.
4. Скопируйте это число в `.env` → `CHAT_ID`.

Если для группы `getUpdates` возвращает пустой список (`"result":[]`) — у бота включён privacy mode, и он не видит обычные сообщения в группе. Отправьте боту в BotFather команду `/setprivacy` → выберите бота → `Disable`, затем повторите шаг 1–2.

## Локальный тест без GitLab

```
curl -X POST http://localhost:3000/webhook/gitlab -H "Content-Type: application/json" -H "X-Gitlab-Token: dgdgfdgdfgdfgghfghfghfghfghfghgf" -d "{\"object_kind\":\"pipeline\",\"object_attributes\":{\"id\":123,\"ref\":\"main\",\"status\":\"success\",\"url\":\"https://gitlab.example.com/pipe/123\",\"duration\":95},\"user\":{\"name\":\"Evgeniy\",\"username\":\"evgeniy\"},\"project\":{\"name\":\"test-project\",\"web_url\":\"https://gitlab.example.com/test\"}}"
```

Если в Telegram пришло сообщение — всё работает.

## Подключение GitLab

Проект → Settings → Webhooks:
- URL: `http://<IP>:3000/webhook/gitlab`
- Secret token: значение `GITLAB_WEBHOOK_SECRET`
- Trigger: только **Pipeline events**

## Продакшен

```
npm run build
npm start
```

На постоянной машине запускать через pm2
